import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JobFile, JobFileCategory, Prisma } from '../../generated/prisma/client';
import { AzureBlobStorageService } from 'src/azure-blob/azure-blob.service';
import { isTemplateGroup } from 'src/common/types/interface';
import { RunPromptDto } from './dto/run-prompt.dto';
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
  assistantFileId: string;
}

interface OpenAiRequestOptions {
  timeout?: number;
  signal?: AbortSignal | null;
}

interface AssistantFileReference {
  fileId: string;
  fileName?: string;
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
  private readonly openAiApiKey: string | null;
  private readonly azureOpenAiConfig: AzureOpenAiConfig | null;
  private readonly jobFieldBatchSize: number;
  private readonly openAiRequestTimeoutMs: number;
  private readonly openAiRequestRetryDelayMs: number;
  private readonly openAiRequestMaxAttempts: number;

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

    this.openAiApiKey = process.env.OPENAI_API_KEY || null;
    const parsedBatchSize = Number(process.env.JOB_FIELD_BATCH_SIZE);
    this.jobFieldBatchSize =
      Number.isFinite(parsedBatchSize) && parsedBatchSize >= 1 ? parsedBatchSize : 5;
    const parsedTimeout = Number(process.env.OPENAI_REQUEST_TIMEOUT_MS);
    this.openAiRequestTimeoutMs =
      Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 180_000;
    const parsedRetryDelay = Number(process.env.OPENAI_REQUEST_RETRY_DELAY_MS);
    this.openAiRequestRetryDelayMs =
      Number.isFinite(parsedRetryDelay) && parsedRetryDelay >= 0 ? parsedRetryDelay : 10_000;
    const parsedMaxAttempts = Number(process.env.OPENAI_REQUEST_MAX_ATTEMPTS);
    this.openAiRequestMaxAttempts =
      Number.isFinite(parsedMaxAttempts) && parsedMaxAttempts >= 1
        ? Math.floor(parsedMaxAttempts)
        : 3;
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
            assistantFileId: file.assistantFileId ?? null,
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
              assistantFileId: file.assistantFileId ?? null,
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

    const promptText = (runPromptDto.prompt || '').trim();
    const note = (runPromptDto.note || '').trim();

    if (!promptText) {
      return {
        fieldName: runPromptDto.fieldName,
        prompt: '',
        note,
        files: [],
        result: '',
      };
    }

