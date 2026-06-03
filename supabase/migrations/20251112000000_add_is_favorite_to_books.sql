-- Add is_favorite field to books table for Quick Action Bar
-- This allows users to mark books as favorites

-- Add the is_favorite column to books table
ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- Create an index for better performance when filtering favorites
CREATE INDEX IF NOT EXISTS idx_books_is_favorite ON public.books(is_favorite) WHERE is_favorite = TRUE;

-- Add comment explaining the column
COMMENT ON COLUMN public.books.is_favorite IS 'Indicates if the book is marked as a favorite by the user';
