'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Download, FileText, BookOpen, Smartphone, Loader2, Lock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import BottomSheet from '@/components/BottomSheet'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast'
import { useProSheet } from '@/context/ProSheetContext'
import { useLanguage } from '@/context/LanguageContext'

interface BookExportDialogProps {
  bookId: string
  bookTitle: string
  purchased?: boolean
  triggerElement?: React.ReactNode
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'sm' | 'default' | 'lg' | 'icon'
}

interface ExportFormat {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  fileExtension: string
  color: string
  recommended?: boolean
  premium?: boolean
}

const exportFormats: ExportFormat[] = [
  {
    id: 'pdf',
    name: 'PDF',
    description: 'Professional layout, ideal for printing and universally readable',
    icon: <FileText className="h-6 w-6" />,
    fileExtension: 'pdf',
    color: 'red',
    recommended: true,
    premium: false,
  },
  {
    id: 'epub',
    name: 'EPUB',
    description: 'E-book standard for most e-readers (Tolino, Kobo, Apple Books)',
    icon: <BookOpen className="h-6 w-6" />,
    fileExtension: 'epub',
    color: 'blue',
    recommended: true,
    premium: true,
  },
  {
    id: 'mobi',
    name: 'MOBI/Kindle',
    description: 'Optimized for Amazon Kindle e-readers',
    icon: <Smartphone className="h-6 w-6" />,
    fileExtension: 'html',
    color: 'orange',
    premium: true,
  },
  {
    id: 'txt',
    name: 'Text',
    description: 'Simple text file without formatting',
    icon: <FileText className="h-6 w-6" />,
    fileExtension: 'txt',
    color: 'gray',
    premium: false,
  },
]

