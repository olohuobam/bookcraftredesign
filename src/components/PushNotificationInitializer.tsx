'use client'

/**
 * PushNotificationInitializer
 *
 * Mounts the `usePushNotifications` hook once at the root of the app tree
 * (inside Providers, after AuthProvider so the router is available).
 * Renders nothing — it's a side-effect-only component.
 */

import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function PushNotificationInitializer() {
 usePushNotifications()
 return null
}
