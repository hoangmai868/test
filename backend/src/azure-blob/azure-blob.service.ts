import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AzureBlobStorageService {
  private accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
  private accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;
  private containerName = process.env.AZURE_STORAGE_CONTAINER_NAME!;

  private credential = new StorageSharedKeyCredential(
    this.accountName,
    this.accountKey,
  );

  private blobServiceClient = new BlobServiceClient(
    `https://${this.accountName}.blob.core.windows.net`,
    this.credential,
  );

  async generatePresignedUrl(params: {
    blobName: string;
    contentType: string;
  }) {
    const { blobName, contentType } = params;

    const containerClient =
      this.blobServiceClient.getContainerClient(this.containerName);

    const blobClient = containerClient.getBlockBlobClient(blobName);

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName,
        permissions: BlobSASPermissions.parse('rcw'),
        expiresOn: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        contentType,
      },
      this.credential,
    ).toString();

    const fileKey = `/${blobName}`;

    return {
      uploadUrl: `${blobClient.url}?${sasToken}`,
      fileKey,
    };
  }
}
