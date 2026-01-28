import { Module } from '@nestjs/common';
import { CleanupService } from './cleanup.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [CleanupService, PrismaService],
})
export class CleanupModule {}
