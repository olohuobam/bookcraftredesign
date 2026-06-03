'use client'

import { useState, useEffect, useRef, useCallback, useMemo, startTransition } from 'react'
import NextImage from 'next/image'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo, Variants } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  X,
  BookOpen,
  Lock,
  ShoppingCart,
  Image as ImageIcon,
  Shield,
  Bookmark,
  StickyNote,
  MoreHorizontal,
  ChevronRight,
  Pencil,
  Search,
  Download,
  Trash2,
  WifiOff,
  ZoomIn,
} from 'lucide-react'
import { useReaderSettings } from '@/hooks/useReaderSettings'
import { useOfflineReading } from '@/hooks/useOfflineReading'
import { useLanguage } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'
import { useHaptics } from '@/hooks/useHaptics'
import { useProSheet } from '@/context/ProSheetContext'
import BookPurchaseSheet from '@/components/BookPurchaseSheet'
import { formatPrice, getBookPrice, PRICING } from '@/lib/pricing'
import { UnifiedLivePreview } from '@/components/UnifiedLivePreview'
import { ProtectedContent, ProtectedImage } from '@/components/ContentProtection'
import { useReadingProgress } from '@/hooks/useReadingProgress'
import BookmarkNotesPanel from '@/components/BookmarkNotesPanel'
import BottomSheet from '@/components/BottomSheet'
import { TranslationKey } from '@/lib/translations'
import { useToast } from '@/components/ui/toast'
import { useSubscription } from '@/hooks/useSubscription'

// ============================================
// TYPES
// ============================================

interface Chapter {
  id: string
  title: string
  content: string
  wordCount: number
}

interface BookPage {
  imageUrl: string
  text: string
  pageNumber: number
}

interface ReadingPage {
  chapterIndex: number
  chapterTitle: string
  paragraphs: string[]
  isFirstPageOfChapter: boolean
  isLastPageOfChapter: boolean
}

// Split chapters into pages (~4-6 paragraphs per page)
const PARAGRAPHS_PER_PAGE = 5

interface UniversalBookReaderProps {
  bookId: string
  bookTitle: string
  bookType?: string // 'text', 'picture', 'photobook'
  status?: string
  activeJobId?: string | null
  chapters: Chapter[]
  chaptersJson?: any
  images?: string[] // Picture book images array (flat, indexed by pageIndex * imagesPerPage + panelIndex)
  purchased?: boolean
  aiGenerated?: boolean
  coverImage?: string | null
  author?: string
  isGated?: boolean
  gatedChapterCount?: number
  gatedPageCount?: number
  onClose: () => void
  onEditMode?: () => void
  onPurchaseSuccess?: () => void
  onComplete?: () => void
  initialChapterIndex?: number
}

// ============================================
// CONSTANTS
// ============================================

type ReaderTheme = 'light' | 'sepia' | 'dark'
type FontFamily = 'system' | 'serif' | 'mono'
type LineSpacing = 'compact' | 'normal' | 'relaxed'

const FONT_FAMILY_MAP: Record<FontFamily, string> = {
  system: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  serif: 'Georgia, Cambria, serif',
  mono: 'JetBrains Mono, monospace',
}

const LINE_SPACING_MAP: Record<LineSpacing, number> = {
  compact: 1.5,
  normal: 1.7,
  relaxed: 2.0,
}

const THEME_STYLES: Record<ReaderTheme, { bg: string; text: string; muted: string }> = {
  light: { bg: '#ffffff', text: '#111827', muted: '#6b7280' },
  sepia: { bg: '#f8f1e3', text: '#5b4636', muted: '#8b7355' },
  dark: { bg: '#1a1a1a', text: '#d4d4d4', muted: '#737373' },
}

// ─── Elegant Apple Books-style slide/fade variants ────────────────────────────
const pageSlideVariants: Variants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? 30 : -30,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      x: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] },
      opacity: { duration: 0.15 },
    },
  },
  exit: (dir: number) => ({
    x: dir >= 0 ? -20 : 20,
    opacity: 0,
    transition: {
      x: { duration: 0.15, ease: [0.55, 0, 1, 0.45] },
      opacity: { duration: 0.12 },
    },
  }),
}

// ─── Content styles per reader theme (fullscreen, no card/shadow) ─────────────
const contentStyles: Record<ReaderTheme, {
  color: string
  headingColor: string
  mutedColor: string
  dividerColor: string
}> = {
  light: {
    color: '#1a1a1a',
    headingColor: '#111111',
    mutedColor: '#9ca3af',
    dividerColor: 'rgba(0,0,0,0.10)',
  },
  sepia: {
    color: '#3b2a14',
    headingColor: '#2a1a08',
    mutedColor: '#a87d4a',
    dividerColor: 'rgba(120,80,20,0.15)',
  },
  dark: {
    color: '#e5e7eb',
    headingColor: '#f3f4f6',
    mutedColor: '#6b7280',
    dividerColor: 'rgba(255,255,255,0.10)',
  },
}

/**
 * UniversalBookReader - Apple Books-level reading experience
 *
 * Features:
 * - Auto-hiding chrome with tap-to-toggle
 * - Reading themes (Light, Sepia, Dark)
 * - Typography controls (font size, family, line spacing)
 * - Swipe, keyboard, and tap-zone navigation
 * - Purchase gate for AI-generated books
 * - Bookmarks and notes system
 * - Bottom sheet settings and TOC
 */
export default function UniversalBookReader({
  bookId,
  bookTitle,
  bookType = 'text',
  status,
  activeJobId,
  chapters,
  chaptersJson,
  images: bookImages,
  purchased = false,
  aiGenerated = false,
  coverImage,
  author,
  isGated = false,
  gatedChapterCount = 0,
  gatedPageCount = 0,
  onClose,
  onEditMode,
  onPurchaseSuccess,
  onComplete,
  initialChapterIndex = 0
}: UniversalBookReaderProps) {
  const { t } = useLanguage()
  const { impact, selectionChanged } = useHaptics()

  // ============================================
  // BOOK TYPE & STATUS DETECTION
  // ============================================

  const detectedBookType = (() => {
    if (bookType && bookType !== 'text') return bookType

    if (chaptersJson) {
      const parsed = typeof chaptersJson === 'string'
        ? JSON.parse(chaptersJson)
        : chaptersJson

      if (parsed?.isPhotobook === true) return 'photobook'
      if (parsed?.pages || parsed?.pictureBookConfig) return 'picture'
    }

    return 'text'
  })()

  const isGenerating = Boolean(activeJobId && status === 'generating')

  // ============================================
  // LIVE GENERATION VIEWS
  // ============================================

  if (isGenerating && activeJobId) {
    return (
      <UnifiedLivePreview
        jobId={activeJobId}
        bookId={bookId}
        bookType={detectedBookType === 'picture' ? 'picture' : 'text'}
        bookTitle={bookTitle}
        bookAuthor={author}
        onComplete={() => {
          onComplete?.()
          onClose()
        }}
        onClose={onClose}
      />
    )
  }

  // ============================================
  // COMPLETED BOOK - PREMIUM READER
  // ============================================

  return (
    <PremiumUniversalReader
      bookId={bookId}
      bookTitle={bookTitle}
      bookType={detectedBookType}
      chapters={chapters}
      chaptersJson={chaptersJson}
      bookImages={bookImages}
      purchased={purchased}
      aiGenerated={aiGenerated}
      coverImage={coverImage}
      author={author}
      isGated={isGated}
      gatedChapterCount={gatedChapterCount}
      gatedPageCount={gatedPageCount}
      onClose={onClose}
      onEditMode={onEditMode}
      onPurchaseSuccess={onPurchaseSuccess}
      initialChapterIndex={initialChapterIndex}
    />
  )
}

