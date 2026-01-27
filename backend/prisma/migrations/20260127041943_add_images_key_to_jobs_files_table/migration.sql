-- AlterTable
ALTER TABLE "jobs_files" ADD COLUMN     "images_key" TEXT[] DEFAULT ARRAY[]::TEXT[];
