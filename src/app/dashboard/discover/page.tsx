'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppBar } from '@/components/AppBar'
import { Button } from '@/components/ui/button'
import SafeImage from '@/components/SafeImage'
import {
 BookOpen,
 Compass,
 Plus,
 TrendingUp,
 Clock,
 Filter,
 Search,
 X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/LanguageContext'

const LANGUAGES = ['All', 'en', 'de', 'es']

interface PublicBook {
 id: string
 title: string
 genre: string
 description: string
 author?: string
 cover_image?: string
 is_public: boolean
 view_count: number
 created_at: string
 book_type?: string
 user_id?: string
}

const GENRES = [
 'Alle',
 'Fantasy',
 'Krimi',
 'Kinderbuch',
 'Sachbuch',
 'Romance',
 'Thriller',
 'Liebesroman',
]

const GENRE_COLORS: Record<string, string> = {
 Fantasy: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
 Krimi: 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
 Kinderbuch: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
 Sachbuch: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
 Romance: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
 Thriller: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
 Liebesroman: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
}

function GenreBadge({ genre }: { genre: string }) {
 const colorClass = GENRE_COLORS[genre] ?? 'bg-bookcraft-blue/10 text-bookcraft-blue dark:bg-bookcraft-blue/20 dark:text-bookcraft-blue/80'
 return (
 <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', colorClass)}>
 {genre}
 </span>
 )
}

function BookCoverPlaceholder({ title, genre }: { title: string; genre: string }) {
 const colors = [
 'from-blue-500 to-blue-600',
 'from-blue-500 to-pink-600',
 'from-green-500 to-teal-600',
 'from-orange-500 to-red-600',
 'from-cyan-500 to-blue-600',
 'from-pink-500 to-rose-600',
 ]
 const colorIndex = title.charCodeAt(0) % colors.length
 return (
 <div className={cn('w-full h-full flex flex-col items-center justify-center bg-gradient-to-br', colors[colorIndex], 'p-4')}>
 <BookOpen className="w-8 h-8 text-white/80 mb-2" />
 <p className="text-white/90 text-xs font-semibold text-center line-clamp-2 leading-tight">{title}</p>
 </div>
 )
}

// ─── SPOTLIGHT CARD ───────────────────────────────────────────
function SpotlightCard({ book, index, onRead }: { book: PublicBook; index: number; onRead: (id: string) => void }) {
 const { t } = useLanguage()
 return (
 <motion.div
 initial={{ opacity: 0, y: 30, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 transition={{ duration: 0.5, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
 className="relative rounded-3xl overflow-hidden bg-card border border-border shadow-xl flex-shrink-0 w-72 sm:w-80 snap-start"
 style={{ minHeight: '380px' }}
 >
 {/* Cover */}
 <div className="absolute inset-0">
 {book.cover_image ? (
 <SafeImage
 src={book.cover_image}
 alt={book.title}
 className="w-full h-full object-cover"
 />
 ) : (
 <BookCoverPlaceholder title={book.title} genre={book.genre} />
 )}
 {/* Gradient overlay */}
 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
 </div>

 {/* Content */}
 <div className="absolute inset-0 flex flex-col justify-end p-5">
 <GenreBadge genre={book.genre} />
 <h3 className="mt-2 text-xl font-bold text-white leading-tight line-clamp-2">{book.title}</h3>
 {book.author && (
 <p className="text-white/70 text-sm mt-1">{t('by')} {book.author}</p>
 )}
 <p className="text-white/60 text-xs mt-1.5 line-clamp-2 leading-relaxed">{book.description}</p>
 <Button
 onClick={() => onRead(book.id)}
 className="mt-4 w-full rounded-2xl h-11 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/30 font-semibold transition-all"
 >
 <BookOpen className="h-4 w-4 mr-2" />
 {t('viewBook')}
 </Button>
 </div>

 {/* Index badge */}
 <div className="absolute top-4 left-4">
 <span className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white text-xs font-bold">
 #{index + 1}
 </span>
 </div>
 </motion.div>
 )
}

// ─── GALLERY BOOK CARD ────────────────────────────────────────
function GalleryCard({ book, index, onRead }: { book: PublicBook; index: number; onRead: (id: string) => void }) {
 const { t } = useLanguage()
 return (
 <motion.div
 initial={{ opacity: 0, y: 20, scale: 0.97 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.4), ease: [0.16, 1, 0.3, 1] }}
 className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group"
 >
 {/* Cover thumbnail */}
 <div className="aspect-[3/4] bg-muted overflow-hidden relative">
 {book.cover_image ? (
 <SafeImage
 src={book.cover_image}
 alt={book.title}
 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
 />
 ) : (
 <BookCoverPlaceholder title={book.title} genre={book.genre} />
 )}
 <div className="absolute top-2 left-2">
 <GenreBadge genre={book.genre} />
 </div>
 </div>

 {/* Info */}
 <div className="p-3">
 <h4 className="font-semibold text-foreground text-sm line-clamp-2 leading-tight">{book.title}</h4>
 {book.author && (
 <p className="text-muted-foreground text-xs mt-1 truncate">{book.author}</p>
 )}
 <Button
 onClick={() => onRead(book.id)}
 size="sm"
 className="mt-3 w-full rounded-xl h-9 text-xs font-semibold bg-gradient-to-r from-[#3E86D7] to-[#3E86D7] hover:opacity-90 text-white"
 >
 {t('viewBook')}
 </Button>
 </div>
 </motion.div>
 )
}

// ─── TRENDING CARD ────────────────────────────────────────────
function TrendingCard({ book, index, onRead }: { book: PublicBook; index: number; onRead: (id: string) => void }) {
 const { t } = useLanguage()
 return (
 <motion.div
 initial={{ opacity: 0, x: -20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ duration: 0.4, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
 className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:border-bookcraft-blue/30 hover:shadow-md transition-all duration-300 group cursor-pointer"
 onClick={() => onRead(book.id)}
 >
 {/* Rank */}
 <span className={cn(
 'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
 index === 0
 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-md'
 : index === 1
 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white'
 : index === 2
 ? 'bg-gradient-to-br from-orange-300 to-amber-500 text-white'
 : 'bg-muted text-muted-foreground'
 )}>
 {index + 1}
 </span>

 {/* Cover thumbnail */}
 <div className="flex-shrink-0 w-10 h-14 rounded-lg overflow-hidden bg-muted">
 {book.cover_image ? (
 <SafeImage
 src={book.cover_image}
 alt={book.title}
 className="w-full h-full object-cover"
 />
 ) : (
 <BookCoverPlaceholder title={book.title} genre={book.genre} />
 )}
 </div>

 {/* Info */}
 <div className="flex-1 min-w-0">
 <h4 className="font-semibold text-foreground text-sm line-clamp-1 leading-tight">{book.title}</h4>
 {book.author && (
 <p className="text-muted-foreground text-xs mt-0.5 truncate">
  {t('by')}{' '}
  {book.user_id ? (
  <Link
   href={`/profile/${book.user_id}`}
   className="hover:text-foreground transition-colors"
   onClick={e => e.stopPropagation()}
  >
   {book.author}
  </Link>
  ) : (
  book.author
  )}
 </p>
 )}
 <div className="flex items-center gap-1 mt-1">
 <GenreBadge genre={book.genre} />
 </div>
 </div>

 {/* View count */}
 <div className="flex-shrink-0 flex items-center gap-1 text-muted-foreground text-xs">
 <TrendingUp className="w-3 h-3 text-bookcraft-blue/60" />
 <span>{book.view_count}</span>
 </div>
 </motion.div>
 )
}

// ─── EMPTY STATE ──────────────────────────────────────────────
function EmptyState({ onCreateBook }: { onCreateBook: () => void }) {
 const { t } = useLanguage()
 return (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ duration: 0.5 }}
 className="flex flex-col items-center justify-center py-24 px-6 text-center"
 >
 <div className="relative w-20 h-20 mx-auto mb-6">
 <div className="absolute inset-0 bg-gradient-to-br from-bookcraft-blue/20 to-bookcraft-blue/20 rounded-3xl blur-xl" />
 <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-[#3E86D7] to-[#3E86D7] flex items-center justify-center shadow-xl shadow-bookcraft-blue/25">
  <Compass className="w-10 h-10 text-white" />
 </div>
 </div>
 <h3 className="text-2xl font-bold font-display text-foreground mb-3">{t('beTheFirst')}</h3>
 <p className="text-muted-foreground max-w-sm leading-relaxed mb-8">
 {t('beTheFirstDesc')}
 </p>
 <motion.div
 animate={{ boxShadow: ['0 0 0 0 rgba(62,134,215,0)', '0 0 0 8px rgba(62,134,215,0.18)', '0 0 0 0 rgba(62,134,215,0)'] }}
 transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
 className="inline-block rounded-2xl"
 >
 <Button
  onClick={onCreateBook}
  className="rounded-2xl px-8 h-12 bg-gradient-to-r from-[#3E86D7] to-[#3E86D7] text-white font-semibold shadow-lg shadow-bookcraft-blue/25 hover:opacity-90 transition-all"
 >
  <Plus className="h-5 w-5 mr-2" />
  {t('createFirstBookBtn')}
 </Button>
 </motion.div>
 </motion.div>
 )
}

// ─── SPOTLIGHT EMPTY STATE ────────────────────────────────────
function SpotlightEmpty({ onGoToBooks }: { onGoToBooks: () => void }) {
 const { t } = useLanguage()
 return (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="flex flex-col items-center justify-center py-16 px-6 text-center"
 >
 <div className="relative w-16 h-16 mx-auto mb-4">
 <div className="absolute inset-0 bg-gradient-to-br from-bookcraft-blue/20 to-bookcraft-blue/20 rounded-2xl blur-xl" />
 <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-[#3E86D7] to-[#3E86D7] flex items-center justify-center shadow-lg">
 </div>
 </div>
 <h3 className="text-xl font-bold font-display text-foreground mb-2">{t('beTheFirst')}</h3>
 <p className="text-muted-foreground text-sm max-w-xs leading-relaxed mb-6">
 {t('shareToSpotlight')}
 </p>
 <Button
 onClick={onGoToBooks}
 variant="outline"
 className="rounded-2xl px-6 h-10 font-semibold border-2"
 >
 {t('goToMyBooks')}
 </Button>
 </motion.div>
 )
}

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function DiscoverPage() {
 const router = useRouter()
 const { t } = useLanguage()
 const [allBooks, setAllBooks] = useState<PublicBook[]>([])
 const [loading, setLoading] = useState(true)
 const [selectedGenre, setSelectedGenre] = useState('Alle')
 const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest')
 const [searchQuery, setSearchQuery] = useState('')
 const [selectedLanguage, setSelectedLanguage] = useState('All')

 const fetchBooks = useCallback(async () => {
 setLoading(true)
 try {
 const res = await fetch('/api/books/public')
 const data = await res.json()
 setAllBooks(data.books ?? [])
 } catch (err) {
      console.error('Failed to fetch public books', err)
 } finally {
 setLoading(false)
 }
 }, [])

 useEffect(() => {
 fetchBooks()
 }, [fetchBooks])

 const trendingBooks = allBooks
 .slice()
 .sort((a, b) => b.view_count - a.view_count || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
 .slice(0, 6)

 const spotlightBooks = allBooks
 .slice()
 .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
 .slice(0, 3)

 const filteredBooks = allBooks
 .filter(b => selectedGenre === 'Alle' || b.genre === selectedGenre)
 .filter(b => !searchQuery.trim() || b.title.toLowerCase().includes(searchQuery.toLowerCase()))
 .filter(b => selectedLanguage === 'All' || (b as PublicBook & { language?: string }).language === selectedLanguage)
 .sort((a, b) => {
 if (sortBy === 'popular') return b.view_count - a.view_count
 return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
 })

 const handleRead = (id: string) => {
 router.push(`/dashboard/books/${id}`)
 }

 const handleGoToBooks = () => router.push('/dashboard/books')
 const handleCreate = () => router.push('/dashboard/create')

 return (
 <div className="min-h-[60vh] pb-32 lg:pb-8">
 {/* ── Mobile App Bar ── */}
 <div className="lg:hidden">
 <AppBar
 title={t('discoverTitle')}
 subtitle={t('discoverSubtitle')}
 />
 </div>

 {/* ── Desktop Header ── */}
 <div className="hidden lg:block border-b border-border px-6 py-6 bg-background">
 <div className="flex items-center gap-3 mb-1">
 <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#3E86D7] to-[#3E86D7] flex items-center justify-center shadow-md">
 <Compass className="w-5 h-5 text-white" />
 </div>
 <div>
 <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">{t('discoverTitle')}</h1>
 <p className="text-sm text-muted-foreground">{t('discoverSubtitle')}</p>
 </div>
 </div>
 </div>

 <div className="px-4 lg:px-6 pt-4 lg:pt-8 max-w-7xl mx-auto">

 {/* ══════════════════════════════════════════
 SEARCH & FILTER BAR
 ══════════════════════════════════════════ */}
 <div className="flex flex-col sm:flex-row gap-3 mb-8">
 {/* Search input */}
 <div className="relative flex-1">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
 <input
 type="text"
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 placeholder={t('searchBooksPlaceholder')}
 className="w-full h-11 pl-10 pr-10 rounded-2xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-bookcraft-blue/40 focus:border-bookcraft-blue/50 transition-all"
 />
 {searchQuery && (
 <button
 onClick={() => setSearchQuery('')}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
 >
 <X className="w-4 h-4" />
 </button>
 )}
 </div>

 {/* Language filter */}
 <div className="relative">
 <select
 value={selectedLanguage}
 onChange={e => setSelectedLanguage(e.target.value)}
 className="h-11 pl-4 pr-8 rounded-2xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-bookcraft-blue/40 focus:border-bookcraft-blue/50 transition-all appearance-none cursor-pointer"
 >
 {LANGUAGES.map(lang => (
 <option key={lang} value={lang}>
 {lang === 'All' ? t('allLanguages') : lang === 'en' ? 'English' : lang === 'de' ? 'Deutsch' : 'Español'}
 </option>
 ))}
 </select>
 <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
 <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
 </div>
 </div>
 </div>

 {/* ══════════════════════════════════════════
 TRENDING SECTION
 ══════════════════════════════════════════ */}
 {!searchQuery && selectedLanguage === 'All' && (
 <section className="mb-10">
 <div className="flex items-center gap-2 mb-5">
 <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
 <TrendingUp className="w-3.5 h-3.5 text-white" />
 </div>
 <h2 className="text-lg font-bold font-display text-foreground">{t('trendingLabel')}</h2>
 <span className="text-xs text-muted-foreground ml-1">{t('trendingSubtitle')}</span>
 </div>

 {loading ? (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
 {[1, 2, 3, 4, 5, 6].map(i => (
 <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
 ))}
 </div>
 ) : trendingBooks.length === 0 ? null : (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
 {trendingBooks.map((book, i) => (
 <TrendingCard key={book.id} book={book} index={i} onRead={handleRead} />
 ))}
 </div>
 )}
 </section>
 )}

 {/* ══════════════════════════════════════════
 SPOTLIGHT SECTION
 ══════════════════════════════════════════ */}
 {!searchQuery && selectedLanguage === 'All' && (
 <section className="mb-10">
 <div className="flex items-center gap-2 mb-5">
 <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#3E86D7] to-[#3E86D7] flex items-center justify-center">
 </div>
 <h2 className="text-lg font-bold font-display text-foreground">{t('spotlightLabel')}</h2>
 <span className="text-xs text-muted-foreground ml-1">{t('spotlightNewest')}</span>
 </div>

 {loading ? (
 <div className="flex gap-4 overflow-hidden">
 {[1, 2, 3].map(i => (
 <div key={i} className="w-72 sm:w-80 rounded-3xl bg-muted animate-pulse flex-shrink-0" style={{ height: 380 }} />
 ))}
 </div>
 ) : spotlightBooks.length === 0 ? (
 <div className="rounded-3xl border border-dashed border-border bg-muted/20">
 <SpotlightEmpty onGoToBooks={handleGoToBooks} />
 </div>
 ) : (
 <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
 {spotlightBooks.map((book, i) => (
 <SpotlightCard key={book.id} book={book} index={i} onRead={handleRead} />
 ))}
 </div>
 )}
 </section>
 )}

 {/* ══════════════════════════════════════════
 GALLERY SECTION
 ══════════════════════════════════════════ */}
 <section>
 <div className="flex items-center justify-between mb-5">
 <div className="flex items-center gap-2">
 <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#3E86D7] to-[#3E86D7] flex items-center justify-center">
 <BookOpen className="w-3.5 h-3.5 text-white" />
 </div>
 <h2 className="text-lg font-bold font-display text-foreground">{t('bookGallery')}</h2>
 </div>

 {/* Sort toggle */}
 <div className="flex items-center gap-1 p-1 rounded-xl bg-muted">
 <button
 onClick={() => setSortBy('newest')}
 className={cn(
 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
 sortBy === 'newest'
 ? 'bg-background text-foreground shadow-sm'
 : 'text-muted-foreground hover:text-foreground'
 )}
 >
 <Clock className="w-3 h-3" />
 {t('sortNewest')}
 </button>
 <button
 onClick={() => setSortBy('popular')}
 className={cn(
 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
 sortBy === 'popular'
 ? 'bg-background text-foreground shadow-sm'
 : 'text-muted-foreground hover:text-foreground'
 )}
 >
 <TrendingUp className="w-3 h-3" />
 {t('sortPopular')}
 </button>
 </div>
 </div>

 {/* Genre filter chips */}
 <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide mb-6">
 {GENRES.map(genre => (
 <button
 key={genre}
 onClick={() => setSelectedGenre(genre)}
 className={cn(
 'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
 selectedGenre === genre
 ? 'bg-gradient-to-r from-[#3E86D7] to-[#3E86D7] text-white shadow-md shadow-bookcraft-blue/25'
 : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
 )}
 >
 {genre}
 </button>
 ))}
 </div>

 {/* Grid */}
 <AnimatePresence mode="wait">
 {loading ? (
 <motion.div
 key="loading"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
 >
 {[1, 2, 3, 4, 5, 6].map(i => (
 <div key={i} className="rounded-2xl bg-muted animate-pulse" style={{ height: 280 }} />
 ))}
 </motion.div>
 ) : filteredBooks.length === 0 && allBooks.length === 0 ? (
 <motion.div key="empty-all" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
 <EmptyState onCreateBook={handleCreate} />
 </motion.div>
 ) : filteredBooks.length === 0 ? (
 <motion.div
 key="empty-filter"
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="flex flex-col items-center justify-center py-20 px-6 text-center"
 >
 <div className="relative w-16 h-16 mx-auto mb-6">
 <div className="absolute inset-0 bg-gradient-to-br from-bookcraft-blue/20 to-bookcraft-blue/20 rounded-2xl blur-xl" />
 <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-bookcraft-blue/10 to-bookcraft-blue/10 border border-bookcraft-blue/20 flex items-center justify-center">
  <Filter className="w-8 h-8 text-bookcraft-blue" />
 </div>
 </div>
 <p className="text-foreground font-semibold font-display mb-1">{t('noBooksFound')}</p>
 <p className="text-muted-foreground text-sm">
 {t('noBookInGenreDesc', { genre: selectedGenre })}
 </p>
 <Button
 variant="outline"
 onClick={() => setSelectedGenre('Alle')}
 className="mt-4 rounded-full px-6"
 >
 {t('resetFilters')}
 </Button>
 </motion.div>
 ) : (
 <motion.div
 key={`grid-${selectedGenre}-${sortBy}`}
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ duration: 0.3 }}
 className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
 >
 {filteredBooks.map((book, i) => (
 <GalleryCard key={book.id} book={book} index={i} onRead={handleRead} />
 ))}
 </motion.div>
 )}
 </AnimatePresence>
 </section>
 </div>
 </div>
 )
}
