import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken, supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/notifications — Fetch paginated notifications for the authenticated user.
 * Query params: limit (default 50), offset (default 0)
 */
export async function GET(request: NextRequest) {
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

    const url = new URL(request.url)
    const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 100)
    const offset = Number(url.searchParams.get('offset')) || 0

    // Fetch notifications
    const { data: notifications, error, count } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', verified.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[api/notifications] Fetch error:', error.message)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    // Get unread count
    const { count: unreadCount } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', verified.userId)
      .eq('read', false)

    return NextResponse.json({
      notifications: notifications ?? [],
      total: count ?? 0,
      unreadCount: unreadCount ?? 0,
    })
  } catch (err) {
    console.error('[api/notifications] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
