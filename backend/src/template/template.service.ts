import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}



