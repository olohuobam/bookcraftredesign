import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'

// Verify caller has access to this book (owner). Returns true if allowed.
async function userOwnsBook(bookId: string, userId: string): Promise<boolean> {
  try {
    const book = await SupabaseDB.getBookById(bookId, userId)
    return !!book
  } catch {
    return false
  }
}

// Only create client if env vars are set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let supabaseAdmin: SupabaseClient | null = null
if (supabaseUrl && supabaseKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseKey)
}

// Helper to extract and verify token
async function verifyAuth(request: NextRequest) {
  const authorization = request.headers.get('authorization')
  const token = authorization?.replace('Bearer ', '')

  if (!token) {
    return null
  }

  try {
    const userData = await verifySupabaseToken(token)
    if (!userData || !userData.userId) {
      return null
    }
    return userData
  } catch {
    return null
  }
}

export interface Bookmark {
  id: string
  user_id: string
  book_id: string
  chapter_number: number
  page_number: number | null
  scroll_position: number | null
  title: string | null
  note: string | null
  color: string
  bookmark_type: 'bookmark' | 'reading_position' | 'highlight'
  highlighted_text: string | null
  text_start_offset: number | null
  text_end_offset: number | null
  created_at: string
  updated_at: string
}

// GET /api/books/[id]/bookmarks - Get all bookmarks for a book
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const { id: bookId } = await params
    const userData = await verifyAuth(request)

    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query params for filtering
    const { searchParams } = new URL(request.url)
    const bookmarkType = searchParams.get('type') // 'bookmark', 'reading_position', 'highlight', or null for all

    let query = supabaseAdmin
      .from('bookmarks')
      .select('*')
      .eq('user_id', userData.userId)
      .eq('book_id', bookId)
      .order('chapter_number', { ascending: true })
      .order('created_at', { ascending: false })

    if (bookmarkType) {
      query = query.eq('bookmark_type', bookmarkType)
    }

    const { data: bookmarks, error } = await query

    if (error) {
      console.error('Error fetching bookmarks:', error)
      return NextResponse.json({ error: 'Failed to fetch bookmarks' }, { status: 500 })
    }

    return NextResponse.json({ bookmarks })
  } catch (error) {
    console.error('Error in GET /api/books/[id]/bookmarks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/books/[id]/bookmarks - Create a new bookmark
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const { id: bookId } = await params
    const userData = await verifyAuth(request)

    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      chapter_number,
      page_number,
      scroll_position,
      title,
      note,
      color = 'amber',
      bookmark_type = 'bookmark',
      highlighted_text,
      text_start_offset,
      text_end_offset
    } = body

    if (chapter_number === undefined) {
      return NextResponse.json({ error: 'chapter_number is required' }, { status: 400 })
    }

    // SECURITY: enforce that the caller owns the book before writing bookmark rows.
    if (!userData.userId || !(await userOwnsBook(bookId, userData.userId))) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // For reading_position, use upsert
    if (bookmark_type === 'reading_position') {
      const { data, error } = await supabaseAdmin.rpc('upsert_reading_position', {
        p_user_id: userData.userId,
        p_book_id: bookId,
        p_chapter_number: chapter_number,
        p_page_number: page_number || null,
        p_scroll_position: scroll_position || null
      })

      if (error) {
        console.error('Error upserting reading position:', error)
        return NextResponse.json({ error: 'Failed to save reading position' }, { status: 500 })
      }

      return NextResponse.json({ bookmark: data })
    }

    // For regular bookmarks and highlights
    const { data: bookmark, error } = await supabaseAdmin
      .from('bookmarks')
      .insert({
        user_id: userData.userId,
        book_id: bookId,
        chapter_number,
        page_number,
        scroll_position,
        title: title || `Bookmark in Chapter ${chapter_number}`,
        note,
        color,
        bookmark_type,
        highlighted_text,
        text_start_offset,
        text_end_offset
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating bookmark:', error)
      return NextResponse.json({ error: 'Failed to create bookmark' }, { status: 500 })
    }

    return NextResponse.json({ bookmark }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/books/[id]/bookmarks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/books/[id]/bookmarks - Delete a bookmark (pass bookmark_id in body)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    await params // bookId not needed for delete, but validate route
    const userData = await verifyAuth(request)

    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const bookmarkId = searchParams.get('bookmark_id')

    if (!bookmarkId) {
      return NextResponse.json({ error: 'bookmark_id is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('bookmarks')
      .delete()
      .eq('id', bookmarkId)
      .eq('user_id', userData.userId) // Ensure user owns the bookmark

    if (error) {
      console.error('Error deleting bookmark:', error)
      return NextResponse.json({ error: 'Failed to delete bookmark' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/books/[id]/bookmarks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/books/[id]/bookmarks - Update a bookmark
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    await params
    const userData = await verifyAuth(request)

    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { bookmark_id, title, note, color } = body

    if (!bookmark_id) {
      return NextResponse.json({ error: 'bookmark_id is required' }, { status: 400 })
    }

    const updateData: Record<string, string | undefined> = {}
    if (title !== undefined) updateData.title = title
    if (note !== undefined) updateData.note = note
    if (color !== undefined) updateData.color = color

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: bookmark, error } = await supabaseAdmin
      .from('bookmarks')
      .update(updateData)
      .eq('id', bookmark_id)
      .eq('user_id', userData.userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating bookmark:', error)
      return NextResponse.json({ error: 'Failed to update bookmark' }, { status: 500 })
    }

    return NextResponse.json({ bookmark })
  } catch (error) {
    console.error('Error in PATCH /api/books/[id]/bookmarks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
