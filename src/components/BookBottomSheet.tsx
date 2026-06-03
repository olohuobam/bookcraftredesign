'use client'

import React from 'react'
import {
  BookOpen,
  Image as ImageIcon,
  Pencil,
  Share2,
  Trash2,
  FileText,
  Hash,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import BottomSheet from '@/components/BottomSheet'
import { useLanguage } from '@/context/LanguageContext'

// Minimal Book shape required by this component
export interface BookBottomSheetBook {
  id: string
  title: string
  author?: string | null
  genre?: string
  description?: string
  chapters?: number
  bookType?: string
  status?: string
  coverImage?: string
  activeJobId?: string | null
  // Persisted word count (preferred, avoids loading chapters_json)
  wordCount?: number
  // For word count calculation (optional fallback)
  chaptersJson?: { chapters?: { content?: string }[] }
  content?: string
}

interface BookBottomSheetProps {
  book: BookBottomSheetBook | null
  isOpen: boolean
  onClose: () => void
  onOpenBook: (book: BookBottomSheetBook) => void
  onEdit?: (book: BookBottomSheetBook) => void
  onShare?: (book: BookBottomSheetBook) => void
  onDelete?: (book: BookBottomSheetBook) => void
}

// ─── helpers ────────────────────────────────────────────────────────────────

const getWordCount = (book: BookBottomSheetBook): number => {
  // Prefer persisted word_count from DB (no chapters_json load needed)
  if (book.wordCount != null && book.wordCount > 0) {
    return book.wordCount
  }
  // Fallback: calculate from loaded chapters / content
  let total = 0
  if (book.chaptersJson?.chapters) {
    book.chaptersJson.chapters.forEach((ch: { content?: string }) => {
      if (ch.content) total += ch.content.split(/\s+/).filter(Boolean).length
    })
  } else if (book.content) {
    total = book.content.split(/\s+/).filter(Boolean).length
  }
  return total
}

const getBookColors = (genre?: string, bookType?: string) => {
  if (bookType === 'picture') return { primary: '#0ea5e9', secondary: '#0284c7' }
  const g = (genre ?? '').toLowerCase()
  if (g.includes('fantasy')) return { primary: '#3b82f6', secondary: '#2563eb' }
  if (g.includes('romance')) return { primary: '#06b6d4', secondary: '#0891b2' }
  if (g.includes('thriller')) return { primary: '#64748b', secondary: '#475569' }
  if (g.includes('sci-fi')) return { primary: '#3E86D7', secondary: '#2563eb' }
  if (g.includes('sach')) return { primary: '#1e40af', secondary: '#1e3a8a' }
  return { primary: '#0ea5e9', secondary: '#0284c7' }
}

const getStatusInfo = (book: BookBottomSheetBook) => {
  if (book.activeJobId || book.status === 'generating' || book.status === 'processing') {
    return { color: 'bg-bookcraft-blue/70', label: 'Generating', pulse: true }
  }
  if (book.status === 'error') return { color: 'bg-red-500', label: 'Error', pulse: false }
  if (book.status === 'completed') return { color: 'bg-emerald-500', label: 'Completed', pulse: false }
  return { color: 'bg-sky-400', label: 'Draft', pulse: false }
}

const haptic = (style: 'light' | 'medium' = 'light') => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate({ light: 10, medium: 20 }[style])
  }
}

// ─── component ──────────────────────────────────────────────────────────────

export default function BookBottomSheet({
  book,
  isOpen,
  onClose,
  onOpenBook,
  onEdit,
  onShare,
  onDelete,
}: BookBottomSheetProps) {
  const { t } = useLanguage()

  if (!book) return null

  const wordCount = getWordCount(book)
  const colors = getBookColors(book.genre, book.bookType)
  const statusInfo = getStatusInfo(book)

  const actions = [
    ...(onEdit
      ? [{ icon: Pencil, label: t('edit'), action: () => onEdit(book), danger: false }]
      : []),
    ...(onShare
      ? [{ icon: Share2, label: t('share'), action: () => onShare(book), danger: false }]
      : []),
    ...(onDelete
      ? [{ icon: Trash2, label: t('delete'), action: () => onDelete(book), danger: true }]
      : []),
  ]

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} showHandle={true}>
      {/* Cover banner */}
      <div
        className="relative h-52"
        style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
      >
        {book.coverImage ? (
          <img
            src={book.coverImage}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-bookcraft-blue/20 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-bookcraft-blue/20 rounded-full blur-2xl" />
            {/* Title */}
            <span className="text-white/90 text-center text-xs sm:text-sm font-semibold font-display leading-tight line-clamp-3 relative z-10">{book.title}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Status badge */}
        <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md">
          <div
            className={cn(
              'w-2.5 h-2.5 rounded-full',
              statusInfo.color,
              statusInfo.pulse && 'animate-pulse'
            )}
          />
          <span className="text-xs font-medium text-white">{statusInfo.label}</span>
        </div>

        {/* Title */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h2 className="text-2xl font-bold font-display text-white mb-1">{book.title}</h2>
          <p className="text-white/80">{book.author || book.genre}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 pb-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { icon: FileText, value: book.chapters ?? 0, label: t('chapters') },
            { icon: Hash, value: wordCount.toLocaleString(), label: t('words') },
            {
              icon: Clock,
              value: Math.max(1, Math.round(wordCount / 200)),
              label: t('minutes'),
            },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="text-center p-4 rounded-2xl bg-muted">
              <Icon className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {book.description && (
          <p className="text-muted-foreground mb-5 line-clamp-2 text-[15px]">
            {book.description}
          </p>
        )}

        {/* Primary CTA */}
        <Button
          onClick={() => {
            haptic('medium')
            onOpenBook(book)
          }}
          className="w-full h-16 rounded-3xl font-bold text-white text-[18px] shadow-lg mb-6 active:scale-[0.96] transition-all duration-200"
          style={{
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
          }}
        >
          <BookOpen className="w-6 h-6 mr-3" />
          {t('openBook')}
        </Button>

        {/* Secondary actions */}
        {actions.length > 0 && (
          <div
            className={cn(
              'grid gap-4',
              actions.length === 1 && 'grid-cols-1',
              actions.length === 2 && 'grid-cols-2',
              actions.length >= 3 && 'grid-cols-3'
            )}
          >
            {actions.map(({ icon: Icon, label, action, danger }) => (
              <button
                key={label}
                onClick={() => {
                  haptic('light')
                  action()
                }}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 min-h-[72px] rounded-3xl transition-all duration-200 active:scale-[0.95] backdrop-blur-sm border',
                  danger
                    ? 'bg-red-50/80 dark:bg-red-950/50 border-red-200/50 dark:border-red-800/50 hover:bg-red-100/80'
                    : 'bg-muted/80 border-border/50 hover:bg-muted active:bg-muted'
                )}
              >
                <Icon
                  className={cn('w-6 h-6', danger ? 'text-red-500' : 'text-muted-foreground')}
                />
                <span
                  className={cn(
                    'text-xs font-semibold',
                    danger ? 'text-red-500' : 'text-muted-foreground'
                  )}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
