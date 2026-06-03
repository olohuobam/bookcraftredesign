/**
 * Push Notification Service for Bookcraft
 *
 * Handles native push notifications (iOS/Android via Capacitor) and
 * local notifications for in-session book generation completion events.
 *
 * Architecture:
 * - Uses @capacitor/push-notifications for remote push (device token registration)
 * - Uses @capacitor/local-notifications for immediate local trigger when a book is done
 * - Graceful no-op on web/desktop (non-native) platforms
 */

import { Capacitor } from '@capacitor/core'

// Lazily import Capacitor plugins to avoid SSR issues
let PushNotifications: typeof import('@capacitor/push-notifications').PushNotifications | null = null
let LocalNotifications: typeof import('@capacitor/local-notifications').LocalNotifications | null = null

const isNative = (): boolean => {
 if (typeof window === 'undefined') return false
 return Capacitor.isNativePlatform()
}

async function getPushNotifications() {
 if (!PushNotifications) {
 const mod = await import('@capacitor/push-notifications')
 PushNotifications = mod.PushNotifications
 }
 return PushNotifications
}

async function getLocalNotifications() {
 if (!LocalNotifications) {
 const mod = await import('@capacitor/local-notifications')
 LocalNotifications = mod.LocalNotifications
 }
 return LocalNotifications
}

// ─── Permission Management ────────────────────────────────────────────────────

/**
 * Request permission for local notifications (used for immediate triggers
 * when the book generation completes inside the current session).
 * Returns true if granted.
 */
export async function requestLocalNotificationPermission(): Promise<boolean> {
 if (!isNative()) return false

 try {
 const LN = await getLocalNotifications()
 let status = await LN.checkPermissions()

 if (status.display === 'prompt' || status.display === 'prompt-with-rationale') {
 status = await LN.requestPermissions()
 }

 return status.display === 'granted'
 } catch (err) {
    console.error('[PushNotificationService] Local permission error:', err)
 return false
 }
}

/**
 * Request permission for remote push notifications and register with APNs/FCM.
 * The device token is returned via the `onRegistration` listener.
 * Returns true if permission was granted (token registration is async).
 *
 * Android notes:
 * - On Android < 13 (API < 33) push permission is granted automatically, no dialog shown.
 * - On Android 13+ the POST_NOTIFICATIONS runtime permission dialog is shown.
 * - `checkPermissions()` may return 'denied' on the *first* call if the user has not been
 *   asked yet (Capacitor quirk on some Android versions). We therefore call
 *   `requestPermissions()` for any Android status that is not 'granted' — the OS will
 *   not show the dialog twice if the user already decided.
 * - We set a `push_permission_requested` flag AFTER calling requestPermissions() so
 *   isPushPermissionPermanentlyDenied() can correctly distinguish "never asked" from
 *   "user explicitly denied".
 * - On Android, we re-verify with checkPermissions() after requestPermissions() because
 *   the returned status from requestPermissions() can be inaccurate on some Android versions.
 */
export async function requestPushNotificationPermission(): Promise<boolean> {
  if (!isNative()) {
    console.error('[PushNotificationService] requestPushNotificationPermission called on non-native platform')
    return false
  }

  try {
    const PN = await getPushNotifications()
    const platform = Capacitor.getPlatform()

    console.log('[PushNotificationService] Starting push permission flow | platform:', platform)

    if (platform === 'android') {
      // Android: Both checkPermissions() and requestPermissions() can hang indefinitely
      // when called from a Capacitor WebView loading a remote URL (bookcraft.dev).
      // The OS permission dialog never appears, and the promise never resolves.
      //
      // Strategy: Skip permission API calls on Android.
      // Use our custom FcmTokenPlugin (native bridge) for reliable token retrieval.
      // Do not mark the permission as "requested" here because no OS prompt is shown.
      if (typeof window !== 'undefined') {
        localStorage.removeItem('push_permission_requested')
      }
      // Token retrieval is handled by usePushNotifications hook via FcmTokenPlugin
      console.log('[PushNotificationService] Android: permission flow skipped (handled by FcmTokenPlugin)')
      return true
    }

    // ── iOS flow (unchanged) ──────────────────────────────────────────────────
    let status = await PN.checkPermissions()
    console.log('[PushNotificationService] iOS initial permission check:', status.receive)

    if (status.receive === 'prompt' || status.receive === 'prompt-with-rationale') {
      status = await PN.requestPermissions()
      console.log('[PushNotificationService] iOS requestPermissions() returned:', status.receive)
      if (typeof window !== 'undefined') {
        localStorage.setItem('push_permission_requested', '1')
      }
    }

    if (status.receive === 'granted') {
      await PN.register()
      console.log('[PushNotificationService] iOS push permission granted, registered')
      return true
    }

    console.error('[PushNotificationService] iOS push permission not granted. Status:', status.receive)
    return false
  } catch (err) {
    console.error('[PushNotificationService] Push permission error:', err)
    return false
  }
}

