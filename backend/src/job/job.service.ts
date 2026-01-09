import { Injectable, NotFoundException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JobFileCategory } from '@prisma/client';
import { AzureBlobStorageService } from 'src/azure-blob/azure-blob.service';
import { isTemplateGroup } from 'src/common/types/interface';

@Injectable()
export class JobService {
  constructor(
    private prisma: PrismaService,
    private readonly azureBlobStorage: AzureBlobStorageService,
  ) {}

  async create(createJobDto: CreateJobDto) {
    const { files, ...jobData } = createJobDto;

    // Create job with files in a transaction
    const job = await this.prisma.$transaction(async (tx) => {
      const newJob = await tx.job.create({
        data: {
          ...jobData,
          status: 'saved',
        },
        include: {
          files: true,
          template: {
            select: {
              id: true,
              displayName: true,
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
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async copyJob(jobId: string) {
    const existingJob = await this.findOne(jobId);

    if (!existingJob) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    // Create new job with same data but status 'saved'
    const createJobDto: CreateJobDto = {
      userId: existingJob.userId,
      templateId: existingJob.templateId,
      title: `${existingJob.title} (コピー)`,
      templateJson: existingJob.templateJson,
      files: existingJob.files.map((file) => ({
        fileName: file.fileName || '',
        fileKey: file.fileKey || undefined,
        category: file.category,
      })),
    };

    return await this.create(createJobDto);
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
    const headers = ['分類', '訴状の必要な項目', '追加指示', '生成完了'];
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
      { width: 30 }, // 生成完了
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async attachFiles(
    jobId: string,
    files: {
      fileName: string;
      fileKey: string;
      category: JobFileCategory;
    }[],
  ) {
    return this.prisma.jobFile.createMany({
      data: files.map(f => ({
        jobId,
        fileName: f.fileName,
        fileKey: f.fileKey,
        category: f.category,
      })),
    });
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
