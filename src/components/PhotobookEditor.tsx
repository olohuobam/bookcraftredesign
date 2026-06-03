'use client'

import { useState, useEffect, useRef, useCallback, TouchEvent as ReactTouchEvent } from 'react'
import NextImage from 'next/image'
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, PanInfo } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
 ChevronLeft,
 ChevronRight,
 Trash2,
 Edit3,
 ZoomIn,
 Save,
 BookOpen,
 Calendar,
 MapPin,
 Users,
 X,
 Check,
 Lock,
 Pencil,
 MoreVertical,
 Wand2,
 Share2,
 Download,
 ImageIcon,
 Plus,
 Crop,
 ArrowLeftRight
} from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'
import { useHaptics } from '@/hooks/useHaptics'
import { formatPrice, getBookPrice } from '@/lib/pricing'
import BookPurchaseSheet from '@/components/BookPurchaseSheet'
import { PHOTO_ERA_LABEL_KEYS, PHOTOBOOK_TRANSFORM_STYLES, type PhotoEra, type PhotoTransformStyle, type CropData } from '@/types/photobook'
import { Progress } from '@/components/ui/progress'
import { MediaLibrarySelector } from '@/components/MediaLibrarySelector'
import CoverGeneratorButton from '@/components/CoverGeneratorButton'
import { useToast } from '@/components/ui/toast'

interface PhotoAnalysis {
 estimatedEra?: PhotoEra
 estimatedYear?: number
 description?: string
 categories?: string[]
 mood?: string
 setting?: string
 peopleCount?: number
}

interface PhotobookPhoto {
 id: string
 url: string
 caption?: string
 analysis?: PhotoAnalysis
 originalFilename?: string
 cropData?: CropData
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
}

interface PhotobookEditorProps {
 bookId: string
 bookTitle: string
 chaptersJson: PhotobookData
 coverImage?: string | null
 purchased?: boolean
 onSave?: () => void
 onCoverChange?: (url: string) => void
}

// Floating particles component for magical effect
function FloatingParticles() {
 const [particles] = useState(() =>
 Array.from({ length: 20 }, () => ({
 x: Math.random() * 400,
 y: Math.random() * 800,
 scale: Math.random() * 0.5 + 0.5,
 duration: Math.random() * 10 + 10,
 delay: Math.random() * 5,
 }))
 )
 return (
 <div className="absolute inset-0 overflow-hidden pointer-events-none">
 {particles.map((p, i) => (
 <motion.div
 key={i}
 className="absolute w-1 h-1 bg-amber-400/30 rounded-full"
 initial={{
 x: p.x,
 y: p.y,
 scale: p.scale,
 }}
 animate={{
 y: [null, -100],
 opacity: [0, 1, 0],
 }}
 transition={{
 duration: p.duration,
 repeat: Infinity,
 delay: p.delay,
 }}
 />
 ))}
 </div>
 )
}

// Premium loading shimmer
function LoadingShimmer() {
 return (
 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
 )
}

