import { Injectable } from '@nestjs/common';
import { AzureBlobStorageService } from 'src/azure-blob/azure-blob.service';
import * as os from 'os';
import * as path from 'path';
import { randomUUID } from 'crypto';
// import { pdf } from 'pdf-to-img';
const { promises: fs } = require("node:fs");

export interface PdfPreviewOptions {
  scale?: number;
  previewPageCount?: number;
  includeBuffers?: boolean;
}

@Injectable()
export class PdfPreviewService {
  constructor(private readonly azureBlobStorage: AzureBlobStorageService) {}

  async generatePreview(
    fileKey: string,
    jobId: string,
    fileName?: string,
    options?: PdfPreviewOptions,
  ): Promise<string[]> {
    const normalizedKey = (fileKey || '').replace(/^\//, '');
    if (!normalizedKey) {
      throw new Error('fileKey is required');
    }
    const downloadUrl = await this.azureBlobStorage.generateDownloadUrl(normalizedKey);
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
      const scale = options?.scale ?? 3;
      const maxPreviewPages = Math.max(0, Math.min(options?.previewPageCount ?? 1000, 1000));

      const document = await pdf(buffer, { scale });
      const pageCount = document.length ?? 0;
      const pagesToRender = Math.min(pageCount, maxPreviewPages);

      const baseName = fileName || path.basename(normalizedKey).replace(/\.[^/.]+$/, '') || 'file';
      const uploadedKeys: string[] = [];

      for (let pageNumber = 1; pageNumber <= pagesToRender; pageNumber += 1) {
        const pageBuffer: Buffer = await document.getPage(pageNumber);
        const destinationBlobName = `${jobId}/${baseName}/page-${pageNumber}.png`;
        // Assume uploadImage.uploadImage(blobName, buffer, options?) exists.
        await this.azureBlobStorage.uploadImage({
          blobName: destinationBlobName,
          buffer: pageBuffer,
          contentType: 'image/png',
        });
        uploadedKeys.push(`/${destinationBlobName}`);
      }

      return uploadedKeys;
    } finally {
      await fs.unlink(tmpFile).catch(() => {});
    }
  }
}

