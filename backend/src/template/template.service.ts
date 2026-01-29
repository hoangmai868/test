import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export type TemplateField = {
  name: string;
  prompt: string;
};

export type TemplateGroup = {
  groupName: string;
  fields: TemplateField[];
};

@Injectable()
export class TemplateService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.template.findMany({
      where: {
        status: 'active',
      },
      select: {
        id: true,
        fileName: true,
        displayName: true,
        fileKey: true,
        schemaJson: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    return await this.prisma.template.findUnique({
      where: { id },
      select: {
        id: true,
        fileName: true,
        displayName: true,
        fileKey: true,
        schemaJson: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByFileName(fileName: string) {
    return await this.prisma.template.findFirst({
      where: {
        fileName,
        status: 'active',
      },
      select: {
        id: true,
        fileName: true,
        displayName: true,
        fileKey: true,
        schemaJson: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async parseSchemaFromExcel(buffer: ArrayBuffer) {
    if (!buffer?.byteLength) {
      throw new BadRequestException('Excel file is required');
    }

    const workbook = new ExcelJS.Workbook();
    const loadedWorkbook = await workbook.xlsx.load(buffer);
    const worksheet = loadedWorkbook.worksheets[0];

    if (!worksheet) {
      throw new BadRequestException(
        'Excel workbook does not contain any sheet',
      );
    }

    const schema: TemplateGroup[] = [];

    const headerRow = worksheet.getRow(2);
    const columnMap = {
      groupName: -1,
      name: -1,
      prompt: -1,
    };

    headerRow.eachCell((cell, colNumber) => {
      const headerValue = this.trimmedCellValue(cell);
      if (headerValue === '名称') {
        columnMap.groupName = colNumber;
      }
      if (headerValue === '項目') {
        columnMap.name = colNumber;
      }
      if (headerValue === 'プロンプト') {
        columnMap.prompt = colNumber;
      }
    });

    if (columnMap.name === -1) {
      throw new BadRequestException('Header "項目" not found');
    }
    if (columnMap.prompt === -1) {
      throw new BadRequestException('Header "プロンプト" not found');
    }

    let currentGroup: TemplateGroup | null = null;

    for (let rowIndex = 3; rowIndex <= worksheet.rowCount; rowIndex++) {
      const row = worksheet.getRow(rowIndex);
      const fieldName = this.trimmedCellValue(row.getCell(columnMap.name));
      if (!fieldName) {
        continue;
      }

      const groupNameCandidate =
        columnMap.groupName !== -1
          ? this.trimmedCellValue(row.getCell(columnMap.groupName))
          : '';

      if (groupNameCandidate) {
        currentGroup = {
          groupName: groupNameCandidate,
          fields: [],
        };
        schema.push(currentGroup);
      }

      if (!currentGroup) {
        continue;
      }

      const prompt = this.trimmedCellValue(row.getCell(columnMap.prompt));
      currentGroup.fields.push({
        name: fieldName,
        prompt,
      });
    }

    return schema;
  }

  async createTemplateFromSchema(
    templateName: string,
    schemaJson: TemplateGroup[],
  ) {
    const existing = await this.prisma.template.findFirst({
      where: {
        fileName: templateName,
        status: 'active',
      },
    });

    if (existing) {
      return this.prisma.template.update({
        where: { id: existing.id },
        data: {
          schemaJson,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          fileName: true,
          displayName: true,
          fileKey: true,
          schemaJson: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }
    return this.prisma.template.create({
      data: {
        fileName: templateName,
        displayName: templateName,
        fileKey: '',
        schemaJson,
        status: 'active',
      },
      select: {
        id: true,
        fileName: true,
        displayName: true,
        fileKey: true,
        schemaJson: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  private trimmedCellValue(cell: ExcelJS.Cell) {
    if (!cell) {
      return '';
    }

    if (typeof cell.text === 'string' && cell.text.trim()) {
      return cell.text.trim();
    }

    const value = cell.value;
    if (value == null) {
      return '';
    }

    if (typeof value === 'string') {
      return value.trim();
    }

    if (typeof value === 'number') {
      return value.toString();
    }

    if (typeof value === 'object') {
      if (
        'richText' in value &&
        Array.isArray(
          (value as { richText?: Array<{ text?: string }> }).richText,
        )
      ) {
        return (
          (value as { richText?: Array<{ text?: string }> }).richText ?? []
        )
          .map((piece) => piece.text ?? '')
          .join('')
          .trim();
      }

      if (
        'text' in value &&
        typeof (value as { text?: string }).text === 'string'
      ) {
        return ((value as { text?: string }).text ?? '').trim();
      }
    }

    return '';
  }
}
