'use client'

import { useState, useEffect, useRef, useCallback, useMemo, startTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  Users,
  X,
  Maximize2,
  Minimize2,
  ChevronDown,
} from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { PHOTO_ERA_LABEL_KEYS, type PhotoEra } from '@/types/photobook'

interface PhotoAnalysis {
  estimatedEra?: PhotoEra
  estimatedYear?: number
  description?: string
  categories?: string[]
  mood?: string
  setting?: string
  peopleCount?: number
  eraReasoning?: string
}

interface PhotobookPhoto {
  id: string
  url: string
  position?: string
  caption?: string
  analysis?: PhotoAnalysis
}

interface PhotobookPage {
  id: string
  pageNumber: number
  layout: string
  photos: PhotobookPhoto[]
}

interface PhotobookData {
  isPhotobook: boolean
  photobookConfig: {
    title: string
    subtitle?: string
    theme: string
    photosPerPage: number
  }
  pages: PhotobookPage[]
  totalPhotos: number
  totalPages: number
  sortedBy: string
}

interface PhotobookViewerProps {
  bookTitle: string
  chaptersJson: PhotobookData
  coverImage?: string | null
  onClose?: () => void
}

// Design tokens
const GOLD = '#C9A96E'
const BG = '#F8F7F4'
const TEXT = '#1A1A1A'
const CAPTION_COLOR = '#4A4A4A'
const BORDER_SUBTLE = 'rgba(0,0,0,0.06)'

type MobileSlide =
  | { kind: 'cover' }
  | { kind: 'photo'; photo: PhotobookPhoto; pageNumber: number }

