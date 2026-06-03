import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'

export const runtime = 'nodejs'

// Constants for timeout handling
const STALE_THRESHOLD_SECONDS = 5 * 60 // 5 minutes without update = stale
const HARD_TIMEOUT_SECONDS = 45 * 60 // 45 minutes total = hard timeout

/**
 * Calculate ETA based on current progress and elapsed time
 */
function calculateETA(progress: number, createdAt: string): {
  estimatedSecondsRemaining: number | null
  displayText: string
  confidence: 'low' | 'medium' | 'high'
} {
  // Don't calculate ETA if progress is too low (unreliable)
  if (progress < 10) {
    return {
      estimatedSecondsRemaining: null,
      displayText: 'Berechne...',
      confidence: 'low'
    }
  }

  const now = new Date()
  const startTime = new Date(createdAt)
  const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000)

  // Calculate estimated total time and remaining time
  const estimatedTotalSeconds = (elapsedSeconds / progress) * 100
  const estimatedSecondsRemaining = Math.max(0, Math.round((estimatedTotalSeconds - elapsedSeconds) * 1.2)) // +20% buffer

  // Determine confidence based on progress
  let confidence: 'low' | 'medium' | 'high' = 'low'
  if (progress >= 50) {
    confidence = 'high'
  } else if (progress >= 25) {
    confidence = 'medium'
  }

  // Format display text
  let displayText: string
  if (estimatedSecondsRemaining < 60) {
    displayText = 'Weniger als 1 Minute'
  } else if (estimatedSecondsRemaining < 300) {
    displayText = `~${Math.ceil(estimatedSecondsRemaining / 60)} Minuten`
  } else {
    displayText = `~${Math.round(estimatedSecondsRemaining / 60)} Minuten`
  }

  return {
    estimatedSecondsRemaining,
    displayText,
    confidence
  }
}

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

    // Verify Supabase token
    let userData
    try {
      userData = await verifySupabaseToken(token)
      if (!userData || !userData.userId) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { jobId } = await params

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
    }

    // Get job from database
    const job = await SupabaseDB.getBookGenerationJob(jobId)

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Verify job belongs to user
    if (job.user_id !== userData.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Always return book data if available (needed for live preview to detect book type)
    let bookData = null
    if (job.book_id) {
      const book = await SupabaseDB.getBook(job.book_id)
      if (book) {
        bookData = {
          id: book.id,
          title: book.title,
          genre: book.genre,
          chapters: book.chapters,
          chapters_json: book.chapters_json,
          status: book.status,
          book_type: book.book_type,
          cover_image: book.cover_image,
          back_cover_image: book.back_cover_image,
          images: book.images
        }
      }
    }

    // Calculate stale and timeout information
    const now = new Date()
    const createdAt = job.created_at ? new Date(job.created_at) : now
    const lastHeartbeatAt = job.last_heartbeat_at ? new Date(job.last_heartbeat_at) : createdAt

    const staleSeconds = Math.floor((now.getTime() - lastHeartbeatAt.getTime()) / 1000)
    const isStale = staleSeconds > STALE_THRESHOLD_SECONDS &&
                   (job.status === 'pending' || job.status === 'processing' || job.status === 'retrying')

    const totalElapsedSeconds = Math.floor((now.getTime() - createdAt.getTime()) / 1000)
    const timeoutIn = Math.max(0, HARD_TIMEOUT_SECONDS - totalElapsedSeconds)
    const maxTimeoutAt = new Date(createdAt.getTime() + HARD_TIMEOUT_SECONDS * 1000).toISOString()

    // Calculate ETA only for active jobs
    const eta = (job.status === 'processing' || job.status === 'retrying')
      ? calculateETA(job.progress, job.created_at || now.toISOString())
      : { estimatedSecondsRemaining: null, displayText: '-', confidence: 'low' as const }

    // Parse metadata from JSON string if needed
    let parsedMetadata: Record<string, unknown> | null = null
    if (job.metadata) {
      try {
        parsedMetadata = typeof job.metadata === 'string'
          ? JSON.parse(job.metadata)
          : job.metadata as Record<string, unknown>
      } catch (e) {
        console.error('Failed to parse job metadata:', e)
      }
    }

    return NextResponse.json({
      job: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        currentStep: job.current_step,
        errorMessage: job.error_message,
        bookId: job.book_id,
        config: job.config,
        metadata: parsedMetadata,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        completedAt: job.completed_at,
        // Timeout and heartbeat info
        lastHeartbeatAt: job.last_heartbeat_at,
        retryCount: job.retry_count || 0,
        staleSeconds,
        isStale,
        maxTimeoutAt,
        timeoutIn,
        elapsedSeconds: totalElapsedSeconds
      },
      book: bookData,
      eta
    })

  } catch (error) {
    console.error('Error getting job status:', error)
    return NextResponse.json({
      error: 'Failed to get job status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE endpoint to cancel a job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    // Verify Supabase token
    let userData
    try {
      userData = await verifySupabaseToken(token)
      if (!userData || !userData.userId) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { jobId } = await params

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
    }

    // Get job from database
    const job = await SupabaseDB.getBookGenerationJob(jobId)

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Verify job belongs to user
    if (job.user_id !== userData.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Can only cancel pending or processing jobs
    if (job.status !== 'pending' && job.status !== 'processing') {
      return NextResponse.json({
        error: 'Can only cancel pending or processing jobs'
      }, { status: 400 })
    }

    // Update job status to cancelled
    await SupabaseDB.updateBookGenerationJob(jobId, {
      status: 'cancelled',
      current_step: 'Cancelled by user',
      error_message: 'Cancelled by user'
    })

    // Update associated book status if exists
    if (job.book_id) {
      await SupabaseDB.updateBook(job.book_id, {
        status: 'error',
        active_job_id: null
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Job cancelled successfully'
    })

  } catch (error) {
    console.error('Error cancelling job:', error)
    return NextResponse.json({
      error: 'Failed to cancel job',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
