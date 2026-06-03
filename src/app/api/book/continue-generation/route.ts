import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'
import { generateLiveBook } from '@/lib/generation'
import { waitUntil } from '@vercel/functions'
import type { LiveBookConfig } from '@/lib/generation/live'

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * POST /api/book/continue-generation
 * Continues book generation after purchase (generates chapters 2-N)
 *
 * Required: Book must be purchased before calling this endpoint
 *
 * Request body:
 * {
 *   bookId: string  // The book to continue generating
 * }
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { bookId } = body

    if (!bookId) {
      return NextResponse.json({
        error: 'Missing required field: bookId'
      }, { status: 400 })
    }

    // Get the book
    const book = await SupabaseDB.getBook(bookId)

    if (!book) {
      return NextResponse.json({
        error: 'Book not found'
      }, { status: 404 })
    }

    // Verify ownership
    if (book.user_id !== user.userId) {
      return NextResponse.json({
        error: 'Not authorized to access this book'
      }, { status: 403 })
    }

    // Check if book is purchased
    if (!book.purchased) {
      return NextResponse.json({
        error: 'Book must be purchased to generate remaining chapters',
        code: 'PURCHASE_REQUIRED'
      }, { status: 403 }) // 403 Forbidden - payment required
    }

    // Check if book is in preview status
    if (book.status !== 'preview') {
      return NextResponse.json({
        error: 'Book is not in preview status',
        code: 'INVALID_STATUS',
        currentStatus: book.status
      }, { status: 400 })
    }

    // Get the original job to retrieve outline and config
    const originalJobId = book.active_job_id
    let originalJob = null
    let outline: unknown = null
    let config: Record<string, unknown> | null = null

    if (originalJobId) {
      originalJob = await SupabaseDB.getBookGenerationJob(originalJobId)
    }

    // If no active job, find the most recent completed preview job
    if (!originalJob) {
      // We need to find the preview job for this book
      // For now, we'll reconstruct the config from the book data
      console.error('No active job found, reconstructing config from book data')
    }

    // Get outline and config from job metadata
    if (originalJob?.metadata) {
      try {
        const metadata = typeof originalJob.metadata === 'string'
          ? JSON.parse(originalJob.metadata)
          : originalJob.metadata
        outline = metadata.outline
        config = originalJob.config as Record<string, unknown> | null
      } catch (e) {
        console.error('Error parsing job metadata:', e)
      }
    }

    // If no config, reconstruct from book data
    if (!config) {
      config = {
        title: book.title,
        genre: book.genre,
        description: book.description || '',
        totalChapters: book.chapters || 5,
        writingStyle: book.style || 'descriptive',
        targetAudience: book.target_audience || 'general',
        tone: 'engaging',
        themes: [],
        mainCharacters: '',
        setting: '',
        plotOutline: '',
        pov: 'third' as const,
        tenseStyle: 'past' as const
      }
    }

    if (!outline) {
      return NextResponse.json({
        error: 'No book structure found. Please create the book again.',
        code: 'NO_OUTLINE'
      }, { status: 400 })
    }

    // Create new generation job for continuation
    const job = await SupabaseDB.createBookGenerationJob({
      user_id: user.userId,
      book_id: bookId,
      status: 'pending',
      progress: 0,
      current_step: 'Generating remaining chapters...',
      config: config,
      metadata: JSON.stringify({ outline, isContinuation: true })
    })

    const jobId = job.id!

    // Update book status
    await SupabaseDB.updateBook(bookId, {
      active_job_id: jobId,
      status: 'generating'
    })

    console.error('🚀 Continuing book generation:', {
      jobId,
      bookId,
      title: config.title,
      startFromChapter: 2,
      totalChapters: config.totalChapters
    })

    // Start native generation in background (non-blocking)
    waitUntil(generateLiveBook(
      jobId,
      bookId,
      user.userId,
      {
        ...(config as unknown as LiveBookConfig),
        previewMode: false,
        startFromChapter: 2
      },
      outline as import('@/lib/generation/engine').BookOutline
    ).catch(async (err) => {
      console.error('❌ Background continuation generation error:', err)
      try {
        await SupabaseDB.updateBookGenerationJob(jobId, {
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Unknown error',
          completed_at: new Date().toISOString()
        })
      } catch (dbErr) {
        console.error('❌ Failed to update job status after error:', dbErr)
      }
    }))

    return NextResponse.json({
      success: true,
      jobId,
      bookId,
      message: 'Generation of remaining chapters started',
      chaptersToGenerate: (config?.totalChapters as number ?? 0) - 1
    })

  } catch (error) {
    console.error('❌ Error continuing book generation:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
