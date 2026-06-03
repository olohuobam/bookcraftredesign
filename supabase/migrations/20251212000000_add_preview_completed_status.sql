-- Migration: Add preview_completed status for preview mode book generation
-- This enables the freemium model where only the first chapter is generated initially
-- This migration is idempotent and will create the table if it doesn't exist

-- 1. Create the book_generation_jobs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.book_generation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'retrying', 'preview_completed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_step TEXT,
  config JSONB NOT NULL,
  metadata JSONB,
  error_message TEXT,
  n8n_execution_id TEXT,
  last_heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 2. If table already exists, update the status constraint
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'book_generation_jobs_status_check'
  ) THEN
    ALTER TABLE public.book_generation_jobs DROP CONSTRAINT book_generation_jobs_status_check;
  END IF;

  -- Add updated constraint with preview_completed
  ALTER TABLE public.book_generation_jobs
  ADD CONSTRAINT book_generation_jobs_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'retrying', 'preview_completed'));
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Constraint already exists with correct values
END $$;

-- 3. Add columns if they don't exist (for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'book_generation_jobs' AND column_name = 'last_heartbeat_at') THEN
    ALTER TABLE public.book_generation_jobs ADD COLUMN last_heartbeat_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'book_generation_jobs' AND column_name = 'retry_count') THEN
    ALTER TABLE public.book_generation_jobs ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'book_generation_jobs' AND column_name = 'metadata') THEN
    ALTER TABLE public.book_generation_jobs ADD COLUMN metadata JSONB;
  END IF;
END $$;

-- 4. Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_book_generation_jobs_user_id ON public.book_generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_book_generation_jobs_book_id ON public.book_generation_jobs(book_id);
CREATE INDEX IF NOT EXISTS idx_book_generation_jobs_status ON public.book_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_book_generation_jobs_created_at ON public.book_generation_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_book_generation_jobs_user_status_created ON public.book_generation_jobs(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_book_generation_jobs_heartbeat ON public.book_generation_jobs(last_heartbeat_at) WHERE status IN ('pending', 'processing', 'retrying');

-- 5. Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_book_generation_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  -- Set completed_at when status changes to completed, failed, cancelled, or preview_completed
  IF NEW.status IN ('completed', 'failed', 'cancelled', 'preview_completed') AND OLD.status NOT IN ('completed', 'failed', 'cancelled', 'preview_completed') THEN
    NEW.completed_at = NOW();
  END IF;

  -- Initialize last_heartbeat_at if not set
  IF NEW.last_heartbeat_at IS NULL THEN
    NEW.last_heartbeat_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_book_generation_jobs_updated_at') THEN
    CREATE TRIGGER trigger_update_book_generation_jobs_updated_at
      BEFORE UPDATE ON public.book_generation_jobs
      FOR EACH ROW
      EXECUTE FUNCTION update_book_generation_jobs_updated_at();
  END IF;
END $$;

-- 7. Enable RLS if not already enabled
ALTER TABLE public.book_generation_jobs ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own generation jobs') THEN
    CREATE POLICY "Users can view their own generation jobs"
      ON public.book_generation_jobs
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create their own generation jobs') THEN
    CREATE POLICY "Users can create their own generation jobs"
      ON public.book_generation_jobs
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role can update any generation job') THEN
    CREATE POLICY "Service role can update any generation job"
      ON public.book_generation_jobs
      FOR UPDATE
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own generation jobs') THEN
    CREATE POLICY "Users can delete their own generation jobs"
      ON public.book_generation_jobs
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 9. Add 'preview' to book_status ENUM type (if it uses ENUM)
-- First check if it's an ENUM type and add the value if not exists
DO $$
BEGIN
  -- Check if book_status enum type exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'book_status') THEN
    -- Add 'preview' to the enum if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = 'book_status'::regtype
      AND enumlabel = 'preview'
    ) THEN
      ALTER TYPE book_status ADD VALUE 'preview';
    END IF;
  ELSE
    -- If it's not an ENUM, try to update CHECK constraint
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'books_status_check'
      AND conrelid = 'public.books'::regclass
    ) THEN
      ALTER TABLE public.books DROP CONSTRAINT books_status_check;
      ALTER TABLE public.books
      ADD CONSTRAINT books_status_check
      CHECK (status IN ('draft', 'generating', 'completed', 'error', 'preview'));
    END IF;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- 'preview' already exists in enum
  WHEN undefined_table THEN
    NULL; -- books table doesn't exist yet
END $$;

-- 10. Function to find stale jobs
CREATE OR REPLACE FUNCTION get_stale_book_generation_jobs(
  stale_threshold_seconds INTEGER DEFAULT 300,
  hard_timeout_seconds INTEGER DEFAULT 2700
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  book_id UUID,
  status TEXT,
  seconds_since_heartbeat INTEGER,
  seconds_since_created INTEGER,
  is_stale BOOLEAN,
  is_timed_out BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id,
    j.user_id,
    j.book_id,
    j.status,
    EXTRACT(EPOCH FROM (NOW() - COALESCE(j.last_heartbeat_at, j.created_at)))::INTEGER AS seconds_since_heartbeat,
    EXTRACT(EPOCH FROM (NOW() - j.created_at))::INTEGER AS seconds_since_created,
    EXTRACT(EPOCH FROM (NOW() - COALESCE(j.last_heartbeat_at, j.created_at))) > stale_threshold_seconds AS is_stale,
    EXTRACT(EPOCH FROM (NOW() - j.created_at)) > hard_timeout_seconds AS is_timed_out
  FROM public.book_generation_jobs j
  WHERE j.status IN ('pending', 'processing', 'retrying');
END;
$$ LANGUAGE plpgsql;

-- 11. Comments for documentation
COMMENT ON TABLE public.book_generation_jobs IS 'Tracks async book generation jobs processed by n8n workflow';
COMMENT ON COLUMN public.book_generation_jobs.id IS 'Unique job identifier';
COMMENT ON COLUMN public.book_generation_jobs.user_id IS 'User who requested the book generation';
COMMENT ON COLUMN public.book_generation_jobs.book_id IS 'Generated book ID (set after book creation)';
COMMENT ON COLUMN public.book_generation_jobs.status IS 'Current job status: pending, processing, completed, failed, cancelled, retrying, preview_completed';
COMMENT ON COLUMN public.book_generation_jobs.progress IS 'Progress percentage (0-100)';
COMMENT ON COLUMN public.book_generation_jobs.current_step IS 'Human-readable current step description';
COMMENT ON COLUMN public.book_generation_jobs.config IS 'Book configuration JSON (title, genre, chapters, etc.)';
COMMENT ON COLUMN public.book_generation_jobs.metadata IS 'Additional metadata like outline for continuation';
COMMENT ON COLUMN public.book_generation_jobs.error_message IS 'Error message if job failed';
COMMENT ON COLUMN public.book_generation_jobs.n8n_execution_id IS 'n8n workflow execution ID for debugging';
COMMENT ON COLUMN public.book_generation_jobs.last_heartbeat_at IS 'Timestamp of last activity (updated by n8n workflow heartbeat nodes)';
COMMENT ON COLUMN public.book_generation_jobs.retry_count IS 'Number of retry attempts for failed/stale jobs';
COMMENT ON FUNCTION get_stale_book_generation_jobs IS 'Returns active jobs with stale/timeout status for cleanup';
