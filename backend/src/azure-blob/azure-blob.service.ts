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

  async uploadImage(params: {
    blobName: string;
    buffer: Buffer;
    contentType: string;
  }) {
    const { blobName, buffer, contentType } = params;
    const containerClient =
      this.blobServiceClient.getContainerClient(this.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
    });

    return {
      url: blockBlobClient.url,
      fileKey: `/${blobName}`,
    };
  }

  async generateDownloadUrl(blobName: string) {
    const containerClient =
      this.blobServiceClient.getContainerClient(this.containerName);

    const blobClient = containerClient.getBlobClient(blobName);
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName,
        permissions: BlobSASPermissions.parse('r'),
        expiresOn: new Date(Date.now() + 10 * 60 * 1000),
      },
      this.credential,
    ).toString();

    return `${blobClient.url}?${sasToken}`;
  }

  async deleteBlob(blobName: string) {
    const containerClient =
      this.blobServiceClient.getContainerClient(this.containerName);

    const blobClient = containerClient.getBlobClient(blobName);
    await blobClient.deleteIfExists();
  }

  async copyBlob(sourceBlobName: string, destinationBlobName: string) {
    const containerClient =
      this.blobServiceClient.getContainerClient(this.containerName);

    const sourceBlobClient = containerClient.getBlobClient(sourceBlobName);
    const destinationBlobClient =
      containerClient.getBlockBlobClient(destinationBlobName);

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName: sourceBlobName,
        permissions: BlobSASPermissions.parse('r'),
        expiresOn: new Date(Date.now() + 5 * 60 * 1000),
      },
      this.credential,
    ).toString();

    const sourceUrl = `${sourceBlobClient.url}?${sasToken}`;

    const copyPoller = await destinationBlobClient.beginCopyFromURL(sourceUrl);
    await copyPoller.pollUntilDone();
  }
}
