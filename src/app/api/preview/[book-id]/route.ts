import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Number of chapters/pages to expose in the public preview
const PUBLIC_PREVIEW_PAGES = 3

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ 'book-id': string }> }
) {
  try {
    const { 'book-id': bookId } = await params

    if (!bookId) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    // Fetch book using the service-role client (bypasses RLS for public reads)
    const { data: book, error } = await supabaseAdmin
      .from('books')
      .select(
        'id, title, description, genre, author, cover_image, chapters_json, content, status, book_type, target_audience, style, created_at'
      )
      .eq('id', bookId)
      .single()

    if (error || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Only expose books that are completed / have content
    if (book.status === 'draft' || book.status === 'generating') {
      return NextResponse.json({ error: 'Book not yet available' }, { status: 404 })
    }

    // Parse chapters
    let chapters: { title: string; content: string }[] = []

    if (book.chapters_json) {
      try {
        const raw =
          typeof book.chapters_json === 'string'
            ? JSON.parse(book.chapters_json)
            : book.chapters_json

        if (Array.isArray(raw)) {
          chapters = raw.map((ch: { title?: string; content?: unknown }) => {
            let content = ''
            if (typeof ch.content === 'string') {
              content = ch.content
            } else if (
              ch.content &&
              typeof ch.content === 'object' &&
              'content' in (ch.content as object)
            ) {
              content = (ch.content as { content: string }).content
            }
            return { title: ch.title || 'Chapter', content }
          })
        }
      } catch {
        // fall through
      }
    }

    // Fallback: parse from content field
    if (chapters.length === 0 && book.content) {
      const sections = book.content.split(/\n\n---\n\n/).filter(Boolean)
      if (sections.length > 1) {
        chapters = sections.map((section: string, i: number) => {
          const lines = section.split('\n')
          return { title: lines[0]?.trim() || `Chapter ${i + 1}`, content: lines.slice(1).join('\n').trim() }
        })
      } else {
        chapters = [{ title: book.title, content: book.content }]
      }
    }

    const previewChapters = chapters.slice(0, PUBLIC_PREVIEW_PAGES).map((ch) => ({
      title: ch.title,
      // Truncate long chapters so the preview stays punchy
      content:
        ch.content.length > 1200
          ? ch.content.substring(0, 1200).replace(/\s+\S*$/, '') + '…'
          : ch.content,
    }))

    return NextResponse.json(
      {
        book: {
          id: book.id,
          title: book.title,
          description: book.description,
          genre: book.genre,
          author: book.author ?? null,
          coverImage: book.cover_image ?? null,
          bookType: book.book_type ?? 'text',
          targetAudience: book.target_audience ?? null,
          style: book.style ?? null,
          createdAt: book.created_at,
          totalChapters: chapters.length,
        },
        previewChapters,
        totalChapters: chapters.length,
        previewCount: previewChapters.length,
      },
      {
        headers: {
          // Allow CDN caching for 10 minutes, shared cache for 5 min
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (err) {
    console.error('[preview API] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
