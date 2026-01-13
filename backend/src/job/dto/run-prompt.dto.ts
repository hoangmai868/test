import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class RunPromptDto {
  @IsString()
  @IsNotEmpty()
  fieldName: string;

  @IsString()
  @IsOptional()
  prompt?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fileKeys?: string[];
}