function ExportContent({
  bookId,
  bookTitle,
  purchased,
  onClose,
}: {
  bookId: string
  bookTitle: string
  purchased?: boolean
  onClose?: () => void
}) {
  const { getIdToken } = useAuth()
  const { isPro, isLoading: isSubscriptionLoading } = useSubscription()
  const router = useRouter()
  const { showToast } = useToast()
  const { openProSheet } = useProSheet()
  const { t } = useLanguage()
  const [downloading, setDownloading] = useState<string | null>(null)

  // EPUB and MOBI require Pro subscription (PDF and TXT are always free)
  const hasProAccess = isPro

  const handleExport = async (format: ExportFormat) => {
    // If premium format (epub/mobi) and no Pro → show upgrade prompt
    if (format.premium && !hasProAccess) {
      openProSheet('export')
      onClose?.()
      return
    }

    setDownloading(format.id)

    try {
      const token = await getIdToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(`/api/books/${bookId}/export?format=${format.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Export failed')
      }

      const blob = await response.blob()
      const safeTitle = bookTitle.replace(/[^a-z0-9\-_]+/gi, '_').slice(0, 80) || 'book'
      const fileName = `${safeTitle}.${format.fileExtension}`

      const { Capacitor } = await import('@capacitor/core')
      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem')
        const { Share } = await import('@capacitor/share')
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            const result = reader.result as string
            const comma = result.indexOf(',')
            resolve(comma >= 0 ? result.slice(comma + 1) : result)
          }
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(blob)
        })
        const written = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
        })
        try {
          await Share.share({
            title: bookTitle,
            url: written.uri,
            dialogTitle: 'Buch teilen',
          })
        } catch (shareErr) {
          console.warn('Share cancelled or unavailable:', shareErr)
        }
      } else {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }

      setTimeout(() => {
        onClose?.()
      }, 500)
    } catch (error: unknown) {
      console.error('Export error:', error)
      showToast(error instanceof Error ? error.message : 'Export failed', 'error')
    } finally {
      setDownloading(null)
    }
  }

  if (isSubscriptionLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-5 space-y-4">
      {/* Pro upsell banner for free users */}
      {!hasProAccess && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3">
          <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              EPUB &amp; MOBI require Pro
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              PDF and TXT are free for everyone. Upgrade to Pro to unlock EPUB &amp; MOBI export.
            </p>
            <button
              onClick={() => { openProSheet('export'); onClose?.() }}
              className="mt-2 text-xs font-semibold text-amber-900 dark:text-amber-100 underline hover:no-underline"
            >
              Upgrade to Pro →
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {exportFormats.map((format) => {
          const isLocked = format.premium && !hasProAccess
          const isDownloading = downloading === format.id

          return (
            <button
              key={format.id}
              onClick={() => handleExport(format)}
              disabled={downloading !== null && !isLocked}
              title={isLocked ? 'Upgrade to Pro to unlock this format' : undefined}
              className={`
                relative p-4 rounded-2xl border-2 transition-all text-left active:scale-[0.98]
                ${isDownloading
                  ? 'border-bookcraft-blue bg-bookcraft-blue/5 dark:bg-bookcraft-blue/10'
                  : isLocked
                  ? 'border-border opacity-60 cursor-not-allowed bg-muted/30'
                  : format.color === 'red'
                  ? 'border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
                  : format.color === 'blue'
                  ? 'border-bookcraft-blue/30 dark:border-bookcraft-blue/30 hover:border-bookcraft-blue dark:hover:border-bookcraft-blue hover:bg-bookcraft-blue/5 dark:hover:bg-bookcraft-blue/10'
                  : format.color === 'orange'
                  ? 'border-orange-200 dark:border-orange-800 hover:border-orange-400 dark:hover:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30'
                  : 'border-border hover:border-muted-foreground hover:bg-muted'
                }
                ${downloading !== null && downloading !== format.id && !isLocked ? 'opacity-50' : ''}
              `}
            >
              {format.recommended && !isLocked && (
                <div className="absolute -top-2 -right-2 bg-green-500 dark:bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                  Recommended
                </div>
              )}
              {isLocked && (
                <div className="absolute -top-2 -right-2 bg-amber-500 dark:bg-amber-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Pro
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className={`
                  p-2 rounded-xl
                  ${isLocked ? 'bg-muted text-muted-foreground' : ''}
                  ${!isLocked && format.color === 'red' ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' : ''}
                  ${!isLocked && format.color === 'blue' ? 'bg-bookcraft-blue/10 dark:bg-bookcraft-blue/20 text-bookcraft-blue dark:text-bookcraft-blue/80' : ''}
                  ${!isLocked && format.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400' : ''}
                  ${!isLocked && format.color === 'gray' ? 'bg-muted text-muted-foreground' : ''}
                `}>
                  {isLocked ? <Lock className="h-6 w-6" /> : format.icon}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{format.name}</h3>
                    <span className="text-xs text-muted-foreground uppercase">.{format.fileExtension}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{format.description}</p>

                  {isLocked && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
                      🔒 Pro subscription required
                    </p>
                  )}

                  {isDownloading && (
                    <div className="flex items-center gap-2 mt-2 text-bookcraft-blue dark:text-bookcraft-blue/80">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Exporting...</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-2xl">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2"> Notes:</h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• <strong>PDF</strong> is best suited for printing and sharing</li>
          <li>• <strong>EPUB</strong> {t('epubWorksOnEreaders')}</li>
          <li>• <strong>MOBI/Kindle</strong> can be opened in the Kindle app</li>
          <li>• All formats include metadata and table of contents</li>
        </ul>
      </div>
    </div>
  )
}

export default function BookExportDialog({
  bookId,
  bookTitle,
  purchased,
  triggerElement,
  variant = 'default',
  size = 'default'
}: BookExportDialogProps) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const trigger = triggerElement || (
    <Button variant={variant} size={size}>
      <Download className="h-4 w-4 mr-2" />
      Download
    </Button>
  )

  // Wait for client-side check to prevent hydration mismatch
  if (isMobile === null) {
    return (
      <div onClick={() => setOpen(true)}>
        {trigger}
      </div>
    )
  }

  // Mobile: use BottomSheet
  if (isMobile) {
    return (
      <>
        <div onClick={() => setOpen(true)}>
          {trigger}
        </div>
        <BottomSheet
          isOpen={open}
          onClose={() => setOpen(false)}
          title={t('exportBookDialog')}
          subtitle={`Choose a format for "${bookTitle}"`}
        >
          <ExportContent
            bookId={bookId}
            bookTitle={bookTitle}
            purchased={purchased}
            onClose={() => setOpen(false)}
          />
        </BottomSheet>
      </>
    )
  }

  // Desktop: use Dialog
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('exportBookDialog')}</DialogTitle>
          <DialogDescription>
            Choose a format to download &quot;{bookTitle}&quot;
          </DialogDescription>
        </DialogHeader>
        <ExportContent
          bookId={bookId}
          bookTitle={bookTitle}
          purchased={purchased}
          onClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
