import { NextRequest, NextResponse } from 'next/server'
import { SupabaseDB } from '@/lib/supabase-db'
import { refreshSignedUrls } from '@/lib/image-storage'

// GET /api/books/public - list public books for the Discover page
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const genre = searchParams.get('genre') ?? undefined
    const sortBy = (searchParams.get('sort') as 'newest' | 'popular') ?? 'newest'
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : undefined
    const search = searchParams.get('search') ?? undefined
    const language = searchParams.get('language') ?? undefined
    const userId = searchParams.get('userId') ?? undefined

    const books = await SupabaseDB.getPublicBooks({ genre, sortBy, limit, search, language, userId })

    // Refresh signed cover image URLs
    const coverUrls = books.map(b => b.cover_image)
    const refreshed = await refreshSignedUrls(coverUrls)

    const booksWithRefreshedCovers = books.map((book, i) => ({
      ...book,
      cover_image: refreshed[i] ?? book.cover_image,
    }))

    return NextResponse.json({ books: booksWithRefreshedCovers })
  } catch (error) {
    console.error('Error fetching public books:', error)
    return NextResponse.json({ error: 'Failed to fetch public books' }, { status: 500 })
  }
}
