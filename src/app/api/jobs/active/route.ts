import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'

/**
 * GET /api/jobs/active
 * Returns all active (pending/processing) generation jobs for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 401 })

    const user = await verifySupabaseToken(token)
    if (!user?.userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const jobs = await SupabaseDB.getUserActiveJobs(user.userId)

    return NextResponse.json({
      jobs: jobs.map(j => ({
        id: j.id,
        bookId: j.book_id,
        status: j.status,
        progress: j.progress,
        currentStep: j.current_step,
        config: j.config,
        createdAt: j.created_at,
      }))
    })
  } catch (error) {
    console.error('Error fetching active jobs:', error)
    return NextResponse.json({ error: 'Failed to fetch active jobs' }, { status: 500 })
  }
}
