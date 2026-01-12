import { IsEnum, IsString } from 'class-validator';

export enum FileCategory {
  CUSTOMER_INFO = 'customer_info',
  CONTRACT_DOCUMENTS = 'contract_documents',
  REGISTRY_TRANSCRIPT = 'registry_transcript',
}

export class CreatePresignedUrlDto {
  @IsString()
  fileName: string;

  @IsString()
  contentType: string;

  @IsString()
  jobId: string;

  @IsEnum(FileCategory)
  category: FileCategory;
}
