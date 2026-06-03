import { NextRequest, NextResponse } from 'next/server'
import { SupabaseDB } from '@/lib/supabase-db'
import { refreshSignedUrls } from '@/lib/image-storage'

// GET /api/users/[userId]/public - fetch public profile for any user (no auth required)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    const user = await SupabaseDB.getProfile(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch only public books by this user
    const books = await SupabaseDB.getPublicBooks({ userId })

    // Refresh cover image signed URLs
    const coverUrls = books.map(b => b.cover_image)
    const refreshedCovers = await refreshSignedUrls(coverUrls)
    const booksWithCovers = books.map((book, i) => ({
      id: book.id,
      title: book.title,
      genre: book.genre,
      cover_image: refreshedCovers[i] ?? book.cover_image,
      view_count: book.view_count ?? 0,
      created_at: book.created_at,
    }))

    // Refresh avatar URL if it's a signed Supabase URL
    let avatarUrl = user.image ?? null
    if (avatarUrl) {
      const [refreshed] = await refreshSignedUrls([avatarUrl])
      if (refreshed) avatarUrl = refreshed
    }

    const totalViews = booksWithCovers.reduce((sum, b) => sum + (b.view_count ?? 0), 0)

    return NextResponse.json({
      profile: {
        id: user.id,
        name: user.name ?? null,
        image: avatarUrl,
        createdAt: user.created_at ?? null,
      },
      books: booksWithCovers,
      stats: {
        totalBooks: booksWithCovers.length,
        totalViews,
      },
    })
  } catch (error) {
    console.error('Error fetching public user profile:', error)
    return NextResponse.json({ error: 'Failed to fetch public profile' }, { status: 500 })
  }
}
