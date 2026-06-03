/**
 * push-sender.ts — Server-side push notification sender
 *
 * Sends push notifications via APNs (iOS) and FCM (Android) using firebase-admin.
 * This file is SERVER-SIDE ONLY — never import from client components.
 *
 * ─── Required Vercel Environment Variables ────────────────────────────────────
 *   FIREBASE_SERVICE_ACCOUNT  JSON string of the Firebase service account key
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as admin from 'firebase-admin'
import { SupabaseDB } from './supabase-db'

// ─── Firebase Admin (singleton) ───────────────────────────────────────────────

function getFirebaseApp(): admin.app.App | null {
  if (admin.apps.length > 0) return admin.apps[0]!

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!serviceAccountJson) {
    console.warn('FIREBASE_SERVICE_ACCOUNT not configured — push notifications disabled')
    return null
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson)
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
  } catch (err) {
    console.error('Failed to initialize Firebase Admin:', err)
    return null
  }
}

// ─── Send Push Notification ───────────────────────────────────────────────────

interface PushPayload {
  title: string
  body: string
  data?: Record<string, string>
}

/**
 * Send a push notification to a specific user.
 * Fetches all device tokens for the user and sends via FCM.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const app = getFirebaseApp()
  if (!app) return

  try {
    const tokens = await SupabaseDB.getUserDeviceTokens(userId)
    if (!tokens || tokens.length === 0) {
      console.log(`No device tokens for user ${userId} — skipping push`)
      return
    }

    const messaging = admin.messaging(app)

    const message: admin.messaging.MulticastMessage = {
      tokens: tokens.map(t => t.token),
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          channelId: 'bookcraft-default',
        },
      },
    }

    const response = await messaging.sendEachForMulticast(message)

    console.log(
      `Push sent to user ${userId}: ${response.successCount} success, ${response.failureCount} failed`
    )

    // Clean up invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens: string[] = []
      response.responses.forEach((resp, i) => {
        if (
          !resp.success &&
          resp.error?.code &&
          ['messaging/invalid-registration-token', 'messaging/registration-token-not-registered'].includes(
            resp.error.code
          )
        ) {
          invalidTokens.push(tokens[i].token)
        }
      })

      if (invalidTokens.length > 0) {
        console.log(`Removing ${invalidTokens.length} invalid tokens for user ${userId}`)
        await Promise.all(invalidTokens.map(t => SupabaseDB.deleteDeviceToken(t)))
      }
    }
  } catch (err) {
    console.error(`Failed to send push to user ${userId}:`, err)
  }
}

/**
 * Send a "book generation complete" notification.
 */
export async function notifyBookComplete(userId: string, bookTitle: string, bookId: string): Promise<void> {
  await sendPushToUser(userId, {
    title: 'Dein Buch ist fertig!',
    body: `"${bookTitle}" wurde erfolgreich erstellt.`,
    data: {
      type: 'book_complete',
      bookId,
    },
  })
}

/**
 * Send a "print order status update" notification.
 */
export async function notifyPrintOrderUpdate(
  userId: string,
  bookTitle: string,
  status: string
): Promise<void> {
  const statusLabels: Record<string, string> = {
    in_production: 'wird jetzt gedruckt',
    shipped: 'wurde versendet',
    delivered: 'wurde geliefert',
  }

  const statusText = statusLabels[status] || `Status: ${status}`

  await sendPushToUser(userId, {
    title: 'Druckauftrag Update',
    body: `"${bookTitle}" ${statusText}`,
    data: {
      type: 'print_order_update',
      status,
    },
  })
}

/**
 * Legacy alias — used by generation pipelines.
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  await sendPushToUser(userId, { title, body, data })
}
