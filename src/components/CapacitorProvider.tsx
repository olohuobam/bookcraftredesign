'use client'

import { createContext, useContext, useEffect, useState, useCallback, startTransition } from 'react'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'
import { App } from '@capacitor/app'
import { SplashScreen } from '@capacitor/splash-screen'

interface StatusBarConfig {
 color: string
 style: 'light' | 'dark'
}

interface CapacitorContextType {
 isNative: boolean
 platform: string
 setStatusBar: (config: StatusBarConfig) => Promise<void>
 resetStatusBar: () => Promise<void>
}

const CapacitorContext = createContext<CapacitorContextType>({
 isNative: false,
 platform: 'web',
 setStatusBar: async () => {},
 resetStatusBar: async () => {},
})

export const useCapacitor = () => useContext(CapacitorContext)

const DEFAULT_STATUS_BAR_COLOR = '#ffffff'

/**
 * CapacitorProvider Component
 *
 * Initializes and configures Capacitor plugins for mobile apps.
 * This component should be wrapped around the app to enable native features.
 *
 * Features:
 * - Status bar styling (dynamic theme)
 * - Keyboard management
 * - Back button handling
 * - App state management
 * - Splash screen management
 * - Error handling with user feedback
 */
export default function CapacitorProvider({ children }: { children: React.ReactNode }) {
 const [initError, setInitError] = useState<string | null>(null)
 const [isNative, setIsNative] = useState(false)
 const [platform, setPlatform] = useState('web')

  // Initialize platform detection on mount (client-side only)
 useEffect(() => {
 startTransition(() => {
 setIsNative(Capacitor.isNativePlatform())
 setPlatform(Capacitor.getPlatform())
 })
 }, [])

  // Dynamic status bar control
 const setStatusBar = useCallback(async (config: StatusBarConfig) => {
 if (!Capacitor.isNativePlatform()) return

 try {
 await StatusBar.setStyle({
 style: config.style === 'light' ? Style.Light : Style.Dark
 })
      // Under Android 15+ edge-to-edge, the status bar is transparent and
      // setBackgroundColor uses deprecated Window APIs. We rely on CSS
      // safe-area padding and the WebView background instead.
 } catch (error) {
      console.warn('Failed to set status bar:', error)
 }
 }, [])

 const resetStatusBar = useCallback(async () => {
 await setStatusBar({ color: DEFAULT_STATUS_BAR_COLOR, style: 'dark' })
 }, [setStatusBar])

 useEffect(() => {
 const initCapacitor = async () => {
      // Only run on native platforms
 if (!Capacitor.isNativePlatform()) {
        console.log('Running in web mode - Capacitor plugins disabled')
 return
 }

      console.log('Initializing Capacitor for platform:', Capacitor.getPlatform())

 try {
        // Configure Status Bar - White background with dark text for clean look
 try {
 await StatusBar.setStyle({ style: Style.Dark })
          // Edge-to-edge: WebView draws under the system bars. Safe-area
          // insets on <body> (globals.css) keep content inside the safe zone.
          // setBackgroundColor is intentionally omitted — it routes through
          // deprecated Window.setStatusBarColor on Android 15+ and is a no-op
          // under edge-to-edge anyway.
 await StatusBar.setOverlaysWebView({ overlay: true })
          console.log('✅ Status Bar configured (edge-to-edge)')
 } catch (error) {
          console.warn('⚠️ Status Bar configuration failed:', error)
          // Non-critical, continue
 }

        // Configure Keyboard
 try {
 await Keyboard.setResizeMode({ mode: KeyboardResize.Body })
 await Keyboard.setAccessoryBarVisible({ isVisible: true })
          console.log('✅ Keyboard configured')
 } catch (error) {
          console.warn('⚠️ Keyboard configuration failed:', error)
          // Non-critical, continue
 }

        // Handle app state changes
 try {
 App.addListener('appStateChange', ({ isActive }) => {
            console.log('App state changed. Is active?', isActive)
 })

          // Handle back button (Android)
 App.addListener('backButton', ({ canGoBack }) => {
 if (!canGoBack) {
 App.exitApp()
 } else {
 window.history.back()
 }
 })
          console.log('✅ App listeners configured')
 } catch (error) {
          console.warn('⚠️ App listeners configuration failed:', error)
          // Non-critical, continue
 }

        // Hide splash screen after initialization
 try {
 await SplashScreen.hide()
          console.log('✅ Splash screen hidden')
 } catch (error) {
          console.warn('⚠️ Splash screen hide failed:', error)
          // Non-critical, continue
 }

        console.log('✅ Capacitor initialization complete')

 } catch (error) {
 const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('❌ Critical error initializing Capacitor:', error)
 setInitError(errorMessage)
 }
 }

 initCapacitor()

    // Cleanup
 return () => {
 if (Capacitor.isNativePlatform()) {
 try {
 App.removeAllListeners()
 } catch (error) {
          console.warn('Error removing listeners:', error)
 }
 }
 }
 }, [])

  // Show error message if initialization failed (optional)
 if (initError && Capacitor.isNativePlatform()) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
 <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md text-center space-y-4">
 <div className="text-red-600 text-5xl">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
        </div>
 <h2 className="text-xl font-bold font-display text-gray-900">
 Initialization Error
 </h2>
 <p className="text-gray-600 text-sm">
 The app could not be fully initialized.
 </p>
 <div className="bg-red-50 rounded-lg p-3 text-xs text-red-800 font-mono break-all">
 {initError}
 </div>
 <button
 onClick={() => window.location.reload()}
 className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold
 hover:bg-red-700 active:scale-95 transition-all"
 >
 Restart App
 </button>
 </div>
 </div>
 )
 }

 return (
 <CapacitorContext.Provider value={{ isNative, platform, setStatusBar, resetStatusBar }}>
 {children}
 </CapacitorContext.Provider>
 )
}

/**
 * Hook to check if running in Capacitor
 */
export function useIsNative() {
 const { isNative } = useCapacitor()
 return isNative
}

/**
 * Hook to get current platform
 */
export function usePlatform() {
 const { platform } = useCapacitor()
 return platform
}
