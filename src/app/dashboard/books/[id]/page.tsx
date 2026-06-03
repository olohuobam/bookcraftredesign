'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, BookOpen, Edit, Package, Download, Lock, ShoppingCart,
  Settings, Share2, Camera, MoreHorizontal, Trash2, Globe, EyeOff, GripVertical, ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import BookMetadataEditor from '@/components/BookMetadataEditor'
import PictureBookCoverSelector from '@/components/PictureBookCoverSelector'
import BookPrintConfig from '@/components/BookPrintConfig'
import UniversalBookReader from '@/components/UniversalBookReader'
import PhotobookViewer from '@/components/PhotobookViewer'
import PictureBookViewer from '@/components/PictureBookViewer'
import UniversalBookEditor from '@/components/UniversalBookEditor'
import BookExportDialog from '@/components/BookExportDialog'
import KDPExportButton from '@/components/KDPExportButton'
import CoverGeneratorButton from '@/components/CoverGeneratorButton'
import BookPurchaseSheet from '@/components/BookPurchaseSheet'
import ShareButton from '@/components/ShareButton'
import { BookDetailSkeleton } from '@/components/skeletons/BookDetailSkeleton'
import { formatPrice, getBookPrice } from '@/lib/pricing'
import { AppBar } from '@/components/AppBar'
import { useSubscription } from '@/hooks/useSubscription'
import PullToRefreshContainer from '@/components/PullToRefreshContainer'
const BookHero3D = dynamic(() => import('@/components/BookHero3D'), { ssr: false })
import BottomSheet from '@/components/BottomSheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Chapter {
  id: string
  title: string
  content: string
  wordCount: number
}

interface Book {
  id: string
  title: string
  description: string
  content: string
  status: string
  genre: string
  targetAudience: string
  style: string
  bookType?: string
  createdAt: string
  updatedAt: string
  coverImage?: string | null
  backCoverImage?: string | null
  backCoverText?: string | null
  isbn?: string | null
  author?: string | null
  publisher?: string | null
  publicationDate?: string | null
  images?: string[] | null
  chaptersJson?: string | null
  purchased?: boolean
  aiGenerated?: boolean
  activeJobId?: string | null
  isPublic?: boolean
  isGated?: boolean
  gatedChapterCount?: number
  gatedPageCount?: number
}

function SortableChapterItem({
  chapter,
  index,
  canDrag,
  onClick,
}: {
  chapter: Chapter
  index: number
  canDrag: boolean
  onClick: () => void
}) {
  const { t } = useLanguage()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: isDragging ? 'relative' : undefined,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, touchAction: 'pan-y' }}
      className="flex items-center gap-2 p-3.5 rounded-xl hover:bg-muted/50 transition-colors"
    >
      {canDrag && (
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="touch-none flex-shrink-0 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing p-0.5"
          aria-label={t('dragToReorder')}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <div
        onClick={onClick}
        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
      >
        <span className="w-7 h-7 rounded-full bg-bookcraft-blue/5 dark:bg-bookcraft-blue/10 flex items-center justify-center text-xs font-semibold text-bookcraft-blue dark:text-bookcraft-blue/80 flex-shrink-0">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{chapter.title}</p>
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {chapter.wordCount.toLocaleString()}
        </span>
      </div>
    </div>
  )
}

