-- =============================================
-- Bookmarks Table for FlipBook Reading Progress
-- =============================================
-- Allows users to save reading positions and bookmarks in their books

-- Create bookmarks table
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,

    -- Position in the book
    chapter_number INTEGER NOT NULL,
    page_number INTEGER, -- Optional: specific page within chapter
    scroll_position FLOAT, -- Optional: scroll percentage (0-100) within page

    -- Bookmark metadata
    title VARCHAR(255), -- User-defined bookmark name (e.g., "Favorite scene")
    note TEXT, -- Optional user note about this bookmark
    color VARCHAR(20) DEFAULT 'amber', -- Bookmark color: amber, red, blue, green, purple

    -- Type of bookmark
    bookmark_type VARCHAR(20) DEFAULT 'bookmark' CHECK (bookmark_type IN ('bookmark', 'reading_position', 'highlight')),
    -- 'bookmark' = user-created bookmark
    -- 'reading_position' = auto-saved last reading position
    -- 'highlight' = highlighted text passage

    -- For highlights: store the selected text
    highlighted_text TEXT,
    text_start_offset INTEGER, -- Character offset where highlight starts
    text_end_offset INTEGER, -- Character offset where highlight ends

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_book_id ON public.bookmarks(book_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_book ON public.bookmarks(user_id, book_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_type ON public.bookmarks(bookmark_type);

-- Unique constraint: only one reading_position per user per book
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_reading_position
    ON public.bookmarks(user_id, book_id)
    WHERE bookmark_type = 'reading_position';

-- Enable Row Level Security
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own bookmarks
CREATE POLICY "Users can view own bookmarks"
    ON public.bookmarks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookmarks"
    ON public.bookmarks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookmarks"
    ON public.bookmarks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
    ON public.bookmarks FOR DELETE
    USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bookmark_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_bookmark_timestamp ON public.bookmarks;
CREATE TRIGGER trigger_update_bookmark_timestamp
    BEFORE UPDATE ON public.bookmarks
    FOR EACH ROW
    EXECUTE FUNCTION update_bookmark_updated_at();

-- Function to upsert reading position (insert or update)
CREATE OR REPLACE FUNCTION upsert_reading_position(
    p_user_id UUID,
    p_book_id UUID,
    p_chapter_number INTEGER,
    p_page_number INTEGER DEFAULT NULL,
    p_scroll_position FLOAT DEFAULT NULL
)
RETURNS public.bookmarks AS $$
DECLARE
    result public.bookmarks;
BEGIN
    INSERT INTO public.bookmarks (
        user_id,
        book_id,
        chapter_number,
        page_number,
        scroll_position,
        bookmark_type,
        title
    )
    VALUES (
        p_user_id,
        p_book_id,
        p_chapter_number,
        p_page_number,
        p_scroll_position,
        'reading_position',
        'Letzte Leseposition'
    )
    ON CONFLICT (user_id, book_id) WHERE bookmark_type = 'reading_position'
    DO UPDATE SET
        chapter_number = EXCLUDED.chapter_number,
        page_number = EXCLUDED.page_number,
        scroll_position = EXCLUDED.scroll_position,
        updated_at = NOW()
    RETURNING * INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION upsert_reading_position TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.bookmarks IS 'Stores user bookmarks, reading positions, and highlights for books';
COMMENT ON COLUMN public.bookmarks.bookmark_type IS 'Type: bookmark (manual), reading_position (auto-saved), highlight (text selection)';
COMMENT ON COLUMN public.bookmarks.color IS 'Visual color for the bookmark: amber, red, blue, green, purple';
COMMENT ON COLUMN public.bookmarks.scroll_position IS 'Percentage (0-100) of scroll position within the page';
