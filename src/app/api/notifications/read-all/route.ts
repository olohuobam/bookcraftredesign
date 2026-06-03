import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken, supabaseAdmin } from '@/lib/supabase-admin'

/**
 * PATCH /api/notifications/read-all — Mark all notifications as read for the authenticated user.
 */
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const verified = await verifySupabaseToken(token)
    if (!verified?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .eq('user_id', verified.userId)
      .eq('read', false)

    if (error) {
      console.error('[api/notifications/read-all] Update error:', error.message)
      return NextResponse.json({ error: 'Failed to mark all as read' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/notifications/read-all] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
