-- Add metadata column to book_generation_jobs for storing outline and other workflow data
-- Add active_job_id to books for tracking current generation job

-- Add metadata to book_generation_jobs
ALTER TABLE public.book_generation_jobs
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add active_job_id to books
ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS active_job_id UUID REFERENCES public.book_generation_jobs(id) ON DELETE SET NULL;

-- Create index for better performance when querying active jobs
CREATE INDEX IF NOT EXISTS idx_books_active_job_id ON public.books(active_job_id);

-- Comments for documentation
COMMENT ON COLUMN public.book_generation_jobs.metadata IS 'Additional workflow data (outline, validation, etc.)';
COMMENT ON COLUMN public.books.active_job_id IS 'Currently running generation job (null if none)';
