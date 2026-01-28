import { Injectable } from '@nestjs/common';
import * as os from 'os';
import * as path from 'path';
import { randomUUID } from 'crypto';
const { promises: fs } = require('node:fs');
import OpenAI from 'openai';
import sharp from 'sharp';
import { AzureBlobStorageService } from 'src/azure-blob/azure-blob.service';
import { logJobEventSafe } from '../common/file-logger';
import { PrismaService } from 'src/prisma/prisma.service'; // Adjust the path as needed

export interface PdfPreviewOptions {
  scale?: number;
  previewPageCount?: number;
  includeBuffers?: boolean;
}

interface AzureOpenAiConfig {
  apiKey: string;
  endpoint: string;
  deployment: string;
  apiVersion: string;
}

@Injectable()
export class PdfPreviewService {
  private readonly openAiApiKey: string | null;
  private readonly azureOpenAiConfig: AzureOpenAiConfig | null;

  constructor(
    private readonly azureBlobStorage: AzureBlobStorageService,
    private readonly prisma: PrismaService,
  ) {
    const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    if (!azureApiKey || !azureEndpoint) {
      this.azureOpenAiConfig = null;
    } else {
      this.azureOpenAiConfig = {
        apiKey: azureApiKey,
        endpoint: azureEndpoint.replace(/\/$/, ''),
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-5.1',
        apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-10-21',
      };
    }
    this.openAiApiKey = process.env.OPENAI_API_KEY || null;
  }

  private getOpenAiClient(): OpenAI | null {
    if (this.azureOpenAiConfig) {
      const { apiKey, endpoint } = this.azureOpenAiConfig;
      return new OpenAI({
        apiKey,
        baseURL: `${endpoint}/openai/v1/`,
        defaultHeaders: {
          'api-key': apiKey,
        },
      });
    }
    if (this.openAiApiKey) {
      return new OpenAI({ apiKey: this.openAiApiKey });
    }
    return null;
  }

  private async determineRotationUsingOpenAi(
    pageBuffer: Buffer,
  ): Promise<number> {
    const client = this.getOpenAiClient();
    if (!client) {
      return 0;
    }

    try {
      const model = this.azureOpenAiConfig
        ? this.azureOpenAiConfig.deployment
        : 'gpt-5.1';
      const payload: any[] = [
        {
          role: 'user',
          content: [
            {
              type: 'input_image',
              image_url: `data:image/jpeg;base64,${pageBuffer.toString('base64')}`,
            },
            {
              type: 'input_text',
              text: 'Detect if this image is rotated and return the degrees to rotate clockwise to make it upright. Allowed values: 0, 90, 180, 270. Respond ONLY with the number.',
            },
          ],
        },
      ];

      const response = await client.responses.create({
        model,
        input: payload,
        reasoning: { effort: 'low' },
      } as any);

      // Try output_text first
      if (
        typeof response?.output_text === 'string' &&
        response.output_text.trim()
      ) {
        const val = parseInt(
          response.output_text.trim().match(/-?\d+/)?.[0] || '0',
          10,
        );
        const normalized = [0, 90, 180, 270].includes(val) ? val : 0;
        return normalized;
      }

      // Fallback parsing from output array
      const outputs = Array.isArray(response?.output) ? response.output : [];

      const parsed = parseInt(
        outputs
          .map((item) => item.toString().match(/-?\d+/)?.[0])
          .find((val) => val) || '0',
        10,
      );
      return [0, 90, 180, 270].includes(parsed) ? parsed : 0;
    } catch (err) {
      console.warn('OpenAI rotation check failed:', err);
      return 0;
    }
  }

  async generatePreview(
    id: string,
    fileKey: string,
    jobId: string,
    fileName?: string,
    options?: PdfPreviewOptions,
  ): Promise<string[]> {
    const normalizedKey = (fileKey || '').replace(/^\//, '');
    if (!normalizedKey) {
      throw new Error('fileKey is required');
    }
    const downloadUrl =
      await this.azureBlobStorage.generateDownloadUrl(normalizedKey);
    const resp = await fetch(downloadUrl);
    if (!resp.ok) {
      throw new Error('Failed to download PDF from blob storage');
    }
    const arrayBuffer = await resp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const tmpDir = os.tmpdir();
    const ext = path.extname(fileName || normalizedKey) || '.pdf';
    const tmpFile = path.join(tmpDir, `${randomUUID()}${ext}`);
    await fs.writeFile(tmpFile, buffer);

    try {
      const { pdf } = await import('pdf-to-img');
      const scale = options?.scale ?? 5;
      const maxPreviewPages = Math.max(
        0,
        Math.min(options?.previewPageCount ?? 1000, 1000),
      );

      const document = await pdf(buffer, { scale });
      const pageCount = document.length ?? 0;
      const pagesToRender = Math.min(pageCount, maxPreviewPages);

      const baseName =
        fileName ||
        path.basename(normalizedKey).replace(/\.[^/.]+$/, '') ||
        'file';
      const uploadedKeys: string[] = [];

      // determine rotation once
      if (pagesToRender > 0) {
        try {
          const firstPageBuffer: Buffer = await document.getPage(1);
          const rotation =
            await this.determineRotationUsingOpenAi(firstPageBuffer);

          for (
            let pageNumber = 1;
            pageNumber <= pagesToRender;
            pageNumber += 1
          ) {
            let pageBuffer: Buffer = await document.getPage(pageNumber);
            if (rotation && rotation % 360 !== 0) {
              try {
                pageBuffer = await sharp(pageBuffer)
                  .rotate(rotation)
                  .toBuffer();
                logJobEventSafe(
                  `Rotated page ${pageNumber} of ${id} by ${rotation} degrees`,
                );
              } catch (rotateErr) {
                console.warn(
                  'Image rotation failed, uploading original image',
                  rotateErr,
                );
              }
            }

            const destinationBlobName = `${jobId}/${baseName}/page-${pageNumber}.png`;
            await this.azureBlobStorage.uploadImage({
              blobName: destinationBlobName,
              buffer: pageBuffer,
              contentType: 'image/png',
            });
            uploadedKeys.push(`/${destinationBlobName}`);
          }
        } catch (err) {
          console.warn('Error rendering pages:', err);
        }
      }

      try {
        await this.prisma.jobFile.update({
          where: { id: id },
          data: { imagesKeys: uploadedKeys },
        });
      } catch (updateErr) {
        console.warn('Failed to update jobs_files.images_keys:', updateErr);
      }

      return uploadedKeys;
    } finally {
      await fs.unlink(tmpFile).catch(() => {});
    }
  }
}
