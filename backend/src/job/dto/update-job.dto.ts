import { IsString, IsOptional, IsObject, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { JobFileDto } from './create-job.dto';

export class UpdateJobDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsObject()
  @IsOptional()
  templateJson?: any;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobFileDto)
  @IsOptional()
  files?: JobFileDto[];
}

