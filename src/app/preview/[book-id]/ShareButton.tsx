'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

interface ShareButtonProps {
 bookTitle: string
 previewUrl: string
}

export default function ShareButton({ bookTitle, previewUrl }: ShareButtonProps) {
 const { t } = useLanguage()
 const [copied, setCopied] = useState(false)

 const handleShare = async () => {
    // Use native Web Share API on mobile (WhatsApp, iMessage, etc.)
 if (typeof navigator !== 'undefined' && navigator.share) {
 try {
 await navigator.share({
 title: bookTitle,
 text: `Check out "${bookTitle}" — created with bookcraft.dev`,
 url: previewUrl,
 })
 } catch {
        // User cancelled or share failed — fall back to clipboard
 await copyToClipboard()
 }
 return
 }

    // Desktop fallback: copy to clipboard
 await copyToClipboard()
 }

 const copyToClipboard = async () => {
 try {
 await navigator.clipboard.writeText(previewUrl)
 setCopied(true)
 setTimeout(() => setCopied(false), 2000)
 } catch {
      // If clipboard API also fails, do nothing silently
 }
 }

 return (
 <button
 onClick={handleShare}
 className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-background text-sm font-medium text-foreground hover:bg-accent transition-colors"
 aria-label={t('shareBook')}
 >
 {copied ? (
 <>
 <Check className="h-4 w-4 text-green-500" />
 <span className="text-green-600 dark:text-green-400">Copied!</span>
 </>
 ) : (
 <>
 <Share2 className="h-4 w-4" />
 Share preview
 </>
 )}
 </button>
 )
}
