-- Add PDF URL fields to books table for Lulu integration
-- These fields will store the URLs of generated PDFs for printing

ALTER TABLE public.books 
ADD COLUMN cover_pdf_url TEXT,
ADD COLUMN interior_pdf_url TEXT,
ADD COLUMN pdf_generated_at TIMESTAMPTZ;

-- Add indexes for better performance when querying books with PDFs
CREATE INDEX idx_books_cover_pdf_url ON public.books(cover_pdf_url) WHERE cover_pdf_url IS NOT NULL;
CREATE INDEX idx_books_interior_pdf_url ON public.books(interior_pdf_url) WHERE interior_pdf_url IS NOT NULL;
CREATE INDEX idx_books_pdf_generated_at ON public.books(pdf_generated_at) WHERE pdf_generated_at IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN public.books.cover_pdf_url IS 'URL to the cover PDF file for printing (Lulu-compatible)';
COMMENT ON COLUMN public.books.interior_pdf_url IS 'URL to the interior PDF file for printing (Lulu-compatible)';
COMMENT ON COLUMN public.books.pdf_generated_at IS 'Timestamp when PDFs were last generated for this book';