import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class JobFileDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsOptional()
  fileKey?: string;

  @IsString()
  @IsOptional()
  assistantFileId?: string;

  @IsString()
  @IsNotEmpty()
  category: 'customer_info' | 'contract_documents' | 'registry_transcript';
}

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  templateId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsObject()
  @IsNotEmpty()
  templateJson: any;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobFileDto)
  files: JobFileDto[];
}
