import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken, supabaseAdmin } from '@/lib/supabase-admin'

/**
 * DELETE /api/notifications/[id] — Delete a single notification.
 */
export async function DELETE(
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

    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', verified.userId)

    if (error) {
      console.error('[api/notifications/delete] Delete error:', error.message)
      return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/notifications/delete] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
