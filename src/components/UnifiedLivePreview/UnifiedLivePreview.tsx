'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { X, ArrowRight, BookOpen, RefreshCw, Loader2, Check, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useJobRealtime } from '@/hooks/useJobRealtime'
import { useImagePreloader } from '@/hooks/useImagePreloader'
import { useLanguage } from '@/context/LanguageContext'
const LiveBook3D = dynamic(() => import('@/components/LiveBook3D'), { ssr: false })
import SafeImage from '@/components/SafeImage'
import ImageStrip from '@/components/ImageStrip'
import ImageLightbox from '@/components/ImageLightbox'

import AnimatedBackground from './AnimatedBackground'
import CelebrationOverlay from './CelebrationOverlay'
import { headerVariants } from './animations'
import { UnifiedLivePreviewProps } from './types'

interface TextChunk {
 chapterNumber: number
 chapterTitle: string
 chapterSubtitle?: string
 text: string
 isComplete: boolean
 wordCount?: number
 _deliveredAt?: string
}

interface ChapterComplete {
 number: number
 title: string
 wordCount: number
}

interface LocalChapter {
 number: number
 title: string
 subtitle?: string
 content: string
 wordCount: number
 isComplete: boolean
 isStreaming: boolean
}

interface ActivityItem {
 id: string
 label: string
 timestamp: number
 type: 'cover' | 'chapter' | 'image' | 'status'
 imageUrl?: string
}

