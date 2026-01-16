import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class RunPromptDto {
  @IsString()
  @IsNotEmpty()
  fieldName: string;

  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  fileKeys: string[];
}

