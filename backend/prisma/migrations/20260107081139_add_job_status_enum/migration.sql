/*
  Warnings:

  - The `status` column on the `jobs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[user_name]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('saved', 'processing', 'completed');

-- AlterTable
ALTER TABLE "jobs" DROP COLUMN "status",
ADD COLUMN     "status" "JobStatus" NOT NULL DEFAULT 'saved';

-- CreateIndex
CREATE UNIQUE INDEX "users_user_name_key" ON "users"("user_name");
