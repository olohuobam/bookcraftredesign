import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/auth-helpers'
import { LuluPDFStorage } from '@/lib/lulu-pdf-storage'

/**
 * Generate PDFs for a book for Lulu printing
 * POST /api/books/[id]/generate-pdfs
 */
export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const bookId = resolvedParams.id

    // 1. Verify user authentication
    const user = await getSupabaseUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Generate and store PDFs
    const pdfUrls = await LuluPDFStorage.generateAndStorePDFs(bookId, user.userId!)

    // 3. Validate the generated PDFs
    const validation = await LuluPDFStorage.validatePDFs(pdfUrls.coverUrl, pdfUrls.interiorUrl)

    return NextResponse.json({
      success: true,
      cover_url: pdfUrls.coverUrl,
      interior_url: pdfUrls.interiorUrl,
      validation: {
        cover_valid: validation.coverValid,
        interior_valid: validation.interiorValid,
        errors: validation.errors
      },
      message: 'PDFs generated successfully'
    })

  } catch (error) {
    console.error('Error generating PDFs:', error)
    
    if ((error as Error).message === 'Book not found') {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate PDFs' },
      { status: 500 }
    )
  }
}

/**
 * Check PDF status for a book
 * GET /api/books/[id]/generate-pdfs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const bookId = resolvedParams.id

    // 1. Verify user authentication
    const user = await getSupabaseUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Check if PDFs exist
    const hasValidPDFs = await LuluPDFStorage.hasValidPDFs(bookId, user.userId!)

    if (!hasValidPDFs) {
      return NextResponse.json({
        has_pdfs: false,
        message: 'PDFs not generated yet'
      })
    }

    // 3. Get PDF URLs
    const pdfUrls = await LuluPDFStorage.getPDFUrls(bookId, user.userId!)

    return NextResponse.json({
      has_pdfs: true,
      cover_url: pdfUrls.coverUrl,
      interior_url: pdfUrls.interiorUrl,
      message: 'PDFs are ready'
    })

  } catch (error) {
    console.error('Error checking PDF status:', error)
    
    if ((error as Error).message === 'Book not found') {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to check PDF status' },
      { status: 500 }
    )
  }
}