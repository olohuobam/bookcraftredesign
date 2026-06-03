-- Migration to ensure all fields needed for Book Import and Templates are present
-- This migration is idempotent - it can be run multiple times safely

-- Ensure all required columns exist in books table
-- Most of these should already exist, but this ensures compatibility

-- Add missing columns if they don't exist
ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS cover_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS interior_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMPTZ;

-- Ensure users table exists (should already be migrated from profiles)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  email_verified TIMESTAMPTZ,
  image TEXT,
  bio TEXT,
  language TEXT DEFAULT 'en',
  theme TEXT DEFAULT 'light',
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT false,
  weekly_report BOOLEAN DEFAULT true,
  book_completion_alert BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on users table if not already enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create indexes for PDF fields if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_books_cover_pdf_url') THEN
    CREATE INDEX idx_books_cover_pdf_url ON public.books(cover_pdf_url) WHERE cover_pdf_url IS NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_books_interior_pdf_url') THEN
    CREATE INDEX idx_books_interior_pdf_url ON public.books(interior_pdf_url) WHERE interior_pdf_url IS NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_books_pdf_generated_at') THEN
    CREATE INDEX idx_books_pdf_generated_at ON public.books(pdf_generated_at) WHERE pdf_generated_at IS NOT NULL;
  END IF;
END $$;

-- Ensure RLS policies exist for users table
DO $$
BEGIN
  -- Drop and recreate policies to ensure they're correct
  DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
  CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

  DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
  CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

  DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
  CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Users table does not exist yet, skipping RLS policies';
END $$;

-- Add helpful comments for the new features
COMMENT ON COLUMN public.books.chapters_json IS 'Stores chapter structure as JSON - used by templates and import feature';
COMMENT ON COLUMN public.books.images IS 'Stores image data as JSON - used for picture books';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully - Book Import and Templates features are ready to use!';
END $$;
