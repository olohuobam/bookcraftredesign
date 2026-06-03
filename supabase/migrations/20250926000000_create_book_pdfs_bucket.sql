-- Create storage bucket for book PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-pdfs', 'book-pdfs', true);

-- Set up RLS policies for book-pdfs bucket
CREATE POLICY "Users can upload their own PDFs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'book-pdfs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own PDFs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'book-pdfs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own PDFs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'book-pdfs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own PDFs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'book-pdfs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);