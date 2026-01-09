import { Module } from '@nestjs/common';
import { AzureBlobStorageService } from './azure-blob.service';

@Module({
  providers: [AzureBlobStorageService],
  exports: [AzureBlobStorageService],
})
export class AzureBlobModule {}
