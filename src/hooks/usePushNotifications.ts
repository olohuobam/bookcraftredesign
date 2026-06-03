'use client'

/**
 * usePushNotifications Hook
 *
 * Initialises native push notification infrastructure once on mount:
 *   1. Creates the Android "book-ready" notification channel
 *   2. Requests local-notification permission (for immediate book-done triggers)
 *   3. Requests remote-push permission and registers the device token
 *      — only requests the iOS permission dialog on first app open after login
 *      — subsequent launches skip the dialog (permission already decided)
 *   4. Registers a listener for notification taps → navigates to the finished book
 *
 * Usage:
 *   Mount once near the root of the authenticated app tree (e.g. in a layout or
 *   the AuthContext provider). The hook is safe to call on web — all native calls
 *   are guarded and silently skipped on non-Capacitor platforms.
 */

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '@/context/AuthContext'
import {
 createAndroidNotificationChannel,
 requestLocalNotificationPermission,
 requestPushNotificationPermission,
 onDeviceTokenReceived,
 onNotificationAction,
 resetBadgeCount,
} from '@/lib/push-notification-service'
import { getFcmTokenNative } from '@/lib/fcm-token-native'


export function usePushNotifications() {
 const router = useRouter()
 const { getIdToken, user } = useAuth()

 const handleNotificationTap = useCallback(
 (bookId: string) => {
      // Navigate to the book detail page when user taps the notification
      // router.push is stable in Next.js — safe to omit from deps to prevent
      // unnecessary listener re-registration when the router reference changes.
 router.push(`/dashboard/books/${bookId}`)
 },
    // eslint-disable-next-line react-hooks/exhaustive-deps
 [],
 )

 useEffect(() => {
    // Only run on native Capacitor platforms
 if (!Capacitor.isNativePlatform()) return

    // Wait until user is logged in
 if (!user) return

 let cleanupToken: (() => void) | undefined
 let cleanupAction: (() => void) | undefined
 let cleanupAndroidListeners: (() => void) | undefined

 const init = async () => {
      const platform = Capacitor.getPlatform()

      // 0. Reset badge count when app opens
      resetBadgeCount().catch(() => {}) // fire-and-forget, can hang on Android

      // 1. Android channel (no-op on iOS)
      await createAndroidNotificationChannel()

      // 2. Local notification permission
      await requestLocalNotificationPermission()

      // 3. Remote push registration
      if (platform === 'android') {
        // Android: The @capacitor/push-notifications event-based bridge is unreliable
        // when loading from a remote URL (server.url). The 'registration' event never
        // fires even though FCM retrieves the token natively.
        //
        // Strategy: Use our custom FcmTokenPlugin that returns the token directly
        // via a PluginCall (request-response), bypassing the broken event system.
        // Fall back to the standard approach if the native plugin isn't available.

        const saveToken = async (token: string, plt: 'ios' | 'android') => {
          console.info(`[usePushNotifications] Token received (${plt}):`, token.slice(0, 10) + '...')
          try { localStorage.setItem('bookcraft_device_push_token', token) } catch { /* ignore */ }
          try {
            const jwt = await getIdToken()
            await fetch('/api/device-tokens', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
              body: JSON.stringify({ token, platform: plt }),
            })
            console.info('[usePushNotifications] Token saved to backend')
          } catch (err) {
            console.warn('[usePushNotifications] Failed to save token:', err)
          }
        }

        const androidListenerCleanups: Array<() => void> = []

        // Primary: Use native FcmTokenPlugin for reliable token retrieval
        console.info('[usePushNotifications] Android: trying native FcmTokenPlugin...')
        const nativeToken = await getFcmTokenNative()
        const { PushNotifications } = await import('@capacitor/push-notifications')

        if (nativeToken) {
          await saveToken(nativeToken, 'android')
        } else {
          // Fallback: Try the standard Capacitor push-notifications approach
          console.warn('[usePushNotifications] Native plugin failed, falling back to standard approach')

          try {
            const registrationHandle = await PushNotifications.addListener('registration', (t) => {
              void saveToken(t.value, 'android')
            })
            androidListenerCleanups.push(() => registrationHandle.remove())
          } catch (err) {
            console.warn('[usePushNotifications] addListener(registration) failed:', err)
          }

          try {
            const registrationErrorHandle = await PushNotifications.addListener('registrationError', (err) => {
              console.error('[usePushNotifications] FCM registration error:', err)
            })
            androidListenerCleanups.push(() => registrationErrorHandle.remove())
          } catch {
            // ignore listener setup failures here — native path already failed, fallback is best-effort
          }

          PushNotifications.register().catch(
            (err) => console.error('[usePushNotifications] register() error:', err)
          )
        }

        // Keep a listener for foreground push logging on Android and clean it up on unmount
        try {
          const notificationReceivedHandle = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.info('[usePushNotifications] Push received:', notification)
          })
          androidListenerCleanups.push(() => notificationReceivedHandle.remove())
        } catch {
          // ignore
        }

        cleanupAndroidListeners = () => {
          androidListenerCleanups.forEach((cleanup) => cleanup())
        }
      } else {
        // iOS: standard flow with await (bridge calls work reliably on iOS)
        const granted = await requestPushNotificationPermission()
        if (granted) {
          cleanupToken = await onDeviceTokenReceived(async (token, plt) => {
            console.info(`[usePushNotifications] Token registered (${plt}):`, token.slice(0, 10) + '...')
            try { localStorage.setItem('bookcraft_device_push_token', token) } catch { /* ignore */ }
            try {
              const jwt = await getIdToken()
              await fetch('/api/device-tokens', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
                body: JSON.stringify({ token, platform: plt }),
              })
              console.info('[usePushNotifications] Token saved to backend')
            } catch (err) {
              console.warn('[usePushNotifications] Failed to save token:', err)
            }
          })
        }
      }

      // 4. Notification tap → navigate to book
      cleanupAction = await onNotificationAction(handleNotificationTap)
 }

 init()

 return () => {
 cleanupToken?.()
 cleanupAction?.()
 cleanupAndroidListeners?.()
 }
 }, [handleNotificationTap, getIdToken, user])
}
