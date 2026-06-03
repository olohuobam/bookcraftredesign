-- Media Library table for storing reusable photo uploads
-- This allows users to upload photos once and reuse them across multiple photobooks

CREATE TABLE IF NOT EXISTS media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File information
  original_filename TEXT NOT NULL,
  url TEXT NOT NULL,
  storage_path TEXT,
  storage_type TEXT NOT NULL DEFAULT 'supabase' CHECK (storage_type IN ('supabase', 'base64', 'local')),
  thumbnail_url TEXT,

  -- File metadata
  file_size INTEGER,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,

  -- AI Analysis
  analysis JSONB,
  analysis_status TEXT NOT NULL DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'analyzing', 'completed', 'failed')),
  analyzed_with TEXT,

  -- Organization
  tags TEXT[],
  folder TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_media_library_user_id ON media_library(user_id);
CREATE INDEX IF NOT EXISTS idx_media_library_folder ON media_library(user_id, folder) WHERE folder IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_library_created_at ON media_library(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_library_analysis_status ON media_library(user_id, analysis_status);

-- Enable Row Level Security
ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own media items
CREATE POLICY "Users can view their own media library items"
  ON media_library
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own media library items"
  ON media_library
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media library items"
  ON media_library
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media library items"
  ON media_library
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_media_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER update_media_library_updated_at_trigger
  BEFORE UPDATE ON media_library
  FOR EACH ROW
  EXECUTE FUNCTION update_media_library_updated_at();

-- Add comment for documentation
COMMENT ON TABLE media_library IS 'Stores user-uploaded photos with AI analysis for reuse across photobooks';
COMMENT ON COLUMN media_library.analysis IS 'AI-generated analysis including estimated era, description, categories, etc.';
COMMENT ON COLUMN media_library.analyzed_with IS 'The AI model used for analysis (e.g., gemini-1.5-flash, gpt-4o)';
