import { Controller, Get, Param, Query } from '@nestjs/common';
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
}



