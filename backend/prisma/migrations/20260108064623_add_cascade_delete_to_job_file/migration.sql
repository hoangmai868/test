-- DropForeignKey
ALTER TABLE "jobs_files" DROP CONSTRAINT "jobs_files_job_id_fkey";

-- AddForeignKey
ALTER TABLE "jobs_files" ADD CONSTRAINT "jobs_files_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
