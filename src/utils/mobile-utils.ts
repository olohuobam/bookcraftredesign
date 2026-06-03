/**
 * Mobile utility functions for iOS-native experience
 */

// Viewport height adjustment for mobile keyboards
export const adjustViewportForKeyboard = () => {
 if (typeof window === 'undefined') return

 const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
 const isAndroid = /Android/.test(navigator.userAgent)
 
 if (!isIOS && !isAndroid) return

  // Listen for viewport height changes (keyboard events)
 const handleResize = () => {
 const vh = window.innerHeight * 0.01
 document.documentElement.style.setProperty('--vh', `${vh}px`)
 }

 handleResize()
 window.addEventListener('resize', handleResize)
 window.addEventListener('orientationchange', handleResize)

 return () => {
 window.removeEventListener('resize', handleResize)
 window.removeEventListener('orientationchange', handleResize)
 }
}

// Smooth scroll to element (for form validation errors)
export const scrollToElement = (
 element: HTMLElement, 
 options: ScrollIntoViewOptions = { behavior: 'smooth', block: 'center' }
) => {
 if (element) {
 element.scrollIntoView(options)
 }
}

// Prevent iOS zoom on input focus
export const preventIOSZoom = () => {
 if (typeof window === 'undefined') return

 const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
 if (!isIOS) return

 const meta = document.querySelector('meta[name="viewport"]')
 if (meta) {
 const content = meta.getAttribute('content')
 const handleFocus = () => {
 meta.setAttribute('content', content + ', user-scalable=no')
 }
 const handleBlur = () => {
 meta.setAttribute('content', content || '')
 }

 document.addEventListener('focusin', handleFocus)
 document.addEventListener('focusout', handleBlur)

 return () => {
 document.removeEventListener('focusin', handleFocus)
 document.removeEventListener('focusout', handleBlur)
 }
 }
}

// Haptic feedback simulation
export const hapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light') => {
 if (typeof window === 'undefined') return

  // Try native iOS haptic feedback first
 if ('haptic' in navigator) {
 try {
 ;(navigator as any).haptic.vibrate(type === 'heavy' ? 100 : type === 'medium' ? 50 : 25)
 return
 } catch {
      // Fallback to vibration API
 }
 }

  // Fallback to vibration API
 if ('vibrate' in navigator) {
 const duration = type === 'heavy' ? 50 : type === 'medium' ? 30 : 10
 navigator.vibrate(duration)
 }
}

// Detect if device supports touch
export const isTouchDevice = () => {
 if (typeof window === 'undefined') return false
 return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

// Get safe area insets
export const getSafeAreaInsets = () => {
 if (typeof window === 'undefined') return { top: 0, bottom: 0, left: 0, right: 0 }
 
 const style = getComputedStyle(document.documentElement)
 return {
 top: parseInt(style.getPropertyValue('--safe-area-inset-top').replace('px', '')) || 0,
 bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom').replace('px', '')) || 0,
 left: parseInt(style.getPropertyValue('--safe-area-inset-left').replace('px', '')) || 0,
 right: parseInt(style.getPropertyValue('--safe-area-inset-right').replace('px', '')) || 0,
 }
}

// Smooth page transitions
export const pageTransition = (direction: 'up' | 'down' | 'left' | 'right' = 'up') => {
 const animations = {
 up: 'transform: translateY(20px); opacity: 0;',
 down: 'transform: translateY(-20px); opacity: 0;',
 left: 'transform: translateX(20px); opacity: 0;',
 right: 'transform: translateX(-20px); opacity: 0;'
 }

 return {
 initial: animations[direction],
 animate: 'transform: translateY(0); opacity: 1;',
 transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
 }
}

// Button press animation
export const buttonPress = (element: HTMLElement) => {
 if (!element) return

 element.style.transform = 'scale(0.96)'
 element.style.transition = 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)'

 setTimeout(() => {
 element.style.transform = 'scale(1)'
 }, 150)
}

// Auto-resize textarea
export const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
 textarea.style.height = 'auto'
 textarea.style.height = `${textarea.scrollHeight}px`
}