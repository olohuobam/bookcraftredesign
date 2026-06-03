'use client'

import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus, Clock, Loader2, Trash2, X, Package, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import PullToRefreshContainer from '@/components/PullToRefreshContainer'
import { AppBar } from '@/components/AppBar'
import SafeImage from '@/components/SafeImage'
import ReadingProgressBar, { type ReadingProgress } from '@/components/ReadingProgressBar'
import BookBottomSheet, { type BookBottomSheetBook } from '@/components/BookBottomSheet'
import { getOfflineBookIds } from '@/hooks/useOfflineReading'

interface Book {
 id: string
 title: string
 createdAt: string
 updatedAt: string
 status: string
 genre?: string
 chapters?: number
 purchased?: boolean
 bookType?: string
 coverImage?: string
 author?: string | null
 // Extended fields for BottomSheet stats & status detection
 description?: string
 activeJobId?: string | null
 chaptersJson?: { chapters?: { content?: string }[] }
 content?: string
}

interface ActiveJob {
 id: string
 bookId: string
 status: string
 progress: number
 currentStep: string
 config: any
 createdAt: string
}

interface PrintJobSummary {
 id: string
 book_title?: string
 status: string
 created_at: string
}

const PRINT_STATUS_LABEL_KEYS: Record<string, string> = {
 pending:          'printStatusPending',
 payment_received: 'printStatusPaymentReceived',
 processing:       'printStatusProcessing',
 production_ready: 'printStatusProductionReady',
 in_production:    'printStatusInProduction',
 shipped:          'printStatusShipped',
 delivered:        'printStatusDelivered',
 error:            'printStatusError',
}

