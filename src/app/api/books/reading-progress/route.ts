import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { verifySupabaseToken } from '@/lib/supabase-admin'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let supabaseAdmin: SupabaseClient | null = null
if (supabaseUrl && supabaseKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseKey)
}

export interface ReadingProgress {
  book_id: string
  chapter_number: number
  page_number: number | null
  scroll_position: number | null
  updated_at: string
}

/**
 * GET /api/books/reading-progress
 * Returns all reading_position bookmarks for the authenticated user,
 * grouped by book_id (latest per book).
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userData = await verifySupabaseToken(token)
    if (!userData?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all reading_position bookmarks for this user.
    // The DB enforces a unique (user_id, book_id) partial index for reading_position,
    // so one row per book is guaranteed — no de-duplication needed.
    const { data, error } = await supabaseAdmin
      .from('bookmarks')
      .select('book_id, chapter_number, page_number, scroll_position, updated_at')
      .eq('user_id', userData.userId)
      .eq('bookmark_type', 'reading_position')

    if (error) {
      console.error('Error fetching reading progress:', error)
      return NextResponse.json({ error: 'Failed to fetch reading progress' }, { status: 500 })
    }

    // Build progress object keyed by book_id
    const progress: Record<string, ReadingProgress> = {}
    for (const row of data ?? []) {
      progress[row.book_id] = row as ReadingProgress
    }

    return NextResponse.json({ progress })
  } catch (err) {
    console.error('Error in GET /api/books/reading-progress:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
