import { Module } from '@nestjs/common';
import { JobController } from './job.controller';
import { JobService } from './job.service';
import { AzureBlobStorageService } from 'src/azure-blob/azure-blob.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [JobController],
  providers: [JobService, AzureBlobStorageService],
  exports: [JobService],
})
export class JobModule {}

