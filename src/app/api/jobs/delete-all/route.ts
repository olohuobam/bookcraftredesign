import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'

export const runtime = 'nodejs'

/**
 * DELETE /api/jobs/delete-all
 * Delete ALL jobs (regardless of status) for the authenticated user
 * AND delete books with error/generating/processing status
 */
export async function DELETE(request: NextRequest) {
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

    // Delete all jobs and error/generating books for the user
    const result = await SupabaseDB.deleteAllUserJobs(userData.userId)

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deletedCount} job(s) and ${result.deletedBooksCount} book(s)`,
      deletedCount: result.deletedCount,
      deletedBooksCount: result.deletedBooksCount
    })

  } catch (error) {
    console.error('Error deleting all jobs:', error)
    return NextResponse.json({
      error: 'Failed to delete jobs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
