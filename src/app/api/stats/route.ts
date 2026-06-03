import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase-admin'

// ── helpers ────────────────────────────────────────────────────────────────

function countWords(text: string | null | undefined): number {
  if (!text) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

function extractTextFromChaptersJson(chaptersJson: unknown): string {
  if (!chaptersJson) return ''
  try {
    const chapters = Array.isArray(chaptersJson)
      ? chaptersJson
      : typeof chaptersJson === 'string'
      ? JSON.parse(chaptersJson)
      : []
    return chapters
      .map((ch: { content?: string; title?: string }) =>
        [ch.title ?? '', ch.content ?? ''].join(' ')
      )
      .join(' ')
  } catch {
    return ''
  }
}

/** Compute how many consecutive days (up to today) have at least one entry */
function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0

  // Normalise to 'YYYY-MM-DD' in UTC
  const daySet = new Set(
    dates.map((d) => new Date(d).toISOString().slice(0, 10))
  )

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  let streak = 0

  // Start from today; if today has no entry, check yesterday first
  const cursor = new Date(today)
  const todayStr = cursor.toISOString().slice(0, 10)
  if (!daySet.has(todayStr)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  while (true) {
    const key = cursor.toISOString().slice(0, 10)
    if (!daySet.has(key)) break
    streak++
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}

// ── route ──────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = await verifySupabaseToken(token)
    if (!user?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Return zero-state when DB is not configured (dev mode)
    if (!isSupabaseConfigured || !supabaseAdmin) {
      return NextResponse.json({
        totalWords: 0,
        streak: 0,
        bookCount: 0,
        milestonesReached: [],
      })
    }

    // Fetch only the fields we need for stats (lightweight)
    const { data: books, error } = await supabaseAdmin
      .from('books')
      .select('content, chapters_json, created_at, updated_at')
      .eq('user_id', user.userId)

    if (error) {
      console.error('[stats] DB error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    let totalWords = 0
    const activityDates: string[] = []

    for (const book of books ?? []) {
      // Word count: prefer chapters_json (richer), fall back to content
      const chaptersText = extractTextFromChaptersJson(book.chapters_json)
      const words = chaptersText
        ? countWords(chaptersText)
        : countWords(book.content)
      totalWords += words

      // Collect all activity dates for streak calculation
      if (book.created_at) activityDates.push(book.created_at)
      if (book.updated_at) activityDates.push(book.updated_at)
    }

    const streak = computeStreak(activityDates)
    const bookCount = (books ?? []).length

    // Milestones (word counts that have been reached)
    const MILESTONES = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000]
    const milestonesReached = MILESTONES.filter((m) => totalWords >= m)

    return NextResponse.json({
      totalWords,
      streak,
      bookCount,
      milestonesReached,
    })
  } catch (err) {
    console.error('[stats] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
