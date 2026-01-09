import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JobFileCategory } from '@prisma/client';


@Injectable()
export class JobService {
  constructor(private prisma: PrismaService) {}

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
}