export default function PhotobookViewer({
  bookTitle,
  chaptersJson,
  coverImage,
  onClose,
}: PhotobookViewerProps) {
  const { t } = useLanguage()
  const [currentPage, setCurrentPage] = useState(0) // 0 = cover
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const [selectedPhoto, setSelectedPhoto] = useState<PhotobookPhoto | null>(null)
  const [showNav, setShowNav] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const { pages, photobookConfig, totalPhotos } = chaptersJson
  const totalDesktopPages = pages.length + 1 // +1 for cover

  // Mobile detection — runs after mount to avoid SSR mismatch
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Reset to cover when breakpoint changes
  useEffect(() => {
    startTransition(() => { setCurrentPage(0) })
  }, [isMobile])

  // Mobile slides: cover + one slide per individual photo
  const mobileSlides = useMemo<MobileSlide[]>(() => {
    const slides: MobileSlide[] = [{ kind: 'cover' }]
    for (const page of pages) {
      for (const photo of page.photos) {
        slides.push({ kind: 'photo', photo, pageNumber: page.pageNumber })
      }
    }
    return slides
  }, [pages])

  const totalSlides = isMobile ? mobileSlides.length : totalDesktopPages
  const progress = totalSlides > 1 ? (currentPage / (totalSlides - 1)) * 100 : 0

  const goNext = useCallback(() => {
    if (currentPage < totalSlides - 1) {
      setDirection('next')
      setCurrentPage((p) => p + 1)
    }
  }, [currentPage, totalSlides])

  const goPrev = useCallback(() => {
    if (currentPage > 0) {
      setDirection('prev')
      setCurrentPage((p) => p - 1)
    }
  }, [currentPage])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (selectedPhoto) {
        if (e.key === 'Escape') setSelectedPhoto(null)
        return
      }
      if (e.key === 'Escape' && onClose) {
        onClose()
        return
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext()
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPrev()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goNext, goPrev, selectedPhoto, onClose])

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

  // Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.().catch(() => {})
      setIsFullscreen(false)
    }
  }
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const isCover = currentPage === 0
  const currentPageData = (!isCover && !isMobile) ? pages[currentPage - 1] : null
  const currentMobileSlide: MobileSlide | undefined = isMobile ? mobileSlides[currentPage] : undefined

  // Bottom bar label
  let pageLabel: string
  if (isCover) {
    pageLabel = 'Cover'
  } else if (isMobile && currentMobileSlide?.kind === 'photo') {
    pageLabel = `${currentPage} / ${mobileSlides.length - 1}`
  } else if (currentPageData) {
    pageLabel = `${currentPageData.pageNumber} / ${pages.length}`
  } else {
    pageLabel = ''
  }

  // Page transition: opacity fade + subtle x translate (Apple Photos style)
  const pageVariants = {
    enter: (dir: 'next' | 'prev') => ({
      x: dir === 'next' ? 48 : -48,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: 'next' | 'prev') => ({
      x: dir === 'next' ? -48 : 48,
      opacity: 0,
    }),
  }

  // Dot nav
  const totalDots = Math.min(totalSlides, 15)
  const dotToSlide = (i: number) =>
    totalSlides <= 15 ? i : Math.round((i / (totalDots - 1)) * (totalSlides - 1))

  return (
    <div
      ref={containerRef}
      className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'}`}
      style={{ backgroundColor: BG }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Gold progress bar — thin line at top */}
      <div className="h-0.5 shrink-0" style={{ backgroundColor: '#E8E4DC' }}>
        <motion.div
          className="h-full"
          style={{ backgroundColor: GOLD }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Main content */}
      <div
        className="flex-1 relative overflow-hidden"
        onMouseEnter={() => setShowNav(true)}
        onMouseLeave={() => setShowNav(false)}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentPage}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            {isCover ? (
              <CoverPage
                bookTitle={bookTitle}
                coverImage={coverImage}
                photobookConfig={photobookConfig}
                totalPhotos={totalPhotos}
                onNext={goNext}
              />
            ) : isMobile && currentMobileSlide?.kind === 'photo' ? (
              <MobilePhotoSlide
                photo={currentMobileSlide.photo}
                onTapLeft={goPrev}
                onTapRight={goNext}
                onPhotoClick={setSelectedPhoto}
              />
            ) : currentPageData ? (
              <ContentPage
                page={currentPageData}
                onPhotoClick={setSelectedPhoto}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>

        {/* Desktop nav arrows — appear on hover */}
        <motion.button
          onClick={goPrev}
          disabled={currentPage === 0}
          animate={{ opacity: showNav && currentPage > 0 ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="hidden md:flex absolute left-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full items-center justify-center"
          style={{
            backgroundColor: 'rgba(255,255,255,0.92)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
            border: '1px solid rgba(0,0,0,0.07)',
            pointerEvents: showNav && currentPage > 0 ? 'auto' : 'none',
          }}
        >
          <ChevronLeft className="h-5 w-5" style={{ color: TEXT }} />
        </motion.button>

        <motion.button
          onClick={goNext}
          disabled={currentPage >= totalSlides - 1}
          animate={{ opacity: showNav && currentPage < totalSlides - 1 ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="hidden md:flex absolute right-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full items-center justify-center"
          style={{
            backgroundColor: 'rgba(255,255,255,0.92)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
            border: '1px solid rgba(0,0,0,0.07)',
            pointerEvents: showNav && currentPage < totalSlides - 1 ? 'auto' : 'none',
          }}
        >
          <ChevronRight className="h-5 w-5" style={{ color: TEXT }} />
        </motion.button>

        {/* Top-right controls: fullscreen + close */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {/* Fullscreen toggle — subtle, desktop only */}
          <motion.button
            animate={{ opacity: showNav ? 0.7 : 0 }}
            whileHover={{ opacity: 1 }}
            onClick={toggleFullscreen}
            className="hidden md:flex w-8 h-8 rounded-full items-center justify-center"
            style={{
              backgroundColor: 'rgba(255,255,255,0.85)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.09)',
              border: '1px solid rgba(0,0,0,0.06)',
              pointerEvents: showNav ? 'auto' : 'none',
            }}
          >
            {isFullscreen
              ? <Minimize2 className="h-3.5 w-3.5" style={{ color: TEXT }} />
              : <Maximize2 className="h-3.5 w-3.5" style={{ color: TEXT }} />
            }
          </motion.button>

          {/* Close button — always visible with scrim for readability */}
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full transition-all hover:opacity-100 hover:scale-105 active:scale-95"
              style={{
                backgroundColor: 'rgba(0,0,0,0.65)',
                boxShadow: '0 2px 16px rgba(0,0,0,0.35)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(8px)',
              }}
              aria-label={t('close')}
            >
              <X className="h-[18px] w-[18px] md:h-5 md:w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom bar: page number + dot indicator */}
      <div
        className="shrink-0 flex items-center justify-center gap-4 py-3 px-4"
        style={{ backgroundColor: BG, borderTop: `1px solid ${BORDER_SUBTLE}` }}
      >
        {/* Left: page number */}
        <span
          className="font-sans text-xs tracking-wider uppercase"
          style={{ color: '#A09A90', minWidth: 64 }}
        >
          {pageLabel}
        </span>

        {/* Dots */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalDots }).map((_, i) => {
            const slideI = dotToSlide(i)
            const isActive = slideI === currentPage
            return (
              <button
                key={i}
                onClick={() => {
                  setDirection(slideI > currentPage ? 'next' : 'prev')
                  setCurrentPage(slideI)
                }}
                className="rounded-full transition-all duration-300"
                style={{
                  width: isActive ? 20 : 6,
                  height: 6,
                  backgroundColor: isActive ? GOLD : '#D4CFC6',
                  flexShrink: 0,
                }}
              />
            )
          })}
        </div>

        {/* Right: spacer */}
        <div style={{ minWidth: 64 }} />
      </div>

      {/* Photo Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <PhotoModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── MobilePhotoSlide ──────────────────────────────────────────────────────────

function MobilePhotoSlide({
  photo,
  onTapLeft,
  onTapRight,
  onPhotoClick,
}: {
  photo: PhotobookPhoto
  onTapLeft: () => void
  onTapRight: () => void
  onPhotoClick: (photo: PhotobookPhoto) => void
}) {
  const { t } = useLanguage()
  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    if (x < rect.width / 2) onTapLeft()
    else onTapRight()
  }

  return (
    <div
      className="relative w-full h-full"
      style={{ backgroundColor: '#000' }}
      onClick={handleTap}
    >
      <img
        src={photo.url}
        alt={photo.caption || 'Photo'}
        className="absolute inset-0 w-full h-full object-contain"
        loading="lazy"
        decoding="async"
      />

      {/* Era badge — top left */}
      {photo.analysis?.estimatedEra && photo.analysis.estimatedEra !== 'unknown' && (
        <div className="absolute top-4 left-4 z-10">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: 'rgba(0,0,0,0.65)',
              color: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Calendar className="h-3 w-3" />
            {photo.analysis.estimatedYear
              ? `ca. ${photo.analysis.estimatedYear}`
              : t(PHOTO_ERA_LABEL_KEYS[photo.analysis.estimatedEra] as never) || photo.analysis.estimatedEra}
          </span>
        </div>
      )}

      {/* Frosted glass caption overlay — bottom */}
      {photo.caption && (
        <div
          className="absolute bottom-0 left-0 right-0 z-10 px-5 py-4"
          style={{
            background: 'rgba(0,0,0,0.40)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <p className="font-serif italic text-sm text-center text-white/90 line-clamp-2">
            {photo.caption}
          </p>
        </div>
      )}
    </div>
  )
}

// ── CoverPage ─────────────────────────────────────────────────────────────────

function CoverPage({
  bookTitle,
  coverImage,
  photobookConfig,
  totalPhotos,
  onNext,
}: {
  bookTitle: string
  coverImage?: string | null
  photobookConfig: PhotobookData['photobookConfig']
  totalPhotos: number
  onNext: () => void
}) {
  return (
    <div className="h-full relative overflow-hidden" style={{ backgroundColor: '#111' }}>
      {/* Full-bleed cover image */}
      {coverImage ? (
        <img
          src={coverImage}
          alt={bookTitle}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.88 }}
          loading="eager"
          fetchPriority="high"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, #2C2420 0%, #1A1614 50%, #0D0B0A 100%)',
          }}
        />
      )}

      {/* Dark gradient from bottom */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)',
        }}
      />

      {/* Title block — bottom left */}
      <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 lg:p-16">
        <div className="max-w-2xl">
          <h1
            className="font-serif text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-white leading-tight"
            style={{ textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}
          >
            {bookTitle}
          </h1>
          {photobookConfig?.subtitle && (
            <p className="mt-2 font-serif italic text-sm md:text-base text-white/55">
              {photobookConfig.subtitle}
            </p>
          )}
          <p className="mt-4 font-sans text-xs tracking-widest uppercase text-white/35">
            {totalPhotos} Photos
          </p>
        </div>
      </div>

      {/* Animated browse hint — bottom right */}
      <motion.button
        onClick={onNext}
        className="absolute bottom-8 right-10 md:right-14 lg:right-18 flex flex-col items-center gap-1 group"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ opacity: 0.5 }}
        whileHover={{ opacity: 0.85 }}
      >
        <span className="hidden md:block font-sans text-xs tracking-widest uppercase text-white">
          Browse
        </span>
        <ChevronDown className="h-5 w-5 text-white" />
      </motion.button>
    </div>
  )
}

