import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JobFile, JobFileCategory, Prisma } from '../../generated/prisma/client';
import { AzureBlobStorageService } from 'src/azure-blob/azure-blob.service';
import { isTemplateGroup } from 'src/common/types/interface';
import { RunPromptDto } from './dto/run-prompt.dto';
import OpenAI from 'openai';
import { PDFParse } from 'pdf-parse';
interface TemplateJsonField {
  name: string;
  fileNames: string[];
  fileKeys: string[];
  note?: string;
  prompt: string;
  extractedValue?: string;
}

interface TemplateJsonGroup {
  groupName: string;
  fields: TemplateJsonField[];
}

interface DocumentContent {
  fileKey: string;
  fileName: string;
  text: string;
}

interface PromptResult {
  fieldName: string;
  prompt: string;
  note: string;
  files: string[];
  result: string;
}

interface AzureOpenAiConfig {
  apiKey: string;
  endpoint: string;
  deployment: string;
  apiVersion: string;
}

@Injectable()
export class JobService {
  private readonly openAiClient: OpenAI | null;
  private readonly azureOpenAiConfig: AzureOpenAiConfig | null;

  constructor(
    private prisma: PrismaService,
    private readonly azureBlobStorage: AzureBlobStorageService,
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

    this.openAiClient = this.azureOpenAiConfig
      ? null
      : process.env.OPENAI_API_KEY
        ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        : null;
  }

  async create(createJobDto: CreateJobDto) {
    const { files, ...jobData } = createJobDto;

    // Create job with files in a transaction
    const job = await this.prisma.$transaction(async (tx) => {
      const newJob = await tx.job.create({
        data: {
          ...jobData,
          status: 'draft',
        },
        include: {
          files: true,
          template: {
            select: {
              id: true,
              displayName: true,
              systemPrompt: true,
            },
          },
        },
      });

      // Create job files
      if (files && files.length > 0) {
        await tx.jobFile.createMany({
          data: files.map((file) => ({
            jobId: newJob.id,
            fileName: file.fileName,
            fileKey: file.fileKey || null,
            category: file.category,
          })),
        });
      }

      // Return job with files
      return tx.job.findUnique({
        where: { id: newJob.id },
        include: {
          files: true,
          template: {
            select: {
              id: true,
              displayName: true,
              systemPrompt: true,
            },
          },
        },
      });
    });

    return job;
  }

  async update(id: string, updateJobDto: UpdateJobDto) {
    const existingJob = await this.prisma.job.findUnique({
      where: { id },
    });

    if (!existingJob) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    const { files, ...jobData } = updateJobDto;

    // Update job and files in a transaction
    const job = await this.prisma.$transaction(async (tx) => {
      // Update job data
      const updatedJob = await tx.job.update({
        where: { id },
        data: jobData,
        include: {
          files: true,
          template: {
            select: {
              id: true,
              displayName: true,
              systemPrompt: true,
            },
          },
        },
      });

      // Update files if provided
      if (files !== undefined) {
        // Delete existing files
        await tx.jobFile.deleteMany({
          where: { jobId: id },
        });

        // Create new files
        if (files.length > 0) {
          await tx.jobFile.createMany({
            data: files.map((file) => ({
              jobId: id,
              fileName: file.fileName,
              fileKey: file.fileKey || null,
              category: file.category,
            })),
          });
        }
      }

      // Return updated job with files
      return tx.job.findUnique({
        where: { id },
        include: {
          files: true,
          template: {
            select: {
              id: true,
              displayName: true,
              systemPrompt: true,
            },
          },
        },
      });
    });

    return job;
  }

