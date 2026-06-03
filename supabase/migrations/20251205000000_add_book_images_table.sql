-- Migration: Add book_images table for persistent picture book image storage
-- This allows recovery of generated images if the workflow fails mid-generation

CREATE TABLE IF NOT EXISTS book_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES book_generation_jobs(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  panel_index INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  image_prompt TEXT,
  page_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint to prevent duplicate images for same page/panel
  UNIQUE(job_id, page_number, panel_index)
);

-- Index for efficient queries by job_id
CREATE INDEX IF NOT EXISTS idx_book_images_job_id ON book_images(job_id);

-- Index for querying images by page
CREATE INDEX IF NOT EXISTS idx_book_images_job_page ON book_images(job_id, page_number);

-- Enable Row Level Security
ALTER TABLE book_images ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view images for their own jobs
CREATE POLICY "Users can view own book images" ON book_images
  FOR SELECT
  USING (
    job_id IN (
      SELECT id FROM book_generation_jobs
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Service role can do everything (for n8n workflow)
CREATE POLICY "Service role full access to book_images" ON book_images
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE book_images IS 'Stores generated images during picture book creation for recovery and debugging';
COMMENT ON COLUMN book_images.job_id IS 'Reference to the generation job';
COMMENT ON COLUMN book_images.page_number IS 'Page number in the book (1-indexed)';
COMMENT ON COLUMN book_images.panel_index IS 'Panel index on the page (0-indexed, for multi-panel layouts)';
COMMENT ON COLUMN book_images.image_url IS 'URL of the generated image';
COMMENT ON COLUMN book_images.image_prompt IS 'The prompt used to generate this image';
COMMENT ON COLUMN book_images.page_text IS 'The text/story content for this page';