/**
 * Check whether push notification permission has been permanently denied by the user.
 * Returns true only when the user has explicitly denied AND the OS will no longer show
 * a dialog (requires opening System Settings to re-enable).
 *
 * Uses a localStorage flag to avoid false positives on Android, where
 * checkPermissions() can return 'denied' before the user has ever been asked.
 */
export async function isPushPermissionPermanentlyDenied(): Promise<boolean> {
 if (!isNative()) return false
 try {
 const PN = await getPushNotifications()
 const status = await PN.checkPermissions()
 // If already granted, definitely not permanently denied
 if (status.receive === 'granted') return false

 // If status is 'prompt' or 'prompt-with-rationale', the OS can still show a dialog.
 // This means the user was never actually denied — the flag may be stale (set by old code
 // that set it BEFORE calling requestPermissions). Clear stale flag to unblock the flow.
 if (status.receive === 'prompt' || status.receive === 'prompt-with-rationale') {
   if (typeof window !== 'undefined') {
     localStorage.removeItem('push_permission_requested')
     console.log('[PushNotificationService] Cleared stale push_permission_requested flag (status is prompt)')
   }
   return false
 }

 // Only treat as permanently denied when BOTH:
 // 1. Status is 'denied'
 // 2. We already called requestPermissions() at least once (flag is set)
 // Note: On Android, 'denied' before any dialog can be a Capacitor quirk — but since we
 // now only set the flag AFTER calling requestPermissions(), this should be accurate.
 // On iOS (and after reinstall/upgrade), if status is already 'denied' but the flag was
 // never set on this device, we still treat it as permanently denied (iOS enforces a hard
 // single-prompt limit, so 'denied' on iOS without the flag is accurate).
 const platform = Capacitor.getPlatform()
 const wasRequested =
 typeof window !== 'undefined' &&
 localStorage.getItem('push_permission_requested') === '1'
 // iOS: treat 'denied' as permanently denied regardless of flag (no second OS dialog)
 const result = status.receive === 'denied' && (wasRequested || platform !== 'android')
 console.log('[PushNotificationService] isPushPermissionPermanentlyDenied:', result, '| status:', status.receive, '| wasRequested:', wasRequested)
 return result
 } catch (err) {
   console.error('[PushNotificationService] isPushPermissionPermanentlyDenied error:', err)
   return false
 }
}

// ─── Device Token Registration ────────────────────────────────────────────────

export type DeviceTokenCallback = (token: string, platform: 'ios' | 'android') => void

/**
 * Register a listener for device token events.
 * Call this once during app initialisation (e.g. in a provider / layout).
 * Returns a cleanup function to remove the listener.
 */
export async function onDeviceTokenReceived(
 callback: DeviceTokenCallback,
): Promise<() => void> {
 if (!isNative()) return () => {}

 try {
 const PN = await getPushNotifications()
 const handle = await PN.addListener('registration', (token) => {
 const platform = Capacitor.getPlatform() as 'ios' | 'android'
      console.log('[PushNotificationService] Device token received:', token.value.slice(0, 10) + '...')
      // Cache token for logout cleanup
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('bookcraft_device_push_token', token.value)
        } catch (err) {
          console.warn('[PushNotificationService] Failed to cache device push token:', err)
        }
      }
 callback(token.value, platform)
 })

 const errHandle = await PN.addListener('registrationError', (err) => {
      console.error('[PushNotificationService] Registration error:', err)
 })

 return () => {
 handle.remove()
 errHandle.remove()
 }
 } catch (err) {
    console.error('[PushNotificationService] Token listener error:', err)
 return () => {}
 }
}

// ─── Notification Action Handling ─────────────────────────────────────────────

export type NotificationActionCallback = (bookId: string) => void

/**
 * Register listeners for both remote push taps and local notification taps.
 * When a user taps a "book ready" notification, `callback` is called with the bookId.
 * Returns a cleanup function.
 */
export async function onNotificationAction(
 callback: NotificationActionCallback,
): Promise<() => void> {
 if (!isNative()) return () => {}

 const cleanups: Array<() => void> = []

 try {
    // Remote push tap
 const PN = await getPushNotifications()
 const remoteHandle = await PN.addListener('pushNotificationActionPerformed', (action) => {
 const bookId =
 action.notification?.data?.bookId ??
 action.notification?.data?.book_id

 if (bookId) {
        console.log('[PushNotificationService] Remote notification tapped, bookId:', bookId)
 callback(String(bookId))
 }
 })
 cleanups.push(() => remoteHandle.remove())
 } catch (err) {
    console.error('[PushNotificationService] Remote action listener error:', err)
 }

 try {
    // Local notification tap
 const LN = await getLocalNotifications()
 const localHandle = await LN.addListener('localNotificationActionPerformed', (action) => {
 const bookId = action.notification?.extra?.bookId

 if (bookId) {
        console.log('[PushNotificationService] Local notification tapped, bookId:', bookId)
 callback(String(bookId))
 }
 })
 cleanups.push(() => localHandle.remove())
 } catch (err) {
    console.error('[PushNotificationService] Local action listener error:', err)
 }

 return () => cleanups.forEach((fn) => fn())
}

// ─── Trigger Notification ─────────────────────────────────────────────────────