export default function PhotobookEditor({
 bookId,
 bookTitle,
 chaptersJson,
 coverImage,
 purchased = false,
 onSave,
 onCoverChange
}: PhotobookEditorProps) {
 const { t } = useLanguage()
 const { getIdToken } = useAuth()
 const { impact, notification, selectionChanged } = useHaptics()

 const photobookConfig = chaptersJson.photobookConfig

 const [pages, setPages] = useState<PhotobookPage[]>(chaptersJson.pages || [])
 const [currentPage, setCurrentPage] = useState(-1)
 const [selectedPhoto, setSelectedPhoto] = useState<PhotobookPhoto | null>(null)
 const [editingCaption, setEditingCaption] = useState<{ pageIndex: number; photoIndex: number } | null>(null)
 const [captionText, setCaptionText] = useState('')
 const [isSaving, setIsSaving] = useState(false)
 const [hasChanges, setHasChanges] = useState(false)
 const [isEditMode, setIsEditMode] = useState(false)
 const [showEditSheet, setShowEditSheet] = useState<{ pageIndex: number; photoIndex: number } | null>(null)
 const [isFlipping, setIsFlipping] = useState(false)
 const [flipDirection, setFlipDirection] = useState<'next' | 'prev'>('next')

  // Transform single photo state
 const [showStylePicker, setShowStylePicker] = useState<{ pageIndex: number; photoIndex: number } | null>(null)
 const [isTransforming, setIsTransforming] = useState(false)
 const [transformProgress, setTransformProgress] = useState(0)

  // Feature 1: Add photos
 const [showMediaLibrary, setShowMediaLibrary] = useState(false)

  // Feature 3: Inline title editing
 const [isEditingTitle, setIsEditingTitle] = useState(false)
 const [editTitle, setEditTitle] = useState(bookTitle)
 const [editSubtitle, setEditSubtitle] = useState(photobookConfig?.subtitle || '')
 const [displayTitle, setDisplayTitle] = useState(bookTitle)
 const [displaySubtitle, setDisplaySubtitle] = useState(photobookConfig?.subtitle || '')

  // Feature 6: Crop
 const [showCropSheet, setShowCropSheet] = useState<{ pageIndex: number; photoIndex: number } | null>(null)
 const [cropRect, setCropRect] = useState<CropData>({ x: 10, y: 10, width: 80, height: 80 })

 const { showToast } = useToast()

 const containerRef = useRef<HTMLDivElement>(null)
 const dragX = useMotionValue(0)
 const dragProgress = useTransform(dragX, [-200, 0, 200], [-1, 0, 1])

 const theme = photobookConfig?.theme || 'classic'
 const totalPhotos = pages.reduce((sum, page) => sum + page.photos.length, 0)
 const totalPages = pages.length

  // Theme configurations with premium colors
 const themes = {
 vintage: {
 bg: 'from-amber-900 via-orange-900 to-amber-950',
 pageBg: 'bg-gradient-to-br from-amber-50 to-orange-50',
 accent: 'text-amber-700',
 glow: 'shadow-amber-500/20'
 },
 modern: {
 bg: 'from-slate-900 via-gray-900 to-zinc-950',
 pageBg: 'bg-gradient-to-br from-gray-50 to-slate-100',
 accent: 'text-slate-700',
 glow: 'shadow-slate-500/20'
 },
 elegant: {
 bg: 'from-stone-900 via-neutral-900 to-stone-950',
 pageBg: 'bg-gradient-to-br from-stone-50 to-neutral-100',
 accent: 'text-stone-700',
 glow: 'shadow-stone-500/20'
 },
 classic: {
 bg: 'from-amber-950 via-yellow-950 to-orange-950',
 pageBg: 'bg-gradient-to-br from-[#FDF8F3] to-[#F5EDE4]',
 accent: 'text-amber-800',
 glow: 'shadow-amber-400/30'
 }
 }

 const currentTheme = themes[theme as keyof typeof themes] || themes.classic

  // Page navigation with haptics and animation
 const goToPage = useCallback((targetPage: number) => {
 if (targetPage < -1 || targetPage >= totalPages || isFlipping) return

 selectionChanged()
 setFlipDirection(targetPage > currentPage ? 'next' : 'prev')
 setIsFlipping(true)

 setTimeout(() => {
 setCurrentPage(targetPage)
 setIsFlipping(false)
 }, 300)
 }, [currentPage, totalPages, isFlipping, selectionChanged])

  // Drag gesture handling
 const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
 const threshold = 60
 const velocity = info.velocity.x

 if (info.offset.x < -threshold || velocity < -300) {
 if (currentPage < totalPages - 1) {
 goToPage(currentPage + 1)
 impact('light')
 }
 } else if (info.offset.x > threshold || velocity > 300) {
 if (currentPage > -1) {
 goToPage(currentPage - 1)
 impact('light')
 }
 }
 }, [currentPage, totalPages, goToPage, impact])

  // Edit functions with haptics
 const handleDeletePhoto = useCallback((pageIndex: number, photoIndex: number) => {
 impact('medium')
 const newPages = [...pages]
 newPages[pageIndex].photos.splice(photoIndex, 1)

 const filteredPages = newPages.filter(page => page.photos.length > 0)
 filteredPages.forEach((page, idx) => {
 page.pageNumber = idx + 1
 })

 setPages(filteredPages)
 setHasChanges(true)
 setShowEditSheet(null)

 if (currentPage >= filteredPages.length) {
 setCurrentPage(Math.max(-1, filteredPages.length - 1))
 }
 }, [pages, currentPage, impact])

 const startEditCaption = useCallback((pageIndex: number, photoIndex: number) => {
 selectionChanged()
 const photo = pages[pageIndex].photos[photoIndex]
 setCaptionText(photo.caption || '')
 setEditingCaption({ pageIndex, photoIndex })
 setShowEditSheet(null)
 }, [pages, selectionChanged])

 const saveCaption = useCallback(() => {
 if (!editingCaption) return
 impact('light')
 const newPages = [...pages]
 newPages[editingCaption.pageIndex].photos[editingCaption.photoIndex].caption = captionText
 setPages(newPages)
 setHasChanges(true)
 setEditingCaption(null)
 setCaptionText('')
 }, [editingCaption, pages, captionText, impact])

 const movePhoto = useCallback((pageIndex: number, photoIndex: number, direction: 'prev' | 'next') => {
 selectionChanged()
 const allPhotos: PhotobookPhoto[] = []
 pages.forEach(page => page.photos.forEach(photo => allPhotos.push(photo)))

 const flatIndex = pages.slice(0, pageIndex).reduce((sum, p) => sum + p.photos.length, 0) + photoIndex
 const targetIndex = direction === 'prev' ? flatIndex - 1 : flatIndex + 1

 if (targetIndex < 0 || targetIndex >= allPhotos.length) return

 const temp = allPhotos[flatIndex]
 allPhotos[flatIndex] = allPhotos[targetIndex]
 allPhotos[targetIndex] = temp

 const photosPerPage = photobookConfig?.photosPerPage || 2
 const newPages: PhotobookPage[] = []
 for (let i = 0; i < allPhotos.length; i += photosPerPage) {
 newPages.push({
 id: `page-${Math.floor(i / photosPerPage) + 1}`,
 pageNumber: Math.floor(i / photosPerPage) + 1,
 layout: photosPerPage === 1 ? 'single' : 'double',
 photos: allPhotos.slice(i, i + photosPerPage)
 })
 }

 setPages(newPages)
 setHasChanges(true)
 setShowEditSheet(null)
 }, [pages, photobookConfig, selectionChanged])

  // Transform a single photo with AI style
 const handleTransformPhoto = useCallback(async (pageIndex: number, photoIndex: number, style: PhotoTransformStyle) => {
 if (style === 'original') {
 setShowStylePicker(null)
 return
 }

 setIsTransforming(true)
 setTransformProgress(10)

 try {
 const token = await getIdToken()
 if (!token) throw new Error('No auth token')

 const photo = pages[pageIndex].photos[photoIndex]
 setTransformProgress(30)

 const response = await fetch('/api/photobook/transform', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({
 imageUrl: photo.url,
 style,
 photoId: photo.id
 })
 })

 setTransformProgress(80)

 if (!response.ok) {
 throw new Error('Transform failed')
 }

 const data = await response.json()
 setTransformProgress(100)

      // Update the photo with the transformed URL
 const newPages = [...pages]
 newPages[pageIndex].photos[photoIndex] = {
 ...photo,
 url: data.transformedUrl,
 originalUrl: photo.url // Keep original for potential undo
 } as PhotobookPhoto

 setPages(newPages)
 setHasChanges(true)
 notification('success')
 impact('medium')
 } catch (error) {
      console.error('Transform error:', error)
 notification('error')
 } finally {
 setIsTransforming(false)
 setTransformProgress(0)
 setShowStylePicker(null)
 }
 }, [pages, getIdToken, notification, impact])

 // Set a photo as the cover image
 const handleSetAsCover = useCallback(async (pageIndex: number, photoIndex: number) => {
  const photo = pages[pageIndex].photos[photoIndex]
  impact('medium')
  
  // Update via API
  try {
   const token = await getIdToken()
   if (!token) throw new Error('No auth token')

   const response = await fetch(`/api/books/${bookId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ coverImage: photo.url }),
   })

   if (!response.ok) {
    throw new Error('Failed to update cover image')
   }

   onCoverChange?.(photo.url)
   notification('success')
  } catch {
   notification('error')
  }
  setShowEditSheet(null)
 }, [pages, bookId, getIdToken, impact, notification, onCoverChange])

  // Save with success feedback
 const handleSave = async (pagesToSave: PhotobookPage[] = pages) => {
 setIsSaving(true)
 try {
 const token = await getIdToken()
 if (!token) throw new Error('No auth token')

 const response = await fetch(`/api/books/${bookId}`, {
 method: 'PATCH',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({
 chapters_json: JSON.stringify({
 ...chaptersJson,
 pages: pagesToSave,
 totalPages: pagesToSave.length,
 totalPhotos: pagesToSave.reduce((sum, page) => sum + page.photos.length, 0)
 })
 })
 })

 if (!response.ok) throw new Error('Failed to save')
 notification('success')
 setHasChanges(false)
 onSave?.()
 } catch (error) {
 notification('error')
      console.error('Save error:', error)
 } finally {
 setIsSaving(false)
 }
 }

  // Feature 1: Add photos from media library
 const handleAddPhotos = useCallback((newPhotos: Array<{ id: string; url: string; originalFilename: string; analysis?: PhotoAnalysis }>) => {
 if (newPhotos.length === 0) return
 impact('medium')
 const photosPerPage = photobookConfig?.photosPerPage || 2
 const photobookPhotos: PhotobookPhoto[] = newPhotos.map(p => ({
 id: p.id,
 url: p.url,
 caption: '',
 analysis: p.analysis,
 originalFilename: p.originalFilename,
 }))

 let updatedPages: PhotobookPage[] = []

 setPages(prev => {
 const base = prev.length
 const newPages: PhotobookPage[] = []
 for (let i = 0; i < photobookPhotos.length; i += photosPerPage) {
 const pagePhotos = photobookPhotos.slice(i, i + photosPerPage)
 newPages.push({
 id: `page-${base + Math.floor(i / photosPerPage) + 1}`,
 pageNumber: base + Math.floor(i / photosPerPage) + 1,
 layout: photosPerPage === 1 ? 'single' : 'double',
 photos: pagePhotos,
 })
 }

 updatedPages = [...prev, ...newPages]
 updatedPages.forEach((page, idx) => { page.pageNumber = idx + 1 })
 return updatedPages
 })
 setHasChanges(true)
 setShowMediaLibrary(false)
 handleSave(updatedPages)
 }, [photobookConfig, impact, handleSave])

  // Feature 2: Move page left/right
 const movePage = useCallback((pageIndex: number, direction: 'left' | 'right') => {
 const targetIndex = direction === 'left' ? pageIndex - 1 : pageIndex + 1
 if (targetIndex < 0 || targetIndex >= pages.length) return
 selectionChanged()
 const newPages = [...pages]
 const temp = newPages[pageIndex]
 newPages[pageIndex] = newPages[targetIndex]
 newPages[targetIndex] = temp
 newPages.forEach((page, idx) => { page.pageNumber = idx + 1 })
 setPages(newPages)
 setCurrentPage(targetIndex)
 setHasChanges(true)
 }, [pages, selectionChanged])

  // Feature 3: Save title/subtitle
 const handleSaveTitle = useCallback(async () => {
 try {
 const token = await getIdToken()
 if (!token) throw new Error('No auth token')
 const response = await fetch(`/api/books/${bookId}`, {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
 body: JSON.stringify({ title: editTitle, subtitle: editSubtitle }),
 })
 if (!response.ok) throw new Error('Failed to update title')
 setDisplayTitle(editTitle)
 setDisplaySubtitle(editSubtitle)
 setIsEditingTitle(false)
 notification('success')
 showToast(t('photobookTitleUpdated') || 'Title updated', 'success')
 } catch {
 notification('error')
 showToast(t('photobookTitleUpdateError') || 'Failed to update title', 'error')
 }
 }, [editTitle, editSubtitle, bookId, getIdToken, notification, showToast, t])

  // Feature 6: Save crop data
 const handleSaveCrop = useCallback((pageIndex: number, photoIndex: number) => {
 impact('light')
 const newPages = [...pages]
 newPages[pageIndex].photos[photoIndex] = {
 ...newPages[pageIndex].photos[photoIndex],
 cropData: { ...cropRect },
 }
 setPages(newPages)
 setHasChanges(true)
 setShowCropSheet(null)
 showToast(t('photobookCropSaved') || 'Crop saved', 'success')
 }, [pages, cropRect, impact, showToast, t])

 const currentPageData = currentPage >= 0 ? pages[currentPage] : null

  // 3D Page flip variants
 const pageVariants = {
 enter: (direction: 'next' | 'prev') => ({
 rotateY: direction === 'next' ? 90 : -90,
 opacity: 0,
 scale: 0.9,
 }),
 center: {
 rotateY: 0,
 opacity: 1,
 scale: 1,
 },
 exit: (direction: 'next' | 'prev') => ({
 rotateY: direction === 'next' ? -90 : 90,
 opacity: 0,
 scale: 0.9,
 }),
 }

 return (
 <div className={`flex flex-col h-full bg-gradient-to-b ${currentTheme.bg} overflow-hidden`}>
 {/* Floating particles background */}
 <FloatingParticles />

 {/* Premium Glass Header */}
 <motion.div
 initial={{ y: -20, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 className="relative z-20 flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 bg-black/20 backdrop-blur-xl border-b border-white/10 safe-area-top"
 >
 <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
 <motion.div
 whileHover={{ rotate: 10 }}
 className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30 flex-shrink-0"
 >
 <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
 </motion.div>
 <div className="min-w-0">
 <button
 type="button"
 onClick={() => { setIsEditingTitle(true); setEditTitle(displayTitle); setEditSubtitle(displaySubtitle) }}
 className="flex items-center gap-1 group"
 >
 <h1 className="font-semibold text-white text-xs sm:text-sm truncate">{displayTitle}</h1>
 <Pencil className="h-3 w-3 text-white/40 group-hover:text-white/80 transition-colors flex-shrink-0" />
 </button>
 <p className="text-[10px] sm:text-xs text-white/60 truncate">{totalPhotos} Photos · {totalPages} Pages</p>
 </div>
 </div>

 <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
 {/* Feature 1: Add Photos */}
 {isEditMode && (
 <motion.button
 initial={{ opacity: 0, scale: 0.8 }}
 animate={{ opacity: 1, scale: 1 }}
 whileTap={{ scale: 0.95 }}
 onClick={() => setShowMediaLibrary(true)}
 aria-label={t('photobookAddPhotos') || 'Add Photos'}
 className="h-9 sm:h-10 px-3 rounded-xl bg-white/10 text-white hover:bg-white/20 font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-colors"
 >
 <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
 <span className="hidden sm:inline">{t('photobookAddPhotos') || 'Add Photos'}</span>
 </motion.button>
 )}

 {hasChanges && (
 <motion.div
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"
 />
 )}

 <AnimatePresence mode="wait">
 {hasChanges && (
 <motion.button
 initial={{ opacity: 0, scale: 0.8 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.8 }}
 onClick={() => handleSave()}
 disabled={isSaving}
 className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl bg-amber-500 text-white font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-amber-500/30 active:scale-95 transition-transform"
 >
 <Save className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isSaving ? 'animate-spin' : ''}`} />
 <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
 </motion.button>
 )}
 </AnimatePresence>

 <motion.button
 whileTap={{ scale: 0.95 }}
 onClick={() => {
 setIsEditMode(!isEditMode)
 impact('light')
 }}
 className={`h-9 sm:h-10 px-3 sm:px-4 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-all ${
 isEditMode
 ? 'bg-background dark:bg-gray-200 text-gray-900 shadow-lg'
 : 'bg-white/10 text-white hover:bg-white/20'
 }`}
 >
 <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
 <span className="hidden sm:inline">{isEditMode ? 'Done' : 'Edit'}</span>
 </motion.button>
 </div>
 </motion.div>

 {/* Main Content with 3D perspective */}
 <motion.div
 ref={containerRef}
 className="flex-1 relative overflow-hidden"
 style={{ perspective: 1500 }}
 >
 {/* Drag Area */}
 <motion.div
 drag="x"
 dragConstraints={{ left: 0, right: 0 }}
 dragElastic={0.1}
 onDragEnd={handleDragEnd}
 style={{ x: dragX }}
 className="absolute inset-0 flex items-center justify-center p-4 sm:p-8"
 >
 <AnimatePresence mode="wait" custom={flipDirection}>
 {currentPage === -1 ? (
              // Premium Cover Page
 <motion.div
 key="cover"
 custom={flipDirection}
 variants={pageVariants}
 initial="enter"
 animate="center"
 exit="exit"
 transition={{ type: 'spring', stiffness: 300, damping: 30 }}
 className="w-full max-w-md aspect-[3/4] relative"
 style={{ transformStyle: 'preserve-3d' }}
 >
 <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-700 via-amber-800 to-amber-950 shadow-2xl ${currentTheme.glow} overflow-hidden`}>
 {/* Premium texture overlay */}
 <div className="absolute inset-0 opacity-30" style={{
 backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
 }} />

 {/* Decorative frame */}
 <div className="absolute inset-4 sm:inset-6 border-2 border-amber-500/30 rounded-xl" />
 <div className="absolute inset-6 sm:inset-8 border border-amber-400/20 rounded-lg" />

 {/* Content */}
 <div className="relative h-full flex flex-col items-center justify-center p-6 sm:p-10 text-center">
 {coverImage ? (
 <motion.div
 initial={{ scale: 0.8, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 transition={{ delay: 0.2 }}
 className="relative mb-6"
 >
 <div className="absolute inset-0 bg-amber-400/30 blur-2xl rounded-full" />
 <NextImage
 src={coverImage!}
 alt="Cover"
 width={192}
 height={192}
 priority
 className="relative w-full max-w-[12rem] max-h-48 object-contain rounded-xl shadow-2xl ring-4 ring-amber-500/30"
 />
 </motion.div>
 ) : (
 <motion.div
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mb-6"
 >
 </motion.div>
 )}

 <motion.h1
 initial={{ y: 20, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 transition={{ delay: 0.3 }}
 className="text-2xl sm:text-4xl font-serif font-bold text-white mb-2 drop-shadow-lg"
 >
 {displayTitle}
 </motion.h1>

 {displaySubtitle && (
 <motion.p
 initial={{ y: 20, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 transition={{ delay: 0.4 }}
 className="text-amber-200/80 text-sm sm:text-lg mb-6"
 >
 {displaySubtitle}
 </motion.p>
 )}

 <motion.div
 initial={{ y: 20, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 transition={{ delay: 0.5 }}
 className="mt-auto flex flex-col items-center gap-2"
 >
 <div className="flex items-center gap-2 text-amber-300/70 text-sm">
 <span>{totalPhotos} Memories</span>
 <span>·</span>
 <span>{totalPages} Pages</span>
 </div>
 <motion.p
 animate={{ opacity: [0.5, 1, 0.5] }}
 transition={{ duration: 2, repeat: Infinity }}
 className="text-amber-400/50 text-xs flex items-center gap-2"
 >
 <ChevronLeft className="h-3 w-3" />
 Swipe to turn pages
 <ChevronRight className="h-3 w-3" />
 </motion.p>
 </motion.div>
 </div>

 {/* Shine effect */}
 <motion.div
 className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent"
 animate={{ opacity: [0.3, 0.5, 0.3] }}
 transition={{ duration: 3, repeat: Infinity }}
 />
 </div>
 </motion.div>
 ) : currentPageData ? (
              // Photo Page with 3D flip
 <motion.div
 key={`page-${currentPage}`}
 custom={flipDirection}
 variants={pageVariants}
 initial="enter"
 animate="center"
 exit="exit"
 transition={{ type: 'spring', stiffness: 300, damping: 30 }}
 className="w-full max-w-md aspect-[3/4] relative"
 style={{ transformStyle: 'preserve-3d' }}
 >
 <div className={`absolute inset-0 ${currentTheme.pageBg} rounded-2xl shadow-2xl ${currentTheme.glow} overflow-hidden`}>
 {/* Page texture */}
 <div className="absolute inset-0 opacity-50" style={{
 backgroundImage: 'radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.02) 100%)'
 }} />

 {/* Content */}
 <div className="relative h-full p-4 sm:p-6 flex flex-col">
 {/* Page number */}
 <div className={`text-xs ${currentTheme.accent} mb-3 font-serif flex items-center justify-between`}>
 <span>Page {currentPageData.pageNumber}</span>
 {isEditMode && (
 <Badge variant="secondary" className="text-[10px]">Editing active</Badge>
 )}
 </div>

 {/* Photos grid */}
 <div className={`flex-1 grid gap-3 ${
 currentPageData.photos.length === 1 ? 'grid-cols-1' :
 currentPageData.photos.length === 2 ? 'grid-cols-1 grid-rows-2' :
 'grid-cols-2 grid-rows-2'
 }`}>
 {currentPageData.photos.map((photo, photoIdx) => (
 <motion.div
 key={photo.id}
 layoutId={`photo-${photo.id}`}
 whileHover={{ scale: isEditMode ? 1 : 1.02 }}
 whileTap={{ scale: 0.98 }}
 onClick={() => {
 if (isEditMode) {
 setShowEditSheet({ pageIndex: currentPage, photoIndex: photoIdx })
 selectionChanged()
 } else {
 setSelectedPhoto(photo)
 impact('light')
 }
 }}
 className="relative rounded-xl overflow-hidden shadow-lg bg-card cursor-pointer group"
 >
 <NextImage
 src={photo.url}
 alt={photo.caption || 'Photo'}
 fill
 sizes="(max-width: 768px) 50vw, 25vw"
 className="object-cover"
 style={photo.cropData ? (() => {
 const cropWidth = Math.max(photo.cropData.width, 1)
 const cropHeight = Math.max(photo.cropData.height, 1)
 const cropCenterX = photo.cropData.x + cropWidth / 2
 const cropCenterY = photo.cropData.y + cropHeight / 2
 const cropScale = Math.max(100 / cropWidth, 100 / cropHeight)

 return {
 objectPosition: `${cropCenterX}% ${cropCenterY}%`,
 objectFit: 'cover' as const,
 transform: `scale(${cropScale})`,
 transformOrigin: 'center',
 }
 })() : undefined}
 />

 {/* Gradient overlay for caption */}
 {photo.caption && !isEditMode && (
 <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8">
  <div className="flex items-center gap-1.5">
   <p className="text-white text-xs sm:text-sm font-serif italic line-clamp-2 flex-1">
    {photo.caption}
   </p>
   <button
    type="button"
    aria-label={t('photobookCaption') || 'Edit caption'}
    onClick={(e) => { e.stopPropagation(); startEditCaption(currentPage, photoIdx) }}
    className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition-colors"
   >
    <Pencil className="w-3 h-3 text-white" />
   </button>
  </div>
 </div>
 )}

 {/* Era badge */}
 {photo.analysis?.estimatedEra && photo.analysis.estimatedEra !== 'unknown' && !isEditMode && (
 <motion.div
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 className="absolute top-2 left-2"
 >
 <Badge className="bg-black/60 backdrop-blur-sm text-white text-[10px] border-0">
 <Calendar className="h-3 w-3 mr-1" />
 {photo.analysis.estimatedYear || t(PHOTO_ERA_LABEL_KEYS[photo.analysis.estimatedEra] as never)}
 </Badge>
 </motion.div>
 )}

 {/* Edit mode overlay */}
 {isEditMode && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center"
 >
 <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-xl">
 <MoreVertical className="h-6 w-6 text-gray-700" />
 </div>
 </motion.div>
 )}

 {/* Hover zoom indicator */}
 {!isEditMode && (
 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
 <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
 <ZoomIn className="h-5 w-5 text-gray-700" />
 </div>
 </div>
 )}
 </motion.div>
 ))}
 </div>
 </div>

 {/* Page fold effect */}
 <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-black/10 to-transparent rounded-tl-3xl" />
 </div>
 </motion.div>
 ) : (
              // End page
 <motion.div
 key="end"
 custom={flipDirection}
 variants={pageVariants}
 initial="enter"
 animate="center"
 exit="exit"
 className="w-full max-w-md aspect-[3/4]"
 >
 <div className={`h-full ${currentTheme.pageBg} rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8`}>
 <motion.div
 animate={{ scale: [1, 1.1, 1] }}
 transition={{ duration: 2, repeat: Infinity }}
 >
 <BookOpen className={`h-20 w-20 ${currentTheme.accent} opacity-30`} />
 </motion.div>
 <p className={`text-xl font-serif ${currentTheme.accent} opacity-60 mt-4`}>
 End of photobook
 </p>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </motion.div>

 {/* Navigation buttons */}
 <motion.button
 initial={{ opacity: 0, x: -20 }}
 animate={{ opacity: currentPage > -1 ? 1 : 0, x: 0 }}
 whileHover={{ scale: 1.1 }}
 whileTap={{ scale: 0.9 }}
 onClick={() => goToPage(currentPage - 1)}
 disabled={currentPage <= -1}
 className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-12 h-16 sm:w-14 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl z-10 disabled:opacity-0"
 >
 <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
 </motion.button>

 <motion.button
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: currentPage < totalPages - 1 ? 1 : 0, x: 0 }}
 whileHover={{ scale: 1.1 }}
 whileTap={{ scale: 0.9 }}
 onClick={() => goToPage(currentPage + 1)}
 disabled={currentPage >= totalPages - 1}
 className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-12 h-16 sm:w-14 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl z-10 disabled:opacity-0"
 >
 <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
 </motion.button>
 </motion.div>

 {/* Premium Bottom Bar */}
 <motion.div
 initial={{ y: 50, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 className="relative z-20 bg-black/30 backdrop-blur-xl border-t border-white/10 px-4 py-4 safe-area-bottom"
 >
 {/* Feature 2: Page reorder buttons in edit mode */}
 {isEditMode && currentPage >= 0 && (
 <div className="flex items-center justify-center gap-3 mb-3">
 <motion.button
 whileTap={{ scale: 0.9 }}
 onClick={() => movePage(currentPage, 'left')}
 disabled={currentPage <= 0}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs disabled:opacity-30 hover:bg-white/20 transition-colors"
 >
 <ChevronLeft className="h-3.5 w-3.5" />
 <span>{t('photobookMovePageLeft') || 'Move Page Left'}</span>
 </motion.button>
 <span className="text-white/50 text-xs">
 <ArrowLeftRight className="h-3.5 w-3.5 inline" />
 </span>
 <motion.button
 whileTap={{ scale: 0.9 }}
 onClick={() => movePage(currentPage, 'right')}
 disabled={currentPage >= pages.length - 1}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs disabled:opacity-30 hover:bg-white/20 transition-colors"
 >
 <span>{t('photobookMovePageRight') || 'Move Page Right'}</span>
 <ChevronRight className="h-3.5 w-3.5" />
 </motion.button>
 </div>
 )}

 {/* Page indicators */}
 <div className="flex items-center justify-center gap-2 mb-4">
 <motion.button
 whileTap={{ scale: 0.9 }}
 onClick={() => goToPage(-1)}
 className={`w-3 h-3 rounded-full transition-all ${
 currentPage === -1
 ? 'bg-amber-400 w-8 shadow-lg shadow-amber-400/50'
 : 'bg-white/30 hover:bg-white/50'
 }`}
 />
 {pages.slice(0, 8).map((_, idx) => (
 <motion.button
 key={idx}
 whileTap={{ scale: 0.9 }}
 onClick={() => goToPage(idx)}
 className={`w-3 h-3 rounded-full transition-all ${
 currentPage === idx
 ? 'bg-amber-400 w-8 shadow-lg shadow-amber-400/50'
 : 'bg-white/30 hover:bg-white/50'
 }`}
 />
 ))}
 {pages.length > 8 && (
 <span className="text-white/50 text-xs ml-1">+{pages.length - 8}</span>
 )}
 </div>

 {/* Purchase CTA */}
 {!purchased ? (
 <motion.div
 initial={{ y: 20, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30"
 >
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-xl bg-amber-500/30 flex items-center justify-center">
 <Lock className="h-6 w-6 text-amber-400" />
 </div>
 <div>
 <p className="text-white font-semibold">Unlock Photobook</p>
 <p className="text-amber-300/70 text-sm">Export & Print for {formatPrice(getBookPrice('photobook'))}</p>
 </div>
 </div>
 <BookPurchaseSheet
 bookId={bookId}
 bookData={{
 title: bookTitle,
 genre: 'photobook',
 chapters: pages.length,
 purchased
 }}
 price={getBookPrice('photobook')}
 onPurchaseSuccess={onSave || (() => {})}
 />
 </motion.div>
 ) : (
 <div className="flex items-center justify-center gap-3">
 <motion.button
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.95 }}
 className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
 >
 <Share2 className="h-5 w-5" />
 <span>Share</span>
 </motion.button>
 <motion.button
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.95 }}
 className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/30"
 >
 <Download className="h-5 w-5" />
 <span>Export</span>
 </motion.button>
 </div>
 )}
 </motion.div>

 {/* Photo Detail Modal */}
 <AnimatePresence>
 {selectedPhoto && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 bg-black"
 onClick={() => setSelectedPhoto(null)}
 >
 <motion.button
 initial={{ opacity: 0, scale: 0.8 }}
 animate={{ opacity: 1, scale: 1 }}
 className="absolute top-4 right-4 z-10 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center safe-area-top"
 >
 <X className="h-6 w-6 text-white" />
 </motion.button>

 <motion.div
 initial={{ scale: 0.9, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.9, opacity: 0 }}
 className="h-full flex flex-col"
 onClick={e => e.stopPropagation()}
 >
 <div className="flex-1 flex items-center justify-center p-4">
 <motion.img
 layoutId={`photo-${selectedPhoto.id}`}
 src={selectedPhoto.url}
 alt={selectedPhoto.caption || 'Photo'}
 className="max-w-full max-h-full object-contain rounded-xl"
 />
 </div>

 {(selectedPhoto.caption || selectedPhoto.analysis) && (
 <motion.div
 initial={{ y: 100 }}
 animate={{ y: 0 }}
 className="bg-gradient-to-t from-black via-black/90 to-transparent p-6 pt-12 safe-area-bottom"
 >
 {selectedPhoto.caption && (
 <p className="text-white text-lg font-serif mb-3">{selectedPhoto.caption}</p>
 )}
 {selectedPhoto.analysis?.description && (
 <p className="text-gray-400 text-sm mb-4">{selectedPhoto.analysis.description}</p>
 )}
 <div className="flex flex-wrap gap-2">
 {selectedPhoto.analysis?.estimatedEra && (
 <Badge variant="outline" className="border-white/20 text-white bg-white/10">
 <Calendar className="h-3 w-3 mr-1" />
 {t(PHOTO_ERA_LABEL_KEYS[selectedPhoto.analysis.estimatedEra] as never)}
 </Badge>
 )}
 {selectedPhoto.analysis?.setting && (
 <Badge variant="outline" className="border-white/20 text-white bg-white/10">
 <MapPin className="h-3 w-3 mr-1" />
 {selectedPhoto.analysis.setting}
 </Badge>
 )}
 {selectedPhoto.analysis?.peopleCount !== undefined && selectedPhoto.analysis.peopleCount > 0 && (
 <Badge variant="outline" className="border-white/20 text-white bg-white/10">
 <Users className="h-3 w-3 mr-1" />
 {selectedPhoto.analysis.peopleCount} {selectedPhoto.analysis.peopleCount === 1 ? 'Person' : 'People'}
 </Badge>
 )}
 </div>
 </motion.div>
 )}
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Edit Sheet */}
 <AnimatePresence>
 {showEditSheet && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-50"
 onClick={() => setShowEditSheet(null)}
 >
 <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
 <motion.div
 initial={{ y: '100%' }}
 animate={{ y: 0 }}
 exit={{ y: '100%' }}
 transition={{ type: 'spring', damping: 30, stiffness: 300 }}
 className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-3xl safe-area-bottom"
 onClick={e => e.stopPropagation()}
 >
 <div className="flex justify-center py-4">
 <div className="w-12 h-1.5 bg-gray-700 rounded-full" />
 </div>

 <div className="px-4 pb-6 space-y-2">
 {[
 { icon: ChevronLeft, label: t('photobookMoveForward') || 'Move Forward', action: () => movePhoto(showEditSheet.pageIndex, showEditSheet.photoIndex, 'prev') },
 { icon: ChevronRight, label: t('photobookMoveBackward') || 'Move Backward', action: () => movePhoto(showEditSheet.pageIndex, showEditSheet.photoIndex, 'next') },
 { icon: Edit3, label: t('photobookCaption') || 'Caption', action: () => startEditCaption(showEditSheet.pageIndex, showEditSheet.photoIndex) },
 { icon: ImageIcon, label: t('photobookSetAsCover') || 'Set as Cover', action: () => handleSetAsCover(showEditSheet.pageIndex, showEditSheet.photoIndex) },
 { icon: Crop, label: t('photobookCropPhoto') || 'Crop Photo', action: () => { const photo = pages[showEditSheet.pageIndex].photos[showEditSheet.photoIndex]; setCropRect(photo.cropData || { x: 10, y: 10, width: 80, height: 80 }); setShowCropSheet(showEditSheet); setShowEditSheet(null) } },
 { icon: Wand2, label: t('photobookTransformStyle') || 'Transform Style', action: () => { setShowStylePicker(showEditSheet); setShowEditSheet(null) }, highlight: true },
 { icon: ZoomIn, label: t('photobookZoomIn') || 'Zoom In', action: () => { setSelectedPhoto(pages[showEditSheet.pageIndex].photos[showEditSheet.photoIndex]); setShowEditSheet(null) } },
 ].map((item, idx) => (
 <motion.button
 key={idx}
 whileTap={{ scale: 0.98 }}
 onClick={item.action}
 className={`w-full flex items-center gap-4 p-4 rounded-2xl active:bg-gray-700 ${
 'highlight' in item && item.highlight
 ? 'bg-gradient-to-r from-amber-900/50 to-orange-900/50 border border-amber-500/30'
 : 'bg-gray-800'
 }`}
 >
 <item.icon className={`h-5 w-5 ${'highlight' in item && item.highlight ? 'text-amber-400' : 'text-gray-400'}`} />
 <span className="text-white font-medium">{item.label}</span>
 {'highlight' in item && item.highlight && (
 <Badge className="ml-auto bg-amber-500/20 text-amber-300 text-[10px] border-0">AI</Badge>
 )}
 </motion.button>
 ))}

 <motion.button
 whileTap={{ scale: 0.98 }}
 onClick={() => handleDeletePhoto(showEditSheet.pageIndex, showEditSheet.photoIndex)}
 className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/20 active:bg-red-500/30"
 >
 <Trash2 className="h-5 w-5 text-red-400" />
 <span className="text-red-400 font-medium">Delete Photo</span>
 </motion.button>

 <motion.button
 whileTap={{ scale: 0.98 }}
 onClick={() => setShowEditSheet(null)}
 className="w-full p-4 rounded-2xl bg-gray-800 active:bg-gray-700 mt-4"
 >
 <span className="text-gray-400 font-medium">Cancel</span>
 </motion.button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Caption Edit Dialog */}
 <AnimatePresence>
 {editingCaption && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
 >
 <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setEditingCaption(null)} />
 <motion.div
 initial={{ y: '100%' }}
 animate={{ y: 0 }}
 exit={{ y: '100%' }}
 transition={{ type: 'spring', damping: 25, stiffness: 300 }}
 className="relative w-full sm:max-w-md bg-gray-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
 >
 <div className="flex justify-center mb-3 sm:hidden"><div className="w-10 h-1 bg-gray-700 rounded-full" /></div>
 <h3 className="text-white text-lg font-semibold mb-4">Caption</h3>
 <Input
 value={captionText}
 onChange={(e) => setCaptionText(e.target.value)}
 placeholder={t('captionPlaceholder')}
 className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 h-12 rounded-xl"
 autoFocus
 />
 <div className="flex gap-3 mt-6">
 <Button
 variant="outline"
 onClick={() => setEditingCaption(null)}
 className="flex-1 h-12 rounded-xl border-gray-700 text-gray-300 hover:bg-gray-800"
 >
 Cancel
 </Button>
 <Button
 onClick={saveCaption}
 className="flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white"
 >
 Save
 </Button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Style Picker Dialog */}
 <AnimatePresence>
 {showStylePicker && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-50"
 onClick={() => !isTransforming && setShowStylePicker(null)}
 >
 <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
 <motion.div
 initial={{ y: '100%' }}
 animate={{ y: 0 }}
 exit={{ y: '100%' }}
 transition={{ type: 'spring', damping: 30, stiffness: 300 }}
 className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-3xl max-h-[85vh] overflow-hidden safe-area-bottom"
 onClick={e => e.stopPropagation()}
 >
 <div className="flex justify-center py-4">
 <div className="w-12 h-1.5 bg-gray-700 rounded-full" />
 </div>

 <div className="px-4 pb-6">
 <div className="flex items-center gap-3 mb-4">
 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
 </div>
 <div>
 <h3 className="text-white text-lg font-semibold">Transform with AI</h3>
 <p className="text-gray-400 text-sm">Choose an art style for this photo</p>
 </div>
 </div>

 {/* Current photo preview */}
 <div className="mb-4 rounded-xl overflow-hidden bg-gray-800 p-2">
 <NextImage
 src={pages[showStylePicker.pageIndex].photos[showStylePicker.photoIndex].url}
 alt="Current photo"
 width={400}
 height={128}
 className="w-full h-32 object-cover rounded-lg"
 />
 </div>

 {isTransforming ? (
 <div className="py-8 text-center">
 <motion.div
 animate={{ rotate: 360 }}
 transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
 className="w-16 h-16 mx-auto mb-4"
 >
 </motion.div>
 <p className="text-white font-medium mb-2">Transforming with AI...</p>
 <p className="text-gray-400 text-sm mb-4">This may take a moment</p>
 <div className="max-w-xs mx-auto">
 <Progress value={transformProgress} className="h-2" />
 <p className="text-xs text-gray-500 mt-2">{transformProgress}%</p>
 </div>
 </div>
 ) : (
 <div className="grid grid-cols-3 gap-2 max-h-[40vh] overflow-y-auto">
 {PHOTOBOOK_TRANSFORM_STYLES.filter(s => s.value !== 'original').map(style => (
 <motion.button
 key={style.value}
 whileTap={{ scale: 0.95 }}
 onClick={() => handleTransformPhoto(showStylePicker.pageIndex, showStylePicker.photoIndex, style.value as PhotoTransformStyle)}
 className="p-3 rounded-xl bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-left transition-colors border border-transparent hover:border-amber-500/30"
 >
 <span className="text-2xl block mb-1">{style.icon}</span>
 <span className="text-white text-sm font-medium block">{t(style.labelKey as never)}</span>
 <span className="text-gray-400 text-[10px] line-clamp-2">{t(style.descriptionKey as never)}</span>
 </motion.button>
 ))}
 </div>
 )}

 {!isTransforming && (
 <motion.button
 whileTap={{ scale: 0.98 }}
 onClick={() => setShowStylePicker(null)}
 className="w-full p-4 rounded-2xl bg-gray-800 active:bg-gray-700 mt-4"
 >
 <span className="text-gray-400 font-medium">Cancel</span>
 </motion.button>
 )}
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Feature 3: Title Edit Dialog */}
 <AnimatePresence>
 {isEditingTitle && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
 >
 <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsEditingTitle(false)} />
 <motion.div
 initial={{ y: '100%' }}
 animate={{ y: 0 }}
 exit={{ y: '100%' }}
 transition={{ type: 'spring', damping: 25, stiffness: 300 }}
 className="relative w-full sm:max-w-md bg-gray-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
 >
 <div className="flex justify-center mb-3 sm:hidden"><div className="w-10 h-1 bg-gray-700 rounded-full" /></div>
 <h3 className="text-white text-lg font-semibold mb-4">{t('photobookEditTitle') || 'Edit Title'}</h3>
 <Input
 value={editTitle}
 onChange={(e) => setEditTitle(e.target.value)}
 placeholder={t('title') || 'Title'}
 className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 h-12 rounded-xl mb-3"
 autoFocus
 />
 <Input
 value={editSubtitle}
 onChange={(e) => setEditSubtitle(e.target.value)}
 placeholder={t('photobookSubtitlePlaceholder') || 'Subtitle (optional)'}
 className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 h-12 rounded-xl"
 />
 <div className="flex gap-3 mt-6">
 <Button
 variant="outline"
 onClick={() => setIsEditingTitle(false)}
 className="flex-1 h-12 rounded-xl border-gray-700 text-gray-300 hover:bg-gray-800"
 >
 {t('cancel') || 'Cancel'}
 </Button>
 <Button
 onClick={handleSaveTitle}
 className="flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white"
 >
 <Check className="h-4 w-4 mr-2" />
 {t('save') || 'Save'}
 </Button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Feature 6: Crop Dialog */}
 <AnimatePresence>
 {showCropSheet && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-50"
 onClick={() => setShowCropSheet(null)}
 >
 <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
 <motion.div
 initial={{ y: '100%' }}
 animate={{ y: 0 }}
 exit={{ y: '100%' }}
 transition={{ type: 'spring', damping: 30, stiffness: 300 }}
 className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-3xl safe-area-bottom"
 onClick={e => e.stopPropagation()}
 >
 <div className="flex justify-center py-4">
 <div className="w-12 h-1.5 bg-gray-700 rounded-full" />
 </div>
 <div className="px-4 pb-6">
 <h3 className="text-white text-lg font-semibold mb-4">{t('photobookCropPhoto') || 'Crop Photo'}</h3>
 <div className="relative mx-auto w-64 h-64 rounded-xl overflow-hidden bg-gray-800 mb-4">
 <img
 src={pages[showCropSheet.pageIndex].photos[showCropSheet.photoIndex].url}
 alt="Crop preview"
 className="w-full h-full object-cover"
 />
 <div
 className="absolute border-2 border-white/80 bg-white/10 shadow-lg"
 style={{
 left: `${cropRect.x}%`,
 top: `${cropRect.y}%`,
 width: `${cropRect.width}%`,
 height: `${cropRect.height}%`,
 }}
 />
 <div className="absolute inset-x-0 top-0 bg-black/50" style={{ height: `${cropRect.y}%` }} />
 <div className="absolute inset-x-0 bottom-0 bg-black/50" style={{ height: `${100 - (cropRect.y + cropRect.height)}%` }} />
 <div className="absolute left-0 bg-black/50" style={{ top: `${cropRect.y}%`, width: `${cropRect.x}%`, height: `${cropRect.height}%` }} />
 <div className="absolute right-0 bg-black/50" style={{ top: `${cropRect.y}%`, width: `${100 - (cropRect.x + cropRect.width)}%`, height: `${cropRect.height}%` }} />
 </div>
 <div className="space-y-3 mb-4">
 <div className="flex items-center gap-3">
 <span className="text-gray-400 text-sm w-8">X</span>
 <input type="range" min="0" max={100 - cropRect.width} value={cropRect.x} onChange={e => setCropRect(prev => ({ ...prev, x: Number(e.target.value) }))} className="flex-1 accent-amber-500" />
 <span className="text-white text-sm w-10 text-right">{cropRect.x}%</span>
 </div>
 <div className="flex items-center gap-3">
 <span className="text-gray-400 text-sm w-8">Y</span>
 <input type="range" min="0" max={100 - cropRect.height} value={cropRect.y} onChange={e => setCropRect(prev => ({ ...prev, y: Number(e.target.value) }))} className="flex-1 accent-amber-500" />
 <span className="text-white text-sm w-10 text-right">{cropRect.y}%</span>
 </div>
 <div className="flex items-center gap-3">
 <span className="text-gray-400 text-sm w-8">W</span>
 <input type="range" min="10" max={100 - cropRect.x} value={cropRect.width} onChange={e => setCropRect(prev => ({ ...prev, width: Number(e.target.value) }))} className="flex-1 accent-amber-500" />
 <span className="text-white text-sm w-10 text-right">{cropRect.width}%</span>
 </div>
 <div className="flex items-center gap-3">
 <span className="text-gray-400 text-sm w-8">H</span>
 <input type="range" min="10" max={100 - cropRect.y} value={cropRect.height} onChange={e => setCropRect(prev => ({ ...prev, height: Number(e.target.value) }))} className="flex-1 accent-amber-500" />
 <span className="text-white text-sm w-10 text-right">{cropRect.height}%</span>
 </div>
 </div>
 <div className="flex gap-3">
 <Button variant="outline" onClick={() => setShowCropSheet(null)} className="flex-1 h-12 rounded-xl border-gray-700 text-gray-300 hover:bg-gray-800">
 {t('cancel') || 'Cancel'}
 </Button>
 <Button onClick={() => handleSaveCrop(showCropSheet.pageIndex, showCropSheet.photoIndex)} className="flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white">
 <Check className="h-4 w-4 mr-2" /> {t('save') || 'Save'}
 </Button>
 </div>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Feature 1: Media Library Selector for adding photos */}
 <MediaLibrarySelector
 open={showMediaLibrary}
 onOpenChange={setShowMediaLibrary}
 onSelectPhotos={(photos) => handleAddPhotos(photos.map(p => ({
 id: p.id,
 url: p.url,
 originalFilename: p.originalFilename,
 analysis: p.analysis as PhotoAnalysis | undefined,
 })))}
 existingPhotoIds={pages.flatMap(p => p.photos.map(ph => ph.id))}
 />

 {/* Feature 10: Cover Generate Button */}
 {isEditMode && currentPage === -1 && (
 <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 w-64">
 <CoverGeneratorButton
 bookId={bookId}
 onCoverGenerated={(coverUrl) => {
 onCoverChange?.(coverUrl)
 notification('success')
 }}
 />
 </div>
 )}
 </div>
 )
}