// ============================================
// READER SETTINGS BOTTOM SHEET
// ============================================

interface ReaderSettingsProps {
  isOpen: boolean
  onClose: () => void
  fontSize: number
  setFontSize: (size: number) => void
  fontFamily: FontFamily
  setFontFamily: (family: FontFamily) => void
  lineSpacing: LineSpacing
  setLineSpacing: (spacing: LineSpacing) => void
  readerTheme: ReaderTheme
  setReaderTheme: (theme: ReaderTheme) => void
  onShowToc: () => void
  onShowBookmarks: () => void
  // Offline props
  purchased: boolean
  isOfflineAvailable: boolean
  isDownloading: boolean
  downloadProgress: number
  onDownloadOffline: () => void
  onRemoveOffline: () => void
}

function ReaderSettings({
  isOpen,
  onClose,
  fontSize,
  setFontSize,
  fontFamily,
  setFontFamily,
  lineSpacing,
  setLineSpacing,
  readerTheme,
  setReaderTheme,
  onShowToc,
  onShowBookmarks,
  purchased,
  isOfflineAvailable,
  isDownloading,
  downloadProgress,
  onDownloadOffline,
  onRemoveOffline,
}: ReaderSettingsProps) {
  const { t } = useLanguage()

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Reading Settings">
      {/* Font Size */}
      <div className="px-5 py-4">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          Font Size
        </label>
        <div className="flex items-center gap-4 mt-3">
          <span className="text-sm text-muted-foreground" style={{ fontFamily: FONT_FAMILY_MAP[fontFamily] }}>A</span>
          <input
            type="range"
            min={14}
            max={28}
            step={1}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="flex-1 h-1 bg-border rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-md
              [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <span className="text-xl text-muted-foreground" style={{ fontFamily: FONT_FAMILY_MAP[fontFamily] }}>A</span>
        </div>
      </div>

      {/* Font Family */}
      <div className="px-5 py-4 border-t border-border">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          Font
        </label>
        <div className="flex gap-2 mt-3">
          {(['system', 'serif', 'mono'] as FontFamily[]).map((font) => (
            <button
              key={font}
              onClick={() => setFontFamily(font)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                fontFamily === font
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
              style={{ fontFamily: FONT_FAMILY_MAP[font] }}
            >
              {font === 'system' ? 'System' : font === 'serif' ? 'Serif' : 'Mono'}
            </button>
          ))}
        </div>
      </div>

      {/* Line Spacing */}
      <div className="px-5 py-4 border-t border-border">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          Spacing
        </label>
        <div className="flex gap-2 mt-3">
          {(['compact', 'normal', 'relaxed'] as LineSpacing[]).map((spacing) => (
            <button
              key={spacing}
              onClick={() => setLineSpacing(spacing)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                lineSpacing === spacing
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {spacing}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="px-5 py-4 border-t border-border">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          Theme
        </label>
        <div className="flex gap-4 mt-3 items-center justify-start">
          {([
            { key: 'light' as ReaderTheme, label: 'Light', bg: '#ffffff', border: true },
            { key: 'sepia' as ReaderTheme, label: 'Sepia', bg: '#f8f1e3', border: true },
            { key: 'dark' as ReaderTheme, label: 'Dark', bg: '#1a1a1a', border: false },
          ]).map((theme) => (
            <button
              key={theme.key}
              onClick={() => setReaderTheme(theme.key)}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className={`w-10 h-10 rounded-full transition-all ${
                  theme.border ? 'border border-border' : ''
                } ${
                  readerTheme === theme.key
                    ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
                    : ''
                }`}
                style={{ backgroundColor: theme.bg }}
              />
              <span className={`text-xs ${
                readerTheme === theme.key ? 'text-foreground font-medium' : 'text-muted-foreground'
              }`}>
                {theme.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="px-5 py-4 border-t border-border space-y-1">
        <button
          onClick={() => { onClose(); setTimeout(onShowToc, 200) }}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors"
        >
          <span>{t('tableOfContents')}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          onClick={() => { onClose(); setTimeout(onShowBookmarks, 200) }}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors"
        >
          <span>{t('bookmarksAndNotes')}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Offline Reading */}
      <div className="px-5 py-4 border-t border-border">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          {t('offline')}
        </label>
        {!purchased ? (
          <div className="mt-3 flex items-center gap-3 px-3 py-3 rounded-lg bg-muted/50">
            <WifiOff className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{t('offlineReading')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('offlineProFeatureBuyBook')}</p>
            </div>
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
              Pro
            </span>
          </div>
        ) : isOfflineAvailable ? (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <WifiOff className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-sm font-medium text-green-700 dark:text-green-300">{t('offlineAvailable')}</p>
            </div>
            <button
              onClick={onRemoveOffline}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              <span>{t('removeOfflineDownload')}</span>
            </button>
          </div>
        ) : isDownloading ? (
          <div className="mt-3 px-3 py-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <Download className="h-4 w-4 text-bookcraft-blue animate-bounce" />
              <p className="text-sm font-medium text-foreground">{t('downloading')}</p>
            </div>
            <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-bookcraft-blue rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{downloadProgress}%</p>
          </div>
        ) : (
          <button
            onClick={onDownloadOffline}
            className="mt-3 w-full flex items-center gap-3 px-3 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <Download className="h-5 w-5 text-bookcraft-blue dark:text-bookcraft-blue/80 flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium text-bookcraft-blue dark:text-bookcraft-blue/80">{t('downloadForOffline')}</p>
              <p className="text-xs text-bookcraft-blue dark:text-bookcraft-blue/80 mt-0.5">{t('readWithoutInternet')}</p>
            </div>
          </button>
        )}
      </div>
    </BottomSheet>
  )
}

// ============================================
// TOC BOTTOM SHEET
// ============================================

interface TocBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  bookType: string
  chapters: Chapter[]
  pages: BookPage[]
  currentPage: number
  goToPage: (index: number) => void
  goToChapter?: (chapterIndex: number) => void
  isPageLocked: (index: number) => boolean
  isChapterLocked?: (chapterIndex: number) => boolean
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

function TocBottomSheet({
  isOpen,
  onClose,
  bookType,
  chapters,
  pages,
  currentPage,
  goToPage,
  goToChapter,
  isPageLocked,
  isChapterLocked,
  t,
}: TocBottomSheetProps) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={bookType === 'text' ? t('tableOfContents') : t('pagesLabel')}
      maxHeight={75}
    >
      <div className="pb-4">
        {bookType === 'text' ? (
          chapters.map((ch, index) => {
            const locked = isChapterLocked ? isChapterLocked(index) : isPageLocked(index)
            return (
              <button
                key={ch.id}
                onClick={() => { goToChapter ? goToChapter(index) : goToPage(index); onClose() }}
                className={`w-full text-left px-5 py-3.5 border-b border-border transition-colors ${
                  index === currentPage
                    ? 'bg-bookcraft-blue/5 text-bookcraft-blue dark:bg-bookcraft-blue/15 dark:text-bookcraft-blue/80'
                    : locked
                    ? 'text-muted-foreground'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                <div className="flex items-center gap-3">
                  {locked ? (
                    <Lock className="h-4 w-4 text-orange-500 flex-shrink-0" />
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground w-6 text-right flex-shrink-0">
                      {index + 1}
                    </span>
                  )}
                  <span className="truncate">{ch.title}</span>
                </div>
                {!locked && (
                  <p className="text-xs mt-0.5 ml-9 text-muted-foreground">
                    {ch.wordCount.toLocaleString()} {t('wordsCount')}
                  </p>
                )}
              </button>
            )
          })
        ) : (
          pages.map((page, index) => {
            const locked = isPageLocked(index)
            return (
              <button
                key={index}
                onClick={() => { goToPage(index); onClose() }}
                className={`w-full text-left px-5 py-3.5 border-b border-border transition-colors ${
                  index === currentPage
                    ? 'bg-bookcraft-blue/5 text-bookcraft-blue dark:bg-bookcraft-blue/15 dark:text-bookcraft-blue/80'
                    : locked
                    ? 'text-muted-foreground'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                <div className="flex items-center gap-3">
                  {locked ? (
                    <Lock className="h-4 w-4 text-orange-500 flex-shrink-0" />
                  ) : page.imageUrl ? (
                    <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 relative">
                      <NextImage src={page.imageUrl} alt={t('pageNumber').replace('{number}', String(index + 1))} fill sizes="40px" className="object-cover" />
                    </div>
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{t('pageNumber').replace('{number}', String(index + 1))}</div>
                    {page.text && (
                      <p className="text-xs mt-0.5 truncate text-muted-foreground">
                        {page.text.substring(0, 50)}...
                      </p>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </BottomSheet>
  )
}

// ============================================
// PREMIUM UNIVERSAL READER COMPONENT
// ============================================

interface PremiumUniversalReaderProps {
  bookId: string
  bookTitle: string
  bookType: string
  chapters: Chapter[]
  chaptersJson?: any
  bookImages?: string[]
  purchased: boolean
  aiGenerated: boolean
  coverImage?: string | null
  author?: string
  isGated?: boolean
  gatedChapterCount?: number
  gatedPageCount?: number
  onClose: () => void
  onEditMode?: () => void
  onPurchaseSuccess?: () => void
  initialChapterIndex: number
}

function PremiumUniversalReader({
  bookId,
  bookTitle,
  bookType,
  chapters,
  chaptersJson,
  bookImages,
  purchased,
  aiGenerated,
  coverImage,
  author,
  isGated = false,
  gatedChapterCount = 0,
  gatedPageCount = 0,
  onClose,
  onEditMode,
  onPurchaseSuccess,
  initialChapterIndex
}: PremiumUniversalReaderProps) {
  const { t } = useLanguage()
  const { impact, selectionChanged } = useHaptics()
  const { openProSheet } = useProSheet()
  const { resolvedTheme } = useTheme()
  const router = useRouter()
  const { showToast } = useToast()
  const { isPro } = useSubscription()

  // State
  const [currentPage, setCurrentPage] = useState(initialChapterIndex)
  const [showChrome, setShowChrome] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showToc, setShowToc] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showBookmarkPanel, setShowBookmarkPanel] = useState(false)
  const [showNoteEditor, setShowNoteEditor] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [showResumePrompt, setShowResumePrompt] = useState(false)

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Feature: Search
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Feature: Image fullscreen
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
  const fullscreenRef = useRef<HTMLDivElement>(null)
  // Pinch-to-zoom state
  const pinchStartDistRef = useRef<number>(0)
  const pinchCurrentScaleRef = useRef<number>(1)
  const [imageScale, setImageScale] = useState(1)
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 })

  // Feature: Page turn direction tracking (for animation)
  const [pageDirection, setPageDirection] = useState<'forward' | 'backward'>('forward')

  // Reading preferences — persisted via useReaderSettings
  const {
    fontSize, setFontSize,
    fontFamily, setFontFamily,
    lineSpacing, setLineSpacing,
    readerTheme, setReaderTheme,
  } = useReaderSettings(resolvedTheme ?? undefined)

  // Offline reading
  const {
    isOfflineAvailable,
    isDownloading,
    downloadProgress,
    downloadForOffline,
    removeOffline,
    loadOfflineBook,
    resolveImageUrl,
  } = useOfflineReading(bookId)

  // Online/offline state tracking
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [offlineChapters, setOfflineChapters] = useState<Chapter[] | null>(null)
  const [resolvedImageUrls, setResolvedImageUrls] = useState<Map<string, string>>(new Map())
  const objectUrlsRef = useRef<string[]>([])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load offline book content when offline and available
  useEffect(() => {
    if (isOnline || !isOfflineAvailable) return
    loadOfflineBook().then(book => {
      if (book?.chapters && Array.isArray(book.chapters)) {
        setOfflineChapters(book.chapters as Chapter[])
      }
    }).catch((err) => {
      console.error('Failed to load offline book:', err)
      showToast('Could not load offline book. Please check your connection.', 'error')
    })
  }, [isOnline, isOfflineAvailable, loadOfflineBook])

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
    }
  }, [])

  // Resolve cached image URLs for picture books when offline
  useEffect(() => {
    if (isOnline || !isOfflineAvailable) return
    if (bookType !== 'picture' && bookType !== 'photobook') return
    const imageList = bookImages ?? []
    if (imageList.length === 0) return

    let cancelled = false
    const resolved = new Map<string, string>()
    Promise.all(
      imageList.filter(Boolean).map(async (url) => {
        const objectUrl = await resolveImageUrl(url)
        if (!cancelled && objectUrl !== url) {
          resolved.set(url, objectUrl)
          objectUrlsRef.current.push(objectUrl)
        }
      })
    ).then(() => {
      if (!cancelled) setResolvedImageUrls(new Map(resolved))
    }).catch((err) => {
      if (!cancelled) {
        console.error('Failed to resolve offline image URLs:', err)
        showToast('Could not load offline book. Please check your connection.', 'error')
      }
    })

    return () => { cancelled = true }
  }, [isOnline, isOfflineAvailable, bookType, bookImages, resolveImageUrl])

  // Effective chapters: use offline cache when offline and available
  const effectiveChapters = (!isOnline && isOfflineAvailable && offlineChapters) ? offlineChapters : chapters

  const containerRef = useRef<HTMLDivElement>(null)

  // Reading progress (bookmarks, notes, position)
  const {
    lastChapterIndex,
    bookmarks,
    notes,
    isLoading: progressLoading,
    savePosition,
    toggleBookmark,
    isBookmarked,
    saveNote,
    deleteNote,
    getNoteForChapter,
  } = useReadingProgress(bookId)

  // Swipe gesture
  const x = useMotionValue(0)
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5])

  // Current theme styles
  const themeStyles = THEME_STYLES[readerTheme]

  // ============================================
  // CHROME VISIBILITY
  // Chrome is always visible by default. Tap center to toggle fullscreen (hide chrome).
  // ============================================

  const toggleChrome = useCallback(() => {
    setShowChrome(prev => !prev)
  }, [])

  // ============================================
  // PARSE PAGES/CHAPTERS BASED ON BOOK TYPE
  // ============================================

  const pages: BookPage[] = (() => {
    if (bookType === 'picture' || bookType === 'photobook') {
      const images = (bookImages || []).map((img, idx) => {
        // Use resolved (cached) URL if available, fall back to original
        return resolvedImageUrls.get(img) ?? img ?? ''
      })

      if (chaptersJson) {
        const parsed = typeof chaptersJson === 'string'
          ? JSON.parse(chaptersJson)
          : chaptersJson

        const imagesPerPage = parsed.imagesPerPage ||
          parsed.pictureBookConfig?.pages?.[0]?.panels?.length ||
          parsed.pages?.[0]?.panels?.length || 1

        if (parsed.pictureBookConfig?.pages) {
          return parsed.pictureBookConfig.pages.flatMap((page: any, pageIndex: number) => {
            return page.panels?.map((panel: any, panelIndex: number) => {
              const flatIndex = pageIndex * imagesPerPage + panelIndex
              const imageUrl = images[flatIndex] || panel.imageUrl || ''
              return {
                imageUrl,
                text: page.text || panel.description || '',
                pageNumber: pageIndex * imagesPerPage + panelIndex + 1
              }
            }) || []
          })
        }

        if (Array.isArray(parsed.pages) && parsed.pages[0]?.panels) {
          return parsed.pages.flatMap((page: any, pageIndex: number) => {
            return page.panels?.map((panel: any, panelIndex: number) => {
              const flatIndex = pageIndex * imagesPerPage + panelIndex
              const imageUrl = images[flatIndex] || panel.imageUrl || ''
              return {
                imageUrl,
                text: page.text || panel.description || '',
                pageNumber: pageIndex * imagesPerPage + panelIndex + 1
              }
            }) || []
          })
        }

        if (Array.isArray(parsed.pages)) {
          return parsed.pages.map((page: any, index: number) => {
            const imageUrl = images[index] || page.imageUrl || page.url || page.image || ''
            return {
              imageUrl,
              text: page.text || page.content || '',
              pageNumber: index + 1
            }
          })
        }
      }

      const validImages = images.filter(img => img && img.length > 0)
      if (validImages.length > 0) {
        return validImages.map((img, index) => ({
          imageUrl: img,
          text: '',
          pageNumber: index + 1
        }))
      }

      return chapters.map((chapter, index) => ({
        imageUrl: coverImage || '',
        text: chapter.content,
        pageNumber: index + 1
      }))
    }

    return chapters.map((chapter, index) => ({
      imageUrl: '',
      text: chapter.content,
      pageNumber: index + 1
    }))
  })()

  // Split text chapters into smaller reading pages
  const readingPages = useMemo(() => {
    if (bookType !== 'text') return []

    const rpages: ReadingPage[] = []
    effectiveChapters.forEach((chapter, chapterIdx) => {
      const allParagraphs = chapter.content
        .split('\n\n')
        .filter(p => p.trim())

      if (allParagraphs.length === 0) {
        rpages.push({
          chapterIndex: chapterIdx,
          chapterTitle: chapter.title,
          paragraphs: [''],
          isFirstPageOfChapter: true,
          isLastPageOfChapter: true,
        })
        return
      }

      for (let i = 0; i < allParagraphs.length; i += PARAGRAPHS_PER_PAGE) {
        const slice = allParagraphs.slice(i, i + PARAGRAPHS_PER_PAGE)
        rpages.push({
          chapterIndex: chapterIdx,
          chapterTitle: chapter.title,
          paragraphs: slice,
          isFirstPageOfChapter: i === 0,
          isLastPageOfChapter: i + PARAGRAPHS_PER_PAGE >= allParagraphs.length,
        })
      }
    })
    return rpages
  }, [effectiveChapters, bookType])

  const getFirstPageOfChapter = (chapterIndex: number) => {
    return readingPages.findIndex(p => p.chapterIndex === chapterIndex)
  }

  const totalPages = bookType === 'text' ? readingPages.length : pages.length
  const isPageLocked = useCallback((index: number) => {
    if (purchased || isPro || !aiGenerated) return false
    if (bookType === 'picture' || bookType === 'photobook') {
      return index > 1
    }
    if (bookType === 'text' && readingPages[index]) {
      return readingPages[index].chapterIndex > 0
    }
    return index > 0
  }, [purchased, isPro, aiGenerated, bookType, readingPages])

  // ============================================
  // NAVIGATION
  // ============================================

  const goToPage = useCallback((index: number) => {
    if (index >= 0 && index < totalPages) {
      if (isPageLocked(index)) {
        setShowPurchaseModal(true)
        return
      }
      selectionChanged()
      setPageDirection(index > currentPage ? 'forward' : 'backward')
      setCurrentPage(index)
      savePosition(index)
    }
  }, [totalPages, purchased, aiGenerated, selectionChanged, savePosition, currentPage, isPageLocked])

  const nextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      if (isPageLocked(currentPage + 1)) {
        setShowPurchaseModal(true)
        return
      }
      impact('light')
      setPageDirection('forward')
      setCurrentPage(prev => {
        const next = prev + 1
        savePosition(next)
        return next
      })
    }
  }, [currentPage, totalPages, purchased, aiGenerated, impact, savePosition, isPageLocked])

  const prevPage = useCallback(() => {
    if (currentPage > 0) {
      impact('light')
      setPageDirection('backward')
      setCurrentPage(prev => {
        const next = prev - 1
        savePosition(next)
        return next
      })
    }
  }, [currentPage, impact, savePosition])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        nextPage()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prevPage()
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextPage, prevPage, onClose])

  // Resume reading prompt
  useEffect(() => {
    if (!progressLoading && lastChapterIndex > 0 && initialChapterIndex === 0) {
      startTransition(() => { setShowResumePrompt(true) })
      const timer = setTimeout(() => setShowResumePrompt(false), 6000)
      return () => clearTimeout(timer)
    }
  }, [progressLoading, lastChapterIndex, initialChapterIndex])

  // Focus search input when shown
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    if (showSearch) {
      timer = setTimeout(() => searchInputRef.current?.focus(), 100)
    }
    return () => {
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [showSearch])

  // Search results
  interface SearchResult {
    pageIndex: number
    chapterTitle: string
    excerpt: string
    matchIndex: number
  }
  const searchResults = useMemo((): SearchResult[] => {
    const q = searchQuery.trim().toLowerCase()
    if (!q || q.length < 2) return []

    const results: SearchResult[] = []

    if (bookType === 'text') {
      readingPages.forEach((rp, idx) => {
        const fullText = rp.paragraphs.join(' ')
        const lower = fullText.toLowerCase()
        let pos = lower.indexOf(q)
        let matchIndex = 0
        while (pos !== -1 && matchIndex < 3) {
          const start = Math.max(0, pos - 60)
          const end = Math.min(fullText.length, pos + q.length + 80)
          const excerpt = (start > 0 ? '…' : '') + fullText.slice(start, end) + (end < fullText.length ? '…' : '')
          results.push({
            pageIndex: idx,
            chapterTitle: rp.chapterTitle,
            excerpt,
            matchIndex,
          })
          pos = lower.indexOf(q, pos + 1)
          matchIndex++
        }
      })
    } else {
      pages.forEach((p, idx) => {
        if (!p.text) return
        const lower = p.text.toLowerCase()
        const pos = lower.indexOf(q)
        if (pos !== -1) {
          const start = Math.max(0, pos - 60)
          const end = Math.min(p.text.length, pos + q.length + 80)
          const excerpt = (start > 0 ? '…' : '') + p.text.slice(start, end) + (end < p.text.length ? '…' : '')
          results.push({
            pageIndex: idx,
            chapterTitle: `Seite ${idx + 1}`,
            excerpt,
            matchIndex: 0,
          })
        }
      })
    }

    // Deduplicate by pageIndex, keep first 20
    const seen = new Set<number>()
    return results.filter(r => {
      if (seen.has(r.pageIndex)) return false
      seen.add(r.pageIndex)
      return true
    }).slice(0, 20)
  }, [searchQuery, bookType, readingPages, pages])

  // Sync note editor content when switching chapters
  useEffect(() => {
    const existingNote = getNoteForChapter(currentPage)
    startTransition(() => { setNoteContent(existingNote?.content ?? '') })
  }, [currentPage, getNoteForChapter])

  // Handle swipe
  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100 && info.velocity.x > 0) {
      prevPage()
    } else if (info.offset.x < -100 && info.velocity.x < 0) {
      nextPage()
    }
  }

  // Tap zone handler for content area
  const handleContentTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Don't handle taps on interactive elements
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('textarea')) {
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const relativeX = (e.clientX - rect.left) / rect.width

    if (relativeX < 0.25) {
      // Left 25% = previous (Kindle-style)
      prevPage()
    } else if (relativeX > 0.75) {
      // Right 25% = next (Kindle-style)
      nextPage()
    } else {
      // Center 50% = toggle chrome
      toggleChrome()
    }
  }, [prevPage, nextPage, toggleChrome])

  const isLocked = isPageLocked(currentPage)
  const progress = ((currentPage + 1) / totalPages) * 100

  const currentTitle = bookType === 'text'
    ? readingPages[currentPage]?.chapterTitle || ''
    : t('pageNumber').replace('{number}', String(currentPage + 1))

  // ============================================
  // HELPER: Text highlighting
  // ============================================

  function highlightText(text: string, query: string): React.ReactNode {
    if (!query || query.trim().length < 2) return text
    const q = query.trim()
    const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark
          key={i}
          className="rounded px-0.5"
          style={{ backgroundColor: '#fde047', color: '#1a1a1a' }}
        >
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  // ============================================
  // RENDER CONTENT BASED ON BOOK TYPE
  // ============================================

  const renderContent = () => {
    if (isLocked) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center min-h-[60vh] text-center"
        >
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
            style={{ backgroundColor: readerTheme === 'dark' ? 'rgba(234,88,12,0.15)' : 'rgba(255,237,213,1)' }}
          >
            <Lock className="h-12 w-12" style={{ color: '#f97316' }} />
          </div>
          <h2 className="text-2xl font-bold font-display mb-3" style={{ color: themeStyles.text }}>
            {bookType === 'text' ? t('chapterLocked') : t('pageLocked')}
          </h2>
          <p className="mb-8 max-w-sm" style={{ color: themeStyles.muted }}>
            {t('buyBookToUnlock').replace('{total}', String(totalPages)).replace('{type}', bookType === 'text' ? t('chaptersCount') : t('pagesLabel'))}
          </p>
          <BookPurchaseSheet
            bookId={bookId}
            bookData={{
              title: bookTitle,
              genre: 'book',
              chapters: totalPages,
              purchased: purchased
            }}
            price={getBookPrice(bookType)}
            onPurchaseSuccess={onPurchaseSuccess || (() => {})}
            triggerElement={
              <Button size="lg" className="gap-2 rounded-full px-8">
                <ShoppingCart className="h-5 w-5" />
                {t('buyForPrice').replace('{price}', formatPrice(getBookPrice(bookType)))}
              </Button>
            }
          />
          <button
            className="mt-4 text-sm font-medium transition-colors"
            style={{ color: themeStyles.muted }}
            onClick={() => setCurrentPage(0)}
          >
            {bookType === 'text' ? t('backToFreeChapter') : t('backToFreePage')}
          </button>
        </motion.div>
      )
    }

    // Text Book Mode
    if (bookType === 'text') {
      const readingPage = readingPages[currentPage]
      if (!readingPage) return null

      const content = contentStyles[readerTheme]
      const slideDir = pageDirection === 'forward' ? 1 : -1

      return (
        <AnimatePresence initial={false} custom={slideDir} mode="wait">
          <motion.article
            key={currentPage}
            custom={slideDir}
            variants={pageSlideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            style={{ color: content.color }}
          >
          {/* Chapter Header - only on first page of chapter */}
          {readingPage.isFirstPageOfChapter && (
            <header style={{ marginBottom: '3rem', marginTop: '1.5rem', textAlign: 'center' }}>
              <p
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: content.mutedColor,
                  fontFamily: FONT_FAMILY_MAP.system,
                  marginBottom: '1rem',
                  fontWeight: 500,
                }}
              >
                {t('chapterNumber').replace('{number}', String(readingPage.chapterIndex + 1))}
              </p>
              <h1
                style={{
                  fontSize: `${Math.min(fontSize * 1.6, 36)}px`,
                  fontWeight: 700,
                  color: content.headingColor,
                  fontFamily: FONT_FAMILY_MAP.serif,
                  lineHeight: 1.25,
                  margin: 0,
                }}
              >
                {readingPage.chapterTitle}
              </h1>
              <div style={{
                width: '2rem',
                height: '2px',
                backgroundColor: content.dividerColor,
                margin: '1.5rem auto 0',
                borderRadius: '1px',
              }} />
            </header>
          )}

          {/* Page Content */}
          <div
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: LINE_SPACING_MAP[lineSpacing],
              fontFamily: FONT_FAMILY_MAP[fontFamily],
              color: content.color,
              textAlign: 'justify',
              hyphens: 'auto',
              WebkitHyphens: 'auto',
            } as React.CSSProperties}
          >
            {readingPage.paragraphs.map((paragraph, i) => (
              <p
                key={i}
                style={{
                  margin: 0,
                  marginBottom: '0',
                  textIndent: (readingPage.isFirstPageOfChapter && i === 0) ? '0' : '1.5em',
                  paddingBottom: '0.1em',
                }}
              >
                {highlightText(paragraph, searchQuery)}
              </p>
            ))}
          </div>

          {/* End of chapter marker - only on last page of chapter */}
          {readingPage.isLastPageOfChapter && (
            <div style={{ marginTop: '3rem', paddingTop: '1.5rem', textAlign: 'center', borderTop: `1px solid ${content.dividerColor}` }}>
              <p style={{ fontSize: '12px', color: content.mutedColor, letterSpacing: '0.05em' }}>
                {t('endOfChapter').replace('{number}', String(readingPage.chapterIndex + 1))}
              </p>
            </div>
          )}

          {/* Gated content upgrade banner — shown after last accessible chapter */}
          {isGated && readingPage.isLastPageOfChapter && currentPage === readingPages.length - 1 && gatedChapterCount > 0 && (
            <div className="mt-8 mx-4 rounded-2xl overflow-hidden border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/80 shadow-lg">
              <div className="px-5 py-5 flex flex-col items-center text-center gap-3">
                <div className="text-2xl">🔒</div>
                <p className="font-semibold text-amber-900 dark:text-amber-100 text-base">
                  {t('gatedUnlockChapters', { count: gatedChapterCount })}
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {t('gatedReadFullBook', { price: formatPrice(PRICING.SUBSCRIPTION.PRO) })}
                </p>
                <button
                  onClick={() => { impact('medium'); openProSheet('reader-gate') }}
                  className="mt-1 w-full py-3 px-6 rounded-xl font-semibold text-white text-sm transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                >
                  {t('gatedGetProNow')}
                </button>
              </div>
            </div>
          )}

          {/* Page number - muted, centered, part of content area */}
          <div style={{ marginTop: '2.5rem', textAlign: 'center', userSelect: 'none' }}>
            <span style={{ fontSize: '11px', color: content.mutedColor, letterSpacing: '0.08em' }}>
              {currentPage + 1} / {totalPages}
            </span>
          </div>
          </motion.article>
        </AnimatePresence>
      )
    }

    // Picture/Photobook Mode
    const page = pages[currentPage]
    const enterX = pageDirection === 'forward' ? 60 : -60
    const exitX = pageDirection === 'forward' ? -60 : 60

    return (
      <motion.div
        key={currentPage}
        initial={{ opacity: 0, x: enterX, scale: 0.98 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: exitX, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex flex-col items-center justify-center min-h-[70vh]"
      >
        {/* Image */}
        {page?.imageUrl && (
          <div className="relative w-full flex-1 flex items-center justify-center">
            <div
              className={`relative w-full max-w-3xl cursor-zoom-in ${isMobile ? 'max-h-[60vh]' : ''}`}
              style={{ aspectRatio: isMobile ? 'auto' : '4/3' }}
              onClick={(e) => {
                e.stopPropagation()
                setFullscreenImage(page.imageUrl)
              }}
            >
              <ProtectedImage
                src={page.imageUrl}
                alt={t('pageNumber').replace('{number}', String(currentPage + 1))}
                className="w-full h-full object-contain"
                watermarkText={purchased ? undefined : `\u00a9 ${bookTitle}`}
                showProtectionBadge={!purchased}
                blurOnInactive={!purchased}
                preventSave={!purchased}
                disabled={purchased}
              />
              {/* Zoom hint */}
              <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40">
                <ZoomIn className="h-3.5 w-3.5 text-white/80" />
              </div>
            </div>
            {/* Page number overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <span
                className="text-xs font-medium px-3 py-1 rounded-full"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  color: 'rgba(255,255,255,0.8)',
                }}
              >
                {currentPage + 1} / {pages.length}
              </span>
            </div>
          </div>
        )}

        {/* Text overlay */}
        {page?.text && (
          <div
            className="w-full max-w-2xl mt-6 px-4"
          >
            <div
              className="text-center leading-relaxed"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: LINE_SPACING_MAP[lineSpacing],
                fontFamily: FONT_FAMILY_MAP[fontFamily],
                color: themeStyles.text,
              }}
            >
              {page.text.split('\n\n').map((paragraph, i) => (
                <p key={i} className="mb-4">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Gated content upgrade banner — shown on last visible picture/photo page */}
        {isGated && currentPage === pages.length - 1 && gatedPageCount > 0 && (
          <div className="w-full max-w-lg mt-6 mx-4 rounded-2xl overflow-hidden border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/80 shadow-lg">
            <div className="px-5 py-5 flex flex-col items-center text-center gap-3">
              <div className="text-2xl">🔒</div>
              <p className="font-semibold text-amber-900 dark:text-amber-100 text-base">
                {t('gatedUnlockPages', { count: gatedPageCount })}
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {t('gatedReadFullBook', { price: formatPrice(PRICING.SUBSCRIPTION.PRO) })}
              </p>
              <button
                onClick={() => { impact('medium'); openProSheet('reader-gate') }}
                className="mt-1 w-full py-3 px-6 rounded-xl font-semibold text-white text-sm transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              >
                {t('gatedGetProNow')}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    )
  }

  // ============================================
  // RENDER MAIN UI
  // ============================================

  const isPictureBook = bookType === 'picture' || bookType === 'photobook'
  const contentBg = isPictureBook ? '#000000' : themeStyles.bg

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50"
      style={{ backgroundColor: contentBg }}
    >
      {/* Top Bar - auto-hiding glass chrome */}
      <AnimatePresence>
        {showChrome && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute top-0 left-0 right-0 z-30"
            style={{
              backgroundColor: readerTheme === 'dark'
                ? 'rgba(26,26,26,0.85)'
                : readerTheme === 'sepia'
                ? 'rgba(248,241,227,0.9)'
                : 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto safe-area-top">
              {/* Left: Close */}
              <button
                onClick={onClose}
                className="w-11 h-11 flex items-center justify-center rounded-full transition-colors min-w-[44px] min-h-[44px]"
                style={{
                  backgroundColor: readerTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                }}
              >
                <X className="h-4 w-4" style={{ color: themeStyles.text }} />
              </button>

              {/* Center: Chapter title */}
              <div className="flex-1 text-center px-4 min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: themeStyles.text, opacity: 0.8 }}
                >
                  {currentTitle}
                </p>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-1.5">
                {/* Search */}
                <button
                  onClick={() => {
                    setShowSearch(prev => !prev)
                  }}
                  className="w-11 h-11 flex items-center justify-center rounded-full transition-colors min-w-[44px] min-h-[44px]"
                  style={{
                    backgroundColor: showSearch
                      ? (readerTheme === 'dark' ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.15)')
                      : (readerTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
                  }}
                  title={t('search')}
                >
                  <Search className="h-4 w-4" style={{ color: showSearch ? '#3b82f6' : themeStyles.text }} />
                </button>

                {/* Bookmark */}
                <button
                  onClick={() => {
                    const currentChapterTitle = bookType === 'text'
                      ? (effectiveChapters[currentPage]?.title ?? `Kapitel ${currentPage + 1}`)
                      : `Seite ${currentPage + 1}`
                    toggleBookmark(currentPage, currentChapterTitle)
                  }}
                  className="w-11 h-11 flex items-center justify-center rounded-full transition-colors min-w-[44px] min-h-[44px]"
                  style={{
                    backgroundColor: readerTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  }}
                  title={isBookmarked(currentPage) ? 'Remove bookmark' : 'Add bookmark'}
                >
                  <Bookmark
                    className={`h-4 w-4 transition-colors ${
                      isBookmarked(currentPage) ? 'text-bookcraft-blue fill-bookcraft-blue' : ''
                    }`}
                    style={!isBookmarked(currentPage) ? { color: themeStyles.text } : undefined}
                  />
                </button>

                {/* Menu button */}
                <button
                  onClick={() => {
                    setShowSettings(true)
                  }}
                  className="w-11 h-11 flex items-center justify-center rounded-full transition-colors min-w-[44px] min-h-[44px]"
                  style={{
                    backgroundColor: readerTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  }}
                >
                  <MoreHorizontal className="h-4 w-4" style={{ color: themeStyles.text }} />
                </button>

                {/* Edit Mode button — only shown when onEditMode is provided */}
                {onEditMode && (
                  <button
                    onClick={() => {
                      onEditMode()
                    }}
                    className="w-11 h-11 flex items-center justify-center rounded-full transition-colors min-w-[44px] min-h-[44px]"
                    style={{
                      backgroundColor: readerTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                    }}
                    title="Edit book"
                  >
                    <Pencil className="h-4 w-4" style={{ color: themeStyles.text }} />
                  </button>
                )}
              </div>
            </div>

            {/* Search Bar — expands below top bar */}
            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-3">
                    <div
                      className="flex items-center gap-2 rounded-xl px-3 py-2"
                      style={{
                        backgroundColor: readerTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      }}
                    >
                      <Search className="h-4 w-4 flex-shrink-0" style={{ color: themeStyles.muted }} />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder={t('searchInBook')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent text-sm outline-none"
                        style={{ color: themeStyles.text }}
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} style={{ color: themeStyles.muted }}>
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Results BottomSheet */}
      <AnimatePresence>
        {showSearch && searchQuery.trim().length >= 2 && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-40 rounded-t-2xl overflow-hidden"
            style={{
              maxHeight: '60vh',
              backgroundColor: readerTheme === 'dark' ? '#1f1f1f' : '#ffffff',
              boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
            }}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h3 className="font-semibold text-sm" style={{ color: themeStyles.text }}>
                {t('searchResultsFor', { count: searchResults.length, query: searchQuery })}
              </h3>
              <button onClick={() => { setShowSearch(false); setSearchQuery('') }} style={{ color: themeStyles.muted }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(60vh - 52px)' }}>
              {searchResults.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm" style={{ color: themeStyles.muted }}>
                  {t('noSearchResults')}
                </p>
              ) : (
                searchResults.map((result) => (
                  <button
                    key={result.pageIndex}
                    onClick={() => {
                      goToPage(result.pageIndex)
                      setShowSearch(false)
                    }}
                    className="w-full text-left px-5 py-3.5 border-b border-border hover:bg-accent/50 transition-colors"
                  >
                    <p className="text-xs font-semibold mb-1" style={{ color: '#3b82f6' }}>
                      {result.chapterTitle}
                    </p>
                    <p className="text-sm leading-relaxed line-clamp-2" style={{ color: themeStyles.text }}>
                      {highlightText(result.excerpt, searchQuery)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Fullscreen Overlay */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div
            ref={fullscreenRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black"
            onClick={() => {
              if (imageScale <= 1.05) {
                setFullscreenImage(null)
                setImageScale(1)
                setImageOffset({ x: 0, y: 0 })
              }
            }}
            onTouchStart={(e) => {
              if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX
                const dy = e.touches[0].clientY - e.touches[1].clientY
                pinchStartDistRef.current = Math.sqrt(dx * dx + dy * dy)
                pinchCurrentScaleRef.current = imageScale
              }
            }}
            onTouchMove={(e) => {
              if (e.touches.length === 2) {
                if (pinchStartDistRef.current === 0) return
                const dx = e.touches[0].clientX - e.touches[1].clientX
                const dy = e.touches[0].clientY - e.touches[1].clientY
                const dist = Math.sqrt(dx * dx + dy * dy)
                const rawScale = pinchCurrentScaleRef.current * (dist / pinchStartDistRef.current)
                setImageScale(Math.min(5, Math.max(1, rawScale)))
              }
            }}
          >
            {/* Close button */}
            <button
              className="absolute top-12 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/60"
              onClick={(e) => {
                e.stopPropagation()
                setFullscreenImage(null)
                setImageScale(1)
                setImageOffset({ x: 0, y: 0 })
              }}
            >
              <X className="h-5 w-5 text-white" />
            </button>
            {imageScale > 1.05 && (
              <button
                className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full bg-black/60 text-white text-sm"
                onClick={(e) => { e.stopPropagation(); setImageScale(1); setImageOffset({ x: 0, y: 0 }) }}
              >
                {t('reset')}
              </button>
            )}
            <motion.img
              src={fullscreenImage}
              alt={t('fullscreen')}
              className="max-w-full max-h-full object-contain select-none"
              style={{
                scale: imageScale,
                x: imageOffset.x,
                y: imageOffset.y,
                cursor: imageScale > 1 ? 'grab' : 'zoom-out',
              }}
              drag={imageScale > 1}
              dragMomentum={false}
              onDrag={(_, info) => {
                setImageOffset((prev) => ({
                  x: prev.x + info.delta.x,
                  y: prev.y + info.delta.y,
                }))
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-xs">
              {imageScale <= 1.05 ? t('tapToClose') : t('pinchToZoomDrag')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Inline Note Editor */}
      <AnimatePresence>
        {showNoteEditor && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-20 right-4 z-20 rounded-2xl shadow-2xl p-4 max-w-xs w-[calc(100vw-2rem)]"
            style={{
              backgroundColor: readerTheme === 'dark' ? '#2a2a2a' : '#ffffff',
              border: `1px solid ${readerTheme === 'dark' ? '#333' : '#e5e7eb'}`,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: themeStyles.text }}>
                <StickyNote className="h-4 w-4 text-amber-500" />
                {t('note')}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setShowNoteEditor(false); setShowBookmarkPanel(true) }}
                  className="text-xs px-2 py-0.5 rounded hover:opacity-80"
                  style={{ color: themeStyles.muted }}
                  title={t('allNotesBookmarks')}
                >
                  {t('all')}
                </button>
                <button
                  onClick={() => setShowNoteEditor(false)}
                  style={{ color: themeStyles.muted }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-xs mb-2 truncate" style={{ color: themeStyles.muted }}>
              {bookType === 'text'
                ? (effectiveChapters[currentPage]?.title ?? `Kapitel ${currentPage + 1}`)
                : `Seite ${currentPage + 1}`}
            </p>
            <textarea
              className="w-full text-sm rounded-lg px-3 py-2 resize-none border-0 focus:outline-none focus:ring-2 focus:ring-bookcraft-blue/50"
              style={{
                backgroundColor: readerTheme === 'dark' ? '#1a1a1a' : '#f3f4f6',
                color: themeStyles.text,
              }}
              rows={4}
              placeholder={t('enterNoteHere')}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-2">
              {getNoteForChapter(currentPage) && (
                <button
                  onClick={() => {
                    const note = getNoteForChapter(currentPage)
                    if (note) deleteNote(note.id)
                    setNoteContent('')
                    setShowNoteEditor(false)
                  }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Loeschen
                </button>
              )}
              <button
                onClick={() => {
                  if (noteContent.trim()) {
                    const chapterTitle = bookType === 'text'
                      ? (effectiveChapters[currentPage]?.title ?? `Kapitel ${currentPage + 1}`)
                      : `Seite ${currentPage + 1}`
                    const existingNote = getNoteForChapter(currentPage)
                    saveNote(currentPage, chapterTitle, noteContent.trim(), existingNote?.id)
                  }
                  setShowNoteEditor(false)
                }}
                className="text-xs font-medium text-bookcraft-blue hover:underline"
              >
                Speichern
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bookmarks & Notes Panel */}
      <BookmarkNotesPanel
        isOpen={showBookmarkPanel}
        onClose={() => setShowBookmarkPanel(false)}
        bookmarks={bookmarks}
        notes={notes}
        onNavigate={(idx) => goToPage(idx)}
        onDeleteBookmark={(idx, title) => toggleBookmark(idx, title)}
        onDeleteNote={(id) => deleteNote(id)}
        bookType={bookType}
      />

      {/* TOC Bottom Sheet */}
      <TocBottomSheet
        isOpen={showToc}
        onClose={() => setShowToc(false)}
        bookType={bookType}
        chapters={effectiveChapters}
        pages={pages}
        currentPage={currentPage}
        goToPage={goToPage}
        goToChapter={(chapterIdx) => {
          const pageIdx = getFirstPageOfChapter(chapterIdx)
          goToPage(pageIdx >= 0 ? pageIdx : 0)
        }}
        isPageLocked={isPageLocked}
        isChapterLocked={(chapterIdx) => {
          if (purchased || !aiGenerated) return false
          return chapterIdx > 0
        }}
        t={t}
      />

      {/* Settings Bottom Sheet */}
      <ReaderSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        fontSize={fontSize}
        setFontSize={setFontSize}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
        lineSpacing={lineSpacing}
        setLineSpacing={setLineSpacing}
        readerTheme={readerTheme}
        setReaderTheme={setReaderTheme}
        onShowToc={() => setShowToc(true)}
        onShowBookmarks={() => setShowBookmarkPanel(true)}
        purchased={purchased}
        isOfflineAvailable={isOfflineAvailable}
        isDownloading={isDownloading}
        downloadProgress={downloadProgress}
        onDownloadOffline={() => {
          setShowSettings(false)
          downloadForOffline(
            bookTitle,
            bookType,
            effectiveChapters,
            chaptersJson,
            bookImages ?? []
          )
        }}
        onRemoveOffline={() => {
          setShowSettings(false)
          removeOffline()
        }}
      />

      {/* Main Content - Protected */}
      <ProtectedContent
        showWarningOnAttempt={!purchased}
        watermark={purchased ? undefined : `\u00a9 ${bookTitle}`}
        blurOnScreenshot={!purchased}
        blurOnDevTools={!purchased}
        blurOnFocusLoss={false}
        maxProtection={!purchased}
        showDevToolsWarning={!purchased}
        disabled={purchased}
      >
        {/* Swipe gesture wrapper */}
        <motion.div
          className="h-full"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          dragDirectionLock={true}
          onDragEnd={handleDragEnd}
          style={{ x, opacity, touchAction: 'pan-y' }}
        >
          {/* Scroll container with tap zones — fullscreen, content-first */}
          <div
            className="h-full overflow-y-auto overscroll-contain"
            style={{
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
              paddingTop: '64px',
              paddingBottom: '48px',
              backgroundColor: contentBg,
            }}
            onClick={handleContentTap}
          >
            <div
              style={{
                maxWidth: '640px',
                margin: '0 auto',
                paddingLeft: '24px',
                paddingRight: '24px',
                paddingTop: '20px',
                paddingBottom: '32px',
              }}
            >
              {renderContent()}
            </div>
          </div>
        </motion.div>
      </ProtectedContent>

      {/* Bottom progress bar - always visible, ultra thin */}
      <div className="absolute bottom-0 left-0 right-0 z-20 safe-area-bottom">
        <div
          className="h-[1px] w-full"
          style={{
            backgroundColor: readerTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          }}
        >
          <motion.div
            className="h-full"
            style={{
              backgroundColor: readerTheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.25)',
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Protection indicator - subtle, only when not purchased */}
      {!purchased && showChrome && (
        <div
          className="absolute top-16 right-4 z-10 flex items-center gap-1 px-2 py-1 rounded-full text-xs"
          style={{
            backgroundColor: readerTheme === 'dark' ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)',
            color: readerTheme === 'dark' ? '#86efac' : '#16a34a',
          }}
        >
          <Shield className="h-3 w-3" />
          <span>{t('protected')}</span>
        </div>
      )}

      {/* Stripe Purchase Modal */}
      {showPurchaseModal && (
        <BookPurchaseSheet
          bookId={bookId}
          bookData={{
            title: bookTitle,
            genre: 'book',
            chapters: totalPages,
            purchased: purchased
          }}
          price={getBookPrice(bookType)}
          onPurchaseSuccess={() => {
            onPurchaseSuccess?.()
            setShowPurchaseModal(false)
          }}
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
        />
      )}
    </motion.div>
  )
}
