ALTER TABLE public.jobs
ALTER COLUMN status DROP DEFAULT;

CREATE TYPE "JobStatus_new" AS ENUM (
  'draft',
  'processing',
  'completed'
);

ALTER TABLE public.jobs
ALTER COLUMN status TYPE "JobStatus_new"
USING (
  CASE
    WHEN status::text = 'saved' THEN 'draft'
    ELSE status::text
  END
)::"JobStatus_new";

DROP TYPE "JobStatus";

ALTER TYPE "JobStatus_new" RENAME TO "JobStatus";

ALTER TABLE public.jobs
ALTER COLUMN status SET DEFAULT 'draft';
