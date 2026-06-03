/**
 * React hook for iOS-native mobile enhancements
 */

import { useEffect } from 'react'
import { adjustViewportForKeyboard, preventIOSZoom, hapticFeedback } from '@/utils/mobile-utils'

export const useMobileEnhancements = () => {
 useEffect(() => {
    // Set up viewport adjustment for keyboard
 const cleanupViewport = adjustViewportForKeyboard()
 
    // Prevent iOS zoom on input focus
 const cleanupZoom = preventIOSZoom()

 return () => {
 cleanupViewport?.()
 cleanupZoom?.()
 }
 }, [])

 return {
 hapticFeedback,
 scrollToError: (fieldName: string) => {
 const element = document.querySelector(`[data-error="true"][data-field="${fieldName}"]`) as HTMLElement
 if (element) {
 element.scrollIntoView({ behavior: 'smooth', block: 'center' })
 hapticFeedback('light')
 }
 }
 }
}