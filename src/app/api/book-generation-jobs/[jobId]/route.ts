import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'

export const runtime = 'nodejs'

// Stale detection thresholds
const STALE_THRESHOLD_SECONDS = 300 // 5 minutes without heartbeat = stale
const HARD_TIMEOUT_SECONDS = 2700 // 45 minutes = hard timeout

/**
 * GET /api/book-generation-jobs/[jobId]
 * Retrieves the current status of a book generation job
 * Includes text chunks, ETA, and stale detection for live preview
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
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

    const { jobId } = await params

    // Get job from database
    const job = await SupabaseDB.getBookGenerationJob(jobId)

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Verify user owns this job
    if (job.user_id !== user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Parse metadata for additional information
    interface JobMetadata {
      outline?: unknown
      textChunk?: { chapterNumber?: number; [key: string]: unknown }
      chapterComplete?: { number?: number; [key: string]: unknown }
      isContinuation?: boolean
      lastSignalDeliveredAt?: string
      [key: string]: unknown
    }
    let metadata: JobMetadata = {}
    if (job.metadata) {
      try {
        metadata = typeof job.metadata === 'string' ? JSON.parse(job.metadata) : job.metadata
      } catch (e) {
        console.error('Error parsing job metadata:', e)
      }
    }

    // Calculate elapsed time and stale detection
    const now = new Date()
    const createdAt = job.created_at ? new Date(job.created_at) : now
    const lastHeartbeat = job.last_heartbeat_at ? new Date(job.last_heartbeat_at) : createdAt

    const elapsedSeconds = Math.floor((now.getTime() - createdAt.getTime()) / 1000)
    const staleSeconds = Math.floor((now.getTime() - lastHeartbeat.getTime()) / 1000)

    // Job is stale if no heartbeat for 5+ minutes and still in progress
    const isStale = staleSeconds > STALE_THRESHOLD_SECONDS &&
      ['pending', 'processing', 'retrying'].includes(job.status)

    // Check for hard timeout
    const isTimedOut = elapsedSeconds > HARD_TIMEOUT_SECONDS &&
      ['pending', 'processing', 'retrying'].includes(job.status)

    // Calculate ETA based on progress
    let eta: { estimatedSecondsRemaining: number | null; displayText: string; confidence: 'low' | 'medium' | 'high' } | null = null

    if (job.progress && job.progress > 5 && job.progress < 100 && !isStale) {
      const progressPercent = job.progress / 100
      const estimatedTotalSeconds = elapsedSeconds / progressPercent
      const estimatedSecondsRemaining = Math.max(0, Math.round((estimatedTotalSeconds - elapsedSeconds) * 1.2)) // 20% buffer

      // Format display text
      let displayText = ''
      if (estimatedSecondsRemaining < 60) {
        displayText = 'Weniger als 1 Minute'
      } else if (estimatedSecondsRemaining < 3600) {
        const mins = Math.ceil(estimatedSecondsRemaining / 60)
        displayText = `~${mins} Minute${mins !== 1 ? 'n' : ''}`
      } else {
        const hours = Math.floor(estimatedSecondsRemaining / 3600)
        const mins = Math.ceil((estimatedSecondsRemaining % 3600) / 60)
        displayText = `~${hours}h ${mins}min`
      }

      // Confidence based on progress
      const confidence = job.progress > 50 ? 'high' : job.progress > 20 ? 'medium' : 'low'

      eta = { estimatedSecondsRemaining, displayText, confidence }
    }

    // Get book data if available
    let bookData: { id?: string; title: string; status?: string; chapters: unknown[] } | null = null
    if (job.book_id) {
      const book = await SupabaseDB.getBook(job.book_id)
      if (book) {
        // Parse chapters
        let chaptersJson = []
        if (book.chapters_json) {
          try {
            chaptersJson = typeof book.chapters_json === 'string'
              ? JSON.parse(book.chapters_json)
              : book.chapters_json
          } catch (e) {
            console.error('Error parsing chapters:', e)
          }
        }

        bookData = {
          id: book.id,
          title: book.title,
          status: book.status,
          chapters: Array.isArray(chaptersJson) ? chaptersJson : []
        }
      }
    }

    // Build job info object for frontend
    const jobInfo = {
      isStale,
      staleSeconds,
      elapsedSeconds,
      retryCount: job.retry_count || 0,
      isTimedOut,
      lastHeartbeat: lastHeartbeat.toISOString()
    }

    // Return comprehensive job status
    const response: Record<string, unknown> = {
      id: job.id,
      status: job.status,
      progress: job.progress,
      current_step: job.current_step,
      error_message: job.error_message,
      created_at: job.created_at,
      updated_at: job.updated_at,
      completed_at: job.completed_at,
      book_id: job.book_id,
      config: job.config,
      metadata: metadata,
      book: bookData,
      // Job timing info for frontend
      job: jobInfo,
      eta: eta,
      // Text chunks for streaming (from metadata)
      textChunk: metadata.textChunk || null,
      chapterComplete: metadata.chapterComplete || null,
      outline: metadata.outline || null
    }

    // If textChunk or chapterComplete was sent, add unique timestamp to prevent re-processing
    // Frontend checks this timestamp via processedChunksRef
    if (metadata.textChunk) {
      response.textChunk = {
        ...metadata.textChunk,
        _deliveredAt: new Date().toISOString() // Unique timestamp for deduplication
      }
    }
    if (metadata.chapterComplete) {
      response.chapterComplete = {
        ...metadata.chapterComplete,
        _deliveredAt: new Date().toISOString()
      }
    }

    // Clear chunks immediately before response (not after!)
    // This prevents race conditions with fast polling
    if (metadata.textChunk || metadata.chapterComplete) {
      const chunkChapter = metadata.textChunk?.chapterNumber
      const completeChapter = metadata.chapterComplete?.number
      console.error(`🧹 Clearing signals immediately:`, {
        textChunk: chunkChapter || 'none',
        chapterComplete: completeChapter || 'none'
      })

      try {
        const clearedMetadata = {
          ...metadata,
          textChunk: null,
          chapterComplete: null,
          lastSignalDeliveredAt: new Date().toISOString()
        }

        // Clear immediately (synchronously) to prevent race conditions
        await SupabaseDB.updateBookGenerationJob(jobId, {
          metadata: JSON.stringify(clearedMetadata)
        })

        console.error(`✅ Cleared signals for:`, {
          textChunk: chunkChapter || 'none',
          chapterComplete: completeChapter || 'none'
        })
      } catch (err) {
        console.error(`❌ Failed to clear signals:`, err)
        // Don't fail the request if clear fails - frontend has deduplication
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Error retrieving job status:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
