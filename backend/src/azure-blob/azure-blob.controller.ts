// upload/upload.controller.ts
import { Body, Controller, Post, Inject } from '@nestjs/common';
import { CreatePresignedUrlDto } from './dto/create-presigned-url.dto';
import { AzureBlobStorageService } from './azure-blob.service';

@Controller('azure-blob')
export class AzureBlobController {
  constructor(
    private readonly azureBlobStorage: AzureBlobStorageService,
  ) {}

  @Post('presigned-url')
  generatePresignedUrl(@Body() dto: CreatePresignedUrlDto) {
    const blobKey = `${dto.jobId}/${dto.category}/${dto.fileName}`;

    return this.azureBlobStorage.generatePresignedUrl({
      blobName: blobKey,
      contentType: dto.contentType,
    });
  }
}
