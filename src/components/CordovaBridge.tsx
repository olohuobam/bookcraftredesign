'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

/**
 * Injects the Cordova bridge (cordova.js) only when running inside a native
 * Capacitor app. On the web there is no cordova.js, so a static <script> tag
 * would resolve relative to the current route and return the HTML 404 page,
 * causing a "MIME type ('text/html') is not executable" console error.
 */
export default function CordovaBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const alreadyLoaded =
      typeof (window as { cordova?: unknown }).cordova !== 'undefined' ||
      document.querySelector('script[data-cordova-bridge]') ||
      document.querySelector('script[src$="cordova.js"]')
    if (alreadyLoaded) return

    const script = document.createElement('script')
    script.src = '/cordova.js'
    script.async = false
    script.setAttribute('data-cordova-bridge', 'true')
    document.head.appendChild(script)
  }, [])

  return null
}
