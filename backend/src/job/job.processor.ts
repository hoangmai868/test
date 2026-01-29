import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { JobService } from './job.service';

@Processor('job-queue')
@Injectable()
export class JobProcessor extends WorkerHost {
  constructor(private readonly jobService: JobService) {
    super();
  }

  async process(job: Job<{ jobId: string }>) {
    if (job.name === 'run-job') {
      await this.jobService.startJobRun(job.data.jobId);
    }
  }
}
