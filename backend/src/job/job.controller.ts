import { Controller, Post, Put, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { JobService } from './job.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { AzureBlobStorageService } from 'src/azure-blob/azure-blob.service';
import { JobFileCategory } from '@prisma/client';

@Controller('jobs')
export class JobController {
  constructor(
    private readonly jobService: JobService,
    private readonly azureBlob: AzureBlobStorageService
  ) {}

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

  @Post(':jobId/files')
  attachFiles(
    @Param('jobId') jobId: string,
    @Body()
    files: {
      fileName: string;
      fileKey: string;
      category: JobFileCategory;
    }[],
  ) {
    return this.jobService.attachFiles(jobId, files);
  }
}

