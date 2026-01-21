ALTER TABLE public.jobs_files
ADD COLUMN IF NOT EXISTS assistant_file_id text;