export default function UnifiedLivePreview({
 jobId,
 bookId,
 bookType,
 bookTitle,
 bookAuthor,
 onComplete,
 onClose
}: UnifiedLivePreviewProps) {
 const router = useRouter()
 const { t } = useLanguage()
 const activityFeedRef = useRef<HTMLDivElement>(null)

  // Real-time job updates
 const {
 job,
 book,
 eta,
 isConnected,
 connectionType,
 isStuck,
 reconnect
 } = useJobRealtime(jobId, {
 onComplete: () => setShowCelebration(true),
 fallbackToSSE: true
 })

  // Image preloading for picture books
 const { preloadImage } = useImagePreloader({ preloadAhead: 2 })

  // Local state for accumulated content
 const [chapters, setChapters] = useState<LocalChapter[]>([])
 const [images, setImages] = useState<string[]>([])
 const [coverImage, setCoverImage] = useState<string | null>(null)
 const [backCoverImage, setBackCoverImage] = useState<string | null>(null)
 const [showCelebration, setShowCelebration] = useState(false)
 const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set())
 const [activityItems, setActivityItems] = useState<ActivityItem[]>([])

  // Lightbox state
 const [isLightboxOpen, setIsLightboxOpen] = useState(false)
 const [selectedImageIdx, setSelectedImageIdx] = useState(0)

  // Fix 6: Chapter milestone toast state
 const [chapterToast, setChapterToast] = useState<{ number: number; title: string } | null>(null)
 const chapterToastTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Refs for tracking processed chunks and preventing duplicates
 const lastTextChunkRef = useRef<string>('')
 const lastChapterCompleteRef = useRef<number>(-1)
 const processedChunksRef = useRef<Set<string>>(new Set())
 const prevImagesRef = useRef<string[]>([])
 const prevStatusRef = useRef<string>('')

  // Helper to add an activity item
 const addActivity = useCallback((item: Omit<ActivityItem, 'id' | 'timestamp'>) => {
 setActivityItems(prev => [
 ...prev,
 { ...item, id: `${item.type}-${Date.now()}-${Math.random()}`, timestamp: Date.now() }
 ])
   // Auto-scroll activity feed
 setTimeout(() => {
 activityFeedRef.current?.scrollTo({
 top: activityFeedRef.current.scrollHeight,
 behavior: 'smooth'
 })
 }, 100)
 }, [])

  // Track status changes for activity feed
 useEffect(() => {
 if (!job?.status) return
 const status = job.status
 if (status === prevStatusRef.current) return
 prevStatusRef.current = status

 if (status === 'processing') {
 addActivity({ label: 'Generation started', type: 'status' })
 } else if (status === 'completed' || status === 'preview_completed') {
 addActivity({ label: 'Generation complete', type: 'status' })
 }
 }, [job?.status, addActivity])

  // Handle cover image from stream
 useEffect(() => {
    // Get cover image URL safely
 const bookCoverImage = book
 ? (book as Record<string, unknown>)['cover_image'] as string | undefined
 : undefined

 if (bookCoverImage && typeof bookCoverImage === 'string' && bookCoverImage !== coverImage) {
 setCoverImage(bookCoverImage)
 setNewItemIds(prev => new Set([...prev, 'cover-0']))
 preloadImage(bookCoverImage)
 addActivity({ label: 'Cover generated', type: 'cover' })
      // Clear "NEW" badge after 3 seconds
 setTimeout(() => {
 setNewItemIds(prev => {
 const updated = new Set(prev)
 updated.delete('cover-0')
 return updated
 })
 }, 3000)
 }
 // Track back cover image from book object
 const bookBackCover = book
   ? (book as Record<string, unknown>)['back_cover_image'] as string | undefined
   : undefined
 if (bookBackCover && typeof bookBackCover === 'string' && bookBackCover !== backCoverImage) {
   setBackCoverImage(bookBackCover)
   preloadImage(bookBackCover)
 }
 }, [book, coverImage, backCoverImage, preloadImage, addActivity])

  // Handle picture book images from stream
 useEffect(() => {
 if (bookType !== 'picture' || !book?.images) return

 const newImages = Array.isArray(book.images) ? book.images : []

    // Detect new images
 const newIndices = new Set<string>()
 newImages.forEach((img: string, idx: number) => {
 if (img && (!prevImagesRef.current[idx] || prevImagesRef.current[idx] !== img)) {
 newIndices.add(`image-${idx}`)
 preloadImage(img)
 }
 })

 if (newIndices.size > 0) {
 const totalImages = (job?.metadata?.totalImages as number) || newImages.length
 const completedCount = newImages.filter((img: string) => img && img.length > 0).length
 // Find the latest new image URL for thumbnail in activity feed
 const latestNewIdx = Array.from(newIndices)
 .map(id => parseInt(id.replace('image-', '')))
 .filter(i => !isNaN(i))
 .sort((a, b) => b - a)[0]
 const latestNewImageUrl = latestNewIdx !== undefined ? newImages[latestNewIdx] : undefined

 // Try to find the page text from pictureBookConfig for this image
 let pageText: string | undefined
 let currentPageNum: number | undefined
 let totalPagesNum: number | undefined
 try {
 const chapJson = (book as Record<string, unknown>)?.chapters_json as string | undefined
 if (chapJson && latestNewIdx !== undefined) {
 const parsed = typeof chapJson === 'string' ? JSON.parse(chapJson) : chapJson
 const pages = parsed?.pictureBookConfig?.pages
 // latestNewIdx is a flat image-slot index; convert to page index
 const imagesPerPage: number = parsed?.pictureBookConfig?.imagesPerPage || parsed?.imagesPerPage || 1
 const pageIndex = Math.floor(latestNewIdx / imagesPerPage)
 if (Array.isArray(pages)) {
 totalPagesNum = pages.length
 currentPageNum = Math.min(pageIndex + 1, pages.length)
 if (pages[pageIndex]) {
 pageText = pages[pageIndex]?.text
 }
 }
 }
 } catch { /* ignore parse errors */ }

 const counterLabel = (currentPageNum && totalPagesNum)
 ? `Seite ${currentPageNum}/${totalPagesNum}`
 : `Bild ${completedCount}/${totalImages}`

 addActivity({
 label: pageText
 ? `✨ ${counterLabel}: ${pageText.substring(0, 80)}${pageText.length > 80 ? '…' : ''}`
 : `${counterLabel} generiert`,
 type: 'image',
 imageUrl: latestNewImageUrl,
 })

 setNewItemIds(prev => new Set([...prev, ...newIndices]))
      // Clear "NEW" badges after 3 seconds
 setTimeout(() => {
 setNewItemIds(prev => {
 const updated = new Set(prev)
 newIndices.forEach(id => updated.delete(id))
 return updated
 })
 }, 3000)
 }

 prevImagesRef.current = newImages
 setImages(newImages)
 }, [book?.images, bookType, preloadImage, addActivity, job?.metadata?.totalImages])

  // Handle text book chapters from streaming metadata
 useEffect(() => {
 if (bookType === 'picture' || !job?.metadata) return

 const metadata = job.metadata as Record<string, unknown>

    // Handle textChunk - use _deliveredAt as unique identifier
 if (metadata.textChunk) {
 const chunk = metadata.textChunk as TextChunk
 const chunkId = `${chunk.chapterNumber}-${chunk._deliveredAt || ''}`

 if (chunkId !== lastTextChunkRef.current) {
 lastTextChunkRef.current = chunkId
 handleTextChunk(chunk)
 }
 }

    // Handle chapterComplete - marks chapter as done
 if (metadata.chapterComplete) {
 const complete = metadata.chapterComplete as ChapterComplete
 if (complete.number !== lastChapterCompleteRef.current) {
 lastChapterCompleteRef.current = complete.number
 handleChapterComplete(complete)
 }
 }
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [job?.metadata, bookType])

  // Handle text chunks for chapters
 const handleTextChunk = useCallback((chunk: TextChunk) => {
 const chunkId = `${chunk.chapterNumber}-${chunk._deliveredAt || Date.now()}-${chunk.text?.substring(0, 30)}`
 if (processedChunksRef.current.has(chunkId)) return
 processedChunksRef.current.add(chunkId)

    // Limit processed chunks set size
 if (processedChunksRef.current.size > 100) {
 processedChunksRef.current = new Set(Array.from(processedChunksRef.current).slice(-100))
 }

 setChapters(prev => {
 const existingIndex = prev.findIndex(ch => ch.number === chunk.chapterNumber)

 if (existingIndex >= 0) {
        // Update existing chapter
 const updated = [...prev]
 const existingChapter = updated[existingIndex]

        // Append new text if this is more content for the same chapter
 const newContent = chunk.text
 ? (existingChapter.content ? existingChapter.content + '\n\n' + chunk.text : chunk.text)
 : existingChapter.content

 updated[existingIndex] = {
 ...existingChapter,
 content: newContent,
 wordCount: newContent.split(/\s+/).filter(Boolean).length,
 isComplete: chunk.isComplete,
 isStreaming: !chunk.isComplete
 }
 return updated
 } else {
        // Add new chapter
 const newChapter: LocalChapter = {
 number: chunk.chapterNumber,
 title: chunk.chapterTitle,
 subtitle: chunk.chapterSubtitle,
 content: chunk.text || '',
 wordCount: chunk.wordCount || 0,
 isComplete: chunk.isComplete,
 isStreaming: !chunk.isComplete
 }

        // Mark as new
 setNewItemIds(prev => new Set([...prev, `chapter-${chunk.chapterNumber - 1}`]))
 setTimeout(() => {
 setNewItemIds(prev => {
 const updated = new Set(prev)
 updated.delete(`chapter-${chunk.chapterNumber - 1}`)
 return updated
 })
 }, 3000)

 return [...prev, newChapter].sort((a, b) => a.number - b.number)
 }
 })
 }, [])

  // Handle chapter completion
 const handleChapterComplete = useCallback((complete: ChapterComplete) => {
 setChapters(prev => {
 const updated = [...prev]
 const index = updated.findIndex(ch => ch.number === complete.number)

 if (index >= 0) {
 updated[index] = {
 ...updated[index],
 isComplete: true,
 isStreaming: false,
 wordCount: complete.wordCount || updated[index].wordCount
 }
 }
 return updated
 })

 addActivity({
 label: `Chapter ${complete.number}: ${complete.title} complete`,
 type: 'chapter'
 })

 // Fix 6: Show chapter milestone toast
 if (chapterToastTimeoutRef.current) {
 clearTimeout(chapterToastTimeoutRef.current)
 }
 setChapterToast({ number: complete.number, title: complete.title })
 chapterToastTimeoutRef.current = setTimeout(() => {
 setChapterToast(null)
 }, 2500)
 }, [addActivity])

  // Determine effective book type
 const effectiveBookType = bookType

  // Calculate progress
 const progress = job?.progress || 0
 const currentStep = job?.currentStep || undefined
 const etaText = eta?.displayText

  // Handle celebration complete
 const handleCelebrationComplete = useCallback(() => {
 setShowCelebration(false)
 setTimeout(() => {
 onComplete?.()
 router.push(`/dashboard/books/${bookId}`)
 }, 500)
 }, [onComplete, router, bookId])

  // Handle retry
 const handleRetry = useCallback(async () => {
 reconnect()
 }, [reconnect])

  // Determine if complete
 const isComplete = job?.status === 'completed' || job?.status === 'preview_completed'
 const isFailed = job?.status === 'failed' || job?.status === 'cancelled'
 const isGenerating = job?.status === 'processing' || job?.status === 'pending'

  // Completed activity items (for display)
 // Extract page texts from chapters_json for picture books
 const pageTexts = useMemo<string[]>(() => {
   try {
     const chapJson = (book as Record<string, unknown>)?.chapters_json as string | undefined
     if (!chapJson) return []
     const parsed = typeof chapJson === 'string' ? JSON.parse(chapJson) : chapJson
     const pages = parsed?.pictureBookConfig?.pages
     if (!Array.isArray(pages)) return []
     const imagesPerPage: number = parsed?.pictureBookConfig?.imagesPerPage || parsed?.imagesPerPage || 1
     const texts: string[] = []
     for (const page of pages) {
       for (let i = 0; i < imagesPerPage; i++) {
         texts.push(page.text || '')
       }
     }
     return texts
   } catch { return [] }
 }, [book])

 const completedActivityItems = useMemo(() => {
 return activityItems.filter(item => item.type !== 'status' || item.label === 'Generation complete')
 }, [activityItems])

 return (
 <div className="fixed inset-0 z-50 overflow-hidden">
 {/* Animated Background */}
 <AnimatedBackground intensity={isComplete ? 'subtle' : 'medium'} />

 {/* Header */}
 <motion.header
 variants={headerVariants}
 initial="hidden"
 animate="visible"
 className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
 >
 <div className="max-w-5xl mx-auto flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm">
 <BookOpen className="w-5 h-5 text-white" />
 </div>
 <div>
 <h1 className="text-lg font-semibold text-white">
 {bookTitle || book?.title || t('generating')}
 </h1>
 <p className="text-xs text-white/60">
 {bookType === 'picture' ? t('pictureBook') : t('textBook')}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 {/* Connection status indicator — green dot only */}
 {isGenerating && (
 <div className="flex items-center gap-1.5 px-2 py-1">
 <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
 </div>
 )}

 {/* Retry button (if failed) */}
 {isFailed && (
 <Button
 variant="outline"
 size="sm"
 onClick={handleRetry}
 className="bg-white/10 border-white/20 text-white hover:bg-white/20"
 >
 <RefreshCw className="w-4 h-4 mr-2" />
 {t('retryGeneration')}
 </Button>
 )}

 {/* Close button */}
 {onClose && (
 <Button
 variant="ghost"
 size="icon"
 onClick={onClose}
 className="text-white/60 hover:text-white hover:bg-white/10"
 >
 <X className="w-5 h-5" />
 </Button>
 )}
 </div>
 </div>
 </motion.header>

 {/* Main Content Area */}
 <div className="absolute inset-0 overflow-y-auto pt-24 pb-8 px-4 sm:px-6">
 <div className="flex flex-col lg:flex-row lg:items-start lg:gap-12 max-w-5xl mx-auto w-full py-8">

 {/* Zone 1: 3D Book Hero */}
 <div className="flex-shrink-0 w-full max-w-full lg:w-[640px] flex flex-col items-center lg:sticky lg:top-8 py-8 gap-3">
 <LiveBook3D
 coverImage={coverImage}
 backCoverImage={backCoverImage}
 isGenerating={isGenerating}
 progress={progress}
 currentStep={currentStep}
 chapters={chapters}
 images={images.map((url, idx) => ({ url, imageIndex: idx, pageText: pageTexts[idx] || undefined }))}
 bookType={effectiveBookType}
 title={bookTitle || 'Untitled'}
 author={bookAuthor || (book as Record<string, unknown>)?.author as string | undefined}
 />
 {/* Image Strip — picture books only */}
 {bookType === 'picture' && images.length > 0 && (
 <ImageStrip
 images={images.map((url, idx) => ({ url, imageIndex: idx }))}
 onImageClick={(idx) => {
 setSelectedImageIdx(idx)
 setIsLightboxOpen(true)
 }}
 newImageIndices={newItemIds}
 />
 )}
 </div>

 {/* Zone 2: Activity Feed + Progress */}
 <div className="flex-1 min-w-0 space-y-6">

 {/* Progress bar */}
 {!isComplete && !isFailed && (
 <div>
 <div className="flex justify-between text-xs text-white/60 mb-1.5">
 <span>{currentStep || 'Starting...'}</span>
 <div className="flex items-center gap-2">
 {etaText && etaText !== '-' && (
 <span className="text-white/40">{etaText}</span>
 )}
 <span>{progress}%</span>
 </div>
 </div>
 <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
 <motion.div
 className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
 initial={{ width: 0 }}
 animate={{ width: `${progress}%` }}
 transition={{ duration: 0.5 }}
 />
 </div>

 {/* Fix 2: Stuck detector banner */}
 <AnimatePresence>
 {isStuck && (
 <motion.div
 initial={{ opacity: 0, y: -4 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -4 }}
 transition={{ duration: 0.3 }}
 className="mt-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-4"
 >
 <p className="text-xs text-amber-300/80 flex-1">
 Generation is taking longer than expected. You can wait or try reconnecting.
 </p>
 <button
 onClick={reconnect}
 className="flex-shrink-0 text-xs text-amber-300 hover:text-amber-100 underline underline-offset-2 transition-colors"
 >
 Reconnect
 </button>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 )}

 {/* Activity items */}
 <div ref={activityFeedRef} className="space-y-2 max-h-[50vh] overflow-y-auto">
 <AnimatePresence mode="popLayout">
 {/* Current step indicator */}
 {isGenerating && currentStep && (
 <motion.div
 key="current-step"
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 className="flex items-center gap-3 px-4 py-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10"
 >
 <div className="w-8 h-8 rounded-full bg-bookcraft-blue/10 flex items-center justify-center flex-shrink-0">
 <Loader2 className="w-4 h-4 text-bookcraft-blue animate-spin" />
 </div>
 <div>
 <p className="text-sm font-medium text-white">{currentStep}</p>
 <p className="text-xs text-white/40">{progress}% complete</p>
 </div>
 </motion.div>
 )}

 {/* Completed items - reverse chronological, max 5 visible */}
 {completedActivityItems.slice(-5).reverse().map(item => (
 <motion.div
 key={item.id}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 transition={{ duration: 0.3 }}
 className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.03]"
 >
 {/* Icon or thumbnail */}
 {item.imageUrl ? (
 <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 ring-1 ring-green-400/40">
 <SafeImage
 src={item.imageUrl}
 alt=""
 width={32}
 height={32}
 className="w-full h-full object-cover"
 />
 </div>
 ) : item.type === 'cover' ? (
 <div className="w-8 h-8 rounded flex-shrink-0 bg-amber-500/20 flex items-center justify-center ring-1 ring-amber-400/40">
 <ImageIcon className="w-4 h-4 text-amber-400" />
 </div>
 ) : (
 <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
 )}
 <p className="text-sm text-white/60">{item.label}</p>
 </motion.div>
 ))}
 </AnimatePresence>

 {/* Empty state */}
 {activityItems.length === 0 && isGenerating && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="text-center py-8"
 >
 <Loader2 className="w-8 h-8 text-bookcraft-blue animate-spin mx-auto mb-3" />
 <p className="text-sm text-white/60">
 Waiting for generation to begin...
 </p>
 </motion.div>
 )}
 </div>



 {/* Complete state with CTA */}
 {isComplete && (
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.5 }}
 className="text-center py-8"
 >
 <Button
 size="lg"
 onClick={() => router.push(`/dashboard/books/${bookId}`)}
 className="bg-gradient-to-r from-bookcraft-blue to-bookcraft-blue hover:brightness-110 text-white shadow-xl shadow-bookcraft-blue/30"
 >
 {t('goToBookEditor')}
 <ArrowRight className="w-5 h-5 ml-2" />
 </Button>
 </motion.div>
 )}
 </div>
 </div>
 </div>

 {/* Celebration Overlay */}
 <CelebrationOverlay
 isVisible={showCelebration}
 onAnimationComplete={handleCelebrationComplete}
 />

 {/* Fix 6: Chapter milestone toast */}
 <AnimatePresence>
 {chapterToast && (
 <motion.div
 key={`toast-chapter-${chapterToast.number}`}
 initial={{ opacity: 0, y: 20, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 10, scale: 0.95 }}
 transition={{ duration: 0.25, ease: 'easeOut' }}
 className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] pointer-events-none"
 >
 <div className="px-5 py-3 rounded-xl bg-white/10 backdrop-blur-xl border border-white/15 shadow-xl">
 <p className="text-sm font-medium text-white whitespace-nowrap">
 Chapter {chapterToast.number} complete
 </p>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Error state */}
 {isFailed && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="fixed bottom-0 left-0 right-0 p-6 bg-red-500/20 backdrop-blur-xl border-t border-red-500/30 z-[120]"
 >
 <div className="max-w-5xl mx-auto flex items-center justify-between">
 <div>
 <h3 className="text-white font-medium">{t('jobFailed')}</h3>
 <p className="text-white/60 text-sm">
 {job?.errorMessage || t('unknownError')}
 </p>
 </div>
 <div className="flex gap-2">
 <Button
 variant="outline"
 onClick={handleRetry}
 className="bg-white/10 border-white/20 text-white"
 >
 <RefreshCw className="w-4 h-4 mr-2" />
 {t('retryGeneration')}
 </Button>
 <Button
 onClick={() => router.push('/dashboard')}
 variant="outline"
 >
 {t('backToDashboard')}
 </Button>
 </div>
 </div>
 </motion.div>
 )}

 {/* Image Lightbox */}
 {isLightboxOpen && images.length > 0 && (
 <ImageLightbox
 isOpen={isLightboxOpen}
 onClose={() => setIsLightboxOpen(false)}
 imageUrl={images[selectedImageIdx] || ''}
 imageIndex={selectedImageIdx}
 totalImages={images.length}
 onPrev={images.length > 1 ? () => setSelectedImageIdx(i => (i - 1 + images.length) % images.length) : undefined}
 onNext={images.length > 1 ? () => setSelectedImageIdx(i => (i + 1) % images.length) : undefined}
 />
 )}
 </div>
 )
}
