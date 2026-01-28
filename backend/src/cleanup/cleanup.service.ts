import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
@Injectable()
export class CleanupService {
  constructor(private prisma: PrismaService) {}

  @Cron('0 3 1 * *', {
    timeZone: 'Asia/Tokyo',
  })
  async cleanup() {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const result = await this.prisma.job.deleteMany({
      where: {
        createdAt: {
          lt: oneMonthAgo,
        },
      },
    });
    console.log(`Cleanup complete. Deleted ${result.count} old jobs.`);
  }
}