  async findOne(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        files: true,
        template: {
          select: {
            id: true,
            displayName: true,
            systemPrompt: true,
          },
        },
        user: {
          select: {
            id: true,
            userName: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return job;
  }

  async findByUserId(userId: string) {
    return await this.prisma.job.findMany({
      where: { userId },
      include: {
        files: true,
        template: {
          select: {
            id: true,
            displayName: true,
            systemPrompt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async runPrompt(jobId: string, runPromptDto: RunPromptDto): Promise<PromptResult> {
    const job = await this.findOne(jobId);
    console.log(`Fetched job ${runPromptDto} for prompt run`);
    const files = runPromptDto.fileKeys;
    if (!files) {
      throw new NotFoundException(`フィールド ${runPromptDto.fieldName} が見つかりません`);
    }

    console.log(`Running prompt for job ${jobId}, field ${runPromptDto.fileKeys}`);
    const providedFileKeys =
      (runPromptDto.fileKeys || [])
        .map((key) => key.replace(/^\//, ''))
        .filter(Boolean);

    // return {
    //   fieldName: runPromptDto.fieldName,
    //   prompt: runPromptDto.prompt?.trim(),
    //   note: (runPromptDto.note?.trim() || '').trim(),
    //   files: providedFileKeys,
    //   result: "",
    // };

    const documents = await this.extractDocuments(providedFileKeys, job.files);
    const promptText = runPromptDto.prompt.trim();
    if (!promptText) {
      throw new BadRequestException('プロンプトを入力してください');
    }

    const note = (runPromptDto.note?.trim() || '').trim();
    const systemPrompt =
      job.template?.systemPrompt || 'You are a helpful legal assistant that summarizes PDF content accurately.';

    const aggregatedText = documents
      .map((doc) => `--- ${doc.fileName} ---\n${doc.text.trim() || '内容なし'}`)
      .join('\n\n');

    const payload = [
      note ? `追加指示:\n${note}` : '',
      `ファイル内容:\n${aggregatedText}`,
      `プロンプト:\n${promptText}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const hasAiClient = Boolean(this.azureOpenAiConfig || this.openAiClient);
    const resultText = hasAiClient
      ? await this.requestOpenAi(systemPrompt, payload)
      : this.buildFallbackResponse(promptText, documents);

    return {
      fieldName: runPromptDto.fieldName,
      prompt: promptText,
      note,
      files: documents.map((doc) => doc.fileName),
      result: resultText,
    };
  }

  async startJobRun(jobId: string): Promise<void> {
    const job = await this.findOne(jobId);
    if (job.status === 'processing') {
      throw new BadRequestException('ジョブはすでに処理中です');
    }

    const templateGroups = this.normalizeTemplateJson(job.templateJson);
    if (templateGroups.length === 0) {
      throw new BadRequestException('生成対象の項目がありません');
    }

    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'processing',
        completedAt: null,
      },
    });

    console.log(`Starting background job run for job ${jobId}`);

    void this.processJobFields(jobId, templateGroups).catch((error) => {
      console.error(`Background job run failed for job ${jobId}:`, error);
    });
  }

  private async processJobFields(jobId: string, templateGroups?: TemplateJsonGroup[]): Promise<void> {
    const groups = templateGroups ?? this.normalizeTemplateJson((await this.findOne(jobId)).templateJson);
    if (groups.length === 0) {
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'draft',
          completedAt: null,
        },
      });
      return;
    }

    const workingGroups = groups.map((group) => ({
      groupName: group.groupName || 'その他',
      fields: group.fields.map((field) => ({ ...field })),
    }));

    try {
      for (const group of workingGroups) {
        for (const field of group.fields) {
          const runResult = await this.runPrompt(jobId, {
            fieldName: field.name,
            prompt: field.prompt,
            note: field.note,
            fileKeys: field.fileKeys,
          });
          field.extractedValue = runResult.result;
        }
      }

      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          templateJson: workingGroups as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'draft',
          completedAt: null,
        },
      });
      throw error;
    }
  }

  private normalizeTemplateJson(templateJson: unknown): TemplateJsonGroup[] {
    if (!Array.isArray(templateJson)) {
      return [];
    }

    const groups: TemplateJsonGroup[] = [];

    const groupedFormat =
      templateJson.length > 0 &&
      typeof (templateJson[0] as TemplateJsonGroup)?.groupName === 'string' &&
      Array.isArray((templateJson[0] as TemplateJsonGroup).fields);

    if (groupedFormat) {
      (templateJson as TemplateJsonGroup[]).forEach((group) => {
        const normalizedFields = Array.isArray(group.fields)
          ? group.fields
              .map((field) => this.normalizeTemplateField(field))
              .filter((field): field is TemplateJsonField => field !== null)
          : [];

        if (normalizedFields.length > 0) {
          groups.push({
            groupName: group.groupName || 'その他',
            fields: normalizedFields,
          });
        }
      });

      return groups;
    }

    const flatFields = templateJson
      .map((field) => this.normalizeTemplateField(field))
      .filter((field): field is TemplateJsonField => field !== null);

    if (flatFields.length === 0) {
      return [];
    }

    return [
      {
        groupName: 'グループ',
        fields: flatFields,
      },
    ];
  }

  private normalizeTemplateField(field: any): TemplateJsonField | null {
    if (!field) {
      return null;
    }

    const name = typeof field.name === 'string' ? field.name : typeof field.fieldId === 'string' ? field.fieldId : '';
    if (!name) {
      return null;
    }

    return {
      name,
      fileNames: this.toStringArray(field.fileNames ?? field.fileIds),
      fileKeys: this.toStringArray(field.fileKeys),
      note: typeof field.note === 'string' ? field.note : '',
      prompt: typeof field.prompt === 'string' ? field.prompt : '',
      extractedValue: typeof field.extractedValue === 'string' ? field.extractedValue : '',
    };
  }

  private toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
  }

  private collectFileKeys(field: TemplateJsonField, jobFiles: JobFile[]): string[] {
    const normalizedKeys = new Set<string>();

    ;(field.fileKeys || []).forEach((key) => {
      if (key) {
        normalizedKeys.add(key.replace(/^\//, ''));
      }
    });

    const targetFileNames = new Set<string>(field.fileNames || []);

    jobFiles.forEach((file) => {
      const normalizedKey = file.fileKey?.replace(/^\//, '');
      if (!normalizedKey) {
        return;
      }
      if (targetFileNames.has(file.fileName || '')) {
        normalizedKeys.add(normalizedKey);
      }
    });

    return Array.from(normalizedKeys);
  }

  private async extractDocuments(fileKeys: string[], jobFiles: JobFile[]): Promise<DocumentContent[]> {
    const tasks = fileKeys.map(async (key) => {
      const downloadUrl = await this.azureBlobStorage.generateDownloadUrl(key);
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new BadRequestException(`ファイル (${key}) のダウンロードに失敗しました`);
      }
      let text = '';
      try {
        const parsed = new PDFParse({url: downloadUrl});
        const result = await parsed.getText();
        text = result.text;
      } catch (error) {
        throw new BadRequestException(`PDFの解析に失敗しました (${key}) : ${error.message}`);
      }

      const jobFile = jobFiles.find(
        (file) => file.fileKey?.replace(/^\//, '') === key,
      );
      const fileName =
        jobFile?.fileName || key.split('/').pop() || `blob-${key}`;

      return {
        fileKey: key,
        fileName,
        text,
      };
    });

    return Promise.all(tasks);
  }

  private async requestOpenAi(systemPrompt: string, userPrompt: string): Promise<string> {
    if (this.azureOpenAiConfig) {
      return this.requestAzureOpenAi(systemPrompt, userPrompt);
    }

    if (!this.openAiClient) {
      throw new BadRequestException('OpenAI APIキーが設定されていません');
    }

    const response = await this.openAiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
    });

    const content = response?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new BadRequestException('AIからの応答を取得できませんでした');
    }

    return content;
  }

  private async requestAzureOpenAi(systemPrompt: string, userPrompt: string): Promise<string> {
    const { apiKey, endpoint, deployment, apiVersion } = this.azureOpenAiConfig as AzureOpenAiConfig;
    const url = new URL(
      `/openai/deployments/${deployment}/chat/completions`,
      `${endpoint}/`,
    );
    url.searchParams.set('api-version', apiVersion);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new BadRequestException(
        `OpenAI API request failed (${response.status}): ${errorText}`,
      );
    }

    const body = await response.json();
    const content = body?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new BadRequestException('AIからの応答を取得できませんでした');
    }

    return content;
  }

  private buildFallbackResponse(prompt: string, documents: DocumentContent[]): string {
    const fileList = documents.map((doc) => doc.fileName).join(', ');
    const excerpt = documents
      .map((doc) => `${doc.fileName}:\n${doc.text.slice(0, 200).trim() || '内容なし'}`)
      .join('\n\n');

    return [
      'OpenAI APIキーが設定されていないため、簡易レスポンスを生成しました。',
      `プロンプト: ${prompt}`,
      `選択ファイル: ${fileList || 'なし'}`,
      'ファイル抜粋:',
      excerpt || 'テキストが取得できませんでした。',
    ].join('\n\n');
  }

  async copyJob(jobId: string) {
    const existingJob = await this.findOne(jobId);

    if (!existingJob) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    // Create new job record first
    const newJob = await this.prisma.job.create({
      data: {
        userId: existingJob.userId,
        templateId: existingJob.templateId,
        title: `${existingJob.title} (コピー)`,
        templateJson: existingJob.templateJson as Prisma.InputJsonValue,
        status: 'draft',
      },
    });

    const copiedBlobNames: string[] = [];
    const newJobFiles: {
      jobId: string;
      fileName: string;
      fileKey: string;
      category: JobFileCategory;
    }[] = [];

    try {
      const copyResults = await Promise.all(
        existingJob.files.map(async (file) => {
          const sourceBlobName = file.fileKey?.replace(/^\//, '');
          if (!sourceBlobName) {
            return null;
          }

          const fileName = file.fileName || 'file';
          const destinationBlobName = `${newJob.id}/${file.category}/${fileName}`;

          await this.azureBlobStorage.copyBlob(
            sourceBlobName,
            destinationBlobName,
          );

          return {
            fileName,
            destinationBlobName,
            category: file.category,
          };
        }),
      );

      const successfulCopies = copyResults.filter(
        (result): result is {
          fileName: string;
          destinationBlobName: string;
          category: JobFileCategory;
        } => result !== null,
      );

      successfulCopies.forEach((result) => {
        copiedBlobNames.push(result.destinationBlobName);

        newJobFiles.push({
          jobId: newJob.id,
          fileName: result.fileName,
          fileKey: `/${result.destinationBlobName}`,
          category: result.category,
        });
      });

      if (newJobFiles.length > 0) {
        await this.prisma.jobFile.createMany({
          data: newJobFiles,
        });
      }

      return this.findOne(newJob.id);
    } catch (error) {
      await Promise.all(
        copiedBlobNames.map(async (blobName) => {
          try {
            await this.azureBlobStorage.deleteBlob(blobName);
          } catch {
            // Ignore cleanup failures
          }
        }),
      );

      try {
        await this.prisma.job.delete({ where: { id: newJob.id } });
      } catch {
        // Ignore cleanup failures
      }

      throw error;
    }
  }

  async generateExcel(jobId: string): Promise<Buffer> {
    const job = await this.findOne(jobId);
    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template Data');

    const templateJson = Array.isArray(job.templateJson) ? job.templateJson  as unknown[]: [];
    const groups = templateJson.filter(isTemplateGroup);

    if (templateJson.length === 0) {
      worksheet.addRow(['No data available']);
      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    }

    // Header
    const headers = ['分類', '訴状の必要な項目', '追加指示', '生成結果'];
    worksheet.addRow(headers);

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    let currentRow = 2;

    for (const group of groups) {
      if (!group) {
        continue;
      }
      const startRow = currentRow;

      for (const field of group.fields) {
        worksheet.addRow([
          group.groupName || '',
          field.name || '',
          field.note || '',
          field.extractedValue || '',
        ]);
        currentRow++;
      };

      const endRow = currentRow - 1;

      // Merge group name column (分類)
      if (endRow > startRow) {
        worksheet.mergeCells(startRow, 1, endRow, 1);
        worksheet.getCell(startRow, 1).alignment = {
          vertical: 'middle',
          horizontal: 'center',
        };
      }
    }

    // Set column width
    worksheet.columns = [
      { width: 20 }, // 分類
      { width: 30 }, // 訴状の必要な項目
      { width: 30 }, // 追加指示
      { width: 30 }, // 生成結果
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async deleteFiles(jobId: string, fileKeys: string[]): Promise<{ count: number }> {
    if (!fileKeys || fileKeys.length === 0) {
      return { count: 0 };
    }

    const deletedBlobNames = fileKeys
      .map((key) => key?.replace(/^\//, ''))
      .filter((key): key is string => key.length > 0);

    await Promise.all(
      deletedBlobNames.map((blobName) =>
        this.azureBlobStorage.deleteBlob(blobName),
      ),
    );

    return this.prisma.jobFile.deleteMany({
      where: {
        jobId,
        fileKey: {
          in: fileKeys,
        },
      },
    });
  }

  async generateDownloadUrl(blobName: string) {
    return this.azureBlobStorage.generateDownloadUrl(blobName);
  }
}
