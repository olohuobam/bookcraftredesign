import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { refreshSignedUrls } from '@/lib/image-storage'

// Curated showcase books displayed on the public landing page.
const EXAMPLE_BOOK_IDS = [
  'dc35cd27-f5c4-48d3-b482-240719f0c3e6', // Double Trouble: Agent Max's Secret Life
  '1951f0b6-aba6-419a-a761-1e1b92dd1cba', // The Life and Times of Kasimir Altenburg
] as const

export const revalidate = 3600

// GET /api/example-books - curated example books for the landing page
export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ books: [] })
    }

    const { data, error } = await supabaseAdmin
      .from('books')
      .select('id, title, genre, description, cover_image, book_type')
      .in('id', EXAMPLE_BOOK_IDS as unknown as string[])

    if (error || !data) {
      console.error('Error fetching example books:', error)
      return NextResponse.json({ books: [] })
    }

    const order = new Map(EXAMPLE_BOOK_IDS.map((id, i) => [id, i]))
    const ordered = [...data].sort(
      (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
    )

    const refreshed = await refreshSignedUrls(ordered.map((b) => b.cover_image))

    const books = ordered.map((book, i) => ({
      id: book.id,
      title: book.title,
      genre: book.genre ?? null,
      description: book.description ?? null,
      bookType: book.book_type ?? 'text',
      coverImage: refreshed[i]?.signedUrl ?? book.cover_image ?? null,
    }))

    return NextResponse.json({ books })
  } catch (error) {
    console.error('Error fetching example books:', error)
    return NextResponse.json({ books: [] })
  }
}
