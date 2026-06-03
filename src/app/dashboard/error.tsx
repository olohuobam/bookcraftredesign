'use client'

import { useEffect } from 'react'
import { AlertTriangle, BookOpen, Home, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: ErrorProps) {
  const { t } = useLanguage()

  useEffect(() => {
    console.error('[DashboardError]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      {/* Icon */}
      <div className="relative mb-6">
        <BookOpen
          className="w-16 h-16 text-bookcraft-blue/40"
          strokeWidth={1.2}
        />
        <div className="absolute -top-2 -right-2 bg-gradient-to-br from-[#3E86D7] to-[#3E86D7] rounded-full p-1.5 shadow-lg shadow-blue-900/30">
          <AlertTriangle className="w-4 h-4 text-white" strokeWidth={2} />
        </div>
      </div>

      {/* Text */}
      <h1 className="font-display text-2xl font-bold text-foreground mb-2 tracking-tight">
        {t('errorTitle')}
      </h1>
      <p className="font-display text-base font-medium text-muted-foreground mb-1">
        {t('errorSubtitle')}
      </p>
      <p className="text-sm text-muted-foreground/70 leading-relaxed mb-8 max-w-sm">
        {t('errorDescription')}
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground font-medium text-sm transition-all duration-200"
        >
          <Home className="h-4 w-4" />
          {t('goHome')}
        </Link>
        <button
          onClick={reset}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-white transition-all duration-200 shadow-md shadow-blue-900/20"
          style={{ background: 'linear-gradient(135deg, #3E86D7 0%, #3E86D7 100%)' }}
        >
          <RefreshCw className="h-4 w-4" />
          {t('tryAgain')}
        </button>
      </div>
    </div>
  )
}
