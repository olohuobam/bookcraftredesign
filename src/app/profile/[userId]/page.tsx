'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import SafeImage from '@/components/SafeImage'
import { BookOpen, Calendar, Eye, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/LanguageContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicProfile {
  id: string
  name?: string
  image?: string
  bio?: string
  createdAt?: string
}

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  const colorClass =
    GENRE_COLORS[genre] ??
    'bg-bookcraft-blue/10 text-bookcraft-blue dark:bg-bookcraft-blue/20 dark:text-bookcraft-blue/80'
  return (
    <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', colorClass)}>
      {genre}
    </span>
  )
}

function BookCoverPlaceholder({ title }: { title: string }) {
  const gradients = [
    'from-blue-500 to-blue-600',
    'from-blue-500 to-pink-600',
    'from-green-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-cyan-500 to-blue-600',
    'from-pink-500 to-rose-600',
  ]
  const idx = title.charCodeAt(0) % gradients.length
  return (
    <div
      className={cn(
        'w-full h-full flex flex-col items-center justify-center bg-gradient-to-br p-4',
        gradients[idx]
      )}
    >
      <BookOpen className="w-8 h-8 text-white/80 mb-2" />
      <p className="text-white/90 text-xs font-semibold text-center line-clamp-2 leading-tight">
        {title}
      </p>
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      {/* Hero */}
      <div className="w-full h-56 bg-muted" />
      <div className="max-w-5xl mx-auto px-4 -mt-16 mb-10 flex flex-col items-center gap-4">
        <div className="w-28 h-28 rounded-full bg-muted border-4 border-background" />
        <div className="h-7 w-48 rounded-lg bg-muted" />
        <div className="h-4 w-32 rounded-lg bg-muted" />
      </div>
      {/* Grid */}
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-muted" style={{ height: 260 }} />
        ))}
      </div>
    </div>
  )
}

// ─── Book Card ───────────────────────────────────────────────────────────────

function BookCard({ book, index }: { book: PublicBook; index: number }) {
  const router = useRouter()
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: Math.min(index * 0.06, 0.5),
        ease: [0.16, 1, 0.3, 1],
      }}
      className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer"
      onClick={() => router.push(`/preview/${book.id}`)}
    >
      {/* Cover */}
      <div className="aspect-[3/4] bg-muted overflow-hidden relative">
        {book.cover_image ? (
          <SafeImage
            src={book.cover_image}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            fill
          />
        ) : (
          <BookCoverPlaceholder title={book.title} />
        )}
        <div className="absolute top-2 left-2">
          <GenreBadge genre={book.genre} />
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="font-semibold text-foreground text-sm line-clamp-2 leading-tight">
          {book.title}
        </h4>
        <div className="flex items-center gap-1 mt-2 text-muted-foreground text-xs">
          <Eye className="w-3 h-3" />
          <span>{book.view_count}</span>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyBooks({ name }: { name?: string }) {
  const { t } = useLanguage()
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-24 px-6 text-center col-span-full"
    >
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-bookcraft-blue/20 to-bookcraft-blue/20 rounded-3xl blur-xl" />
        <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-[#3E86D7] to-[#3E86D7] flex items-center justify-center shadow-xl shadow-bookcraft-blue/25">
          <BookOpen className="w-10 h-10 text-white" />
        </div>
      </div>
      <h3 className="text-xl font-bold font-display text-foreground mb-2">{t('noPublicBooks')}</h3>
      <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
        {name ? `${name} hasn't` : t('authorHasntShared')}
      </p>
    </motion.div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AuthorProfilePage() {
  const { t } = useLanguage()
  const params = useParams()
  const userId = params.userId as string

  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [books, setBooks] = useState<PublicBook[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!userId) return

    async function load() {
      setLoading(true)
      try {
        const [profileRes, booksRes] = await Promise.all([
          fetch(`/api/user/public-profile?userId=${encodeURIComponent(userId)}`),
          fetch(`/api/books/public?userId=${encodeURIComponent(userId)}&sort=newest`),
        ])

        if (profileRes.status === 404) {
          setNotFound(true)
          setLoading(false)
          return
        }

        const profileData = await profileRes.json()
        const booksData = await booksRes.json()

        setProfile(profileData.profile ?? null)
        setBooks(booksData.books ?? [])
      } catch (err) {
        console.error('Failed to load author profile', err)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [userId])

  if (loading) return <ProfileSkeleton />

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-bookcraft-blue/20 to-bookcraft-blue/20 rounded-3xl blur-xl" />
          <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-[#3E86D7] to-[#3E86D7] flex items-center justify-center shadow-xl">
            <User className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold font-display text-foreground mb-3">{t('authorNotFound')}</h1>
        <p className="text-muted-foreground max-w-sm leading-relaxed mb-8">
          {t('authorNotFoundDesc')}
        </p>
        <Link
          href="/dashboard/discover"
          className="px-6 h-11 inline-flex items-center rounded-2xl bg-gradient-to-r from-[#3E86D7] to-[#3E86D7] text-white font-semibold hover:opacity-90 transition-all"
        >
          {t('discoverBooks')}
        </Link>
      </div>
    )
  }

  const totalViews = books.reduce((sum, b) => sum + (b.view_count ?? 0), 0)
  const joinDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      })
    : null

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* ── Hero ── */}
      <div className="relative w-full overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-bookcraft-blue/5 via-background to-bookcraft-blue/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(62,134,215,0.12),transparent)]" />

        <div className="relative max-w-5xl mx-auto px-4 pt-16 pb-10 flex flex-col items-center text-center">
          {/* Avatar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-28 h-28 mb-5"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#3E86D7] to-[#3E86D7] blur-xl opacity-30" />
            <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-background shadow-xl shadow-bookcraft-blue/20 bg-muted">
              {profile.image ? (
                <SafeImage
                  src={profile.image}
                  alt={profile.name ?? 'Author'}
                  className="w-full h-full object-cover"
                  fill
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#3E86D7] to-[#3E86D7]">
                  <User className="w-12 h-12 text-white" />
                </div>
              )}
            </div>
          </motion.div>

          {/* Name */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl sm:text-4xl font-bold font-display text-foreground mb-2"
          >
            {profile.name ?? 'Anonymous Author'}
          </motion.h1>

          {/* Bio */}
          {profile.bio && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="text-muted-foreground text-sm sm:text-base max-w-md leading-relaxed mb-4"
            >
              {profile.bio}
            </motion.p>
          )}

          {/* Meta row */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex items-center gap-4 text-sm text-muted-foreground"
          >
            {joinDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Member since {joinDate}
              </span>
            )}
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="flex items-center gap-6 mt-6"
          >
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold font-display text-foreground">{books.length}</span>
              <span className="text-xs text-muted-foreground mt-0.5">
                {books.length === 1 ? 'Book' : 'Books'}
              </span>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold font-display text-foreground">
                {totalViews.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5">{t('totalViews')}</span>
            </div>
          </motion.div>
        </div>

        {/* Bottom border fade */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* ── Books Section ── */}
      <div className="max-w-5xl mx-auto px-4 pt-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex items-center gap-2 mb-6"
        >
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#3E86D7] to-[#3E86D7] flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-white" />
          </div>
          <h2 className="text-lg font-bold font-display text-foreground">{t('publicBooks')}</h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {books.length === 0 ? (
            <EmptyBooks name={profile.name} />
          ) : (
            books.map((book, i) => <BookCard key={book.id} book={book} index={i} />)
          )}
        </div>
      </div>
    </div>
  )
}