export default function DashboardPage() {
 const { user, getIdToken } = useAuth()
 const { t, isLoading: langLoading } = useLanguage()
 const router = useRouter()
 const [books, setBooks] = useState<Book[]>([])
 const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([])
 const [loading, setLoading] = useState(true)
 const [readingProgress, setReadingProgress] = useState<Record<string, ReadingProgress>>({})
 const [deletingJobId, setDeletingJobId] = useState<string | null>(null)
 const [latestPrintJob, setLatestPrintJob] = useState<PrintJobSummary | null>(null)
 const [contextMenu, setContextMenu] = useState<{ jobId: string; x: number; y: number } | null>(null)
 const longPressTimer = useRef<NodeJS.Timeout | null>(null)
 // BottomSheet state for book cards
 const [selectedBook, setSelectedBook] = useState<Book | null>(null)
 const [isBookSheetOpen, setIsBookSheetOpen] = useState(false)

 // Offline mode: track online status + offline book IDs
 const [isOnline, setIsOnline] = useState(true)
 const [offlineBookIds, setOfflineBookIds] = useState<string[]>([])

 useEffect(() => {
  setIsOnline(navigator.onLine)
  const goOnline = () => setIsOnline(true)
  const goOffline = () => setIsOnline(false)
  window.addEventListener('online', goOnline)
  window.addEventListener('offline', goOffline)
  return () => {
   window.removeEventListener('online', goOnline)
   window.removeEventListener('offline', goOffline)
  }
 }, [])

 // Load offline book IDs when offline
 useEffect(() => {
  if (!isOnline) {
   getOfflineBookIds().then(setOfflineBookIds).catch(() => setOfflineBookIds([]))
  }
 }, [isOnline])

 // ── Book BottomSheet handlers ──────────────────────────────────────────────
 const handleBookTap = useCallback((book: Book) => {
  setSelectedBook(book)
  setIsBookSheetOpen(true)
 }, [])

 const handleBookSheetOpen = useCallback((book: BookBottomSheetBook) => {
  setIsBookSheetOpen(false)
  router.push(`/dashboard/books/${book.id}`)
 }, [router])

 const handleBookSheetEdit = useCallback((book: BookBottomSheetBook) => {
  setIsBookSheetOpen(false)
  router.push(`/dashboard/books/${book.id}`)
 }, [router])

 const handleBookSheetShare = useCallback((book: BookBottomSheetBook) => {
  const url = `${window.location.origin}/preview/${book.id}`
  if (navigator.share) {
   navigator.share({ title: book.title, url })
  } else {
   navigator.clipboard.writeText(url)
  }
  setIsBookSheetOpen(false)
 }, [])

 const handleBookSheetDelete = useCallback(
  (book: BookBottomSheetBook) => {
   setIsBookSheetOpen(false)
   if (confirm(t('confirmDeleteBook').replace('{title}', book.title))) {
    getIdToken().then((token) => {
     if (!token) return
     fetch(`/api/books/${book.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
     }).then((res) => {
      if (res.ok) setBooks((prev) => prev.filter((b) => b.id !== book.id))
     })
    })
   }
  },
  [t, getIdToken]
 )
 // ─────────────────────────────────────────────────────────────────────────

 const deleteJob = async (jobId: string) => {
  try {
   const token = await getIdToken()
   if (!token) return
   const res = await fetch(`/api/jobs/${jobId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
   })
   if (res.ok) {
    setActiveJobs(prev => prev.filter(j => j.id !== jobId))
   }
  } catch (err) {
   console.error('Failed to delete job:', err)
  } finally {
   setDeletingJobId(null)
   setContextMenu(null)
  }
 }

 const handleLongPressStart = (jobId: string) => {
  longPressTimer.current = setTimeout(() => {
   setDeletingJobId(jobId)
  }, 600)
 }

 const handleLongPressEnd = () => {
  if (longPressTimer.current) {
   clearTimeout(longPressTimer.current)
   longPressTimer.current = null
  }
 }

 const handleContextMenu = (e: React.MouseEvent, jobId: string) => {
  e.preventDefault()
  setContextMenu({ jobId, x: e.clientX, y: e.clientY })
 }

 // Close context menu on click outside
 useEffect(() => {
  const close = () => setContextMenu(null)
  if (contextMenu) {
   window.addEventListener('click', close)
   return () => window.removeEventListener('click', close)
  }
 }, [contextMenu])

 const fetchReadingProgress = useCallback(async (token: string) => {
  try {
   const res = await fetch('/api/books/reading-progress', {
    headers: { Authorization: `Bearer ${token}` },
   })
   if (!res.ok) return
   const data = await res.json()
   setReadingProgress(data.progress || {})
  } catch {
   // Silent fail — progress is a nice-to-have
  }
 }, [])

 const fetchBooks = useCallback(async () => {
  if (!user) return
  try {
   const token = await getIdToken()
   if (!token) return

   // Fetch books, active jobs, reading progress, and print jobs in parallel
   const [booksRes, jobsRes, printJobsRes] = await Promise.all([
    fetch('/api/books', { headers: { Authorization: `Bearer ${token}` } }),
    fetch('/api/jobs/active', { headers: { Authorization: `Bearer ${token}` } }),
    fetch('/api/print-jobs', { headers: { Authorization: `Bearer ${token}` } }),
    fetchReadingProgress(token),
   ])
   if (booksRes.ok) {
    const data = await booksRes.json()
    setBooks(data.books || [])
   }
   if (jobsRes.ok) {
    const jobsData = await jobsRes.json()
    setActiveJobs(jobsData.jobs || [])
   }
   if (printJobsRes.ok) {
    const printData = await printJobsRes.json()
    const jobs: PrintJobSummary[] = printData.print_jobs ?? []
    if (jobs.length > 0) setLatestPrintJob(jobs[0])
   }
  } catch {
   // Silent fail
  } finally {
   setLoading(false)
  }
 }, [user, getIdToken, fetchReadingProgress])

 useEffect(() => {
  fetchBooks()
 }, [fetchBooks])

 // Auto-refresh active jobs every 5 seconds
 useEffect(() => {
  if (activeJobs.length === 0) return
  const interval = setInterval(fetchBooks, 5000)
  return () => clearInterval(interval)
 }, [activeJobs.length, fetchBooks])

 if (loading || langLoading) return <DashboardSkeleton />

 // When offline, only show books that are downloaded for offline reading
 const displayBooks = !isOnline
  ? books.filter(b => offlineBookIds.includes(b.id))
  : books

 return (
  <PullToRefreshContainer onRefresh={fetchBooks} className="bg-background flex-1 min-h-0">
   {/* App Bar */}
   <div className="lg:hidden">
    <AppBar title={t('dashboard')} subtitle={`${displayBooks.length} ${displayBooks.length === 1 ? 'Book' : 'Books'}`} />
   </div>
   <div className="hidden lg:block border-b border-border px-6 py-5">
    <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">{t('welcome')}</h1>
    <p className="text-sm text-muted-foreground mt-0.5">{displayBooks.length} {displayBooks.length === 1 ? 'Book' : 'Books'}</p>
   </div>

   <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
    {/* Create Button — hide when offline */}
    {isOnline && <Link href="/dashboard/create" className="block mb-6">
     <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="flex items-center justify-center gap-3 w-full h-14 rounded-2xl bg-gradient-to-r from-bookcraft-blue to-bookcraft-blue text-white font-semibold shadow-lg shadow-bookcraft-blue/20 hover:shadow-bookcraft-blue/30 transition-shadow"
     >
      <Plus className="h-5 w-5" />
      {t('createBook') || 'Create New Book'}
     </motion.div>
    </Link>}

    {/* Letzte Bestellung */}
    {latestPrintJob && (
     <Link href="/dashboard/orders" className="block mb-6">
      <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl border border-border bg-card hover:shadow-sm transition-shadow">
       <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 bg-muted rounded-xl flex-shrink-0">
         <Package className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
         <p className="text-sm font-semibold text-foreground truncate">
          {latestPrintJob.book_title || 'Druckauftrag'}
         </p>
         <div className="flex items-center gap-2 mt-0.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
           {PRINT_STATUS_LABEL_KEYS[latestPrintJob.status?.toLowerCase()]
             ? t(PRINT_STATUS_LABEL_KEYS[latestPrintJob.status?.toLowerCase()] as Parameters<typeof t>[0])
             : latestPrintJob.status}
          </span>
          <span className="text-xs text-muted-foreground">
           {new Date(latestPrintJob.created_at).toLocaleDateString('de-DE')}
          </span>
         </div>
        </div>
       </div>
       <span className="text-xs font-medium text-bookcraft-blue flex items-center gap-1 flex-shrink-0 ml-3">
        Alle Bestellungen
        <ArrowRight className="h-3 w-3" />
       </span>
      </div>
     </Link>
    )}

    {/* Active Jobs Section */}
    {activeJobs.length > 0 && (
     <div className="mb-8">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
       {'Currently Generating'}
      </h2>
      <div className="space-y-3">
       <AnimatePresence>
        {activeJobs.map((job) => (
         <motion.div
          key={job.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.3 } }}
          className="relative rounded-2xl"
         >
          {/* Confirm delete overlay */}
          <AnimatePresence>
           {deletingJobId === job.id && (
            <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="absolute inset-0 z-10 bg-red-500/95 backdrop-blur-sm rounded-2xl flex items-center justify-center gap-3 p-4"
            >
             <span className="text-white text-sm font-medium">{t('deleteJobQuestion')}</span>
             <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteJob(job.id) }}
              className="px-4 py-2 bg-white text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors"
             >
              Ja
             </button>
             <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingJobId(null) }}
              className="px-4 py-2 bg-white/20 text-white rounded-xl text-sm font-semibold hover:bg-white/30 transition-colors"
             >
              Nein
             </button>
            </motion.div>
           )}
          </AnimatePresence>

          {/* Job card */}
          <div
           onContextMenu={(e) => handleContextMenu(e, job.id)}
           onPointerDown={() => handleLongPressStart(job.id)}
           onPointerUp={handleLongPressEnd}
           onPointerLeave={handleLongPressEnd}
           onClick={() => { if (!deletingJobId) window.location.href = `/dashboard/jobs/${job.id}` }}
           className="relative flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-950/30 dark:to-blue-950/30 border border-bookcraft-blue/20 dark:border-bookcraft-blue/20 hover:shadow-md transition-shadow cursor-pointer"
          >
           <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
             <Loader2 className="h-6 w-6 text-bookcraft-blue dark:text-bookcraft-blue/80 animate-spin" />
            </div>
           </div>
           <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">
             {(job.config as any)?.title || 'Untitled Book'}
            </h3>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
             {job.currentStep || 'Processing...'}
            </p>
            <div className="mt-2 h-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-full overflow-hidden">
             <motion.div
              className="h-full bg-gradient-to-r from-bookcraft-blue to-bookcraft-blue rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${job.progress || 0}%` }}
              transition={{ duration: 0.5 }}
             />
            </div>
           </div>
           {/* Delete button (small X) */}
           <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingJobId(job.id) }}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
           >
            <X className="h-4 w-4" />
           </button>
           <span className="text-xs font-medium text-bookcraft-blue dark:text-bookcraft-blue flex-shrink-0">
            {job.progress || 0}%
           </span>
          </div>
         </motion.div>
        ))}
       </AnimatePresence>
      </div>

      {/* Context menu (right-click on desktop) */}
      {contextMenu && (
       <div
        className="fixed z-50 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[160px]"
        style={{ left: contextMenu.x, top: contextMenu.y }}
       >
        <button
         onClick={() => { setDeletingJobId(contextMenu.jobId); setContextMenu(null) }}
         className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
        >
         <Trash2 className="h-4 w-4" />
         {t('deleteJobQuestion').replace('?', '')}
        </button>
       </div>
      )}
     </div>
    )}

    {/* Recent Books */}
    {displayBooks.length === 0 && activeJobs.length === 0 ? (
     <div className="text-center py-16 px-4">
      {!isOnline ? (
       <>
        <div className="relative w-20 h-20 mx-auto mb-6">
         <div className="absolute inset-0 bg-gradient-to-br from-bookcraft-blue/20 to-bookcraft-blue/20 rounded-3xl blur-xl" />
         <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-bookcraft-blue/10 to-bookcraft-blue/10 flex items-center justify-center">
          <BookOpen className="h-9 w-9 text-bookcraft-blue" />
         </div>
        </div>
        <h3 className="text-lg font-semibold font-display text-foreground mb-1">{t('noOfflineBooks')}</h3>
        <p className="text-sm text-muted-foreground mb-6">{t('downloadBooksOffline')}</p>
       </>
      ) : (
       <>
        {/* Inline SVG illustration — open book with magic stars */}
        <div className="mx-auto mb-6 w-40 h-40">
         <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
           <linearGradient id="bookGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3E86D7"/>
            <stop offset="100%" stopColor="#3E86D7"/>
           </linearGradient>
           <linearGradient id="pageGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EEF4FF"/>
            <stop offset="100%" stopColor="#E0ECFF"/>
           </linearGradient>
          </defs>
          {/* Book spine */}
          <rect x="72" y="52" width="16" height="72" rx="2" fill="url(#bookGrad)" opacity="0.9"/>
          {/* Left page */}
          <path d="M72 56 C60 54 40 58 28 68 L28 120 C40 112 60 108 72 110 Z" fill="url(#pageGrad)" stroke="#C7D8F5" strokeWidth="1"/>
          {/* Left page lines */}
          <line x1="38" y1="76" x2="66" y2="73" stroke="#A0BEE8" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="38" y1="84" x2="66" y2="81" stroke="#A0BEE8" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="38" y1="92" x2="66" y2="89" stroke="#A0BEE8" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="38" y1="100" x2="66" y2="97" stroke="#A0BEE8" strokeWidth="1.5" strokeLinecap="round"/>
          {/* Right page */}
          <path d="M88 56 C100 54 120 58 132 68 L132 120 C120 112 100 108 88 110 Z" fill="url(#pageGrad)" stroke="#C7D8F5" strokeWidth="1"/>
          {/* Right page lines */}
          <line x1="94" y1="73" x2="122" y2="76" stroke="#A0BEE8" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="94" y1="81" x2="122" y2="84" stroke="#A0BEE8" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="94" y1="89" x2="122" y2="92" stroke="#A0BEE8" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="94" y1="97" x2="122" y2="100" stroke="#A0BEE8" strokeWidth="1.5" strokeLinecap="round"/>
          {/* Stars / sparkles */}
          <path d="M48 38 L50 32 L52 38 L58 40 L52 42 L50 48 L48 42 L42 40 Z" fill="#FFD700" opacity="0.9"/>
          <path d="M112 30 L113.5 25 L115 30 L120 31.5 L115 33 L113.5 38 L112 33 L107 31.5 Z" fill="#A78BFA" opacity="0.9"/>
          <circle cx="130" cy="50" r="3" fill="#60A5FA" opacity="0.8"/>
          <circle cx="30" cy="52" r="2" fill="#F472B6" opacity="0.7"/>
          <circle cx="105" cy="44" r="1.5" fill="#FFD700" opacity="0.8"/>
          <circle cx="55" cy="28" r="1.5" fill="#A78BFA" opacity="0.7"/>
          {/* Wand spark */}
          <line x1="120" y1="60" x2="136" y2="44" stroke="url(#bookGrad)" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="136" cy="44" r="3" fill="#3E86D7" opacity="0.85"/>
         </svg>
        </div>
        <h3 className="text-xl font-bold font-display text-foreground mb-2">
         {t('emptyStateHeadline')}
        </h3>
        <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto">
         {t('emptyStateSubtext')}
        </p>
        <Link href="/dashboard/create">
         <motion.div
          animate={{ boxShadow: ['0 0 0 0 rgba(62,134,215,0)', '0 0 0 8px rgba(62,134,215,0.18)', '0 0 0 0 rgba(62,134,215,0)'] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="inline-block rounded-2xl"
         >
          <Button className="h-14 px-10 rounded-2xl bg-gradient-to-r from-bookcraft-blue to-bookcraft-blue hover:brightness-110 text-white font-bold text-base shadow-lg shadow-bookcraft-blue/25 transition-all">
           {t('createFirstBook') || 'Create Your First Book'}
          </Button>
         </motion.div>
        </Link>
       </>
      )}
     </div>
    ) : displayBooks.length > 0 && (
     <>
      <div className="flex items-center justify-between mb-3">
       <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {!isOnline ? t('offlineBooks') : t('recentBooks')}
       </h2>
       {displayBooks.length > 6 && (
        <Link href="/dashboard/books" className="text-xs text-bookcraft-blue font-medium hover:underline">
         {'View All'} ({displayBooks.length})
        </Link>
       )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
       {displayBooks.slice(0, 6).map((book, i) => {
        const progress = readingProgress[book.id]
        return (
         <motion.div
          key={book.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 25 }}
          className="group flex flex-col cursor-pointer"
          onClick={() => handleBookTap(book)}
         >
          {/* Cover */}
          <div className="aspect-[3/4] rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900/60 dark:to-slate-800/40 border border-border/50 shadow-sm group-hover:shadow-lg group-hover:shadow-bookcraft-blue/5 group-hover:scale-[1.03] group-hover:border-bookcraft-blue/20 transition-all duration-300 mb-2.5">
           {book.coverImage ? (
            <SafeImage
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
          </div>

          {/* Title */}
          <h3 className="text-sm font-medium text-foreground line-clamp-1">{book.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
           <Clock className="h-3 w-3" />
           {new Date(book.updatedAt || book.createdAt).toLocaleDateString()}
          </p>

          {/* Reading Progress — stop propagation so "Continue Reading" doesn't open the BottomSheet */}
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div onClick={(e) => e.stopPropagation()}>
           <ReadingProgressBar
            bookId={book.id}
            totalChapters={book.chapters ?? 1}
            progress={progress}
            showButton={!!progress}
           />
          </div>
         </motion.div>
        )
       })}
      </div>
     </>
    )}
   </div>

   {/* Bottom safe area for mobile nav */}
   <div className="h-24 lg:h-8" />

   {/* Book BottomSheet — opens on short tap */}
   <BookBottomSheet
    book={selectedBook ? {
      ...selectedBook,
      wordCount: (selectedBook as Book & { word_count?: number }).word_count,
      chaptersJson: (selectedBook as Book & { chapters_json?: { chapters?: { content?: string }[] } }).chapters_json,
    } : null}
    isOpen={isBookSheetOpen}
    onClose={() => setIsBookSheetOpen(false)}
    onOpenBook={handleBookSheetOpen}
    onEdit={handleBookSheetEdit}
    onShare={handleBookSheetShare}
    onDelete={handleBookSheetDelete}
   />
  </PullToRefreshContainer>
 )
}