let localNotificationIdCounter = 1

/**
 * Trigger a local notification announcing that a book is ready.
 * This works even when the app is in the background (during the same session).
 * Silently does nothing on non-native platforms or if permission was denied.
 *
 * @param bookTitle - The title of the completed book
 * @param bookId    - The book ID (used for deep-link on tap)
 */
export async function notifyBookReady(bookTitle: string, bookId: string): Promise<void> {
 if (!isNative()) {
    console.log('[PushNotificationService] Web platform — skipping notification for book:', bookTitle)
 return
 }

 const granted = await requestLocalNotificationPermission()
 if (!granted) {
    console.error('[PushNotificationService] Permission denied — cannot send notification')
 return
 }

 try {
 const LN = await getLocalNotifications()
 const id = localNotificationIdCounter++

 await LN.schedule({
 notifications: [
 {
 id,
 title: 'Dein Buch ist fertig!',
 body: `„${bookTitle}" wurde erfolgreich generiert. Jetzt ansehen!`,
 extra: { bookId },
          // Small delay to avoid race conditions with permission dialogs (especially on iOS,
          // where the permission modal is blocking and must be fully dismissed first)
 schedule: { at: new Date(Date.now() + 2000) },
 sound: undefined, // use system default
 actionTypeId: '',
 attachments: undefined,
 channelId: 'book-ready', // Android channel (configured below)
 },
 ],
 })

    console.log('[PushNotificationService] Local notification scheduled for book:', bookTitle)
 } catch (err) {
    console.error('[PushNotificationService] Failed to schedule notification:', err)
 }
}

// ─── Android Notification Channel ─────────────────────────────────────────────

/**
 * Create the Android notification channel required for book-ready notifications.
 * Call once during app initialisation. No-op on iOS/web.
 */
// Android NotificationManager constants for channel configuration
// See: https://developer.android.com/reference/android/app/NotificationManager
const ANDROID_IMPORTANCE_HIGH = 4 // NotificationManager.IMPORTANCE_HIGH — makes sound and pops on screen
const ANDROID_VISIBILITY_PUBLIC = 1 // Notification.VISIBILITY_PUBLIC — shows on lock screen

// ─── Badge Reset ──────────────────────────────────────────────────────────────

/**
 * Reset the app badge count to zero.
 * Call when the app is opened / foregrounded to clear any stale badge numbers.
 * No-op on web.
 */
export async function resetBadgeCount(): Promise<void> {
  if (!isNative()) return

  try {
    const PN = await getPushNotifications()
    // removeAllDeliveredNotifications clears the notification center
    // and resets the badge on iOS
    await PN.removeAllDeliveredNotifications()
  } catch (err) {
    console.error('[PushNotificationService] Badge reset error:', err)
  }
}

// ─── Token Cleanup ────────────────────────────────────────────────────────────

/**
 * Remove the current device token from the backend (e.g. on logout).
 * This prevents push notifications from being sent to a device after the user logs out.
 */
export async function unregisterDeviceToken(
  getIdToken: () => Promise<string | null>,
): Promise<void> {
  if (!isNative()) return

  try {
    // Retrieve the cached token from localStorage
    const cachedToken = typeof window !== 'undefined'
      ? localStorage.getItem('bookcraft_device_push_token')
      : null

    if (!cachedToken) {
      console.log('[PushNotificationService] No cached token to unregister')
      return
    }

    const jwt = await getIdToken()
    if (!jwt) return

    const response = await fetch('/api/device-tokens', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ token: cachedToken }),
    })

    if (response.ok) {
      localStorage.removeItem('bookcraft_device_push_token')
      console.log('[PushNotificationService] Device token unregistered')
    } else {
      // Retain cached token so the next logout attempt can retry
      console.error(`[PushNotificationService] Token unregister failed (${response.status}), retaining for next attempt`)
    }
  } catch (err) {
    console.error('[PushNotificationService] Token unregister error:', err)
  }
}

// ─── Android Notification Channel ─────────────────────────────────────────────

export async function createAndroidNotificationChannel(): Promise<void> {
 if (!isNative() || Capacitor.getPlatform() !== 'android') return

 try {
 const LN = await getLocalNotifications()
 // Local notification channel for book-ready triggers
 await LN.createChannel({
 id: 'book-ready',
 name: 'Buch fertig',
 description: 'Benachrichtigungen wenn dein Buch generiert wurde',
 importance: ANDROID_IMPORTANCE_HIGH,
 visibility: ANDROID_VISIBILITY_PUBLIC,
 sound: 'default',
 vibration: true,
 })

 // Default channel for remote FCM push notifications
 await LN.createChannel({
 id: 'bookcraft-default',
 name: 'Bookcraft',
 description: 'Allgemeine Benachrichtigungen von Bookcraft',
 importance: ANDROID_IMPORTANCE_HIGH,
 visibility: ANDROID_VISIBILITY_PUBLIC,
 sound: 'default',
 vibration: true,
 })
    console.log('[PushNotificationService] Android channels created')
 } catch (err) {
    console.error('[PushNotificationService] Channel creation error:', err)
 }
}
