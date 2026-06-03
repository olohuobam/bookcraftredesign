'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import { ChevronLeft, ChevronRight, BookOpen, X } from 'lucide-react'
import SafeImage from '@/components/SafeImage'
import { useHaptics } from '@/hooks/useHaptics'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/LanguageContext'

// Cover reveal animation variants (Fix 5)
const coverRevealVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: 'easeOut' as const }
  }
}

interface LiveBook3DProps {
  coverImage?: string | null
  backCoverImage?: string | null
  isGenerating: boolean
  progress: number
  currentStep?: string
  chapters?: Array<{ title: string; content: string; isComplete: boolean }>
  images?: Array<{ url: string; imageIndex: number; pageText?: string }>
  bookType: 'text' | 'picture' | 'photobook'
  title: string
  author?: string | null
  className?: string
}

/** Words that fit on a single book page */
const WORDS_PER_PAGE = 90
/** Duration of the page-flip animation in ms */
const FLIP_DURATION_MS = 600
/** Minimum swipe distance to trigger a page turn (px) */
const SWIPE_THRESHOLD = 20

// --------------------------------------------------------------------------
// Small helper: renders a text page inside the book
// --------------------------------------------------------------------------
function TextPageContent({
  text,
  streaming = false,
}: {
  text: string
  streaming?: boolean
}) {
  if (!text) return null
  return (
    <div className="relative text-[8px] sm:text-[9px] leading-relaxed text-gray-700 font-serif h-full overflow-hidden">
      <p className="whitespace-pre-wrap">{text}</p>
      {streaming && (
        <span className="inline-block w-[2px] h-3 bg-bookcraft-blue animate-pulse ml-0.5 mt-1" />
      )}
      {/* Fade-out at bottom for realistic page cut */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#faf8f4] to-transparent pointer-events-none" />
    </div>
  )
}

// --------------------------------------------------------------------------
// Small helper: renders an image page inside the book
// --------------------------------------------------------------------------
function ImagePageContent({ url, pageText }: { url: string; pageText?: string }) {
  return (
    <div className={cn("w-full h-full flex flex-col overflow-hidden", !pageText && "justify-center")}>
      <div className={cn("relative overflow-hidden", pageText ? "flex-[3] min-h-0" : "flex-1")}>
        <SafeImage
          src={url}
          alt=""
          fill
          className="object-contain rounded-sm"
          sizes="(max-width: 640px) 200px, 300px"
        />
      </div>
      {pageText && (
        <div className="flex-[2] min-h-0 overflow-y-auto px-1 pt-1">
          <p className="text-[9px] sm:text-[11px] leading-relaxed text-black">
            {pageText}
          </p>
        </div>
      )}
    </div>
  )
}

// --------------------------------------------------------------------------
// Loading skeleton for images being generated
// --------------------------------------------------------------------------
function ImageSkeleton() {
  return (
    <div className="w-full h-full rounded-sm relative overflow-hidden bg-slate-100">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, #dbeafe 0%, #bfdbfe 45%, #3E86D7 50%, #bfdbfe 55%, #dbeafe 100%)',
          backgroundSize: '200% 100%',
          animation: 'livebook-shimmer 1.8s ease-in-out infinite',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 opacity-40">
          <div className="w-8 h-8 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
        </div>
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------
// Small helper: empty / title page on the left when no content yet
// --------------------------------------------------------------------------
function TitlePage({ title, author }: { title: string; author?: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-3">
      <p className="text-[11px] sm:text-xs font-serif font-semibold text-gray-500">{title}</p>
      {author && <p className="text-[9px] text-gray-400">{author}</p>}
      <div className="w-10 h-[0.5px] bg-gray-300 mt-1" />
      <p className="text-[8px] text-gray-300 uppercase tracking-widest mt-2">bookcraft</p>
    </div>
  )
}

// --------------------------------------------------------------------------
// Page wrapper: background, texture, page number
// --------------------------------------------------------------------------
function BookPage({
  side,
  pageNumber,
  isImagePage = false,
  children,
}: {
  side: 'left' | 'right'
  pageNumber?: number
  isImagePage?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'relative w-1/2 h-full bg-[#faf8f4] overflow-hidden',
        side === 'left' ? 'rounded-l-sm border-r border-gray-200/60' : 'rounded-r-sm',
      )}
    >
      {/* Paper texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='4' height='4' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='1' height='1' fill='%23000'/%3E%3C/svg%3E\")",
          backgroundSize: '4px 4px',
        }}
      />
      <div className={cn('relative h-full overflow-hidden', isImagePage ? 'p-1' : 'p-4 sm:p-5')}>{children}</div>
      {pageNumber !== undefined && (
        <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
          <span className="text-[7px] text-gray-300">{pageNumber}</span>
        </div>
      )}
    </div>
  )
}

// ==========================================================================
// Main Component
// ==========================================================================
export default function LiveBook3D({
  coverImage,
  backCoverImage,
  isGenerating,
  progress,
  chapters = [],
  images = [],
  bookType,
  title,
  author,
  className,
}: LiveBook3DProps) {
  const { t } = useLanguage()
  const { impact } = useHaptics()

  // ── Open / close state ──────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false)
  const [hasBeenOpen, setHasBeenOpen] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  // ── Cover reveal state (Fix 4 + 5) ──────────────────────────────────────
  const [coverRevealed, setCoverRevealed] = useState(false)
  const prevCoverRef = useRef<string | null | undefined>(null)

  // ── Page-flip state ─────────────────────────────────────────────────────
  const [isFlipping, setIsFlipping] = useState(false)
  // Direction of current flip: 'forward' (right page flips left) or 'backward' (left page flips right)
  const [flipDirection, setFlipDirection] = useState<'forward' | 'backward'>('forward')
  // Snapshot content for the flipping page animation
  const flipOldRightRef = useRef<React.ReactNode>(null)
  const flipNewLeftRef = useRef<React.ReactNode>(null)
  // For backward flip: snapshot of old left and new right
  const flipOldLeftRef = useRef<React.ReactNode>(null)
  const flipNewRightRef = useRef<React.ReactNode>(null)

  // ── Unified spread state ─────────────────────────────────────────────────
  // currentSpread: unified spread index for both text and picture books
  const [currentSpread, setCurrentSpread] = useState(0)
  const lastAutoSpreadRef = useRef(0)

  // ── Picture-book: displayed image indices ───────────────────────────────
  const [displayedPicLeft, setDisplayedPicLeft] = useState(-1)
  const [displayedPicRight, setDisplayedPicRight] = useState(-1)
  const prevImagesLengthRef = useRef(0)

  // ── User navigation tracking ─────────────────────────────────────────────
  const isUserNavigatingRef = useRef(false)

  // ── Flip timer ref (for cleanup on unmount or early cancel) ─────────────
  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Drag-to-rotate (only when closed) ───────────────────────────────────
  const dragStartX = useRef(0)
  const dragStartY = useRef(0)
  const baseRotation = useRef(-15)
  const dragDistance = useRef(0)
  const rotateY = useMotionValue(-15)
  const springRotateY = useSpring(rotateY, { stiffness: 150, damping: 20 })
  const [isDragRotating, setIsDragRotating] = useState(false)

  // Track swipe gesture deltas (open state)
  const swipeDeltaXRef = useRef(0)
  const swipeDeltaYRef = useRef(0)

  // Swipe feedback: live offset while dragging (open state)
  const [swipeOffsetX, setSwipeOffsetX] = useState(0)

  const hasContent = chapters.length > 0 || images.length > 0

  // ── TEXT: split all accumulated text into pages of WORDS_PER_PAGE ───────
  const textPages = useMemo<string[]>(() => {
    if (bookType !== 'text') return []
    const allText = chapters.map((c) => c.content).join('\n\n')
    const words = allText.split(/\s+/).filter(Boolean)
    if (words.length === 0) return []
    const pages: string[] = []
    for (let i = 0; i < words.length; i += WORDS_PER_PAGE) {
      pages.push(words.slice(i, i + WORDS_PER_PAGE).join(' '))
    }
    return pages
  }, [chapters, bookType])

  const latestTextSpread = useMemo(
    () => (textPages.length <= 1 ? 0 : Math.floor((textPages.length - 1) / 2)),
    [textPages.length],
  )

  // ── Total spreads (for page indicator) ──────────────────────────────────
  const totalSpreads = useMemo(() => {
    if (bookType === 'text') {
      return Math.max(1, Math.ceil(textPages.length / 2))
    }
    // picture / photobook: each pair of images = 1 spread
    return Math.max(1, Math.ceil(images.length / 2))
  }, [bookType, textPages.length, images.length])

  // ── goToSpread: unified navigation function ──────────────────────────────
  const goToSpread = useCallback(
    (target: number, direction: 'forward' | 'backward') => {
      if (isFlipping) return
      if (target < 0 || target >= totalSpreads) return

      // Mark user as navigating
      isUserNavigatingRef.current = true

      if (direction === 'forward') {
        // Forward flip: right page flips to become new left
        if (bookType === 'text') {
          const oldRightPageIdx = currentSpread * 2 + 1
          const newLeftPageIdx = target * 2
          flipOldRightRef.current = textPages[oldRightPageIdx] ? (
            <TextPageContent text={textPages[oldRightPageIdx]} />
          ) : null
          flipNewLeftRef.current = textPages[newLeftPageIdx] ? (
            <TextPageContent text={textPages[newLeftPageIdx]} />
          ) : null
        } else {
          // picture / photobook
          const oldRightIdx = displayedPicRight
          const newLeftIdx = target * 2
          flipOldRightRef.current =
            oldRightIdx >= 0 && images[oldRightIdx] ? <ImagePageContent url={images[oldRightIdx].url} pageText={images[oldRightIdx]?.pageText} /> : null
          flipNewLeftRef.current =
            newLeftIdx >= 0 && images[newLeftIdx] ? <ImagePageContent url={images[newLeftIdx].url} pageText={images[newLeftIdx]?.pageText} /> : null
        }
      } else {
        // Backward flip: left page flips to become new right
        if (bookType === 'text') {
          const oldLeftPageIdx = currentSpread * 2
          const newRightPageIdx = target * 2 + 1
          const newLeftPageIdx = target * 2
          flipOldLeftRef.current = textPages[oldLeftPageIdx] ? (
            <TextPageContent text={textPages[oldLeftPageIdx]} />
          ) : null
          flipNewRightRef.current = textPages[newRightPageIdx] ? (
            <TextPageContent text={textPages[newRightPageIdx]} />
          ) : null
          // Snapshot new left page so stable left page can show correct content during flip
          flipNewLeftRef.current = textPages[newLeftPageIdx] ? (
            <TextPageContent text={textPages[newLeftPageIdx]} />
          ) : null
        } else {
          // picture / photobook
          const oldLeftIdx = displayedPicLeft
          const newRightIdx = target * 2 + 1
          const newLeftIdx = target * 2
          flipOldLeftRef.current =
            oldLeftIdx >= 0 && images[oldLeftIdx] ? <ImagePageContent url={images[oldLeftIdx].url} pageText={images[oldLeftIdx]?.pageText} /> : null
          flipNewRightRef.current =
            newRightIdx >= 0 && images[newRightIdx] ? <ImagePageContent url={images[newRightIdx].url} pageText={images[newRightIdx]?.pageText} /> : null
          // Snapshot new left page for stable left position during backward flip
          flipNewLeftRef.current =
            newLeftIdx >= 0 && images[newLeftIdx] ? <ImagePageContent url={images[newLeftIdx].url} pageText={images[newLeftIdx]?.pageText} /> : null
        }
      }

      setFlipDirection(direction)
      setIsFlipping(true)

      // Clear any pending flip timer before starting a new one
      if (flipTimerRef.current !== null) {
        clearTimeout(flipTimerRef.current)
      }
      flipTimerRef.current = setTimeout(() => {
        flipTimerRef.current = null
        setCurrentSpread(target)
        if (bookType === 'picture' || bookType === 'photobook') {
          setDisplayedPicLeft(target * 2 < images.length ? target * 2 : -1)
          setDisplayedPicRight(target * 2 + 1 < images.length ? target * 2 + 1 : -1)
        }
        setIsFlipping(false)
        // Reset user navigation flag if back at latest spread
        if (target >= totalSpreads - 1) {
          isUserNavigatingRef.current = false
        }
      }, FLIP_DURATION_MS)
    },
    [isFlipping, totalSpreads, bookType, currentSpread, textPages, images, displayedPicLeft, displayedPicRight],
  )

  // ── Cleanup flip timer on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (flipTimerRef.current !== null) {
        clearTimeout(flipTimerRef.current)
      }
    }
  }, [])

  // ── TEXT: auto-flip when new spread is available (book must be open) ─────
  useEffect(() => {
    if (bookType !== 'text' || !isOpen) return
    if (latestTextSpread > lastAutoSpreadRef.current && !isFlipping && !isUserNavigatingRef.current) {
      const oldSpread = currentSpread
      const oldRightPageIdx = oldSpread * 2 + 1
      const newSpread = latestTextSpread
      const newLeftPageIdx = newSpread * 2

      flipOldRightRef.current = textPages[oldRightPageIdx] ? (
        <TextPageContent text={textPages[oldRightPageIdx]} />
      ) : null
      flipNewLeftRef.current = textPages[newLeftPageIdx] ? (
        <TextPageContent text={textPages[newLeftPageIdx]} />
      ) : null

      lastAutoSpreadRef.current = newSpread
      setFlipDirection('forward')
      setIsFlipping(true)
      const flipTimer = setTimeout(() => {
        setCurrentSpread(newSpread)
        setIsFlipping(false)
      }, FLIP_DURATION_MS)
      return () => clearTimeout(flipTimer)
    }
  }, [latestTextSpread, currentSpread, isFlipping, isOpen, bookType, textPages])

  // ── PICTURE: auto-flip when new image arrives (book must be open) ────────
  useEffect(() => {
    if (bookType !== 'picture' && bookType !== 'photobook') return
    const currentLen = images.length
    if (currentLen === prevImagesLengthRef.current) return

    // While book is closed → just silently track
    if (!isOpen) {
      prevImagesLengthRef.current = currentLen
      setDisplayedPicLeft(currentLen >= 2 ? currentLen - 2 : -1)
      setDisplayedPicRight(currentLen >= 1 ? currentLen - 1 : -1)
      return
    }

    prevImagesLengthRef.current = currentLen

    if (currentLen === 1) {
      // First image: just appear on the right, no flip
      setDisplayedPicRight(0)
      setDisplayedPicLeft(-1)
      setCurrentSpread(0)
      return
    }

    // Second+ image: only auto-flip if user is not manually navigating
    if (!isFlipping && !isUserNavigatingRef.current) {
      const oldRightIdx = displayedPicRight
      const newLeftIdx = currentLen - 2
      const newRightIdx = currentLen - 1
      const newSpread = Math.floor(newLeftIdx / 2)

      flipOldRightRef.current =
        oldRightIdx >= 0 && images[oldRightIdx] ? <ImagePageContent url={images[oldRightIdx].url} pageText={images[oldRightIdx]?.pageText} /> : null
      flipNewLeftRef.current =
        newLeftIdx >= 0 && images[newLeftIdx] ? <ImagePageContent url={images[newLeftIdx].url} pageText={images[newLeftIdx]?.pageText} /> : null

      setFlipDirection('forward')
      setIsFlipping(true)
      const flipTimer = setTimeout(() => {
        setDisplayedPicLeft(newLeftIdx)
        setDisplayedPicRight(newRightIdx)
        setCurrentSpread(newSpread)
        setIsFlipping(false)
      }, FLIP_DURATION_MS)
      return () => clearTimeout(flipTimer)
    }
  }, [images.length, images, isOpen, isFlipping, displayedPicRight, bookType])

  // Snap to latest state when book opens
  useEffect(() => {
    if (!isOpen) return
    // Text
    if (bookType === 'text') {
      setCurrentSpread(latestTextSpread)
      lastAutoSpreadRef.current = latestTextSpread
    }
    // Picture
    if (bookType === 'picture' || bookType === 'photobook') {
      const len = images.length
      const spread = len >= 2 ? Math.floor((len - 2) / 2) : 0
      setDisplayedPicLeft(len >= 2 ? len - 2 : -1)
      setDisplayedPicRight(len >= 1 ? len - 1 : -1)
      setCurrentSpread(spread)
      prevImagesLengthRef.current = len
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]) // intentionally only on isOpen change

  // ── Reset isUserNavigating when generation completes ─────────────────────
  useEffect(() => {
    if (progress >= 100) {
      isUserNavigatingRef.current = false
    }
  }, [progress])

  // ── Cover reveal: track first arrival of cover image (Fix 4 + 5) ────────
  useEffect(() => {
    if (coverImage && !prevCoverRef.current) {
      // Cover just arrived for the first time
      setCoverRevealed(true)
    }
    prevCoverRef.current = coverImage
  }, [coverImage])

  // ── Auto-open ONCE when first content arrives ───────────────────────────
  useEffect(() => {
    if (hasContent && isGenerating && !isOpen && !hasBeenOpen) {
      const timer = setTimeout(() => {
        rotateY.set(-15)
        setIsOpen(true)
        setHasBeenOpen(true)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [hasContent, isGenerating, isOpen, hasBeenOpen, rotateY])

  // ── Close + celebrate on generation complete ─────────────────────────────
  useEffect(() => {
    if (!isGenerating && progress >= 100 && hasBeenOpen) {
      const closeTimer = setTimeout(() => setIsOpen(false), 600)
      const celebrateTimer = setTimeout(() => setShowCelebration(true), 1200)
      const hideCelebrate = setTimeout(() => setShowCelebration(false), 3200)
      return () => {
        clearTimeout(closeTimer)
        clearTimeout(celebrateTimer)
        clearTimeout(hideCelebrate)
      }
    }
  }, [isGenerating, progress, hasBeenOpen])

  // ── Toggle book open/close (for the button) ──────────────────────────
  const toggleBook = useCallback(() => {
    if (isOpen) {
      setIsOpen(false)
    } else if (hasContent) {
      rotateY.set(-15)
      setIsOpen(true)
      setHasBeenOpen(true)
    }
  }, [isOpen, hasContent, rotateY])

  // ── Keyboard navigation (only when open) ─────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (currentSpread < totalSpreads - 1) {
          goToSpread(currentSpread + 1, 'forward')
          impact('light')
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (currentSpread > 0) {
          goToSpread(currentSpread - 1, 'backward')
          impact('light')
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentSpread, totalSpreads, goToSpread, impact])

  // ── Pointer handlers (swipe for page turns when open, no drag-rotate) ──
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragStartX.current = e.clientX
      dragStartY.current = e.clientY
      dragDistance.current = 0
      swipeDeltaXRef.current = 0
      swipeDeltaYRef.current = 0

      if (isOpen) {
        e.currentTarget.setPointerCapture(e.pointerId)
      }
      // Closed state: do nothing — open/close is handled by button
    },
    [isOpen],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isOpen) return

      const deltaX = e.clientX - dragStartX.current
      const deltaY = e.clientY - dragStartY.current
      dragDistance.current = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      swipeDeltaXRef.current = deltaX
      swipeDeltaYRef.current = deltaY

      // Apply swipe feedback: clamp offset for subtle visual tilt
      const maxOffset = 24
      const clamped = Math.max(-maxOffset, Math.min(maxOffset, deltaX * 0.3))
      setSwipeOffsetX(clamped)
    },
    [isOpen],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      dragDistance.current = 0

      if (!isOpen) return // Closed state — button handles open/close

      // Release pointer capture
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }

      // Always snap back swipe feedback offset
      setSwipeOffsetX(0)

      const deltaX = swipeDeltaXRef.current
      const absDeltaX = Math.abs(deltaX)

      // Swipe gesture — very relaxed, any horizontal movement
      if (absDeltaX >= SWIPE_THRESHOLD) {
        if (deltaX < 0) {
          // Swipe left → forward
          if (currentSpread < totalSpreads - 1) {
            goToSpread(currentSpread + 1, 'forward')
            impact('medium')
          }
        } else {
          // Swipe right → backward
          if (currentSpread > 0) {
            goToSpread(currentSpread - 1, 'backward')
            impact('medium')
          }
        }
      }
    },
    [isOpen, currentSpread, totalSpreads, goToSpread, impact],
  )

  // ── Computed content for current spread ──────────────────────────────────
  const displayedTextSpread = currentSpread
  const leftTextPage = textPages[displayedTextSpread * 2] ?? ''
  const rightTextPage = textPages[displayedTextSpread * 2 + 1] ?? ''
  const isRightTextStreaming =
    isGenerating &&
    bookType === 'text' &&
    displayedTextSpread === latestTextSpread &&
    textPages.length > 0

  const leftImageUrl = displayedPicLeft >= 0 ? images[displayedPicLeft]?.url ?? null : null
  const leftImageText = displayedPicLeft >= 0 ? images[displayedPicLeft]?.pageText : undefined
  const rightImageUrl = displayedPicRight >= 0 ? images[displayedPicRight]?.url ?? null : null
  const rightImageText = displayedPicRight >= 0 ? images[displayedPicRight]?.pageText : undefined

  // ── Responsive book dimensions ────────────────────────────────────────────
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 768,
  )
  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', update)
    update()
    return () => window.removeEventListener('resize', update)
  }, [])

  // ── Spine dimensions ─────────────────────────────────────────────────────
  const spineWidth = Math.max(44, 28 + Math.floor(progress * 0.44))

  // Book dimensions — responsive: shrink on mobile (< 640px)
  const isMobile = viewportWidth < 640
  const bookW = isMobile ? Math.min(200, Math.floor(viewportWidth * 0.5)) : 300
  const bookH = Math.round(bookW * (500 / 360))

  // ── Page render helpers ──────────────────────────────────────────────────
  const renderLeftContent = () => {
    if (bookType === 'text') {
      return leftTextPage ? (
        <TextPageContent text={leftTextPage} />
      ) : (
        <TitlePage title={title} author={author} />
      )
    }
    if (leftImageUrl) {
      return <ImagePageContent url={leftImageUrl} pageText={leftImageText} />
    }
    // No URL yet but generating → show skeleton
    if (isGenerating && displayedPicLeft >= 0) {
      return <ImageSkeleton />
    }
    return <TitlePage title={title} author={author} />
  }

  const renderRightContent = (streaming = false) => {
    if (bookType === 'text') {
      return rightTextPage ? (
        <TextPageContent text={rightTextPage} streaming={streaming} />
      ) : isGenerating ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-[9px] text-gray-400 italic">Generating…</div>
        </div>
      ) : null
    }
    if (rightImageUrl) {
      return <ImagePageContent url={rightImageUrl} pageText={rightImageText} />
    }
    // No URL yet but generating → show skeleton
    if (isGenerating && displayedPicRight >= 0) {
      return <ImageSkeleton />
    }
    if (isGenerating) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-[9px] text-gray-400 italic">Generating image…</div>
        </div>
      )
    }
    return null
  }

  // ── Nav button handlers ───────────────────────────────────────────────────
  const handlePrev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (currentSpread > 0) {
        goToSpread(currentSpread - 1, 'backward')
        impact('light')
      }
    },
    [currentSpread, goToSpread, impact],
  )

  const handleNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (currentSpread < totalSpreads - 1) {
        goToSpread(currentSpread + 1, 'forward')
        impact('light')
      }
    },
    [currentSpread, totalSpreads, goToSpread, impact],
  )

  return (
    <div
      className={cn('flex flex-col items-center justify-center', className)}
      style={{ perspective: '1200px' }}
    >
      {/* Floating animation */}
      <motion.div
        animate={isGenerating ? { y: [0, -6, 0] } : { y: 0 }}
        transition={
          isGenerating
            ? { duration: 3, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.5 }
        }
      >
        {/* Cover pop */}
        <motion.div
          animate={coverImage ? { scale: [1, 1.05, 1] } : { scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Book container — expands when open */}
          <div className="relative">
            <motion.div
              className={cn("relative select-none", isOpen ? "touch-pan-y" : "touch-none")}
              animate={{ width: isOpen ? bookW * 2 : bookW, height: bookH }}
              transition={{ type: 'spring', damping: 25, stiffness: 120 }}
              style={{
                transformStyle: 'preserve-3d',
                rotateX: 2,
                rotateY: isOpen ? 0 : -15,
                cursor: isOpen ? 'grab' : 'default',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {/* ================================================================
                  CLOSED STATE
              ================================================================ */}
              {!isOpen && (
                <>
                  {/* Drop shadow */}
                  <div
                    className="absolute -bottom-4 left-4 right-0 h-8 rounded-full opacity-30 blur-lg"
                    style={{
                      background:
                        'radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, transparent 70%)',
                    }}
                  />

                  {/* Spine */}
                  <div
                    className="absolute top-0 left-0 h-full rounded-l-[3px] overflow-hidden"
                    style={{
                      width: `${spineWidth}px`,
                      transformStyle: 'preserve-3d',
                      transform: `translateX(-${spineWidth}px) rotateY(90deg)`,
                      transformOrigin: 'right center',
                      background: coverImage
                        ? 'linear-gradient(to right, #1a0d04, #3d2008, #6b3a14, #3d2008, #1a0d04)'
                        : 'linear-gradient(to right, #0f172a, #1e293b, #0f172a)',
                    }}
                  >
                    {/* Subtle texture overlay */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.15) 100%)',
                      }}
                    />
                    {/* Gold decorative lines top */}
                    <div className="absolute top-[6%] left-[8%] right-[8%] h-[1.5px]" style={{ background: 'linear-gradient(to right, transparent, #d4af37, transparent)' }} />
                    <div className="absolute top-[8%] left-[15%] right-[15%] h-[0.5px]" style={{ background: 'linear-gradient(to right, transparent, #f0c040, transparent)' }} />
                    {/* Gold decorative lines bottom */}
                    <div className="absolute bottom-[6%] left-[8%] right-[8%] h-[1.5px]" style={{ background: 'linear-gradient(to right, transparent, #d4af37, transparent)' }} />
                    <div className="absolute bottom-[8%] left-[15%] right-[15%] h-[0.5px]" style={{ background: 'linear-gradient(to right, transparent, #f0c040, transparent)' }} />

                    {/* Title, author and brand label */}
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-between pointer-events-none"
                      style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', padding: '14% 0', transform: 'scaleX(-1)' }}
                    >
                      <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden px-1" style={{ flexDirection: 'column', gap: '4px' }}>
                        <p
                          className="leading-tight"
                          style={{
                            fontSize: title.length > 30 ? '8px' : title.length > 20 ? '10px' : title.length > 12 ? '12px' : '14px',
                            fontWeight: 800,
                            color: '#ffffff',
                            letterSpacing: '0.06em',
                            overflow: 'hidden',
                            wordBreak: 'break-word',
                            textShadow: '0 0 12px rgba(0,0,0,0.9), 0 1px 4px rgba(0,0,0,0.8)',
                          }}
                        >
                          {title}
                        </p>
                        {author && (
                          <p
                            className="leading-tight"
                            style={{
                              fontSize: author.length > 20 ? '7px' : '9px',
                              fontStyle: 'italic',
                              color: '#d4af37',
                              letterSpacing: '0.05em',
                              overflow: 'hidden',
                              wordBreak: 'break-word',
                            }}
                          >
                            {author}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <p
                          className="uppercase leading-none"
                          style={{
                            fontSize: '7px',
                            color: '#d4af37',
                            letterSpacing: '0.35em',
                            opacity: 0.85,
                          }}
                        >
                          BOOKCRAFT
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Page edges */}
                  <div
                    className="absolute top-[2px] right-0 bottom-[2px]"
                    style={{
                      width: `${spineWidth}px`,
                      transformStyle: 'preserve-3d',
                      transform: `translateX(${spineWidth - 2}px) rotateY(90deg)`,
                      transformOrigin: 'left center',
                      background: 'linear-gradient(to right, #f5f0e8, #ede8dd, #f5f0e8)',
                    }}
                  />

                  {/* Back cover */}
                  <div
                    className="absolute inset-0 rounded-l-sm rounded-r-[2px] overflow-hidden"
                    style={{
                      transform: 'rotateY(180deg) translateZ(1px)',
                      backfaceVisibility: 'hidden',
                    }}
                  >
                    {backCoverImage ? (
                      <SafeImage
                        src={backCoverImage}
                        alt="Back cover"
                        fill
                        className="object-cover"
                        sizes="360px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-between p-5 overflow-hidden"
                        style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)' }}
                      >
                        {/* Subtle decorative circles */}
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute top-[-20%] right-[-20%] w-[70%] h-[70%] rounded-full opacity-10"
                            style={{ background: 'radial-gradient(circle, #d4af37 0%, transparent 70%)' }} />
                          <div className="absolute bottom-[-10%] left-[-15%] w-[55%] h-[55%] rounded-full opacity-10"
                            style={{ background: 'radial-gradient(circle, #3E86D7 0%, transparent 70%)' }} />
                        </div>
                        {/* Top decorative line */}
                        <div className="w-full flex flex-col items-center gap-1 pt-2">
                          <div className="w-8 h-[1px]" style={{ background: 'linear-gradient(to right, transparent, #d4af37, transparent)' }} />
                          <div className="w-4 h-[0.5px] opacity-50" style={{ background: '#d4af37' }} />
                        </div>
                        {/* Center ornament */}
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ border: '1px solid rgba(212,175,55,0.3)', background: 'rgba(212,175,55,0.05)' }}>
                            <div className="w-4 h-4 rounded-full"
                              style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.6) 0%, transparent 70%)' }} />
                          </div>
                          <p className="text-[7px] uppercase tracking-[0.3em] text-center"
                            style={{ color: 'rgba(212,175,55,0.5)' }}>Made with</p>
                          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-center"
                            style={{ color: 'rgba(212,175,55,0.8)', letterSpacing: '0.3em' }}>Bookcraft</p>
                        </div>
                        {/* Bottom lines */}
                        <div className="w-full flex flex-col items-center gap-1 pb-1">
                          <div className="w-4 h-[0.5px] opacity-50" style={{ background: '#d4af37' }} />
                          <div className="w-8 h-[1px]" style={{ background: 'linear-gradient(to right, transparent, #d4af37, transparent)' }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Front cover */}
                  <div
                    className="absolute inset-0 rounded-r-sm overflow-hidden"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    {coverImage ? (
                      /* Fix 5: Cover-reveal wow moment — scale-in + crossfade */
                      <motion.div
                        className="absolute inset-0"
                        variants={coverRevealVariants}
                        initial={coverRevealed ? 'hidden' : 'visible'}
                        animate="visible"
                      >
                        <SafeImage
                          src={coverImage}
                          alt={title}
                          fill
                          className="object-cover"
                          sizes="360px"
                        />
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background:
                              'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 40%, transparent 60%)',
                          }}
                        />
                      </motion.div>
                    ) : isGenerating ? (
                      /* Fix 4: Cover skeleton with pulse while generating */
                      <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
                        style={{ background: 'linear-gradient(160deg, #1e293b 0%, #0f172a 100%)' }}
                      >
                        {/* Pulsing shimmer background */}
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.04) 37%, transparent 50%)',
                            backgroundSize: '200% 100%',
                            animation: 'livebook-shimmer 2.2s ease-in-out infinite',
                          }}
                        />

                        {/* Pulsing cover placeholder icon */}
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                          style={{
                            background: 'rgba(62,134,215,0.15)',
                            border: '1px solid rgba(62,134,215,0.3)',
                            animation: 'livebook-pulse 2s ease-in-out infinite',
                          }}
                        >
                          <div className="w-5 h-5 rounded-sm" style={{ background: 'rgba(62,134,215,0.5)' }} />
                        </div>

                        <p className="text-[9px] text-white/40 uppercase tracking-[0.15em]">
                          Generating cover...
                        </p>

                        {/* Three animated dots */}
                        <div className="flex items-center gap-1 mt-2">
                          {[0, 0.2, 0.4].map((delay, i) => (
                            <div
                              key={i}
                              className="w-1 h-1 rounded-full bg-blue-400/50"
                              style={{ animation: `livebook-pulse 1.4s ease-in-out ${delay}s infinite` }}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 dark:from-slate-800 dark:via-slate-900 dark:to-black">
                        <div className="absolute top-6 left-6 right-6 h-px bg-white/10" />
                        <div className="absolute bottom-6 left-6 right-6 h-px bg-white/10" />

                        <div className="px-8 text-center space-y-3">
                          <p className="text-base font-bold text-white/90 leading-tight line-clamp-3 tracking-wide">
                            {title}
                          </p>
                          {author && (
                            <p className="text-xs text-white/40 tracking-widest uppercase">{author}</p>
                          )}
                        </div>

                        <p className="absolute bottom-3 text-[7px] text-white/15 uppercase tracking-[0.2em]">
                          bookcraft
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Tap-to-open hint */}
                  {hasContent && (
                    <motion.div
                      className="absolute -bottom-8 left-0 right-0 text-center pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 }}
                    >
                      <p className="text-[9px] text-white/40 uppercase tracking-widest">
                        tap to open
                      </p>
                    </motion.div>
                  )}
                </>
              )}

              {/* ================================================================
                  OPEN STATE: two-page spread with optional flip animation
              ================================================================ */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    className="absolute inset-0 flex"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, x: swipeOffsetX }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: swipeOffsetX === 0 ? 0.4 : 0.05, x: { type: 'spring', stiffness: 300, damping: 30 } }}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    {/* Left page (stable — shows current spread) */}
                    <BookPage
                      side="left"
                      pageNumber={
                        bookType === 'text'
                          ? displayedTextSpread * 2 + 1
                          : displayedPicLeft >= 0
                          ? displayedPicLeft + 1
                          : undefined
                      }
                      isImagePage={bookType === 'picture' || bookType === 'photobook'}
                    >
                      {/* Hide left content during backward flip */}
                      {(!isFlipping || flipDirection === 'forward') && renderLeftContent()}
                      {isFlipping && flipDirection === 'backward' && (
                        <div className="h-full overflow-hidden">
                          {flipNewLeftRef.current /* New left page — revealed after backward flip resolves */}
                        </div>
                      )}
                    </BookPage>

                    {/* Right page (hidden during forward flip to avoid z-fighting) */}
                    <BookPage
                      side="right"
                      pageNumber={
                        bookType === 'text'
                          ? displayedTextSpread * 2 + 2
                          : displayedPicRight >= 0
                          ? displayedPicRight + 1
                          : undefined
                      }
                      isImagePage={bookType === 'picture' || bookType === 'photobook'}
                    >
                      {(!isFlipping || flipDirection === 'backward') && renderRightContent(isRightTextStreaming)}
                      {isFlipping && flipDirection === 'forward' && null}
                    </BookPage>

                    {/* ── Forward flip animation (right page → left) ──────── */}
                    {isFlipping && flipDirection === 'forward' && (
                      <motion.div
                        className="absolute inset-y-0 right-0 w-1/2 z-20"
                        style={{
                          transformStyle: 'preserve-3d',
                          transformOrigin: 'left center',
                        }}
                        initial={{ rotateY: 0 }}
                        animate={{ rotateY: -180 }}
                        transition={{
                          duration: FLIP_DURATION_MS / 1000,
                          ease: 'easeInOut',
                        }}
                      >
                        {/* Front face: old right page content */}
                        <div
                          className="absolute inset-0 bg-[#faf8f4] rounded-r-sm overflow-hidden"
                          style={{ backfaceVisibility: 'hidden' }}
                        >
                          <div className={cn('h-full overflow-hidden', (bookType === 'picture' || bookType === 'photobook') ? 'p-1' : 'p-4 sm:p-5')}>
                            {flipOldRightRef.current}
                          </div>
                          <div
                            className="absolute inset-y-0 left-0 w-6 pointer-events-none"
                            style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.12), transparent)' }}
                          />
                        </div>
                        {/* Back face: new left page content (after flip → left) */}
                        <div
                          className="absolute inset-0 bg-[#faf8f4] rounded-l-sm overflow-hidden"
                          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                        >
                          <div className={cn('h-full overflow-hidden', (bookType === 'picture' || bookType === 'photobook') ? 'p-1' : 'p-4 sm:p-5')}>
                            {flipNewLeftRef.current}
                          </div>
                          <div
                            className="absolute inset-y-0 right-0 w-6 pointer-events-none"
                            style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.12), transparent)' }}
                          />
                        </div>
                      </motion.div>
                    )}

                    {/* ── Backward flip animation (left page → right) ─────── */}
                    {isFlipping && flipDirection === 'backward' && (
                      <motion.div
                        className="absolute inset-y-0 left-0 w-1/2 z-20"
                        style={{
                          transformStyle: 'preserve-3d',
                          transformOrigin: 'right center',
                        }}
                        initial={{ rotateY: 0 }}
                        animate={{ rotateY: 180 }}
                        transition={{
                          duration: FLIP_DURATION_MS / 1000,
                          ease: 'easeInOut',
                        }}
                      >
                        {/* Front face: old left page content */}
                        <div
                          className="absolute inset-0 bg-[#faf8f4] rounded-l-sm overflow-hidden"
                          style={{ backfaceVisibility: 'hidden' }}
                        >
                          <div className={cn('h-full overflow-hidden', (bookType === 'picture' || bookType === 'photobook') ? 'p-1' : 'p-4 sm:p-5')}>
                            {flipOldLeftRef.current}
                          </div>
                          <div
                            className="absolute inset-y-0 right-0 w-6 pointer-events-none"
                            style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.12), transparent)' }}
                          />
                        </div>
                        {/* Back face: new right page content */}
                        <div
                          className="absolute inset-0 bg-[#faf8f4] rounded-r-sm overflow-hidden"
                          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                        >
                          <div className={cn('h-full overflow-hidden', (bookType === 'picture' || bookType === 'photobook') ? 'p-1' : 'p-4 sm:p-5')}>
                            {flipNewRightRef.current}
                          </div>
                          <div
                            className="absolute inset-y-0 left-0 w-6 pointer-events-none"
                            style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.12), transparent)' }}
                          />
                        </div>
                      </motion.div>
                    )}

                    {/* Center fold shadow */}
                    <div
                      className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-4 pointer-events-none z-10"
                      style={{
                        background:
                          'linear-gradient(to right, transparent, rgba(0,0,0,0.06) 40%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.06) 60%, transparent)',
                      }}
                    />

                    {/* Drop shadow */}
                    <div
                      className="absolute -bottom-3 left-[5%] right-[5%] h-6 rounded-full opacity-20 blur-lg -z-10"
                      style={{
                        background:
                          'radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, transparent 70%)',
                      }}
                    />

                    {/* Close hint */}
                    <motion.div
                      className="absolute -bottom-8 left-0 right-0 text-center pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 }}
                    >
                      <p className="text-[9px] text-white/40 uppercase tracking-widest">
                        tap to close
                      </p>
                    </motion.div>

                    {/* ── Desktop nav buttons ─────────────────────────────── */}
                    {!isMobile && totalSpreads > 1 && (
                      <>
                        {/* Prev button */}
                        <AnimatePresence>
                          {currentSpread > 0 && (
                            <motion.button
                              key="prev-btn"
                              className="absolute left-1 top-1/2 -translate-y-1/2 z-30 w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-colors"
                              initial={{ opacity: 0, x: -4 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -4 }}
                              onClick={handlePrev}
                              onPointerDown={(e) => e.stopPropagation()}
                              onPointerUp={(e) => e.stopPropagation()}
                              aria-label={t('previousPage')}
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </motion.button>
                          )}
                        </AnimatePresence>
                        {/* Next button */}
                        <AnimatePresence>
                          {currentSpread < totalSpreads - 1 && (
                            <motion.button
                              key="next-btn"
                              className="absolute right-1 top-1/2 -translate-y-1/2 z-30 w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-colors"
                              initial={{ opacity: 0, x: 4 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 4 }}
                              onClick={handleNext}
                              onPointerDown={(e) => e.stopPropagation()}
                              onPointerUp={(e) => e.stopPropagation()}
                              aria-label={t('nextPage')}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Celebration glow */}
              <AnimatePresence>
                {showCelebration && (
                  <motion.div
                    className="absolute -inset-3 rounded-lg pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.6, 0.3, 0.5, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2, ease: 'easeOut' }}
                    style={{
                      background:
                        'radial-gradient(ellipse at center, rgba(255,215,0,0.3) 0%, rgba(255,180,0,0.1) 50%, transparent 70%)',
                      boxShadow: '0 0 40px rgba(255,215,0,0.2)',
                    }}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Open/Close Button + Page indicator ──────────────────────────── */}
      <div className="mt-3 flex flex-col items-center gap-2">
        {/* Open / Close toggle */}
        {hasContent && (
          <motion.button
            onClick={toggleBook}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white/70 hover:text-white text-xs font-medium transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            {isOpen ? (
              <><X className="w-3.5 h-3.5" /> Close</>
            ) : (
              <><BookOpen className="w-3.5 h-3.5" /> Open</>
            )}
          </motion.button>
        )}

        {/* Page indicator */}
        <AnimatePresence>
          {isOpen && totalSpreads > 1 && (
            <motion.div
              className="pointer-events-none"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-[10px] text-white/50 tabular-nums">
                {currentSpread + 1} / {totalSpreads}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx>{`
        @keyframes livebook-shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        @keyframes livebook-pulse {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.08);
          }
        }
      `}</style>
    </div>
  )
}
