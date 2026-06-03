-- Migration: Add heartbeat and retry support to book_generation_jobs
-- This enables stale job detection and automatic retries

-- 1. Add last_heartbeat_at column for tracking workflow activity
ALTER TABLE public.book_generation_jobs
ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Add retry_count column for tracking retry attempts
ALTER TABLE public.book_generation_jobs
ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;

-- 3. Update the status constraint to include 'retrying' status
-- First drop the existing constraint, then recreate with the new value
ALTER TABLE public.book_generation_jobs
DROP CONSTRAINT IF EXISTS book_generation_jobs_status_check;

ALTER TABLE public.book_generation_jobs
ADD CONSTRAINT book_generation_jobs_status_check
CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'retrying'));

-- 4. Create index for efficient stale job detection
CREATE INDEX IF NOT EXISTS idx_book_generation_jobs_heartbeat
ON public.book_generation_jobs(last_heartbeat_at)
WHERE status IN ('pending', 'processing', 'retrying');

-- 5. Update trigger to also set last_heartbeat_at on status change
CREATE OR REPLACE FUNCTION update_book_generation_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  -- Set completed_at when status changes to completed or failed
  IF NEW.status IN ('completed', 'failed', 'cancelled') AND OLD.status NOT IN ('completed', 'failed', 'cancelled') THEN
    NEW.completed_at = NOW();
  END IF;

  -- Initialize last_heartbeat_at if not set
  IF NEW.last_heartbeat_at IS NULL THEN
    NEW.last_heartbeat_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Comments for documentation
COMMENT ON COLUMN public.book_generation_jobs.last_heartbeat_at IS 'Timestamp of last activity (updated by n8n workflow heartbeat nodes)';
COMMENT ON COLUMN public.book_generation_jobs.retry_count IS 'Number of retry attempts for failed/stale jobs';

-- 7. Optional: Function to find stale jobs (for cron job)
CREATE OR REPLACE FUNCTION get_stale_book_generation_jobs(
  stale_threshold_seconds INTEGER DEFAULT 300,  -- 5 minutes
  hard_timeout_seconds INTEGER DEFAULT 2700     -- 45 minutes
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

COMMENT ON FUNCTION get_stale_book_generation_jobs IS 'Returns active jobs with stale/timeout status for cleanup';
