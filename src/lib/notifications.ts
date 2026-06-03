/**
 * notifications.ts — Server-side notification helper
 *
 * Saves an in-app notification to Supabase AND sends a push notification
 * via FCM if the user has registered device tokens.
 *
 * SERVER-SIDE ONLY — never import from client components.
 */

import { supabaseAdmin } from './supabase-admin'
import { sendPushToUser } from './push-sender'

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType = 'book_ready' | 'comment' | 'system' | 'general'

export interface NotificationPayload {
  userId: string
  title: string
  body: string
  type?: NotificationType
  data?: Record<string, string>
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  type: NotificationType
  data: Record<string, string>
  read: boolean
  created_at: string
}

// ─── Send Notification ────────────────────────────────────────────────────────

/**
 * Create an in-app notification in Supabase and simultaneously send a push
 * notification via FCM (if the user has device tokens registered).
 */
export async function sendNotification(payload: NotificationPayload): Promise<Notification | null> {
  if (!supabaseAdmin) {
    console.error('[notifications] Supabase Admin not initialized — cannot send notification')
    return null
  }

  const { userId, title, body, type = 'general', data = {} } = payload

  try {
    // 1. Save in-app notification to Supabase
    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        body,
        type,
        data,
      })
      .select()
      .single()

    if (error) {
      console.error('[notifications] Failed to insert notification:', error.message)
      return null
    }

    console.log(`[notifications] Created notification ${notification.id} for user ${userId}`)

    // 2. Send push notification in parallel (fire-and-forget)
    sendPushToUser(userId, { title, body, data }).catch((err) => {
      console.error('[notifications] Push send failed:', err)
    })

    return notification as Notification
  } catch (err) {
    console.error('[notifications] sendNotification error:', err)
    return null
  }
}

/**
 * Send a "book ready" notification with a deep link to the book.
 */
export async function notifyBookReady(
  userId: string,
  bookTitle: string,
  bookId: string,
): Promise<Notification | null> {
  return sendNotification({
    userId,
    title: 'Dein Buch ist fertig! 📖',
    body: `„${bookTitle}“ wurde erfolgreich erstellt.`,
    type: 'book_ready',
    data: {
      bookId,
      url: `/dashboard/books/${bookId}`,
    },
  })
}

/**
 * Send a system notification.
 */
export async function notifySystem(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<Notification | null> {
  return sendNotification({
    userId,
    title,
    body,
    type: 'system',
    data,
  })
}

// ─── Admin: Notify All Users ─────────────────────────────────────────────────

/** Admin user IDs allowed to send system-wide notifications. */
const ADMIN_USER_IDS: string[] = (
  process.env.ADMIN_USER_IDS || ''
).split(',').map(id => id.trim()).filter(Boolean)

/** Check whether a userId is an admin. */
export function isAdmin(userId: string): boolean {
  return ADMIN_USER_IDS.includes(userId)
}

/**
 * Send a notification to ALL users (system announcements, new features, etc.).
 * Only admins may call this — pass the calling userId for verification.
 *
 * Returns the count of successfully sent notifications.
 */
export async function notifyAllUsers(
  callerUserId: string,
  title: string,
  body: string,
  type: NotificationType = 'system',
  data?: Record<string, string>,
): Promise<{ sent: number; total: number }> {
  if (!isAdmin(callerUserId)) {
    console.error(`[notifications] notifyAllUsers denied — ${callerUserId} is not an admin`)
    throw new Error('Unauthorized: only admins can send system-wide notifications')
  }

  if (!supabaseAdmin) {
    throw new Error('Supabase Admin not initialized')
  }

  // Fetch all user IDs via auth.users (requires service role key)
  const allUserIds: string[] = []
  let page = 1
  const perPage = 1000

  while (true) {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) {
      console.error('[notifications] Failed to list users:', error.message)
      throw new Error('Failed to fetch user list')
    }

    for (const u of users) {
      allUserIds.push(u.id)
    }

    if (users.length < perPage) break
    page++
  }

  console.log(`[notifications] Sending system notification to ${allUserIds.length} users…`)

  let sent = 0
  // Send in parallel batches of 50 to avoid overwhelming the DB
  const batchSize = 50
  for (let i = 0; i < allUserIds.length; i += batchSize) {
    const batch = allUserIds.slice(i, i + batchSize)
    const results = await Promise.allSettled(
      batch.map(userId =>
        sendNotification({ userId, title, body, type, data })
      )
    )
    sent += results.filter(r => r.status === 'fulfilled' && r.value !== null).length
  }

  console.log(`[notifications] System notification sent: ${sent}/${allUserIds.length}`)
  return { sent, total: allUserIds.length }
}

// ─── Feature Announcement Helper ─────────────────────────────────────────────

/**
 * Send a "new feature" announcement notification to a specific user.
 * Use with `notifyAllUsers` for broad announcements, or individually.
 */
export async function notifyNewFeature(
  userId: string,
  featureName: string,
  description: string,
  url?: string,
): Promise<Notification | null> {
  return sendNotification({
    userId,
    title: `Neu: ${featureName}`,
    body: description,
    type: 'system',
    data: {
      featureName,
      ...(url ? { url } : {}),
    },
  })
}
