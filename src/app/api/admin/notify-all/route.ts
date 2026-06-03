import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { isAdmin, notifyAllUsers, NotificationType } from '@/lib/notifications'

/**
 * POST /api/admin/notify-all
 *
 * Send a system notification to ALL users. Admin-only.
 *
 * Body: { title: string, body: string, type?: NotificationType }
 */
export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = await verifySupabaseToken(token)
    if (!user || !user.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (!isAdmin(user.userId)) {
      return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 })
    }

    const { title, body, type } = await req.json()

    if (!title || !body) {
      return NextResponse.json(
        { error: 'Missing required fields: title, body' },
        { status: 400 },
      )
    }

    const validTypes: NotificationType[] = ['book_ready', 'comment', 'system', 'general']
    const notificationType: NotificationType = validTypes.includes(type) ? type : 'system'

    const result = await notifyAllUsers(user.userId, title, body, notificationType)

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${result.sent} of ${result.total} users`,
      ...result,
    })
  } catch (error) {
    console.error('[admin/notify-all] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
