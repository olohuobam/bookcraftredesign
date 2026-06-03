import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ReviewProfile {
  name?: string | null
  image?: string | null
}

interface Review {
  id: string
  book_id: string
  user_id: string
  rating: number
  text: string | null
  created_at: string
  updated_at: string
  user_name: string | null
  user_avatar: string | null
}

// ─── GET /api/books/[id]/reviews ───────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const bookId = params.id

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)))
    const offset = (page - 1) * limit

    if (!supabaseAdmin) {
      // Mock mode: return empty reviews
      return NextResponse.json({
        reviews: [],
        averageRating: 0,
        totalReviews: 0,
        page,
        limit,
      })
    }

    // Fetch reviews joined with profile data
    const { data: reviews, error, count } = await supabaseAdmin
      .from('book_reviews')
      .select(
        `
        id,
        book_id,
        user_id,
        rating,
        text,
        created_at,
        updated_at,
        profiles:user_id (
          name,
          image
        )
        `,
        { count: 'exact' }
      )
      .eq('book_id', bookId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      // Table may not exist yet — return graceful empty state
      if (
        error.code === '42P01' || // relation does not exist
        error.message?.includes('does not exist') ||
        error.message?.includes('relation')
      ) {
        return NextResponse.json({
          reviews: [],
          averageRating: 0,
          totalReviews: 0,
          page,
          limit,
        })
      }
      console.error('Error fetching reviews:', error)
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
    }

    // Compute aggregate stats
    const { data: stats, error: statsError } = await supabaseAdmin
      .from('book_reviews')
      .select('rating')
      .eq('book_id', bookId)

    let averageRating = 0
    if (!statsError && stats && stats.length > 0) {
      averageRating =
        Math.round(
          (stats.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / stats.length) * 10
        ) / 10
    }

    const serialized = (reviews ?? []).map((r: Record<string, unknown>) => {
      const profile = r.profiles as ReviewProfile
      return {
        id: r.id,
        bookId: r.book_id,
        userId: r.user_id,
        rating: r.rating,
        text: r.text ?? null,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        userName: profile?.name ?? null,
        userAvatar: profile?.image ?? null,
      }
    })

    return NextResponse.json({
      reviews: serialized,
      averageRating,
      totalReviews: count ?? 0,
      page,
      limit,
    })
  } catch (e) {
    console.error('Error in GET /reviews:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/books/[id]/reviews ─────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const bookId = params.id

    // Auth
    const authorization = req.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    let userData = null
    try {
      userData = await verifySupabaseToken(token)
      if (!userData || !userData.userId) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await req.json()
    const { rating, text } = body

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be a number between 1 and 5' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      // Mock mode: return a fake review
      return NextResponse.json({
        review: {
          id: 'mock-' + Date.now(),
          bookId,
          userId: userData.userId,
          rating,
          text: text ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userName: 'Demo User',
          userAvatar: null,
        },
      })
    }

    // Upsert — one review per user per book
    const { data: review, error } = await supabaseAdmin
      .from('book_reviews')
      .upsert(
        {
          book_id: bookId,
          user_id: userData.userId,
          rating,
          text: text?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'book_id,user_id' }
      )
      .select(
        `
        id,
        book_id,
        user_id,
        rating,
        text,
        created_at,
        updated_at,
        profiles:user_id (
          name,
          image
        )
        `
      )
      .single()

    if (error) {
      if (
        error.code === '42P01' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('relation')
      ) {
        return NextResponse.json(
          { error: 'Reviews table not set up yet. Please run the database migration.' },
          { status: 503 }
        )
      }
      console.error('Error upserting review:', error)
      return NextResponse.json({ error: 'Failed to save review' }, { status: 500 })
    }

    const profile = review.profiles as ReviewProfile

    return NextResponse.json({
      review: {
        id: review.id,
        bookId: review.book_id,
        userId: review.user_id,
        rating: review.rating,
        text: review.text ?? null,
        createdAt: review.created_at,
        updatedAt: review.updated_at,
        userName: profile?.name ?? null,
        userAvatar: profile?.image ?? null,
      },
    })
  } catch (e) {
    console.error('Error in POST /reviews:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
