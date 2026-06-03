import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { ensureUserProfile } from '@/lib/user-profile'
import { SupabaseDB } from '@/lib/supabase-db'
import { generateBookCoverAsync } from '@/lib/auto-cover-generator'

// POST /api/books/import
// Imports a book from a JSON payload in the request body (programmatic / API import).
// Used by BookImportDialog for structured JSON book data.
// For file uploads (DOCX, TXT, PDF, JSON file), use /api/books/import-file instead.
export async function POST(req: NextRequest) {
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

    const bookData = await req.json()

    // Validate required fields
    if (!bookData.title || typeof bookData.title !== 'string') {
      return NextResponse.json({ error: 'Title is required and must be text' }, { status: 400 })
    }

    if (!bookData.genre || typeof bookData.genre !== 'string') {
      return NextResponse.json({ error: 'Genre is required and must be text' }, { status: 400 })
    }

    // Validate book_type if provided
    if (bookData.book_type && !['text', 'picture'].includes(bookData.book_type)) {
      return NextResponse.json({ error: 'book_type must be "text" or "picture"' }, { status: 400 })
    }

    // Validate status if provided
    if (bookData.status && !['draft', 'generating', 'completed', 'error'].includes(bookData.status)) {
      return NextResponse.json({ error: 'status must be "draft", "generating", "completed", or "error"' }, { status: 400 })
    }

    // Parse chapters_json if it's a string
    let chaptersJson = bookData.chapters_json
    if (typeof chaptersJson === 'string') {
      try {
        JSON.parse(chaptersJson) // Validate it's valid JSON
      } catch {
        return NextResponse.json({ error: 'chapters_json must be valid JSON' }, { status: 400 })
      }
    } else if (chaptersJson && typeof chaptersJson === 'object') {
      chaptersJson = JSON.stringify(chaptersJson)
    }

    // Parse images if it's a string
    let images = bookData.images
    if (typeof images === 'string') {
      try {
        images = JSON.parse(images)
      } catch {
        return NextResponse.json({ error: 'images must be valid JSON' }, { status: 400 })
      }
    }

    // Create the book with all provided fields, filling in defaults for required fields
    const book = await SupabaseDB.createBook({
      title: bookData.title,
      genre: bookData.genre,
      description: bookData.description || '',
      content: bookData.content || '',
      chapters: bookData.chapters || 0,
      style: bookData.style || '',
      target_audience: bookData.target_audience || bookData.targetAudience || '',
      book_type: bookData.book_type || bookData.bookType || 'text',
      user_id: user.userId,
      status: bookData.status || 'draft',
      images: images || null,
      chapters_json: chaptersJson || null,
      cover_image: bookData.cover_image || bookData.coverImage || null,
      back_cover_image: bookData.back_cover_image || bookData.backCoverImage || null,
      back_cover_text: bookData.back_cover_text || bookData.backCoverText || null,
      author: bookData.author || null,
      publisher: bookData.publisher || null,
      isbn: bookData.isbn || null,
      publication_date: bookData.publication_date || bookData.publicationDate || null,
      purchased: bookData.purchased || false,
      cover_pdf_url: bookData.cover_pdf_url || bookData.coverPdfUrl || null,
      interior_pdf_url: bookData.interior_pdf_url || bookData.interiorPdfUrl || null,
      pdf_generated_at: bookData.pdf_generated_at || bookData.pdfGeneratedAt || null
    })

    // Automatically generate cover if not provided in import (non-blocking)
    const hasCoverImage = bookData.cover_image || bookData.coverImage
    if (book.id && !hasCoverImage) {
      generateBookCoverAsync(book.id).catch(err => {
        console.error('Background cover generation failed:', err)
        // Don't throw - this is non-critical
      })
    }

    return NextResponse.json({
      success: true,
      book: {
        ...book,
        chaptersJson: book.chapters_json,
        coverImage: book.cover_image,
        backCoverImage: book.back_cover_image,
        backCoverText: book.back_cover_text,
        bookType: book.book_type,
        targetAudience: book.target_audience,
        publicationDate: book.publication_date,
        createdAt: book.created_at,
        updatedAt: book.updated_at
      }
    })
  } catch (e) {
    console.error('Error importing book:', e instanceof Error ? e.stack : e)
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Internal server error'
    }, { status: 500 })
  }
}
