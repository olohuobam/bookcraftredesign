-- Add a dedicated book_subtype column so photobooks no longer rely on the
-- fragile (book_type = 'picture' AND genre = 'Photo Album') heuristic.
ALTER TABLE books ADD COLUMN IF NOT EXISTS book_subtype TEXT;

-- Backfill existing photobooks using the previous detection heuristic.
UPDATE books
SET book_subtype = 'photobook'
WHERE book_subtype IS NULL
  AND book_type = 'picture'
  AND genre = 'Photo Album';

-- Supports the free-tier "one photobook per account" count query.
CREATE INDEX IF NOT EXISTS idx_books_user_subtype
  ON books(user_id, book_subtype)
  WHERE book_subtype IS NOT NULL;
