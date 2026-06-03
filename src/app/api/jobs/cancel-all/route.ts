import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'

export const runtime = 'nodejs'

/**
 * POST /api/jobs/cancel-all
 * Cancel all active jobs (pending, processing, retrying) for the authenticated user
 */
export async function POST(request: NextRequest) {
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

    // Get all active jobs for user
    const activeJobs = await SupabaseDB.getUserActiveJobs(userData.userId)

    if (activeJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active jobs to cancel',
        cancelledCount: 0
      })
    }

    // Cancel each active job and update associated books
    const cancelledJobIds: string[] = []
    const errors: string[] = []

    for (const job of activeJobs) {
      try {
        // Update job status to cancelled
        await SupabaseDB.updateBookGenerationJob(job.id!, {
          status: 'cancelled',
          current_step: 'Cancelled by user',
          error_message: 'Cancelled by user (batch cancel)'
        })

        // Update associated book status if exists
        if (job.book_id) {
          await SupabaseDB.updateBook(job.book_id, {
            status: 'error',
            active_job_id: null
          })
        }

        cancelledJobIds.push(job.id!)
      } catch (error) {
        console.error(`Error cancelling job ${job.id}:`, error)
        errors.push(`Job ${job.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully cancelled ${cancelledJobIds.length} job(s)`,
      cancelledCount: cancelledJobIds.length,
      cancelledJobIds,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Error cancelling all jobs:', error)
    return NextResponse.json({
      error: 'Failed to cancel jobs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
