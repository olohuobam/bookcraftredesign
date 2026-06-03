'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { Capacitor } from '@capacitor/core'

interface ContentProtectionOptions {
 disableCopy?: boolean
 disableContextMenu?: boolean
 disablePrint?: boolean
 disableKeyboardShortcuts?: boolean
 disableDevTools?: boolean
 disableDragDrop?: boolean
 disableSelection?: boolean
 blurOnFocusLoss?: boolean
 detectScreenCapture?: boolean
 blurOnInactivity?: boolean
 inactivityTimeout?: number // in milliseconds
 onProtectionTriggered?: (type: 'copy' | 'contextmenu' | 'print' | 'keyboard' | 'screenshot' | 'devtools' | 'blur' | 'drag' | 'inactivity') => void
}

const defaultOptions: ContentProtectionOptions = {
 disableCopy: false,
 disableContextMenu: false,
 disablePrint: false,
 disableKeyboardShortcuts: false,
 disableDevTools: false,
 disableDragDrop: false,
 disableSelection: false,
 blurOnFocusLoss: false,
 detectScreenCapture: false,
 blurOnInactivity: false,
 inactivityTimeout: 60000, // 1 minute
}

export function useContentProtection(options: ContentProtectionOptions = defaultOptions) {
 const [isProtectionActive, setIsProtectionActive] = useState(true)
 const [lastAttempt, setLastAttempt] = useState<{ type: string; timestamp: Date } | null>(null)
 const [isBlurred, setIsBlurred] = useState(false)
 const [devToolsOpen, setDevToolsOpen] = useState(false)
 const [isInactive, setIsInactive] = useState(false)
 const devToolsCheckInterval = useRef<NodeJS.Timeout | null>(null)
 const inactivityTimeout = useRef<NodeJS.Timeout | null>(null)
 const handleProtectionTriggered = useCallback((type: 'copy' | 'contextmenu' | 'print' | 'keyboard' | 'screenshot' | 'devtools' | 'blur' | 'drag' | 'inactivity') => {
 setLastAttempt({ type, timestamp: new Date() })
 options.onProtectionTriggered?.(type)
 }, [options])

  // Block copy events
 const handleCopy = useCallback((e: ClipboardEvent) => {
 if (options.disableCopy) {
 e.preventDefault()
 e.stopPropagation()
      // Replace clipboard with warning message
 e.clipboardData?.setData('text/plain', ' Copying is not allowed. This content is copyrighted.')
 handleProtectionTriggered('copy')
 return false
 }
 }, [options.disableCopy, handleProtectionTriggered])

  // Block cut events
 const handleCut = useCallback((e: ClipboardEvent) => {
 if (options.disableCopy) {
 e.preventDefault()
 e.stopPropagation()
 handleProtectionTriggered('copy')
 return false
 }
 }, [options.disableCopy, handleProtectionTriggered])

  // Block context menu (right-click)
 const handleContextMenu = useCallback((e: MouseEvent) => {
 if (options.disableContextMenu) {
 e.preventDefault()
 e.stopPropagation()
 handleProtectionTriggered('contextmenu')
 return false
 }
 }, [options.disableContextMenu, handleProtectionTriggered])

  // Block drag events
 const handleDragStart = useCallback((e: DragEvent) => {
 if (options.disableDragDrop) {
 e.preventDefault()
 e.stopPropagation()
 handleProtectionTriggered('drag')
 return false
 }
 }, [options.disableDragDrop, handleProtectionTriggered])

  // Block selection
 const handleSelectStart = useCallback((e: Event) => {
 if (options.disableSelection) {
 e.preventDefault()
 return false
 }
 }, [options.disableSelection])

  // Block keyboard shortcuts
 const handleKeyDown = useCallback((e: KeyboardEvent) => {
 if (!options.disableKeyboardShortcuts) return

 const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
 const modifier = isMac ? e.metaKey : e.ctrlKey

    // Block Ctrl/Cmd + C (Copy)
 if (modifier && e.key.toLowerCase() === 'c') {
 e.preventDefault()
 e.stopPropagation()
 handleProtectionTriggered('keyboard')
 return false
 }

    // Block Ctrl/Cmd + X (Cut)
 if (modifier && e.key.toLowerCase() === 'x') {
 e.preventDefault()
 e.stopPropagation()
 handleProtectionTriggered('keyboard')
 return false
 }

    // Block Ctrl/Cmd + A (Select All)
 if (modifier && e.key.toLowerCase() === 'a') {
 e.preventDefault()
 e.stopPropagation()
 handleProtectionTriggered('keyboard')
 return false
 }

    // Block Ctrl/Cmd + S (Save)
 if (modifier && e.key.toLowerCase() === 's') {
 e.preventDefault()
 e.stopPropagation()
 handleProtectionTriggered('keyboard')
 return false
 }

    // Block Ctrl/Cmd + P (Print)
 if (modifier && e.key.toLowerCase() === 'p') {
 e.preventDefault()
 e.stopPropagation()
 handleProtectionTriggered('print')
 return false
 }

    // Block Ctrl/Cmd + U (View Source)
 if (modifier && e.key.toLowerCase() === 'u') {
 e.preventDefault()
 e.stopPropagation()
 handleProtectionTriggered('keyboard')
 return false
 }

    // Block Ctrl/Cmd + Shift + I (DevTools)
 if (modifier && e.shiftKey && e.key.toLowerCase() === 'i') {
 e.preventDefault()
 e.stopPropagation()
 handleProtectionTriggered('devtools')
 return false
 }

    // Block Ctrl/Cmd + Shift + J (Console)
 if (modifier && e.shiftKey && e.key.toLowerCase() === 'j') {
 e.preventDefault()
 e.stopPropagation()
 handleProtectionTriggered('devtools')
 return false
 }

    // Block Ctrl/Cmd + Shift + C (Inspect Element)
 if (modifier && e.shiftKey && e.key.toLowerCase() === 'c') {
 e.preventDefault()
 e.stopPropagation()
 handleProtectionTriggered('devtools')
 return false
 }

    // Block Ctrl/Cmd + Option/Alt + I (DevTools Mac)
 if (modifier && e.altKey && e.key.toLowerCase() === 'i') {
 e.preventDefault()
 e.stopPropagation()
 handleProtectionTriggered('devtools')
 return false
 }

    // Block F12 (DevTools)
 if (e.key === 'F12') {
 e.preventDefault()
 e.stopPropagation()
 handleProtectionTriggered('devtools')
 return false
 }

    // Block Print Screen
 if (e.key === 'PrintScreen') {
 e.preventDefault()
 e.stopPropagation()
      // Try to clear clipboard
 if (navigator.clipboard) {
 navigator.clipboard.writeText(' Screenshots are not allowed.')
 }
 handleProtectionTriggered('screenshot')
 return false
 }

    // Block Windows + Shift + S (Windows Screenshot)
 if (e.metaKey && e.shiftKey && e.key.toLowerCase() === 's') {
 e.preventDefault()
 e.stopPropagation()
 handleProtectionTriggered('screenshot')
 return false
 }
 }, [options.disableKeyboardShortcuts, handleProtectionTriggered])

  // Block print via beforeprint event
 const handleBeforePrint = useCallback(() => {
 if (options.disablePrint) {
 handleProtectionTriggered('print')
      // Hide content before print
 document.querySelectorAll('.protected-content').forEach((el) => {
 (el as HTMLElement).style.visibility = 'hidden'
 })
 }
 }, [options.disablePrint, handleProtectionTriggered])

  // Restore content after print
 const handleAfterPrint = useCallback(() => {
 document.querySelectorAll('.protected-content').forEach((el) => {
 (el as HTMLElement).style.visibility = 'visible'
 })
 }, [])

  // Visibility change detection (potential screenshot) - DISABLED
 const handleVisibilityChange = useCallback(() => {
    // Screenshot detection disabled
 }, [])

  // Blur on focus loss - DISABLED
 const handleBlur = useCallback(() => {
    // Blur on focus loss disabled
 }, [])

 const handleFocus = useCallback(() => {
    // No blur to remove
 }, [])

  // DevTools detection via timing - DISABLED
 const detectDevTools = useCallback(() => {
    // DevTools blur disabled
 }, [])

  // Mobile: Block long press (context menu on touch)
 const handleTouchStart = useCallback((e: TouchEvent) => {
    // Store touch start time to detect long press
 const target = e.target as HTMLElement
 if (target.closest('.protected-content')) {
      // Prevent default on images to block save image dialog
 if (target.tagName === 'IMG' || target.tagName === 'VIDEO') {
 e.preventDefault()
 }
 }
 }, [])

 const handleTouchEnd = useCallback((e: TouchEvent) => {
    // Clear any long press detection
 }, [])

  // iOS: Detect screenshot via accelerometer change - DISABLED
 const handleDeviceMotion = useCallback((e: DeviceMotionEvent) => {
    // iOS screenshot detection disabled
 }, [])

 useEffect(() => {
 if (!isProtectionActive) return

    // Add event listeners
 document.addEventListener('copy', handleCopy, true)
 document.addEventListener('cut', handleCut, true)
 document.addEventListener('contextmenu', handleContextMenu, true)
 document.addEventListener('keydown', handleKeyDown, true)
 document.addEventListener('dragstart', handleDragStart, true)
 document.addEventListener('selectstart', handleSelectStart, true)
 window.addEventListener('beforeprint', handleBeforePrint)
 window.addEventListener('afterprint', handleAfterPrint)
 document.addEventListener('visibilitychange', handleVisibilityChange)
 window.addEventListener('blur', handleBlur)
 window.addEventListener('focus', handleFocus)

    // Mobile-specific listeners
 document.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true })
 document.addEventListener('touchend', handleTouchEnd, { passive: true, capture: true })

    // iOS screenshot detection (experimental)
 if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
 window.addEventListener('devicemotion', handleDeviceMotion)
 }

    // DevTools detection interval
 if (options.disableDevTools) {
 devToolsCheckInterval.current = setInterval(detectDevTools, 1000)
 }

    // Cleanup
 return () => {
 document.removeEventListener('copy', handleCopy, true)
 document.removeEventListener('cut', handleCut, true)
 document.removeEventListener('contextmenu', handleContextMenu, true)
 document.removeEventListener('keydown', handleKeyDown, true)
 document.removeEventListener('dragstart', handleDragStart, true)
 document.removeEventListener('selectstart', handleSelectStart, true)
 window.removeEventListener('beforeprint', handleBeforePrint)
 window.removeEventListener('afterprint', handleAfterPrint)
 document.removeEventListener('visibilitychange', handleVisibilityChange)
 window.removeEventListener('blur', handleBlur)
 window.removeEventListener('focus', handleFocus)

      // Mobile cleanup
 document.removeEventListener('touchstart', handleTouchStart, true)
 document.removeEventListener('touchend', handleTouchEnd, true)
 if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
 window.removeEventListener('devicemotion', handleDeviceMotion)
 }

 if (devToolsCheckInterval.current) {
 clearInterval(devToolsCheckInterval.current)
 }
 }
 }, [
 isProtectionActive,
 handleCopy,
 handleCut,
 handleContextMenu,
 handleKeyDown,
 handleDragStart,
 handleSelectStart,
 handleBeforePrint,
 handleAfterPrint,
 handleVisibilityChange,
 handleBlur,
 handleFocus,
 handleTouchStart,
 handleTouchEnd,
 handleDeviceMotion,
 detectDevTools,
 options.disableDevTools
 ])

  // Android FLAG_SECURE - DISABLED
 useEffect(() => {
    // Android screenshot protection disabled
 }, [])

  // Inactivity detection - DISABLED
 useEffect(() => {
    // Inactivity blur disabled
 }, [])

  // Enhanced Visibility API for screenshot detection - DISABLED
 useEffect(() => {
    // Enhanced screenshot detection disabled
 }, [])

 return {
 isProtectionActive,
 setIsProtectionActive,
 lastAttempt,
 isBlurred,
 devToolsOpen,
 isInactive,
 }
}

// Android-specific screenshot protection - DISABLED
// These functions are no longer used

// CSS styles for content protection - DISABLED
export const contentProtectionStyles = {
  // All protection styles disabled
}

// Print protection CSS - DISABLED
export const printProtectionCSS = ``

// Extreme protection hook - DISABLED
export function useMaxProtection(onAttempt?: (type: string) => void) {
 return useContentProtection({
 disableCopy: false,
 disableContextMenu: false,
 disablePrint: false,
 disableKeyboardShortcuts: false,
 disableDevTools: false,
 disableDragDrop: false,
 disableSelection: false,
 blurOnFocusLoss: false,
 detectScreenCapture: false,
 onProtectionTriggered: onAttempt,
 })
}
