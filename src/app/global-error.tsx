'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, AlertTriangle, Home, RefreshCw } from 'lucide-react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * global-error.tsx handles errors thrown inside app/layout.tsx (e.g. Providers).
 * It must supply its own <html> and <body> tags since the root layout is unavailable.
 * Note: useLanguage() / context providers are not available here.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('[GlobalError - layout level]', error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-blue-950 via-blue-950 to-blue-950">
          {/* Subtle radial glow overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(62,134,215,0.15)_0%,_rgba(62,134,215,0.10)_50%,_transparent_100%)] pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative z-10 flex flex-col items-center text-center px-6 max-w-md w-full"
          >
            {/* Book illustration */}
            <div className="relative mb-8 flex items-end justify-center">
              <div className="relative">
                <BookOpen className="w-24 h-24 text-bookcraft-blue/50" strokeWidth={1.2} />
                <div className="absolute -top-3 -right-3 bg-gradient-to-br from-[#3E86D7] to-[#3E86D7] rounded-full p-1.5 shadow-lg shadow-blue-900/50">
                  <AlertTriangle className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
              </div>
            </div>

            {/* Text — hardcoded since language context is unavailable at layout level */}
            <h1 className="font-display text-5xl font-extrabold text-white mb-3 tracking-tight">
              Oops!
            </h1>
            <h2 className="font-display text-xl font-semibold text-blue-200 mb-4">
              Something went wrong
            </h2>
            <p className="text-blue-100/60 text-sm leading-relaxed mb-8">
              Don&apos;t worry, your books are safe. Let&apos;s get you back on track.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
              <a
                href="/dashboard"
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-all duration-200 border border-white/10 backdrop-blur-sm"
              >
                <Home className="h-4 w-4" />
                Go to Dashboard
              </a>
              <button
                onClick={reset}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all duration-200 shadow-lg shadow-blue-900/40"
                style={{ background: 'linear-gradient(135deg, #3E86D7 0%, #3E86D7 100%)' }}
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            </div>
          </motion.div>
        </div>
      </body>
    </html>
  )
}
