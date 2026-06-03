import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'
import { generateLiveBook, generatePictureBook, generateInteractiveBook } from '@/lib/generation'

export const runtime = 'nodejs'

const MAX_RETRY_COUNT = 1

/**
 * POST /api/jobs/[jobId]/retry
 * Retry a stale or failed job using native generation engine
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

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

    const job = await SupabaseDB.getBookGenerationJob(jobId)

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.user_id !== userData.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const currentRetryCount = job.retry_count || 0

    let force = false
    try {
      const body = await request.json()
      force = body.force === true
    } catch { /* no body */ }

    if (!force && currentRetryCount >= MAX_RETRY_COUNT) {
      return NextResponse.json({
        success: false,
        message: 'Maximum number of automatic retries reached. Use manual retry.',
        retryCount: currentRetryCount,
        canManualRetry: true
      }, { status: 400 })
    }

    const retryableStatuses = ['processing', 'pending', 'failed', 'retrying']
    if (!retryableStatuses.includes(job.status)) {
      return NextResponse.json({
        error: 'Job cannot be restarted',
        message: `Job has status "${job.status}" and cannot be restarted.`
      }, { status: 400 })
    }

    if (!job.book_id) {
      return NextResponse.json({ error: 'Job has no assigned book' }, { status: 400 })
    }

    const book = await SupabaseDB.getBook(job.book_id)
    if (!book) {
      return NextResponse.json({ error: 'Assigned book not found' }, { status: 404 })
    }

    // Update job status to retrying
    await SupabaseDB.updateBookGenerationJob(jobId, {
      status: 'retrying',
      retry_count: currentRetryCount + 1,
      current_step: `Retry ${currentRetryCount + 1}: Restarting generation...`,
      error_message: undefined,
      last_heartbeat_at: new Date().toISOString()
    })

    const jobConfig = typeof job.config === 'object' ? job.config : {}

    console.error('🔄 Retrying job (native):', {
      jobId,
      bookId: job.book_id,
      bookType: book.book_type,
      retryCount: currentRetryCount + 1
    })

    // Start native generation based on book type
    if (book.book_type === 'picture') {
      generatePictureBook(jobId, job.book_id, userData.userId, jobConfig as any)
        .catch(err => console.error('❌ Retry picture book error:', err))
    } else if (book.book_type === 'interactive') {
      generateInteractiveBook(jobId, job.book_id, userData.userId, jobConfig as any)
        .catch(err => console.error('❌ Retry interactive book error:', err))
    } else {
      // Get outline from metadata if available
      let outline = undefined
      if (job.metadata) {
        try {
          const metadata = typeof job.metadata === 'string' ? JSON.parse(job.metadata) : job.metadata
          outline = metadata.outline
        } catch { /* no outline */ }
      }
      generateLiveBook(jobId, job.book_id, userData.userId, jobConfig as any, outline)
        .catch(err => console.error('❌ Retry live book error:', err))
    }

    // Update job to processing
    await SupabaseDB.updateBookGenerationJob(jobId, {
      status: 'processing',
      current_step: 'Generation restarted...',
      last_heartbeat_at: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Generation successfully restarted',
      jobId,
      retryCount: currentRetryCount + 1
    })

  } catch (error) {
    console.error('❌ Error retrying job:', error)
    return NextResponse.json({
      error: 'Failed to retry job',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
