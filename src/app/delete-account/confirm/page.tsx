'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { useLanguage } from '@/context/LanguageContext'

type ConfirmStatus = 'idle' | 'loading' | 'success' | 'error'

function ConfirmContent() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<ConfirmStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-blue-50 dark:from-blue-950/20 dark:via-background dark:to-blue-950/20 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-md">
            <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
              <div className="bg-gradient-to-r from-red-500 to-rose-600 p-8 text-center">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-white">{t('invalidLink')}</h1>
              </div>
              <div className="p-8 text-center">
                <p className="text-muted-foreground leading-relaxed mb-6">
                  No confirmation token provided. Please use the link from your email.
                </p>
                <Link
                  href="/delete-account"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold py-2.5 px-6 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                >
                  Request New Link
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const performDeletion = async () => {
    setStatus('loading')
    setErrorMessage('')
    try {
      // Fix 4: POST instead of GET — prevents email scanners from triggering deletion
      const response = await fetch('/api/delete-account/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await response.json()

      if (response.ok && data.success) {
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMessage(data.error || 'An unexpected error occurred. Please try again.')
      }
    } catch {
      setStatus('error')
      setErrorMessage('Network error. Please check your connection and try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-blue-50 dark:from-blue-950/20 dark:via-background dark:to-blue-950/20 flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
            {/* Card header */}
            <div
              className={`p-8 text-center ${
                status === 'loading'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                  : status === 'success'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                  : status === 'error'
                  ? 'bg-gradient-to-r from-red-500 to-rose-600'
                  : 'bg-gradient-to-r from-red-500 to-rose-600'
              }`}
            >
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                {status === 'loading' && (
                  <svg className="w-7 h-7 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {status === 'success' && (
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {(status === 'error' || status === 'idle') && (
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              <h1 className="text-2xl font-bold text-white">
                {status === 'loading' && 'Deleting Account...'}
                {status === 'success' && 'Account Deleted'}
                {status === 'error' && 'Deletion Failed'}
                {status === 'idle' && 'Confirm Deletion'}
              </h1>
            </div>

            {/* Card body */}
            <div className="p-8 text-center">
              {status === 'idle' && (
                <div className="space-y-6">
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">⚠️ This action is irreversible</p>
                    <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
                      Your account, all books, images, and personal data will be permanently deleted and cannot be recovered.
                    </p>
                  </div>
                  <button
                    onClick={performDeletion}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Permanently Delete My Account
                  </button>
                  <Link
                    href="/"
                    className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel — keep my account
                  </Link>
                </div>
              )}

              {status === 'loading' && (
                <div className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    Please wait while we permanently delete your account and all associated data.
                  </p>
                  <div className="flex justify-center gap-1.5 pt-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              {status === 'success' && (
                <div className="space-y-4">
                  <p className="text-foreground font-medium text-lg">Your account has been permanently deleted.</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    All your personal data, books, images, and account information have been removed from our systems in compliance with GDPR.
                  </p>
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mt-6">
                    <p className="text-sm text-green-700 dark:text-green-400 leading-relaxed">
                      We&apos;re sorry to see you go. If you ever decide to create books again, you&apos;re always welcome back at Bookcraft.
                    </p>
                  </div>
                  <div className="pt-4">
                    <Link
                      href="/"
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 px-8 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      Go to Homepage
                    </Link>
                  </div>
                </div>
              )}

              {status === 'error' && (
                <div className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    {errorMessage}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                    <Link
                      href="/delete-account"
                      className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold py-2.5 px-6 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Request New Link
                    </Link>
                    <Link
                      href="/kontakt"
                      className="inline-flex items-center justify-center gap-2 border border-border text-foreground font-medium py-2.5 px-6 rounded-xl hover:bg-muted transition-colors text-sm"
                    >
                      Contact Support
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

function Header() {
  return (
    <header className="border-b border-border/50 backdrop-blur-sm bg-background/80">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="font-semibold text-foreground">Bookcraft</span>
        </Link>
      </div>
    </header>
  )
}

function Footer() {
  const { t } = useLanguage()
  return (
    <footer className="border-t border-border/50 py-6">
      <div className="container mx-auto px-6 text-center">
        <p className="text-xs text-muted-foreground">
          <Link href="/impressum" className="hover:text-foreground transition-colors">{t('legalNotice')}</Link>
          {' · '}
          <Link href="/datenschutz" className="hover:text-foreground transition-colors">{t('privacyPolicy')}</Link>
          {' · '}
          <span>© {new Date().getFullYear()} Bookcraft</span>
        </p>
      </div>
    </footer>
  )
}

export default function ConfirmDeletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-bookcraft-blue/30 border-t-bookcraft-blue rounded-full animate-spin" />
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  )
}
