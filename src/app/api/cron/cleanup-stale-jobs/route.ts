import { NextRequest, NextResponse } from 'next/server'
import { SupabaseDB } from '@/lib/supabase-db'

export const runtime = 'nodejs'

// Hard timeout: 45 minutes
const HARD_TIMEOUT_SECONDS = 45 * 60

/**
 * GET /api/cron/cleanup-stale-jobs
 *
 * This endpoint is designed to be called by a cron job (e.g., Vercel Cron, external scheduler)
 * It finds all jobs that have exceeded the hard timeout threshold and marks them as failed.
 *
 * Security: Protected by CRON_SECRET environment variable
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (prevent unauthorized access)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // CRON_SECRET MUST be configured — fail hard if missing
    if (!cronSecret) {
      console.error('❌ CRON_SECRET environment variable is not set — refusing to run cron job')
      return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('🕐 Running stale jobs cleanup...')

    // Find all timed-out jobs
    const timedOutJobs = await SupabaseDB.getTimedOutJobs(HARD_TIMEOUT_SECONDS)

    if (timedOutJobs.length === 0) {
      console.error('✅ No stale jobs found')
      return NextResponse.json({
        success: true,
        message: 'No stale jobs found',
        processed: 0
      })
    }

    console.error(`⚠️ Found ${timedOutJobs.length} timed-out jobs`)

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Process each timed-out job
    for (const job of timedOutJobs) {
      try {
        const jobId = job.id!
        const createdAt = new Date(job.created_at || Date.now())
        const elapsedMinutes = Math.round((Date.now() - createdAt.getTime()) / 1000 / 60)

        console.error(`🚫 Timing out job ${jobId} (running for ${elapsedMinutes} minutes)`)

        // Update job status to failed
        await SupabaseDB.updateBookGenerationJob(jobId, {
          status: 'failed',
          current_step: `Timeout: Generation exceeded the 45 minute limit (${elapsedMinutes} min)`,
          error_message: `Hard timeout after ${elapsedMinutes} minutes`,
          completed_at: new Date().toISOString()
        })

        // If job has a book, update book status
        if (job.book_id) {
          try {
            await SupabaseDB.updateBook(job.book_id, {
              status: 'error',
              active_job_id: null
            })
            console.error(`📚 Updated book ${job.book_id} status to error`)
          } catch (bookError) {
            console.error(`❌ Error updating book ${job.book_id}:`, bookError)
          }
        }

        results.processed++
      } catch (error) {
        results.failed++
        results.errors.push(`Job ${job.id}: ${error instanceof Error ? error.message : String(error)}`)
        console.error(`❌ Error processing job ${job.id}:`, error)
      }
    }

    console.error(`✅ Cleanup complete: ${results.processed} jobs timed out, ${results.failed} errors`)

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} timed-out jobs`,
      ...results
    })

  } catch (error) {
    console.error('❌ Error in stale jobs cleanup:', error)
    return NextResponse.json({
      error: 'Failed to cleanup stale jobs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST /api/cron/cleanup-stale-jobs
 *
 * Alternative endpoint for manual triggering or webhooks
 */
export async function POST(request: NextRequest) {
  return GET(request)
}
