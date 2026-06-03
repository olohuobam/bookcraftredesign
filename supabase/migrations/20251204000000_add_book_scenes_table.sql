-- Migration: Add book_scenes table for n8n workflow scene storage
-- This table stores individual scenes during book generation to avoid
-- unreliable global storage in n8n Code nodes

-- Create the book_scenes table
CREATE TABLE IF NOT EXISTS book_scenes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES book_generation_jobs(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  event_id INTEGER NOT NULL,
  title TEXT,
  content TEXT,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure unique scene per chapter per job
  UNIQUE(job_id, chapter_number, event_id)
);

-- Index for fast lookups by job and chapter
CREATE INDEX IF NOT EXISTS idx_book_scenes_job_chapter
  ON book_scenes(job_id, chapter_number);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_book_scenes_job_id
  ON book_scenes(job_id);

-- RLS Policies
ALTER TABLE book_scenes ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for n8n webhook)
CREATE POLICY "Service role full access on book_scenes"
  ON book_scenes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can read their own scenes (via job ownership)
CREATE POLICY "Users can read own scenes"
  ON book_scenes
  FOR SELECT
  TO authenticated
  USING (
    job_id IN (
      SELECT id FROM book_generation_jobs
      WHERE user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON book_scenes TO service_role;
GRANT SELECT ON book_scenes TO authenticated;

COMMENT ON TABLE book_scenes IS 'Temporary storage for book scenes during n8n generation workflow';
COMMENT ON COLUMN book_scenes.job_id IS 'References the book generation job';
COMMENT ON COLUMN book_scenes.chapter_number IS 'Chapter number (1-indexed)';
COMMENT ON COLUMN book_scenes.event_id IS 'Key event ID within the chapter';
COMMENT ON COLUMN book_scenes.content IS 'Generated scene text content';
