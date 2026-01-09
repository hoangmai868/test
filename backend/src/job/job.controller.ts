import { Controller, Post, Put, Get, Body, Param, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { JobService } from './job.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import type { Response } from 'express';

@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

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
}

