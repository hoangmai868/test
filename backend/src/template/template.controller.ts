import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import multer from 'multer';
import { TemplateService } from './template.service';

@Controller('templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get()
  async findAll() {
    const templates = await this.templateService.findAll();
    return {
      success: true,
      data: templates,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const template = await this.templateService.findOne(id);
    if (!template) {
      return {
        success: false,
        message: 'Template not found',
      };
    }
    return {
      success: true,
      data: template,
    };
  }

  @Get('by-name/:fileName')
  async findByFileName(@Param('fileName') fileName: string) {
    const template = await this.templateService.findByFileName(fileName);
    if (!template) {
      return {
        success: false,
        message: 'Template not found',
      };
    }
    return {
      success: true,
      data: template,
    };
  }

  @Post('schema/from-excel')
  @UseInterceptors(FileInterceptor('excel', { storage: multer.memoryStorage() }))
  async parseTemplateSchema(
    @UploadedFile() file: Express.Multer.File,
    @Body('templateName') templateName: string,
  ) {
    const name = templateName?.trim();
    if (!name) {
      throw new BadRequestException('templateName is required');
    }

    if (!file?.buffer?.length) {
      throw new BadRequestException('Excel file is required');
    }

    const arrayBuffer = new ArrayBuffer(file.buffer.byteLength);
    new Uint8Array(arrayBuffer).set(file.buffer);

    const schemaJson = await this.templateService.parseSchemaFromExcel(arrayBuffer);
    const template = await this.templateService.createTemplateFromSchema(name, schemaJson);
    return {
      success: true,
      data: template,
    };
  }

  @Put(':id/prompts')
  async updateTemplatePrompts(
    @Param('id') id: string,
    @Body('prompts') prompts: Record<string, string>,
  ) {
    if (!prompts || typeof prompts !== 'object') {
      throw new BadRequestException('prompts must be a valid object');
    }

    const template = await this.templateService.updateTemplatePrompts(id, prompts);
    if (!template) {
      throw new BadRequestException('Template not found');
    }
    return {
      success: true,
      data: template,
    };
  }
}



