-- Create book_generation_jobs table for tracking async book generation via n8n
-- This enables background processing with no timeout limits

CREATE TABLE IF NOT EXISTS public.book_generation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_step TEXT,
  config JSONB NOT NULL,
  error_message TEXT,
  n8n_execution_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_book_generation_jobs_user_id ON public.book_generation_jobs(user_id);
CREATE INDEX idx_book_generation_jobs_book_id ON public.book_generation_jobs(book_id);
CREATE INDEX idx_book_generation_jobs_status ON public.book_generation_jobs(status);
CREATE INDEX idx_book_generation_jobs_created_at ON public.book_generation_jobs(created_at DESC);

-- Composite index for user's recent jobs
CREATE INDEX idx_book_generation_jobs_user_status_created ON public.book_generation_jobs(user_id, status, created_at DESC);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_book_generation_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  -- Set completed_at when status changes to completed or failed
  IF NEW.status IN ('completed', 'failed', 'cancelled') AND OLD.status NOT IN ('completed', 'failed', 'cancelled') THEN
    NEW.completed_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating timestamps
CREATE TRIGGER trigger_update_book_generation_jobs_updated_at
  BEFORE UPDATE ON public.book_generation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_book_generation_jobs_updated_at();

-- Enable Row Level Security
ALTER TABLE public.book_generation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own jobs
CREATE POLICY "Users can view their own generation jobs"
  ON public.book_generation_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own jobs
CREATE POLICY "Users can create their own generation jobs"
  ON public.book_generation_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can update any job (for n8n webhook)
CREATE POLICY "Service role can update any generation job"
  ON public.book_generation_jobs
  FOR UPDATE
  USING (true);

-- Users can delete their own jobs
CREATE POLICY "Users can delete their own generation jobs"
  ON public.book_generation_jobs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE public.book_generation_jobs IS 'Tracks async book generation jobs processed by n8n workflow';
COMMENT ON COLUMN public.book_generation_jobs.id IS 'Unique job identifier';
COMMENT ON COLUMN public.book_generation_jobs.user_id IS 'User who requested the book generation';
COMMENT ON COLUMN public.book_generation_jobs.book_id IS 'Generated book ID (set after book creation)';
COMMENT ON COLUMN public.book_generation_jobs.status IS 'Current job status: pending, processing, completed, failed, cancelled';
COMMENT ON COLUMN public.book_generation_jobs.progress IS 'Progress percentage (0-100)';
COMMENT ON COLUMN public.book_generation_jobs.current_step IS 'Human-readable current step description';
COMMENT ON COLUMN public.book_generation_jobs.config IS 'Book configuration JSON (title, genre, chapters, etc.)';
COMMENT ON COLUMN public.book_generation_jobs.error_message IS 'Error message if job failed';
COMMENT ON COLUMN public.book_generation_jobs.n8n_execution_id IS 'n8n workflow execution ID for debugging';
