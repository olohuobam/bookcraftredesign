'use client'

import { useEffect, useCallback, useRef, useState, startTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import SafeImage from '@/components/SafeImage'
import { useLanguage } from '@/context/LanguageContext'

interface ImageLightboxProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  imageIndex: number
  totalImages: number
  onPrev?: () => void
  onNext?: () => void
}

export default function ImageLightbox({
  isOpen,
  onClose,
  imageUrl,
  imageIndex,
  totalImages,
  onPrev,
  onNext,
}: ImageLightboxProps) {
  const { t } = useLanguage()
  // Touch swipe state
  const touchStartX = useRef<number | null>(null)
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null)

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && onPrev) onPrev()
      if (e.key === 'ArrowRight' && onNext) onNext()
    },
    [isOpen, onClose, onPrev, onNext],
  )

  useEffect(() => {
    if (!isOpen) return
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, isOpen])

  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])

  // Focus close button on open
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus()
    }
  }, [isOpen])

  // Touch handlers for swipe navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) > 60) {
      if (dx < 0 && onNext) {
        setSwipeDir('left')
        onNext()
      } else if (dx > 0 && onPrev) {
        setSwipeDir('right')
        onPrev()
      }
    }
  }, [onNext, onPrev])

  // Reset swipe direction when image changes
  useEffect(() => {
    startTransition(() => { setSwipeDir(null) })
  }, [imageIndex])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label={t('imageFullscreen')}
        >
          {/* Backdrop — click to close */}
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* X button */}
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            style={{ touchAction: 'manipulation' }}
            aria-label={t('close')}
          >
            <X className="w-6 h-6" />
          </button>

          {/* Image counter */}
          {totalImages > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full bg-black/50 text-white/70 text-sm">
              {imageIndex + 1} / {totalImages}
            </div>
          )}

          {/* Centered image container */}
          <div
            className="absolute inset-0 flex items-center justify-center px-12 sm:px-16 py-14 pointer-events-none"
          >
            <motion.div
              key={imageUrl}
              className="relative pointer-events-auto flex items-center justify-center w-full h-full"
              initial={{ scale: 0.9, opacity: 0, x: swipeDir === 'left' ? 100 : swipeDir === 'right' ? -100 : 0 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={`Image ${imageIndex + 1}`}
                className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-2xl"
              />
            </motion.div>
          </div>

          {/* Nav arrows — z-40 above image container */}
          {totalImages > 1 && onPrev && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onPrev()
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-40 p-2 sm:p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
              style={{ touchAction: 'manipulation' }}
              aria-label={t('previousImage')}
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}

          {totalImages > 1 && onNext && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onNext()
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-40 p-2 sm:p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
              style={{ touchAction: 'manipulation' }}
              aria-label={t('nextImage')}
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
