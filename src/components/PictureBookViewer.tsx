'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Lock, ShoppingCart } from 'lucide-react'
import BookPurchaseSheet from '@/components/BookPurchaseSheet'
import { formatPrice, getBookPrice } from '@/lib/pricing'
import { useSubscription } from '@/hooks/useSubscription'
import { useLanguage } from '@/context/LanguageContext'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PictureBookPage {
  imageUrl: string
  text: string
  pageNumber: number
}

interface PictureBookViewerProps {
  bookTitle: string
  author?: string
  coverImage?: string
  pages: PictureBookPage[]
  // Paywall props (mirrors UniversalBookReader)
  bookId?: string
  purchased?: boolean
  aiGenerated?: boolean
  onPurchaseSuccess?: () => void
}

// ── Page Transition Variants ──────────────────────────────────────────────────

const pageVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
}

const springTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 35,
  mass: 0.8,
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PictureBookViewer({
  bookTitle,
  author,
  coverImage,
  pages,
  bookId = '',
  purchased = false,
  aiGenerated = false,
  onPurchaseSuccess,
}: PictureBookViewerProps) {
  const { t } = useLanguage()
  // 0 = cover, 1..n = pages, n+1 = end page
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [showNav, setShowNav] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const { isPro } = useSubscription()

  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const totalSlides = pages.length + 2 // cover + pages + end

  // Mobile detection (post-mount to avoid SSR mismatch)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Paywall: same logic as UniversalBookReader for picture books
  // index 0 = cover, index 1 = first page (free), index 2 = second page (free), index 3+ = locked
  const isPageLocked = useCallback((index: number) => {
    if (purchased || isPro || !aiGenerated) return false
    // Allow cover (0) + first 2 pages (1, 2) for free
    return index > 2
  }, [purchased, isPro, aiGenerated])

  const goNext = useCallback(() => {
    if (currentIndex < totalSlides - 1) {
      const next = currentIndex + 1
      if (isPageLocked(next)) {
        setShowPurchaseModal(true)
        return
      }
      setDirection(1)
      setCurrentIndex(next)
    }
  }, [currentIndex, totalSlides, isPageLocked])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1)
      setCurrentIndex((i) => i - 1)
    }
  }, [currentIndex])

  const goToStart = useCallback(() => {
    setDirection(-1)
    setCurrentIndex(0)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goNext, goPrev])

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) goNext()
      else goPrev()
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  const isCover = currentIndex === 0
  const isEndPage = currentIndex === totalSlides - 1
  const currentPage = !isCover && !isEndPage ? pages[currentIndex - 1] : null
  const isLocked = isPageLocked(currentIndex)

  // Dot nav — cap at 15 dots
  const totalDots = Math.min(totalSlides, 15)
  const dotToSlide = (i: number) =>
    totalSlides <= 15 ? i : Math.round((i / (totalDots - 1)) * (totalSlides - 1))

  // Page label text
  const pageLabel = isCover ? 'Cover' : isEndPage ? 'Ende' : `${currentIndex} / ${pages.length}`

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-background"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Thin primary progress bar */}
      <div className="h-0.5 shrink-0 bg-muted">
        <motion.div
          className="h-full bg-primary"
          animate={{ width: `${totalSlides > 1 ? (currentIndex / (totalSlides - 1)) * 100 : 0}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Main content area */}
      <div
        className="flex-1 relative overflow-hidden"
        onMouseEnter={() => setShowNav(true)}
        onMouseLeave={() => setShowNav(false)}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={springTransition}
            className="absolute inset-0"
          >
            {isCover ? (
              <CoverSlide
                bookTitle={bookTitle}
                author={author}
                coverImage={coverImage}
                onNext={goNext}
              />
            ) : isLocked ? (
              <PaywallSlide
                bookId={bookId}
                bookTitle={bookTitle}
                totalPages={pages.length}
                onShowPurchase={() => setShowPurchaseModal(true)}
                purchased={purchased}
                onPurchaseSuccess={onPurchaseSuccess || (() => {})}
              />
            ) : isEndPage ? (
              <EndSlide
                bookTitle={bookTitle}
                coverImage={coverImage}
                onRestart={goToStart}
              />
            ) : currentPage ? (
              isMobile ? (
                <MobilePageSlide page={currentPage} />
              ) : (
                <DesktopPageSlide page={currentPage} />
              )
            ) : null}
          </motion.div>
        </AnimatePresence>

        {/* Desktop hover nav arrows — left/right sides only */}
        <motion.button
          onClick={goPrev}
          disabled={currentIndex === 0}
          animate={{ opacity: showNav && currentIndex > 0 ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="hidden md:flex absolute left-5 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full items-center justify-center bg-background/90 border border-border shadow-lg"
          style={{ pointerEvents: showNav && currentIndex > 0 ? 'auto' : 'none' }}
          aria-label={t('previousPage')}
        >
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </motion.button>

        <motion.button
          onClick={goNext}
          disabled={currentIndex >= totalSlides - 1}
          animate={{ opacity: showNav && currentIndex < totalSlides - 1 ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="hidden md:flex absolute right-5 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full items-center justify-center bg-background/90 border border-border shadow-lg"
          style={{ pointerEvents: showNav && currentIndex < totalSlides - 1 ? 'auto' : 'none' }}
          aria-label={t('nextPage')}
        >
          <ChevronRight className="h-5 w-5 text-foreground" />
        </motion.button>
      </div>

      {/* Clean bottom navigation — dots + page count only */}
      <div className="shrink-0 flex flex-col items-center gap-1.5 py-3 bg-background border-t border-border">
        {/* Dots */}
        <div className="flex items-center gap-2">
          {Array.from({ length: totalDots }).map((_, i) => {
            const slideI = dotToSlide(i)
            const isActive = slideI === currentIndex
            const locked = isPageLocked(slideI)
            return (
              <button
                key={i}
                onClick={() => {
                  if (locked) {
                    setShowPurchaseModal(true)
                    return
                  }
                  setDirection(slideI > currentIndex ? 1 : -1)
                  setCurrentIndex(slideI)
                }}
                className="rounded-full transition-all duration-300"
                style={{
                  width: isActive ? 8 : 6,
                  height: isActive ? 8 : 6,
                  backgroundColor: isActive
                    ? 'hsl(var(--primary))'
                    : locked
                    ? 'hsl(var(--muted))'
                    : 'hsl(var(--muted-foreground) / 0.35)',
                  flexShrink: 0,
                }}
                aria-label={`Go to slide ${slideI + 1}`}
              />
            )
          })}
        </div>

        {/* Page count — small, muted */}
        <span className="text-xs text-muted-foreground tabular-nums">
          {pageLabel}
        </span>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <BookPurchaseSheet
          bookId={bookId}
          bookData={{
            title: bookTitle,
            genre: 'book',
            chapters: pages.length,
            purchased,
          }}
          price={getBookPrice('picture')}
          onPurchaseSuccess={() => {
            onPurchaseSuccess?.()
            setShowPurchaseModal(false)
          }}
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
        />
      )}
    </div>
  )
}

// ── PaywallSlide ──────────────────────────────────────────────────────────────

function PaywallSlide({
  bookId,
  bookTitle,
  totalPages,
  onShowPurchase,
  purchased,
  onPurchaseSuccess,
}: {
  bookId: string
  bookTitle: string
  totalPages: number
  onShowPurchase: () => void
  purchased: boolean
  onPurchaseSuccess: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center h-full text-center px-6 bg-background"
    >
      <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 bg-orange-100 dark:bg-orange-950/30">
        <Lock className="h-12 w-12 text-orange-500" />
      </div>
      <h2 className="text-2xl font-bold font-display mb-3 text-foreground">
        Page Locked
      </h2>
      <p className="mb-8 max-w-sm text-muted-foreground">
        Purchase this book to unlock all {totalPages} pages and enjoy the full story.
      </p>
      <BookPurchaseSheet
        bookId={bookId}
        bookData={{
          title: bookTitle,
          genre: 'book',
          chapters: totalPages,
          purchased,
        }}
        price={getBookPrice('picture')}
        onPurchaseSuccess={onPurchaseSuccess}
        triggerElement={
          <button
            onClick={onShowPurchase}
            className="flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
          >
            <ShoppingCart className="h-4 w-4" />
            Buy for {formatPrice(getBookPrice('picture'))}
          </button>
        }
      />
    </motion.div>
  )
}

// ── CoverSlide ────────────────────────────────────────────────────────────────

function CoverSlide({
  bookTitle,
  author,
  coverImage,
  onNext,
}: {
  bookTitle: string
  author?: string
  coverImage?: string
  onNext: () => void
}) {
  const { t } = useLanguage()
  return (
    <motion.div
      className="h-full w-full relative overflow-hidden"
      style={{ backgroundColor: '#111' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      {/* Full-bleed cover image */}
      {coverImage ? (
        <img
          src={coverImage}
          alt={bookTitle}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #2C2420 0%, #1A1614 50%, #0D0B0A 100%)',
          }}
        />
      )}

      {/* Vignette overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      {/* Dark gradient — bottom for text legibility */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.30) 45%, transparent 75%)',
        }}
      />

      {/* Title block */}
      <div className="absolute bottom-0 left-0 right-0 p-8 md:p-14 lg:p-16">
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.7, ease: 'easeOut' }}
        >
          <h1
            className="font-serif text-4xl md:text-6xl font-light tracking-tight text-white leading-tight"
            style={{ textShadow: '0 2px 24px rgba(0,0,0,0.5)' }}
          >
            {bookTitle}
          </h1>
          {author && (
            <p className="mt-3 text-xs md:text-sm tracking-widest uppercase text-primary">
              {author}
            </p>
          )}
        </motion.div>

        {/* Start Reading button */}
        <motion.button
          onClick={onNext}
          className="mt-8 flex items-center gap-3 group"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          aria-label={t('readBook')}
        >
          <span
            className="text-sm tracking-widest uppercase text-white font-light font-serif"
          >
            Start Reading
          </span>
          <motion.div
            className="flex items-center justify-center w-10 h-10 rounded-full bg-primary"
            animate={{
              scale: [1, 1.08, 1],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronRight className="h-4 w-4 text-primary-foreground" />
          </motion.div>
        </motion.button>
      </div>
    </motion.div>
  )
}

// ── MobilePageSlide ───────────────────────────────────────────────────────────

function MobilePageSlide({ page }: { page: PictureBookPage }) {
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Image — top 65vh, edge-to-edge */}
      <div className="relative shrink-0 overflow-hidden flex items-center justify-center bg-black/5 dark:bg-white/5" style={{ height: '65vh' }}>
        <img
          src={page.imageUrl}
          alt={`Page ${page.pageNumber}`}
          className="w-full h-full object-contain"
        />

        {/* Page number — top right, primary color, semi-transparent */}
        <div
          className="absolute top-4 right-4 px-3 py-1 rounded-full"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
        >
          <span className="text-xs tracking-widest text-primary font-serif">
            {page.pageNumber}
          </span>
        </div>

        {/* Gradient transition: image → panel */}
        <div
          className="absolute bottom-0 left-0 right-0 h-16"
          style={{
            background: 'linear-gradient(to bottom, transparent, hsl(var(--card)))',
          }}
        />
      </div>

      {/* Text panel — slides up from bottom */}
      <motion.div
        className="flex-1 overflow-y-auto px-6 py-5 bg-card rounded-t-3xl -mt-6 shadow-lg"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <p className="font-serif text-lg leading-relaxed text-foreground">
          {page.text}
        </p>
      </motion.div>
    </div>
  )
}

// ── DesktopPageSlide ──────────────────────────────────────────────────────────

function DesktopPageSlide({ page }: { page: PictureBookPage }) {
  return (
    <div className="flex h-full">
      {/* Image — left 55% */}
      <div className="relative overflow-hidden flex items-center justify-center" style={{ width: '55%', flexShrink: 0 }}>
        <img
          src={page.imageUrl}
          alt={`Page ${page.pageNumber}`}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {/* Text panel — right 45%, card bg, centered */}
      <div className="flex-1 flex flex-col justify-center px-12 py-12 relative bg-card">
        {/* Decorative opening quote */}
        <div
          className="font-serif text-8xl leading-none select-none mb-2 text-primary"
          style={{ opacity: 0.2, lineHeight: 1 }}
          aria-hidden="true"
        >
          &ldquo;
        </div>

        <p
          className="font-serif text-lg leading-relaxed text-foreground"
          style={{ maxWidth: '36ch' }}
        >
          {page.text}
        </p>

        {/* Page number — bottom center, muted */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          <span className="text-xs tracking-widest uppercase text-muted-foreground font-serif">
            {page.pageNumber}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── EndSlide ──────────────────────────────────────────────────────────────────

function EndSlide({
  bookTitle,
  coverImage,
  onRestart,
}: {
  bookTitle: string
  coverImage?: string
  onRestart: () => void
}) {
  return (
    <motion.div
      className="h-full w-full flex flex-col items-center justify-center gap-8 px-8 bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* Mini cover image */}
      {coverImage && (
        <motion.div
          className="rounded-2xl overflow-hidden shadow-2xl"
          style={{ width: 140, height: 180 }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6, type: 'spring', stiffness: 250 }}
        >
          <img
            src={coverImage}
            alt={bookTitle}
            className="w-full h-full object-cover"
          />
        </motion.div>
      )}

      {/* "The End" */}
      <motion.div
        className="text-center"
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.6 }}
      >
        <h2 className="font-serif text-4xl md:text-5xl font-light text-foreground">
          The End
        </h2>
        <p className="mt-2 text-sm tracking-widest uppercase text-primary font-serif">
          {bookTitle}
        </p>
      </motion.div>

      {/* Divider */}
      <motion.div
        className="h-px w-16 bg-primary"
        style={{ opacity: 0.4 }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      />

      {/* Read Again button */}
      <motion.button
        onClick={onRestart}
        className="flex items-center gap-3 px-8 py-3 rounded-full font-serif text-sm tracking-wider bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
      >
        <ChevronLeft className="h-4 w-4" />
        Read Again
      </motion.button>
    </motion.div>
  )
}
