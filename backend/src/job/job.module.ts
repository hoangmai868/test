import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobController } from './job.controller';
import { JobService } from './job.service';
import { AzureBlobStorageService } from 'src/azure-blob/azure-blob.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JobProcessor } from './job.processor';
import { PdfPreviewService } from './pdf-preview.service';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'job-queue',
    }),
  ],
  controllers: [JobController],
  providers: [
    JobService,
    AzureBlobStorageService,
    JobProcessor,
    PdfPreviewService,
  ],
  exports: [JobService, PdfPreviewService],
})
export class JobModule {}
