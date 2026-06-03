import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken, supabaseAdmin } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'

// GET /api/books/[id]/reading-progress — fetch reading progress for current user
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const authorization = req.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const userData = await verifySupabaseToken(token)
    if (!userData?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const { data, error } = await supabaseAdmin
      .from('book_reading_progress')
      .select('last_chapter_index, bookmarks, notes, updated_at')
      .eq('user_id', userData.userId)
      .eq('book_id', params.id)
      .maybeSingle()

    if (error) {
      console.error('Error fetching reading progress:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json(data ?? { last_chapter_index: 0, bookmarks: [], notes: [] })
  } catch (e) {
    console.error('Error in reading-progress GET:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/books/[id]/reading-progress — upsert reading progress
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const authorization = req.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const userData = await verifySupabaseToken(token)
    if (!userData?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const body = await req.json()
    const {
      last_chapter_index,
      bookmarks,
      notes,
    } = body

    // SECURITY: enforce book ownership before writing progress rows.
    const ownedBook = await SupabaseDB.getBookById(params.id, userData.userId)
    if (!ownedBook) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    const { data, error } = await supabaseAdmin
      .from('book_reading_progress')
      .upsert(
        {
          user_id: userData.userId,
          book_id: params.id,
          last_chapter_index: last_chapter_index ?? 0,
          bookmarks: bookmarks ?? [],
          notes: notes ?? [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,book_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('Error saving reading progress:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (e) {
    console.error('Error in reading-progress POST:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
