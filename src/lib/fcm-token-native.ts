/**
 * fcm-token-native.ts
 *
 * JS bridge to the native FcmTokenPlugin (Android only).
 *
 * When Capacitor loads from a remote URL (server.url = "https://bookcraft.dev"),
 * the @capacitor/push-notifications `register()` call successfully triggers
 * FCM token retrieval natively, but the async 'registration' event never
 * reaches JS — the notifyListeners bridge is unreliable with remote URLs.
 *
 * This module calls our custom native plugin that resolves the PluginCall
 * directly with the token (request-response pattern, not event-based).
 */

import { Capacitor, registerPlugin } from '@capacitor/core'

interface FcmTokenPlugin {
  getToken(): Promise<{ token: string }>
}

const FcmToken = registerPlugin<FcmTokenPlugin>('FcmToken')

/**
 * Fetch the FCM device token directly from the native Firebase SDK.
 * Returns the token string, or null if not on Android or if the request fails.
 */
export async function getFcmTokenNative(): Promise<string | null> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return null
  }

  try {
    const result = await FcmToken.getToken()
    console.info('[fcm-token-native] Token received:', result.token.slice(0, 10) + '...')
    return result.token
  } catch (err) {
    console.error('[fcm-token-native] Failed to get FCM token:', err)
    return null
  }
}
