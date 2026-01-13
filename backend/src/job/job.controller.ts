import {
  Controller,
  Post,
  Put,
  Get,
  Delete,
  Query,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { AzureBlobStorageService } from 'src/azure-blob/azure-blob.service';
import { JobService } from './job.service';
import { CreateJobDto } from './dto/create-job.dto';
import { RunPromptDto } from './dto/run-prompt.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import type { Response } from 'express';

@Controller('jobs')
export class JobController {
  constructor(
    private readonly jobService: JobService,
    private readonly azureBlob: AzureBlobStorageService
  ) {}

  @Get('download-url')
  async getDownloadUrl(@Query('fileKey') fileKey: string) {
    if (!fileKey) {
      throw new BadRequestException('fileKey is required');
    }

    const blobKey = fileKey.replace(/^\//, '');
    if (!blobKey) {
      throw new BadRequestException('fileKey is invalid');
    }

    const downloadUrl = await this.jobService.generateDownloadUrl(
      blobKey,
    );
    return { downloadUrl };
  }
  
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createJobDto: CreateJobDto) {
    try {
      const job = await this.jobService.create(createJobDto);
      return {
        success: true,
        data: job,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to create job',
      };
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateJobDto: UpdateJobDto) {
    try {
      const job = await this.jobService.update(id, updateJobDto);
      return {
        success: true,
        data: job,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to update job',
      };
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const job = await this.jobService.findOne(id);
      return {
        success: true,
        data: job,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch job',
      };
    }
  }

  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string) {
    try {
      const jobs = await this.jobService.findByUserId(userId);
      return {
        success: true,
        data: jobs,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch jobs',
      };
    }
  }

  @Post(':jobId/presigned-url')
  createFilePresignedUrl(
    @Param('jobId') jobId: string,
    @Body()
    body: {
      fileName: string;
      contentType: string;
      category: 'customer_info' | 'contract_documents' | 'registry_transcript';
    },
  ) {
    const blobKey = `${jobId}/${body.category}/${body.fileName}`;

    return this.azureBlob.generatePresignedUrl({
      blobName: blobKey,
      contentType: body.contentType,
    });
  }

  @Delete(':jobId/files')
  async deleteJobFiles(
    @Param('jobId') jobId: string,
    @Body() body: { fileKeys: string[] },
  ) {
    const result = await this.jobService.deleteFiles(jobId, body.fileKeys || []);
    return {
      success: true,
      data: result,
    };
  }

  @Post(':id/copy')
  @HttpCode(HttpStatus.CREATED)
  async copyJob(@Param('id') id: string) {
    try {
      const job = await this.jobService.copyJob(id);
      return {
        success: true,
        data: job,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to copy job',
      };
    }
  }

  @Get(':id/download-excel')
  async downloadExcel(@Param('id') id: string, @Res() res: Response) {
    try {
      const excelBuffer = await this.jobService.generateExcel(id);
      const job = await this.jobService.findOne(id);
      const fileName = `${job.title || 'job'}_${id}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.send(excelBuffer);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to generate Excel file',
      });
    }
  }

  @Post(':jobId/run-prompt')
  async runPrompt(@Param('jobId') jobId: string, @Body() runPromptDto: RunPromptDto): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const result = await this.jobService.runPrompt(jobId, runPromptDto);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to run prompt',
      };
    }
  }

  @Post(':jobId/run')
  async runJob(@Param('jobId') jobId: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      await this.jobService.startJobRun(jobId);
      return {
        success: true,
        data: { message: 'ジョブをバックグラウンドで実行予約しました' },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to run job',
      };
    }
  }
}