// ── ContentPage ───────────────────────────────────────────────────────────────

function ContentPage({
  page,
  onPhotoClick,
}: {
  page: PhotobookPage
  onPhotoClick: (photo: PhotobookPhoto) => void
}) {
  const photos = page.photos
  const isSingle = photos.length === 1
  const hasCaptions = photos.some((p) => p.caption)

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: BG }}>
      {/* Photo area */}
      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {isSingle ? (
          <SinglePhotoLayout photo={photos[0]} onPhotoClick={onPhotoClick} />
        ) : (
          <DoublePhotoLayout
            photos={[photos[0], photos[1]] as [PhotobookPhoto, PhotobookPhoto]}
            onPhotoClick={onPhotoClick}
          />
        )}
      </div>

      {/* Caption bar — desktop only (mobile shows frosted overlay in MobilePhotoSlide) */}
      {hasCaptions && (
        <div
          className="hidden md:flex shrink-0 items-center justify-center px-8 py-3"
          style={{ borderTop: `1px solid ${BORDER_SUBTLE}` }}
        >
          {isSingle && photos[0].caption ? (
            <p className="font-serif italic text-base font-medium text-center" style={{ color: CAPTION_COLOR }}>
              {photos[0].caption}
            </p>
          ) : (
            <div className="flex gap-8 w-full max-w-2xl justify-center">
              {photos.map((photo) =>
                photo.caption ? (
                  <p
                    key={photo.id}
                    className="font-serif italic text-base font-medium flex-1 text-center"
                    style={{ color: CAPTION_COLOR }}
                  >
                    {photo.caption}
                  </p>
                ) : null
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SinglePhotoLayout({
  photo,
  onPhotoClick,
}: {
  photo: PhotobookPhoto
  onPhotoClick: (photo: PhotobookPhoto) => void
}) {
  const { t } = useLanguage()
  return (
    <div
      className="relative w-full h-full cursor-pointer group"
      style={{ backgroundColor: '#0a0a0a' }}
      onClick={() => onPhotoClick(photo)}
    >
      <img
        src={photo.url}
        alt={photo.caption || 'Photo'}
        className="w-full h-full object-contain"
        loading="lazy"
        decoding="async"
      />

      {/* Era badge on hover */}
      {photo.analysis?.estimatedEra && photo.analysis.estimatedEra !== 'unknown' && (
        <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: 'rgba(0,0,0,0.65)',
              color: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Calendar className="h-3 w-3" />
            {photo.analysis.estimatedYear
              ? `ca. ${photo.analysis.estimatedYear}`
              : t(PHOTO_ERA_LABEL_KEYS[photo.analysis.estimatedEra] as never) || photo.analysis.estimatedEra}
          </span>
        </div>
      )}

      {/* Mobile: frosted glass caption overlay */}
      {photo.caption && (
        <div
          className="md:hidden absolute bottom-0 left-0 right-0 px-5 py-4"
          style={{
            background: 'rgba(0,0,0,0.32)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <p className="font-serif italic text-sm text-center text-white/90 line-clamp-2">
            {photo.caption}
          </p>
        </div>
      )}
    </div>
  )
}

function DoublePhotoLayout({
  photos,
  onPhotoClick,
}: {
  photos: [PhotobookPhoto, PhotobookPhoto]
  onPhotoClick: (photo: PhotobookPhoto) => void
}) {
  const { t } = useLanguage()
  return (
    <div className="flex w-full h-full" style={{ gap: 4 }}>
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="relative flex-1 h-full cursor-pointer group overflow-hidden"
          style={{ backgroundColor: '#0a0a0a' }}
          onClick={() => onPhotoClick(photo)}
        >
          <img
            src={photo.url}
            alt={photo.caption || 'Photo'}
            className="w-full h-full object-contain"
            loading="lazy"
            decoding="async"
          />

          {/* Era badge on hover */}
          {photo.analysis?.estimatedEra && photo.analysis.estimatedEra !== 'unknown' && (
            <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.65)',
                  color: 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <Calendar className="h-2.5 w-2.5" />
                {photo.analysis.estimatedYear
                  ? `ca. ${photo.analysis.estimatedYear}`
                  : t(PHOTO_ERA_LABEL_KEYS[photo.analysis.estimatedEra] as never) || photo.analysis.estimatedEra}
              </span>
            </div>
          )}

          {/* Mobile: frosted glass caption */}
          {photo.caption && (
            <div
              className="md:hidden absolute bottom-0 left-0 right-0 px-3 py-2.5"
              style={{
                background: 'rgba(0,0,0,0.32)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <p className="font-serif italic text-xs text-center text-white/90 line-clamp-2">
                {photo.caption}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── PhotoModal ────────────────────────────────────────────────────────────────

function PhotoModal({
  photo,
  onClose,
}: {
  photo: PhotobookPhoto
  onClose: () => void
}) {
  const { t } = useLanguage()
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10"
      style={{ backgroundColor: 'rgba(0,0,0,0.93)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 12 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute -top-9 right-0 z-10 flex items-center gap-1.5 transition-opacity hover:opacity-100"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          <X className="h-4 w-4" />
          <span className="font-sans text-xs tracking-widest uppercase">{t('close')}</span>
        </button>

        {/* Photo */}
        <img
          src={photo.url}
          alt={photo.caption || 'Photo'}
          className="w-full object-contain"
          style={{ maxHeight: '65vh', borderRadius: 3 }}
        />

        {/* Caption + badges */}
        {(photo.caption || photo.analysis) && (
          <div className="mt-5 px-1 space-y-3">
            {photo.caption && (
              <p
                className="font-serif italic text-center"
                style={{ color: 'rgba(255,255,255,0.82)', fontSize: 15 }}
              >
                {photo.caption}
              </p>
            )}

            {photo.analysis && (
              <div className="flex flex-wrap justify-center gap-2">
                {photo.analysis.estimatedEra && (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${GOLD}1A`,
                      color: GOLD,
                      border: `1px solid ${GOLD}40`,
                    }}
                  >
                    <Calendar className="h-3 w-3" />
                    {photo.analysis.estimatedYear
                      ? `ca. ${photo.analysis.estimatedYear}`
                      : t(PHOTO_ERA_LABEL_KEYS[photo.analysis.estimatedEra] as never) ||
                        photo.analysis.estimatedEra}
                  </span>
                )}
                {photo.analysis.setting && (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.07)',
                      color: 'rgba(255,255,255,0.55)',
                      border: '1px solid rgba(255,255,255,0.11)',
                    }}
                  >
                    <MapPin className="h-3 w-3" />
                    {photo.analysis.setting}
                  </span>
                )}
                {photo.analysis.peopleCount !== undefined &&
                  photo.analysis.peopleCount > 0 && (
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.07)',
                        color: 'rgba(255,255,255,0.55)',
                        border: '1px solid rgba(255,255,255,0.11)',
                      }}
                    >
                      <Users className="h-3 w-3" />
                      {photo.analysis.peopleCount}{' '}
                      {photo.analysis.peopleCount === 1 ? 'Person' : 'People'}
                    </span>
                  )}
                {photo.analysis.mood && (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.07)',
                      color: 'rgba(255,255,255,0.55)',
                      border: '1px solid rgba(255,255,255,0.11)',
                    }}
                  >
                    ✨ {photo.analysis.mood}
                  </span>
                )}
                {photo.analysis.categories?.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.35)',
                    }}
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}

            {photo.analysis?.description && (
              <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {photo.analysis.description}
              </p>
            )}

            {photo.analysis?.eraReasoning && (
              <p
                className="text-center text-xs italic"
                style={{ color: 'rgba(255,255,255,0.22)' }}
              >
                &ldquo;{photo.analysis.eraReasoning}&rdquo;
              </p>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
