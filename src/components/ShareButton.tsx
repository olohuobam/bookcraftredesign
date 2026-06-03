'use client'

import { useState, useRef, useEffect } from 'react'
import { Share2, Link, MessageCircle, Twitter, Mail, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/LanguageContext'

interface ShareButtonProps {
  url: string
  title: string
  description?: string
  className?: string
}

export default function ShareButton({ url, title, description, className }: ShareButtonProps) {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Resolve full share URL using env var or window.location
  const resolveUrl = () => {
    if (typeof window === 'undefined') return url
    const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    // If url is already absolute, use it; otherwise prepend base
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`
  }

  const shareText = description
    ? `${title} — ${description}`
    : `Check out "${title}" — created with bookcraft.dev`

  const handleNativeShare = async () => {
    const fullUrl = resolveUrl()
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url: fullUrl })
        return
      } catch {
        // User cancelled or not supported — fall through to dropdown
      }
    }
    setDropdownOpen(prev => !prev)
  }

  const copyToClipboard = async () => {
    const fullUrl = resolveUrl()
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) { console.warn('Share failed:', e) }
    setDropdownOpen(false)
  }

  const shareWhatsApp = () => {
    const fullUrl = resolveUrl()
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${shareText} ${fullUrl}`)}`,
      '_blank',
      'noopener,noreferrer'
    )
    setDropdownOpen(false)
  }

  const shareTwitter = () => {
    const fullUrl = resolveUrl()
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(fullUrl)}`,
      '_blank',
      'noopener,noreferrer'
    )
    setDropdownOpen(false)
  }

  const shareEmail = () => {
    const fullUrl = resolveUrl()
    window.open(
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${shareText}\n\n${fullUrl}`)}`,
      '_self'
    )
    setDropdownOpen(false)
  }

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleNativeShare}
        aria-label={t('shareBook')}
        className="rounded-full px-4 h-9 gap-2 border-bookcraft-blue/30 hover:border-bookcraft-blue/60 hover:text-bookcraft-blue"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Share2 className="h-4 w-4" />
        )}
        <span>{copied ? t('copiedToClipboard') : t('share')}</span>
      </Button>

      {/* Desktop dropdown (shown when Web Share API is unavailable) */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 z-50 min-w-[180px] rounded-2xl border border-border bg-background/95 backdrop-blur-xl shadow-xl shadow-black/10 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
          <button
            onClick={copyToClipboard}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted/60 transition-colors"
          >
            <Link className="h-4 w-4 text-bookcraft-blue" />
            {t('copyLink')}
          </button>
          <button
            onClick={shareWhatsApp}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted/60 transition-colors"
          >
            <MessageCircle className="h-4 w-4 text-green-500" />
            {t('shareWhatsApp')}
          </button>
          <button
            onClick={shareTwitter}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted/60 transition-colors"
          >
            <Twitter className="h-4 w-4 text-sky-500" />
            {t('shareTwitter')}
          </button>
          <button
            onClick={shareEmail}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted/60 transition-colors"
          >
            <Mail className="h-4 w-4 text-muted-foreground" />
            {t('shareEmail')}
          </button>
        </div>
      )}
    </div>
  )
}
