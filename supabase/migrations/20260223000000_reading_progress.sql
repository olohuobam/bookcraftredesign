-- Migration: Reading progress, bookmarks and notes per user per book
-- Issue #309: Lesezeichen & Notizen im Buchreader

CREATE TABLE IF NOT EXISTS public.book_reading_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL,
  last_chapter_index INTEGER NOT NULL DEFAULT 0,
  bookmarks JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, book_id)
);

-- Enable Row Level Security
ALTER TABLE public.book_reading_progress ENABLE ROW LEVEL SECURITY;

-- Users can only access their own reading progress
CREATE POLICY "Users can manage their own reading progress"
  ON public.book_reading_progress
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_book
  ON public.book_reading_progress(user_id, book_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_reading_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reading_progress_updated_at
  BEFORE UPDATE ON public.book_reading_progress
  FOR EACH ROW EXECUTE FUNCTION update_reading_progress_updated_at();
