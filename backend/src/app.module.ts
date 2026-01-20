import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TemplateModule } from './template/template.module';
import { JobModule } from './job/job.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CleanupModule } from './cleanup/cleanup.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (redisUrl) {
          return { connection: { url: redisUrl } };
        }

        const host = configService.get<string>('REDIS_HOST') || 'localhost';
        const parsedPort = Number(configService.get<string>('REDIS_PORT') ?? '6379');
        const port = Number.isFinite(parsedPort) ? parsedPort : 6379;
        const password = configService.get<string>('REDIS_PASSWORD');

        const connection: { host: string; port: number; password?: string } = {
          host,
          port,
        };
        if (password) {
          connection.password = password;
        }

        return { connection };
      },
    }),
    PrismaModule,
    AuthModule,
    TemplateModule,
    JobModule,
    ScheduleModule.forRoot(),
    CleanupModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
