'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, FileText, BookOpen, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface KDPExportButtonProps {
  bookId: string
  bookTitle: string
}

type ExportFormat = 'pdf' | 'epub'

interface FormatOption {
  id: ExportFormat
  label: string
  ext: string
  icon: React.ReactNode
  description: string
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: 'pdf',
    label: 'PDF — Interior',
    ext: 'pdf',
    icon: <FileText className="h-4 w-4" />,
    description: '6×9 inch, KDP-ready interior',
  },
  {
    id: 'epub',
    label: 'EPUB — E-Book',
    ext: 'epub',
    icon: <BookOpen className="h-4 w-4" />,
    description: 'EPUB 3.0 for Kindle and e-readers',
  },
]

const KDP_TOAST_DURATION = 8000

export default function KDPExportButton({ bookId, bookTitle }: KDPExportButtonProps) {
  const { getIdToken } = useAuth()
  const [loading, setLoading] = useState<ExportFormat | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), KDP_TOAST_DURATION)
  }

  const handleExport = async (format: FormatOption) => {
    if (loading) return

    setLoading(format.id)
    try {
      const token = await getIdToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(`/api/books/${bookId}/kdp-export?format=${format.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${bookTitle}-KDP.${format.ext}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showToast(
        'Your book is ready for KDP. Upload the PDF as interior and add your cover separately at kdp.amazon.com'
      )
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Export failed. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="rounded-full px-5 h-11 font-medium gap-1.5"
            disabled={!!loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {loading ? 'Exporting…' : 'KDP Export'}
            {!loading && <ChevronDown className="h-3.5 w-3.5 opacity-60" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {FORMAT_OPTIONS.map((fmt) => (
            <DropdownMenuItem
              key={fmt.id}
              onClick={() => handleExport(fmt)}
              disabled={!!loading}
              className="flex items-start gap-3 py-3 cursor-pointer"
            >
              <span className="mt-0.5 text-muted-foreground">{fmt.icon}</span>
              <span>
                <span className="block font-medium text-sm">{fmt.label}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {fmt.description}
                </span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* KDP guidance toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full mx-4">
          <div className="bg-foreground text-background rounded-2xl px-5 py-4 shadow-xl text-sm leading-relaxed">
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}
