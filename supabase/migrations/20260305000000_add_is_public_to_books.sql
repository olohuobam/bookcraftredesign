-- Migration: Add is_public field to books table
-- Enables the Discover page (Entdecken) feature

-- Add is_public column with default false
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Add index for efficient querying of public books
CREATE INDEX IF NOT EXISTS idx_books_is_public ON public.books(is_public)
  WHERE is_public = true;

-- Add view_count column for "Beliebteste" sort
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- RLS policy: allow anon (unauthenticated) users to read public books
CREATE POLICY "Public books are viewable by everyone"
  ON public.books
  FOR SELECT
  TO anon
  USING (is_public = true);

-- Also allow authenticated users to read all public books (not just their own)
-- (The existing "Users can view own books" policy already handles their own books)
-- We need an additional policy for authenticated users to view OTHER users' public books
CREATE POLICY "Authenticated users can view public books"
  ON public.books
  FOR SELECT
  TO authenticated
  USING (is_public = true);
