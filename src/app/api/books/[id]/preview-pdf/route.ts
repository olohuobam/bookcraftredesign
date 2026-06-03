import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/auth-helpers'
import { SupabaseDB } from '@/lib/supabase-db'
import { LuluPDFGenerator } from '@/lib/lulu-pdf-generator'

/**
 * Generate and serve a PDF preview of the book
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.error('🔍 PDF Preview API called')
    
    // 1. Verify user authentication
    const user = await getSupabaseUser(request)
    if (!user) {
      console.error('❌ PDF Preview: Authentication failed - no user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const bookId = resolvedParams.id
    console.error('📚 PDF Preview: Book ID:', bookId)

    // 2. Get book data from database
    const bookData = await SupabaseDB.getBookById(bookId, user.userId!)
    if (!bookData) {
      console.error('❌ PDF Preview: Book not found for user')
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      )
    }

    console.error('✅ PDF Preview: Book found:', bookData.title, 'Status:', bookData.status)

    // 3. Get preview type from query params (cover or interior)
    const url = new URL(request.url)
    const previewType = url.searchParams.get('type') || 'interior' // 'cover' or 'interior'
    console.error('🎯 PDF Preview: Type:', previewType)

    // 4. Generate PDF based on type
    let pdfBuffer: Buffer
    let filename: string

    if (previewType === 'cover') {
      console.error('🎨 Generating cover PDF...')
      pdfBuffer = LuluPDFGenerator.generateCoverPDF(bookData)
      filename = `${bookData.title.replace(/[^a-zA-Z0-9]/g, '_')}_cover.pdf`
    } else {
      console.error('📖 Generating interior PDF...')
      pdfBuffer = LuluPDFGenerator.generateInteriorPDF(bookData)
      filename = `${bookData.title.replace(/[^a-zA-Z0-9]/g, '_')}_interior.pdf`
    }

    console.error('✅ PDF generated successfully. Size:', pdfBuffer.length, 'bytes')

    // 5. Return PDF as response
    const response = new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Content-Length': pdfBuffer.length.toString()
      }
    })

    console.error('📤 PDF response sent successfully')
    return response

  } catch (error) {
    console.error('❌ PDF preview generation error:', error)
    console.error('Stack trace:', (error as Error).stack)
    
    // Return a more detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to generate PDF preview', details: errorMessage },
      { status: 500 }
    )
  }
}