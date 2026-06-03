import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken, supabaseAdmin } from '@/lib/supabase-admin'

/**
 * PATCH /api/notifications/[id]/read — Mark a single notification as read.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', verified.userId)
      .select()
      .maybeSingle()

    if (error) {
      console.error('[api/notifications/read] Update error:', error.message)
      return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    return NextResponse.json({ notification: data })
  } catch (err) {
    console.error('[api/notifications/read] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