    const providedFileKeys =
      (runPromptDto.fileKeys || [])
        .map((key) => key.replace(/^\//, ''))
        .filter(Boolean);

    let documents: DocumentContent[] = [];
    if (providedFileKeys.length > 0) {
      documents = await this.prepareDocuments(providedFileKeys, job.files);
    }

    const systemPrompt =
      job.template?.systemPrompt ||
      'You are a helpful legal assistant that summarizes PDF content accurately.';

    const hasAiClient = Boolean(this.azureOpenAiConfig || this.openAiApiKey);

    let resultText = '';

    if (hasAiClient) {
      const instructionText = this.buildInstructionText(promptText, note);
      resultText = await this.callOpenAiWithRetry(
        systemPrompt,
        instructionText,
        documents,
      );
    } else {
      resultText = this.buildFallbackResponse(promptText, documents);
    }

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

    await this.processJobFields(jobId, templateGroups);
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
      const batchSize = Math.max(1, this.jobFieldBatchSize);
      for (const group of workingGroups) {
        for (let start = 0; start < group.fields.length; start += batchSize) {
          const batch = group.fields.slice(start, start + batchSize);
          const batchResults = await Promise.all(
            batch.map(async (field) => {
              const runResult = await this.runPrompt(jobId, {
                fieldName: field.name,
                prompt: field.prompt,
                note: field.note,
                fileKeys: field.fileKeys,
              });
              return { field, result: runResult.result };
            }),
          );
          batchResults.forEach(({ field, result }) => {
            field.extractedValue = result;
          });
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

  private buildCopiedTemplateJson(
    templateJson: unknown,
    fileKeyMap: Map<string, string>,
  ): TemplateJsonGroup[] {
    const groups = this.normalizeTemplateJson(templateJson);
    if (groups.length === 0) {
      return [];
    }

    return groups.map((group) => ({
      groupName: group.groupName,
      fields: group.fields.map((field) => ({
        ...field,
        fileKeys: this.remapFieldFileKeys(field.fileKeys, fileKeyMap),
        extractedValue: '',
      })),
    }));
  }

  private remapFieldFileKeys(
    fileKeys: string[] | undefined,
    fileKeyMap: Map<string, string>,
  ): string[] {
    if (!Array.isArray(fileKeys) || fileKeys.length === 0) {
      return [];
    }

    return fileKeys
      .map((key) => {
        if (!key) {
          return '';
        }

        const normalizedKey = key.replace(/^\//, '');
        const mappedKey = fileKeyMap.get(normalizedKey);
        return mappedKey ? `/${mappedKey}` : key;
      })
      .filter((mappedKey): mappedKey is string => mappedKey.trim().length > 0);
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

  private async prepareDocuments(
    fileKeys: string[],
    jobFiles: JobFile[],
  ): Promise<DocumentContent[]> {
    if (fileKeys.length === 0) {
      return [];
    }

    const normalizedKeys = Array.from(
      new Set(
        fileKeys
          .map((key) => key.replace(/^\//, ''))
          .filter((key): key is string => Boolean(key)),
      ),
    );

    const documents: DocumentContent[] = [];

    for (const key of normalizedKeys) {
      const jobFile = jobFiles.find(
        (file) => file.fileKey?.replace(/^\//, '') === key,
      );

      if (!jobFile) {
        throw new BadRequestException(`ファイル (${key}) が見つかりません`);
      }

      const fileName =
        jobFile.fileName || key.split('/').pop() || `blob-${key}`;
      const assistantFileId =
        jobFile.assistantFileId ??
        (await this.uploadAndUpdateAssistantFile(jobFile, key, fileName));

      documents.push({
        fileKey: key,
        fileName,
        assistantFileId,
      });
    }

    return documents;
  }

  private async uploadAndUpdateAssistantFile(
    jobFile: JobFile,
    blobName: string,
    fileName: string,
  ): Promise<string> {
    if (!blobName) {
      throw new BadRequestException('ファイルキーが存在しません');
    }

    const downloadUrl = await this.azureBlobStorage.generateDownloadUrl(blobName);
    const tempFilePath = await this.downloadBlobToTempFile(downloadUrl, fileName);
    console.log(`Downloaded blob ${blobName} to temp file ${tempFilePath}`);

    try {
      const assistantFileId = await this.uploadFileAndGetId(tempFilePath);
      await this.prisma.jobFile.update({
        where: { id: jobFile.id },
        data: { assistantFileId },
      });
      jobFile.assistantFileId = assistantFileId;
      return assistantFileId;
    } finally {
      await fs.promises.unlink(tempFilePath).catch(() => {});
    }
  }

  private async downloadBlobToTempFile(
    downloadUrl: string,
    fileName: string,
  ): Promise<string> {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new BadRequestException('ファイルのダウンロードに失敗しました');
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const extension = path.extname(fileName) || '.pdf';
    const tempFilePath = path.join(os.tmpdir(), `${randomUUID()}${extension}`);
    await fs.promises.writeFile(tempFilePath, buffer);
    return tempFilePath;
  }

  private async uploadFileAndGetId(
    filePath: string,
    {
      purpose = 'assistants',
      client,
    }: { purpose?: string; client?: OpenAI } = {},
  ): Promise<string> {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(absolutePath)) {
      throw new BadRequestException(`ファイルが見つかりません: ${absolutePath}`);
    }

    const openAiClient = client ?? this.getOpenAiClient();
    const file = await openAiClient.files.create({
      file: fs.createReadStream(absolutePath),
      purpose: purpose as any,
    });

    console.log(`Uploaded file ${absolutePath} to OpenAI with file ID ${file.id}`);

    if (!file?.id) {
      throw new BadRequestException('ファイルのアップロードに失敗しました');
    }

    return file.id;
  }

  private getOpenAiClient(): OpenAI {
    if (this.azureOpenAiConfig) {
      const { apiKey, endpoint, apiVersion } = this.azureOpenAiConfig;
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

    throw new BadRequestException('OpenAI APIキーが設定されていません');
  }

  private buildInstructionText(promptText: string, note: string): string {
    const parts: string[] = [];
    if (note) {
      parts.push(`追加指示:\n${note}`);
    }
    if (promptText) {
      parts.push(`プロンプト:\n${promptText}`);
    }
    return parts.join('\n\n').trim();
  }

  private async callOpenAi(
    systemPrompt: string,
    instructionText: string,
    documents: DocumentContent[],
    requestOptions?: OpenAiRequestOptions,
  ): Promise<string> {
    if (documents.length === 0) {
      return this.requestOpenAiWithText(systemPrompt, instructionText, requestOptions);
    }

    console.log(`Calling OpenAI with ${documents.length} documents`);

    const fileInputs: AssistantFileReference[] = documents.map((doc) => ({
      fileId: doc.assistantFileId,
      fileName: doc.fileName,
    }));

    return this.processByFileId(fileInputs, instructionText, { systemPrompt }, requestOptions);
  }

  private async callOpenAiWithRetry(
    systemPrompt: string,
    instructionText: string,
    documents: DocumentContent[],
  ): Promise<string> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.openAiRequestMaxAttempts; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.openAiRequestTimeoutMs);

      try {
        return await this.callOpenAi(systemPrompt, instructionText, documents, {
          timeout: this.openAiRequestTimeoutMs,
          signal: controller.signal,
        });
      } catch (error) {
        lastError = error;
        if (attempt >= this.openAiRequestMaxAttempts) {
          throw error;
        }
        console.warn(
          `OpenAI request failed (attempt ${attempt}/${this.openAiRequestMaxAttempts}); retrying in ${this.openAiRequestRetryDelayMs}ms`,
          error,
        );
        await this.delay(this.openAiRequestRetryDelayMs);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    throw lastError ?? new Error('OpenAI request failed');
  }

  private async requestOpenAiWithText(
    systemPrompt: string,
    instructionText: string,
    requestOptions?: OpenAiRequestOptions,
  ): Promise<string> {
    const client = this.getOpenAiClient();
    const model = this.azureOpenAiConfig ? this.azureOpenAiConfig.deployment : 'gpt-5';
    const payload: any[] = [];

    if (systemPrompt) {
      payload.push({
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: systemPrompt,
          },
        ],
      });
    }

    payload.push({
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: instructionText || 'プロンプトに入力された内容を処理してください。',
        },
      ],
    });

    console.log(`Requesting OpenAI with text prompt`, payload);

    const response = await client.responses.create(
      {
        model,
        input: payload,
        temperature: 0.2,
      },
      requestOptions,
    );

    return this.extractResponseText(response);
  }

  private async processByFileId(
    fileInputs: string | AssistantFileReference[],
    prompt: string,
    options: {
      model?: string;
      client?: OpenAI;
      systemPrompt?: string;
    } = {},
    requestOptions?: OpenAiRequestOptions,
  ): Promise<string> {
    const references = Array.isArray(fileInputs)
      ? fileInputs.filter((input): input is AssistantFileReference => Boolean(input?.fileId))
      : [{ fileId: fileInputs }];

    if (references.length === 0) {
      throw new BadRequestException('assistantFileId が必要です');
    }

    const client = options.client ?? this.getOpenAiClient();
    const model = options.model ?? (this.azureOpenAiConfig?.deployment ?? 'gpt-5');
    const payload: any[] = [];

    if (options.systemPrompt) {
      payload.push({
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: options.systemPrompt,
          },
        ],
      });
    }

    const userContent: Array<{
      type: string;
      file_id?: string;
      text?: string;
    }> = references.map((ref) => {
      const content: {
        type: string;
        file_id: string;
      } = {
        type: 'input_file',
        file_id: ref.fileId,
      };
      return content;
    });

    userContent.push({
      type: 'input_text',
      text: prompt,
    });

    payload.push({
      role: 'user',
      content: userContent,
    });

    const response = await client.responses.create(
      {
        model,
        input: payload,
        temperature: 0.2,
      },
      requestOptions,
    );

    if (typeof response?.output_text === 'string' && response.output_text.trim()) {
      return response.output_text.trim();
    }

    return this.extractResponseText(response);
  }

  private buildFallbackResponse(prompt: string, documents: DocumentContent[]): string {
    const fileList = documents.map((doc) => doc.fileName).join(', ');

    return [
      'OpenAI APIキーが設定されていないため、簡易レスポンスを生成しました。',
      `プロンプト: ${prompt}`,
      `選択ファイル: ${fileList || 'なし'}`,
    ].join('\n\n');
  }

  private extractResponseText(body: any): string {
    const outputs = Array.isArray(body?.output) ? body.output : [];
    const text = outputs
      .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
      .map((content) => {
        if (typeof content?.text === 'string') {
          return content.text;
        }
        if (typeof content?.value === 'string') {
          return content.value;
        }
        return '';
      })
      .filter((chunk) => chunk.trim().length > 0)
      .join('\n')
      .trim();

    // if (!text) {
    //   throw new BadRequestException('AIからの応答を取得できませんでした');
    // }

    return text;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
    const fileKeyMap = new Map<string, string>();
    interface JobCopyResult {
      fileName: string;
      destinationBlobName: string;
      category: JobFileCategory;
      assistantFileId: string | null;
      sourceFileKey: string | null;
    }

    const newJobFiles: {
      jobId: string;
      fileName: string;
      fileKey: string;
      category: JobFileCategory;
      assistantFileId: string | null;
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
            assistantFileId: file.assistantFileId ?? null,
            sourceFileKey: file.fileKey ?? null,
          };
        }),
      );

      const successfulCopies = copyResults.filter(
        (result): result is JobCopyResult => result !== null,
      );

      successfulCopies.forEach((result) => {
        copiedBlobNames.push(result.destinationBlobName);

        newJobFiles.push({
          jobId: newJob.id,
          fileName: result.fileName,
          fileKey: `/${result.destinationBlobName}`,
          assistantFileId: result.assistantFileId ?? null,
          category: result.category,
        });

        if (result.sourceFileKey) {
          const normalizedSource = result.sourceFileKey.replace(/^\//, '');
          if (normalizedSource) {
            fileKeyMap.set(normalizedSource, result.destinationBlobName);
          }
        }
      });

      if (newJobFiles.length > 0) {
        await this.prisma.jobFile.createMany({
          data: newJobFiles,
        });
      }

      const updatedTemplateGroups = this.buildCopiedTemplateJson(
        existingJob.templateJson,
        fileKeyMap,
      );
      if (updatedTemplateGroups.length > 0) {
        await this.prisma.job.update({
          where: { id: newJob.id },
        data: {
          templateJson:
            updatedTemplateGroups as unknown as Prisma.InputJsonValue,
        },
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