export default function BookDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, getIdToken } = useAuth()
  const { t } = useLanguage()
  const { isPro } = useSubscription()
  const id = params?.id as string

  // Deep-link support: ?autoRead=1&chapter=X opens the reader at the given chapter
  const autoRead = searchParams?.get('autoRead') === '1'
  const chapterParam = parseInt(searchParams?.get('chapter') ?? '0', 10)
  const initialChapterIndex = Number.isFinite(chapterParam) && chapterParam > 0
    ? chapterParam - 1
    : 0

  const [book, setBook] = useState<Book | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showReader, setShowReader] = useState(autoRead)
  const [showEditor, setShowEditor] = useState(false)
  const [showPrintOrder, setShowPrintOrder] = useState(false)
  const [showMetadata, setShowMetadata] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showCoverGenerator, setShowCoverGenerator] = useState(false)
  const [printJob, setPrintJob] = useState<{ id: string; status: string } | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  )

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = chapters.findIndex(ch => ch.id === active.id)
    const newIndex = chapters.findIndex(ch => ch.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const newChapters = arrayMove(chapters, oldIndex, newIndex)
    setChapters(newChapters) // Optimistic UI

    try {
      const token = await getIdToken()
      if (!token) return
      await fetch(`/api/books/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ chaptersJson: JSON.stringify(newChapters) }),
      })
    } catch {
      // Revert on error
      setChapters(chapters)
    }
  }, [chapters, id, getIdToken])

  const fetchBook = useCallback(async () => {
    if (!user || !id) return
    try {
      const token = await getIdToken()
      if (!token) { setError(t('authenticationFailed')); return }

      const res = await fetch(`/api/books/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load book')

      const data = await res.json()
      setBook(data.book)

      let parsed: Chapter[] = []
      if (data.book.chaptersJson) {
        try {
          const chaptersData = typeof data.book.chaptersJson === 'string'
            ? JSON.parse(data.book.chaptersJson)
            : data.book.chaptersJson

          if (Array.isArray(chaptersData)) {
            parsed = chaptersData.map((ch: any) => {
              let contentStr = ''
              if (typeof ch.content === 'string') contentStr = ch.content
              else if (ch.content?.content) contentStr = ch.content.content
              return {
                id: ch.id || String(Math.random()),
                title: ch.title || t('unnamedChapter'),
                content: contentStr,
                wordCount: ch.wordCount || (contentStr ? contentStr.split(/\s+/).filter(Boolean).length : 0),
              }
            })
          }
        } catch { /* ignore */ }
      }

      if (parsed.length === 0 && data.book.content) {
        parsed = [{
          id: '1', title: data.book.title, content: data.book.content,
          wordCount: data.book.content.split(/\s+/).filter(Boolean).length,
        }]
      }
      if (parsed.length === 0) {
        parsed = [{ id: '1', title: `${t('chapter')} 1`, content: '', wordCount: 0 }]
      }
      setChapters(parsed)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [user, id, getIdToken, t])

  useEffect(() => { fetchBook() }, [fetchBook])

  // Fetch print job for this book (if any)
  useEffect(() => {
    if (!user || !id) return
    const fetchPrintJob = async () => {
      try {
        const token = await getIdToken()
        if (!token) return
        const res = await fetch(`/api/print-jobs?bookId=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          const jobs = data.print_jobs ?? []
          if (jobs.length > 0) setPrintJob(jobs[0])
        }
      } catch { /* silent */ }
    }
    fetchPrintJob()
  }, [user, id, getIdToken])

  const handleDelete = async () => {
    if (!confirm(t('confirmDeleteAction') || 'Delete this book?')) return
    const token = await getIdToken()
    if (!token) return
    await fetch(`/api/books/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    router.push('/dashboard/books')
  }

  const handleShare = () => {
    const url = `${window.location.origin}/preview/${book?.id}`
    if (navigator.share) {
      navigator.share({ title: book?.title, url })
    } else {
      navigator.clipboard.writeText(url)
    }
  }

  const handleTogglePublic = async () => {
    if (!book) return
    const token = await getIdToken()
    if (!token) return
    const newValue = !book.isPublic
    setBook(prev => prev ? { ...prev, isPublic: newValue } : prev)
    try {
      await fetch(`/api/books/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: newValue }),
      })
    } catch {
      setBook(prev => prev ? { ...prev, isPublic: !newValue } : prev)
    }
  }

  if (loading) return <BookDetailSkeleton />

  if (error || !book) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center px-6">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold font-display text-foreground mb-2">{t('error')}</h2>
          <p className="text-muted-foreground mb-6">{error || t('bookNotFound')}</p>
          <Button onClick={() => router.push('/dashboard/books')} variant="outline" className="rounded-full px-6">
            <ArrowLeft className="h-4 w-4 mr-2" /> {t('backToOverview')}
          </Button>
        </div>
      </div>
    )
  }

  const totalWords = chapters.reduce((s, ch) => s + ch.wordCount, 0)

  // Detect photobook: bookType === 'picture' AND chaptersJson.isPhotobook === true
  const parsedChaptersJson = (() => {
    try {
      return typeof book.chaptersJson === 'string' ? JSON.parse(book.chaptersJson) : book.chaptersJson
    } catch { return null }
  })()
  const isPhotobook = book.bookType === 'picture' && parsedChaptersJson?.isPhotobook === true
  const isPictureBook = book.bookType === 'picture' && !isPhotobook

  // Build PictureBookViewer pages from chaptersJson.pages or images[]
  const pictureBookPages = (() => {
    if (!isPictureBook) return []
    // Try chaptersJson.pages first (n8n structure)
    if (parsedChaptersJson?.pages && Array.isArray(parsedChaptersJson.pages)) {
      return parsedChaptersJson.pages.map((p: any, i: number) => {
        const imageUrl =
          (p.panels && p.panels[0]?.imageUrl) ||
          (book.images && book.images[i]) ||
          ''
        return {
          pageNumber: i + 1,
          imageUrl,
          text: p.text || '',
        }
      }).filter((p: { imageUrl: string; text: string; pageNumber: number }) => p.imageUrl)
    }
    // Fallback: images[] array
    if (book.images && book.images.length > 0) {
      return (book.images as string[])
        .filter(url => typeof url === 'string' && url.length > 0)
        .map((imageUrl, i) => ({
          pageNumber: i + 1,
          imageUrl,
          text: '',
        }))
    }
    return []
  })()

  const PRINT_STATUS_LABELS: Record<string, string> = {
    pending:          t('printStatusPending'),
    payment_received: t('printStatusPaymentReceived'),
    processing:       t('printStatusProcessing'),
    production_ready: t('printStatusProductionReady'),
    in_production:    t('printStatusInProduction'),
    shipped:          t('printStatusShipped'),
    delivered:        t('printStatusDelivered'),
    error:            t('printStatusError'),
    cancelled:        t('printStatusCancelled'),
  }

  // Shared dropdown menu items (used in both mobile and desktop nav)
  const dropdownMenuItems = (
    <>
      <DropdownMenuItem onClick={() => setShowCoverGenerator(true)}>
        <Camera className="h-4 w-4 mr-2.5" /> {t('aiCoverGenerator') || 'Generate Cover'}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleShare}>
        <Share2 className="h-4 w-4 mr-2.5" /> {t('share') || 'Share'}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleTogglePublic}>
        {book.isPublic
          ? <><EyeOff className="h-4 w-4 mr-2.5" /> {t('makePrivate')}</>
          : <><Globe className="h-4 w-4 mr-2.5" /> {t('makePublic')}</>
        }
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setShowMetadata(true)}>
        <Settings className="h-4 w-4 mr-2.5" /> {t('bookInformation') || 'Metadata'}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
        <Trash2 className="h-4 w-4 mr-2.5" /> {t('delete') || 'Delete'}
      </DropdownMenuItem>
    </>
  )

  return (
    <div className="h-full bg-background flex flex-col">
      {/* ── Mobile Navigation Bar ── */}
      <div className="lg:hidden">
        <AppBar
          title=""
          showBack
          onBack={() => router.push('/dashboard/books')}
          actions={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl w-52">
                {dropdownMenuItems}
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
      </div>

      {/* ── Desktop Navigation Bar ── */}
      <div className="hidden lg:flex items-center gap-3 border-b border-border px-6 py-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/books')} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold text-foreground truncate">{book.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <ShareButton
            url={`/preview/${book.id}`}
            title={book.title}
            description={book.description ?? undefined}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl w-52">
              {dropdownMenuItems}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <PullToRefreshContainer onRefresh={fetchBook} className="flex-1">

        {/* ── 1. Book Hero Section ── */}
        <section className="px-4 sm:px-6 pt-8 pb-6 sm:pt-12 sm:pb-8">
          <div className="max-w-lg mx-auto flex flex-col items-center text-center">
            <BookHero3D
              coverImage={book.coverImage}
              backCoverImage={book.backCoverImage}
              title={book.title}
              author={book.author}
              onClick={() => setShowReader(true)}
            />

            {/* Title */}
            <h2 className="mt-8 text-2xl sm:text-3xl font-serif font-bold text-foreground leading-tight">
              {book.title}
            </h2>
            {book.author && (
              <p className="mt-1.5 text-sm text-muted-foreground">{book.author}</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground/70">
              {chapters.length} {t('chaptersCount') || 'Chapters'} · {totalWords.toLocaleString()} {t('wordsCount') || 'Words'}
              {book.genre ? ` · ${book.genre}` : ''}
            </p>

            {/* Status badges */}
            <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
              {book.isPublic && (
                <span
                  onClick={handleTogglePublic}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-bookcraft-blue/5 dark:bg-bookcraft-blue/10 text-bookcraft-blue dark:text-bookcraft-blue/80 rounded-full text-[11px] font-medium cursor-pointer hover:bg-bookcraft-blue/10 dark:hover:bg-bookcraft-blue/20 transition-colors"
                  title={t('clickToMakePrivate')}
                >
                  <Globe className="w-3 h-3" /> Öffentlich
                </span>
              )}
              {book.purchased ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 rounded-full text-[11px] font-medium">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Purchased
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-full text-[11px] font-medium">
                  <Lock className="w-3 h-3" /> Preview
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ── 2. Action Bar ── */}
        <section className="px-4 sm:px-6 pb-6">
          <div className="max-w-lg mx-auto flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={() => setShowReader(true)}
              className="rounded-full px-6 h-11 bg-foreground text-background hover:bg-foreground/90 font-medium"
            >
              <BookOpen className="h-4 w-4 mr-2" /> {t('read') || 'Read'}
            </Button>
            <Button
              onClick={() => setShowEditor(true)}
              variant="outline"
              className="rounded-full px-6 h-11 font-medium"
            >
              <Edit className="h-4 w-4 mr-2" /> {t('write') || 'Edit'}
            </Button>
            {(book.purchased || isPro) && (
              <>
                <BookExportDialog
                  bookId={book.id}
                  bookTitle={book.title}
                  purchased={book.purchased}
                  triggerElement={
                    <Button
                      variant="outline"
                      className="rounded-full px-6 h-11 font-medium"
                    >
                      <Download className="h-4 w-4 mr-2" /> {t('digitalExport') || 'Export'}
                    </Button>
                  }
                />
                <Button
                  disabled
                  variant="outline"
                  title={t('printComingSoonDesc') || 'Print-on-Demand will be available soon.'}
                  className="rounded-full px-6 h-11 font-medium opacity-60 cursor-not-allowed"
                >
                  <Package className="h-4 w-4 mr-2" /> {t('printOnDemand') || 'Print'} · {t('printComingSoon') || 'Coming soon'}
                </Button>
                {book.purchased && (
                  <KDPExportButton
                    bookId={book.id}
                    bookTitle={book.title}
                  />
                )}
              </>
            )}
            {/* Show export dialog even for free users so they can see formats and upgrade */}
            {!book.purchased && !isPro && (
              <>
                <BookExportDialog
                  bookId={book.id}
                  bookTitle={book.title}
                  purchased={false}
                  triggerElement={
                    <Button
                      variant="outline"
                      className="rounded-full px-6 h-11 font-medium"
                    >
                      <Download className="h-4 w-4 mr-2" /> {t('digitalExport') || 'Export'}
                    </Button>
                  }
                />
                <Button
                  onClick={() => setShowPurchaseModal(true)}
                  className="rounded-full px-6 h-11 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" /> {t('purchaseBook') || 'Buy Now'}
                </Button>
              </>
            )}
            <ShareButton
              url={`/preview/${book.id}`}
              title={book.title}
              description={book.description ?? undefined}
            />
          </div>
        </section>

        {/* ── 3. Description ── */}
        {book.description && (
          <section className="px-4 sm:px-6 pb-4">
            <div className="max-w-lg mx-auto">
              <p className="text-sm text-muted-foreground leading-relaxed">{book.description}</p>
            </div>
          </section>
        )}

        {/* ── 3b. Print Status Banner ── */}
        {printJob && (
          <section className="px-4 sm:px-6 pb-4">
            <div className="max-w-lg mx-auto">
              <Link
                href="/dashboard/orders"
                className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-foreground">
                    Druckauftrag
                    <span className="text-muted-foreground"> · </span>
                    {PRINT_STATUS_LABELS[printJob.status?.toLowerCase()] ?? printJob.status}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
              </Link>
            </div>
          </section>
        )}

        {/* ── 4a. Cover Selector (Photobooks only) ── */}
        {book.bookType === 'picture' && (() => { try { const cj = typeof book.chaptersJson === 'string' ? JSON.parse(book.chaptersJson) : book.chaptersJson; return cj?.isPhotobook === true } catch { return false } })() && (book.images || []).some(u => typeof u === 'string' && u.length > 0) && (
          <section className="px-4 sm:px-6 pb-6">
            <div className="max-w-lg mx-auto">
              <div className="bg-gradient-to-r from-blue-600 to-blue-600 rounded-t-2xl px-5 py-3">
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  {t('selectCover')}
                </h3>
                <p className="text-blue-200 text-xs mt-0.5">
                  {t('perfectCoverImage')}
                </p>
              </div>
              <div className="border border-border rounded-b-2xl p-4 bg-card">
                <PictureBookCoverSelector
                  bookId={book.id}
                  bookTitle={book.title}
                  bookAuthor={book.author || undefined}
                  transformStyle={book.style || 'default'}
                  allImages={(book.images || []) as string[]}
                  currentCoverImage={book.coverImage || undefined}
                  onCoverSaved={(url) => setBook(prev => prev ? { ...prev, coverImage: url } : prev)}
                />
              </div>
            </div>
          </section>
        )}

        {/* ── 4. Chapter List ── */}
        <section className="px-4 sm:px-6 pb-8">
          <div className="max-w-lg mx-auto">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {t('chaptersCount') || 'Chapters'}
            </h3>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={chapters.map(ch => ch.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-0.5">
                  {chapters.map((ch, i) => (
                    <SortableChapterItem
                      key={ch.id}
                      chapter={ch}
                      index={i}
                      canDrag={!!user}
                      onClick={() => setShowReader(true)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </section>

        {/* ── 5. Purchase Card (if not purchased and not Pro) ── */}
        {!book.purchased && !isPro && (
          <section className="px-4 sm:px-6 pb-8">
            <div className="max-w-lg mx-auto bg-card rounded-2xl border border-border p-6 text-center">
              <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-base font-semibold mb-1">{t('purchaseBook') || 'Unlock Full Book'}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('bookNotUnlockedDesc') || 'Get full access to read, edit and export'}
              </p>
              <div className="flex items-center justify-center gap-4">
                <span className="text-2xl font-bold text-foreground">
                  {formatPrice(getBookPrice(book.bookType))}
                </span>
                <BookPurchaseSheet
                  bookId={book.id}
                  bookData={{
                    title: book.title,
                    author: book.author || undefined,
                    genre: book.genre,
                    chapters: chapters.length,
                    purchased: book.purchased,
                  }}
                  price={getBookPrice(book.bookType)}
                  onPurchaseSuccess={fetchBook}
                />
              </div>
            </div>
          </section>
        )}

        {/* Bottom spacer */}
        <div className="h-24 lg:h-8" />
      </PullToRefreshContainer>

      {/* ── Full-screen Reader Overlay ── */}
      <AnimatePresence>
        {showReader && (
          isPhotobook ? (
            <div className="fixed inset-0 z-50 bg-background overflow-auto">
              <PhotobookViewer
                bookTitle={book.title}
                chaptersJson={parsedChaptersJson}
                coverImage={book.coverImage}
                onClose={() => setShowReader(false)}
              />
            </div>
          ) : isPictureBook && pictureBookPages.length > 0 ? (
            <div className="fixed inset-0 z-50 bg-background flex flex-col">
              <PictureBookViewer
                bookTitle={book.title}
                author={book.author || undefined}
                coverImage={book.coverImage || undefined}
                pages={pictureBookPages}
                bookId={book.id}
                purchased={book.purchased || false}
                aiGenerated={book.aiGenerated || false}
                onPurchaseSuccess={fetchBook}
              />
              <button
                onClick={() => setShowReader(false)}
                className="fixed top-4 right-4 z-[60] bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                aria-label={t('close')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ) : (
            <UniversalBookReader
              bookId={book.id}
              bookTitle={book.title}
              bookType={book.bookType}
              status={book.status}
              activeJobId={book.activeJobId}
              chapters={chapters}
              chaptersJson={book.chaptersJson}
              images={book.images || undefined}
              purchased={book.purchased || false}
              aiGenerated={book.aiGenerated || false}
              coverImage={book.coverImage}
              author={book.author || undefined}
              initialChapterIndex={Math.min(initialChapterIndex, Math.max(0, chapters.length - 1))}
              isGated={book.isGated || false}
              gatedChapterCount={book.gatedChapterCount || 0}
              gatedPageCount={book.gatedPageCount || 0}
              onClose={() => setShowReader(false)}
              onEditMode={() => { setShowReader(false); setShowEditor(true); }}
              onPurchaseSuccess={fetchBook}
              onComplete={fetchBook}
            />
          )
        )}
      </AnimatePresence>

      {/* ── Full-screen Editor Overlay ── */}
      <AnimatePresence>
        {showEditor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background"
          >
            <UniversalBookEditor
                key={`editor-${book.id}`}
                bookId={book.id}
                bookTitle={book.title}
                bookType={book.bookType}
                chapters={chapters}
                chaptersJson={book.chaptersJson}
                images={book.images || undefined}
                purchased={book.purchased || false}
                aiGenerated={book.aiGenerated || false}
                coverImage={book.coverImage}
                author={book.author || undefined}
                onSave={fetchBook}
                onClose={() => { setShowEditor(false); fetchBook(); }}
              />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Print on Demand BottomSheet ── */}
      <BottomSheet
        isOpen={showPrintOrder}
        onClose={() => setShowPrintOrder(false)}
        title={t('printOnDemand') || 'Print on Demand'}
        subtitle={'Order a physical copy'}
      >
        <div className="p-5">
          <BookPrintConfig
            bookId={book.id}
            bookTitle={book.title}
            coverImageUrl={book.coverImage ?? undefined}
            pageCount={Math.max(24, Math.min(800, Math.round((totalWords || chapters.length * 250) / 250)))}
            onClose={() => setShowPrintOrder(false)}
            onSuccess={() => {
              setShowPrintOrder(false)
            }}
          />
        </div>
      </BottomSheet>


      {/* ── Metadata Sheet ── */}
      <AnimatePresence>
        {showMetadata && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={() => setShowMetadata(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-auto p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold font-display">{t('bookInformation') || 'Book Info'}</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowMetadata(false)} className="rounded-full">

                </Button>
              </div>
              <BookMetadataEditor
                book={book}
                chapters={chapters}
                onSave={async (updates) => {
                  const token = await getIdToken()
                  if (!token) throw new Error('No token')
                  const res = await fetch(`/api/books/${book.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify(updates),
                  })
                  if (!res.ok) throw new Error('Failed to save')
                  await fetchBook()
                  setShowMetadata(false)
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cover Generator Modal ── */}
      <AnimatePresence>
        {showCoverGenerator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={() => setShowCoverGenerator(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-6"
            >
              {/* Handle indicator for mobile */}
              <div className="flex justify-center mb-4 sm:hidden">
                <div className="w-10 h-1 bg-border rounded-full" />
              </div>
              <h3 className="text-lg font-bold font-display mb-4">{t('aiCoverGenerator') || 'AI Cover Generator'}</h3>
              <CoverGeneratorButton
                bookId={book.id}
                onCoverGenerated={(url) => {
                  setBook({ ...book, coverImage: url })
                  setShowCoverGenerator(false)
                  fetchBook()
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Purchase Sheet ── */}
      {showPurchaseModal && (
        <BookPurchaseSheet
          bookId={book.id}
          bookData={{
            title: book.title,
            author: book.author || undefined,
            genre: book.genre,
            chapters: chapters.length,
            purchased: book.purchased,
          }}
          price={getBookPrice(book.bookType)}
          onPurchaseSuccess={() => { fetchBook(); setShowPurchaseModal(false) }}
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
        />
      )}
    </div>
  )
}
