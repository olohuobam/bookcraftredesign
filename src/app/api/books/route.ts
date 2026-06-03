import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken, isSupabaseConfigured } from '@/lib/supabase-admin'
import { ensureUserProfile } from '@/lib/user-profile'
import { SupabaseDB } from '@/lib/supabase-db'
import { refreshSignedUrls, attachPathFragment } from '@/lib/image-storage'
import { generateBookCoverAsync } from '@/lib/auto-cover-generator'
import { checkIsPro } from '@/lib/subscription-utils'

// GET /api/books - list all books for current user
export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = await verifySupabaseToken(token)
    
    if (!user || !user.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // If Supabase is not configured, return empty books list for development
    if (!isSupabaseConfigured) {
      console.error('🔧 Supabase not configured - returning empty books list')
      return NextResponse.json({ books: [] })
    }

    const books = await SupabaseDB.getUserBooks(user.userId)

    // OPTIMIZATION: Collect ALL URLs (covers + book images) and refresh them in a SINGLE batch call
    // instead of N+1 individual calls (one per book)
    type UrlMapping = { bookIndex: number; type: 'cover' | 'backCover' | 'image'; imageIndex?: number }
    const allUrls: (string | null | undefined)[] = []
    const urlIndexMap: UrlMapping[] = []

    books.forEach((book, bookIndex) => {
      // Add cover URLs
      allUrls.push(book.cover_image)
      urlIndexMap.push({ bookIndex, type: 'cover' })
      allUrls.push(book.back_cover_image)
      urlIndexMap.push({ bookIndex, type: 'backCover' })

      // Add all book images
      const bookImages = Array.isArray(book.images) ? book.images : []
      bookImages.forEach((img, imageIndex) => {
        allUrls.push(img)
        urlIndexMap.push({ bookIndex, type: 'image', imageIndex })
      })
    })

    // Single batch refresh for ALL URLs (covers + images)
    const refreshedAssets = await refreshSignedUrls(allUrls)

    // Build maps of refreshed URLs per book
    const bookDataMap: Map<number, {
      coverImage: string | null
      backCoverImage: string | null
      images: (string | null)[]
    }> = new Map()

    // Initialize maps for each book
    books.forEach((book, bookIndex) => {
      const imageCount = Array.isArray(book.images) ? book.images.length : 0
      bookDataMap.set(bookIndex, {
        coverImage: null,
        backCoverImage: null,
        images: new Array(imageCount).fill(null)
      })
    })

    // Populate maps with refreshed URLs (with defensive null checks)
    refreshedAssets.forEach((asset, idx) => {
      const mapping = urlIndexMap[idx]
      if (!mapping) {
        // If we somehow have more refreshed assets than mappings, skip safely
        return
      }
      const entry = bookDataMap.get(mapping.bookIndex)
      if (!entry) {
        // If the book index is out of bounds or initialization failed, skip safely
        return
      }
      const url = asset ? attachPathFragment(asset.signedUrl, asset.path) : null

      if (mapping.type === 'cover') {
        entry.coverImage = url
      } else if (mapping.type === 'backCover') {
        entry.backCoverImage = url
      } else if (mapping.type === 'image' && mapping.imageIndex !== undefined) {
        entry.images[mapping.imageIndex] = url
      }
    })

    // Build enriched books with pre-refreshed URLs (no more async calls needed)
    const enriched = books.map((book, bookIndex) => {
      const bookData = bookDataMap.get(bookIndex) || { coverImage: null, backCoverImage: null, images: [] }

      return {
        ...book,
        images: bookData.images,
        chaptersJson: book.chapters_json,
        coverImage: bookData.coverImage,
        backCoverImage: bookData.backCoverImage,
        backCoverText: book.back_cover_text,
        bookType: book.book_type,
        targetAudience: book.target_audience,
        publicationDate: book.publication_date,
        aiGenerated: book.ai_generated,
        activeJobId: book.active_job_id,
        isPublic: book.is_public ?? false,
        createdAt: book.created_at,
        updatedAt: book.updated_at
      }
    })

    return NextResponse.json({ books: enriched })
  } catch (e) {
    console.error('Error listing books:', e instanceof Error ? e.stack : e)
    console.error('Supabase config status:', { isSupabaseConfigured })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/books - create placeholder/manual book
export async function POST(req: Request) {
  try {
    const authorization = req.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = await verifySupabaseToken(token)
    
    if (!user || !user.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Ensure user profile exists
    if (user.email) {
      await ensureUserProfile(user.userId, user.email)
    }

    const body = await req.json()
    const { title, author, genre, description = '', content = '', style = '', targetAudience = '', chapters = 0, bookType = 'text', aiGenerated = false } = body

    if (!title || !genre) {
      return NextResponse.json({ error: 'Missing title or genre' }, { status: 400 })
    }

    // Check Pro status server-side
    const isPro = await checkIsPro(user.userId)

    const book = await SupabaseDB.createBook({
      title,
      author: author || undefined,
      genre,
      description,
      content,
      style,
      target_audience: targetAudience,
      chapters: chapters || 0,
      user_id: user.userId,
      status: 'draft',
      book_type: bookType as 'text' | 'picture',
      ai_generated: aiGenerated, // Set based on caller's intent

    })

    // Automatically generate cover in the background (non-blocking)
    if (book.id) {
      generateBookCoverAsync(book.id).catch(err => {
        console.error('Background cover generation failed:', err)
        // Don't throw - this is non-critical
      })
    }

    return NextResponse.json({ book })
  } catch (e) {
    console.error('Error creating book', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
