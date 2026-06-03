'use client'

import { useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

/**
 * useHaptics Hook
 *
 * Provides haptic feedback functions for mobile devices.
 * Automatically checks if running on native platform.
 *
 * Usage:
 * ```tsx
 * const { impact, notification, vibrate } = useHaptics()
 *
 * <button onClick={() => {
 *   impact('medium')
 *   // your action
 * }}>
 *   Click me
 * </button>
 * ```
 */
export function useHaptics() {
 const isNative = Capacitor.isNativePlatform()

 const impact = useCallback(async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
 if (!isNative) return

 try {
 const styleMap = {
 light: ImpactStyle.Light,
 medium: ImpactStyle.Medium,
 heavy: ImpactStyle.Heavy,
 }
 await Haptics.impact({ style: styleMap[style] })
 } catch (error) {
      console.error('Haptics error:', error)
 }
 }, [isNative])

 const notification = useCallback(async (type: 'success' | 'warning' | 'error' = 'success') => {
 if (!isNative) return

 try {
 const typeMap = {
 success: NotificationType.Success,
 warning: NotificationType.Warning,
 error: NotificationType.Error,
 }
 await Haptics.notification({ type: typeMap[type] })
 } catch (error) {
      console.error('Haptics error:', error)
 }
 }, [isNative])

 const vibrate = useCallback(async (duration = 300) => {
 if (!isNative) return

 try {
 await Haptics.vibrate({ duration })
 } catch (error) {
      console.error('Haptics error:', error)
 }
 }, [isNative])

 const selectionStart = useCallback(async () => {
 if (!isNative) return

 try {
 await Haptics.selectionStart()
 } catch (error) {
      console.error('Haptics error:', error)
 }
 }, [isNative])

 const selectionChanged = useCallback(async () => {
 if (!isNative) return

 try {
 await Haptics.selectionChanged()
 } catch (error) {
      console.error('Haptics error:', error)
 }
 }, [isNative])

 const selectionEnd = useCallback(async () => {
 if (!isNative) return

 try {
 await Haptics.selectionEnd()
 } catch (error) {
      console.error('Haptics error:', error)
 }
 }, [isNative])

 return {
 impact,
 notification,
 vibrate,
 selectionStart,
 selectionChanged,
 selectionEnd,
 isAvailable: isNative,
 }
}
