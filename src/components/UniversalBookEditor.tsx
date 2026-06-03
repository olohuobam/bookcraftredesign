'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import NextImage from 'next/image'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
 ChevronLeft,
 ChevronRight,
 X,
 BookOpen,
 List,
 Settings,
 Save,
 Edit3,
 Check,
 Undo,
 Redo,
 Shield,
 Lock,
 ShoppingCart,
 Image as ImageIcon,
 Eye,
 Plus,
 Trash2,
 MoreHorizontal,
 FileText,
 FileDown,
} from 'lucide-react'
import BottomSheet from '@/components/BottomSheet'
import { useLanguage } from '@/context/LanguageContext'
import { useHaptics } from '@/hooks/useHaptics'
import { useAuth } from '@/context/AuthContext'
import DigitalPurchaseModal from '@/components/DigitalPurchaseModal'
import { formatPrice, getBookPrice } from '@/lib/pricing'
import UniversalBookReader from '@/components/UniversalBookReader'
import { ProtectedContent, ProtectedImage } from '@/components/ContentProtection'
import SwipeNavigation from '@/components/ios/SwipeNavigation'

interface Chapter {
 id: string
 title: string
 content: string
 wordCount: number
}

interface BookPage {
 imageUrl: string
 text: string
 caption?: string
 pageNumber: number
}

interface HistoryEntry {
 chapters: Chapter[]
 timestamp: number
}

interface UniversalBookEditorProps {
 bookId: string
 bookTitle: string
 bookType?: string // 'text', 'picture', 'photobook'
 chapters: Chapter[]
 chaptersJson?: any
 images?: string[] // Picture book images array (flat, indexed by pageIndex * imagesPerPage + panelIndex)
 purchased?: boolean
 aiGenerated?: boolean
 coverImage?: string | null
 author?: string
 onSave?: () => void
 onClose?: () => void
}

export default function UniversalBookEditor({
 bookId,
 bookTitle,
 bookType = 'text',
 chapters: initialChapters,
 chaptersJson,
 images: bookImages,
 purchased = false,
 aiGenerated = false,
 coverImage,
 author,
 onSave,
 onClose
}: UniversalBookEditorProps) {
 const { t } = useLanguage()
 const { impact, selectionChanged } = useHaptics()
 const { getIdToken } = useAuth()
 const { resolvedTheme } = useTheme()

 const darkMode = resolvedTheme === 'dark'

  // ============================================
  // BOOK TYPE DETECTION
  // ============================================

 const detectedBookType = (() => {
 if (bookType && bookType !== 'text') return bookType

 if (chaptersJson) {
 const parsed = typeof chaptersJson === 'string'
 ? JSON.parse(chaptersJson)
 : chaptersJson

 if (parsed?.isPhotobook === true) return 'photobook'
 if (parsed?.pages || parsed?.pictureBookConfig) return 'picture'
 }

 return 'text'
 })()

  // ============================================
  // STATE
  // ============================================

 const [chapters, setChapters] = useState<Chapter[]>(initialChapters)
 const [pagesState, setPagesState] = useState<BookPage[] | null>(null)
 const [currentPage, setCurrentPage] = useState(0)
 const [saving, setSaving] = useState(false)
 const [lastSaved, setLastSaved] = useState<Date | null>(null)
 const [unsavedChanges, setUnsavedChanges] = useState(false)
 const [savedAgoText, setSavedAgoText] = useState<string | null>(null)
 const [viewMode, setViewMode] = useState<'edit' | 'preview'>('preview')
 const [showPurchaseModal, setShowPurchaseModal] = useState(false)

  // ============================================
  // MINIMAL UI - Tap to show/hide bars (Apple/Breuninger style)
  // ============================================
 const [showUI, setShowUI] = useState(false)
 const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null)
 const tapStartRef = useRef<{ x: number; y: number } | null>(null)
 const isTapValid = useRef(true)

  // Detect tap gesture
 const handleTouchStart = useCallback((e: React.TouchEvent) => {
 const touch = e.touches[0]
 tapStartRef.current = { x: touch.clientX, y: touch.clientY }
 isTapValid.current = true
 }, [])

 const handleTouchEnd = useCallback((e: React.TouchEvent) => {
 if (!tapStartRef.current || !isTapValid.current) return
 const touch = e.changedTouches[0]
 const dx = Math.abs(touch.clientX - tapStartRef.current.x)
 const dy = Math.abs(touch.clientY - tapStartRef.current.y)
 if (dx < 15 && dy < 15) {
 if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current)
 tapTimeoutRef.current = setTimeout(() => {
 setShowUI(prev => !prev)
 impact('light')
 }, 100)
 }
 tapStartRef.current = null
 }, [impact])

 const handleClick = useCallback((e: React.MouseEvent) => {
 const target = e.target as HTMLElement
 if (target.closest('button') || target.closest('input') || target.closest('textarea')) return
 if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current)
 tapTimeoutRef.current = setTimeout(() => setShowUI(prev => !prev), 100)
 }, [])

 useEffect(() => {
 return () => { if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current) }
 }, [])

  // ============================================
  // BOTTOM SHEET STATE
  // ============================================
 
 const [showBottomSheet, setShowBottomSheet] = useState(false)

  // Auto-hide bars
 const [barsVisible, setBarsVisible] = useState(true)
 const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Undo/Redo
 const [history, setHistory] = useState<HistoryEntry[]>([
 { chapters: initialChapters, timestamp: Date.now() }
 ])
 const [historyIndex, setHistoryIndex] = useState(0)
 const isUndoRedoAction = useRef(false)

  // Refs for interval-based auto-save (avoid stale closure issues)
 const isDirtyRef = useRef(false)
 const isSavingRef = useRef(false)
  // eslint-disable-next-line @typescript-eslint/no-empty-function
 const saveChangesRef = useRef<() => Promise<void>>(async () => {})

 const canUndo = historyIndex > 0
 const canRedo = historyIndex < history.length - 1

  // ============================================
  // AUTO-HIDE BARS LOGIC
  // ============================================

 const showBars = useCallback(() => {
 setBarsVisible(true)
 if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
 hideTimerRef.current = setTimeout(() => {
      // Don't hide if bottom sheet is open
 if (!showBottomSheet) {
 setBarsVisible(false)
 }
 }, 3000)
 }, [showBottomSheet])

  // Show bars initially, then start hide timer
 useEffect(() => {
 showBars()
 return () => {
 if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
 }
 }, [showBars])

  // Keep bars visible when bottom sheet is open
 useEffect(() => {
 if (showBottomSheet) {
 setBarsVisible(true)
 if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
 } else {
 showBars()
 }
 }, [showBottomSheet, showBars])

 const handleInteraction = useCallback(() => {
 showBars()
 }, [showBars])

  // ============================================
  // PARSE PAGES BASED ON BOOK TYPE
  // ============================================

 const parsedPages: BookPage[] = (() => {
 if (detectedBookType === 'picture' || detectedBookType === 'photobook') {
 const images = (bookImages || []).map(img => img || '')

 if (chaptersJson) {
 const parsed = typeof chaptersJson === 'string'
 ? JSON.parse(chaptersJson)
 : chaptersJson

 const imagesPerPage = parsed.imagesPerPage ||
 parsed.pictureBookConfig?.pages?.[0]?.panels?.length ||
 parsed.pages?.[0]?.panels?.length || 1

        // Picture book config with panels structure (n8n workflow format)
 if (parsed.pictureBookConfig?.pages) {
 return parsed.pictureBookConfig.pages.flatMap((page: any, pageIndex: number) => {
 return page.panels?.map((panel: any, panelIndex: number) => {
 const flatIndex = pageIndex * imagesPerPage + panelIndex
 const imageUrl = images[flatIndex] || panel.imageUrl || ''
 return {
 imageUrl,
 text: page.text || panel.description || '',
 caption: panel.caption || '',
 pageNumber: pageIndex * imagesPerPage + panelIndex + 1
 }
 }) || []
 })
 }

        // Direct pages array with panels (alternative format)
 if (Array.isArray(parsed.pages) && parsed.pages[0]?.panels) {
 return parsed.pages.flatMap((page: any, pageIndex: number) => {
 return page.panels?.map((panel: any, panelIndex: number) => {
 const flatIndex = pageIndex * imagesPerPage + panelIndex
 const imageUrl = images[flatIndex] || panel.imageUrl || ''
 return {
 imageUrl,
 text: page.text || panel.description || '',
 caption: panel.caption || '',
 pageNumber: pageIndex * imagesPerPage + panelIndex + 1
 }
 }) || []
 })
 }

        // Direct pages array without panels (simple format)
 if (Array.isArray(parsed.pages)) {
 return parsed.pages.map((page: any, index: number) => {
 const imageUrl = images[index] || page.imageUrl || page.url || page.image || ''
 return {
 imageUrl,
 text: page.text || page.content || '',
 caption: page.caption || '',
 pageNumber: index + 1
 }
 })
 }
 }

      // Fallback: create pages from images
 const validImages = images.filter(img => img && img.length > 0)
 if (validImages.length > 0) {
 return validImages.map((img, index) => ({
 imageUrl: img,
 text: '',
 caption: '',
 pageNumber: index + 1
 }))
 }

      // Final fallback
 return chapters.map((chapter, index) => ({
 imageUrl: coverImage || '',
 text: chapter.content,
 caption: '',
 pageNumber: index + 1
 }))
 }

 return []
 })()

  // Use stateful pages if available (allows edits), otherwise use parsed pages
 const pages: BookPage[] = pagesState ?? parsedPages

  // Initialize pagesState from parsedPages on first render (only for picture books)
 useEffect(() => {
 if ((detectedBookType === 'picture' || detectedBookType === 'photobook') && pagesState === null && parsedPages.length > 0) {
 setPagesState(parsedPages)
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [detectedBookType])

 const totalPages = detectedBookType === 'text' ? chapters.length : pages.length
 const currentChapter = chapters[currentPage]

  // ============================================
  // LOCK LOGIC
  // ============================================

 const isPageLocked = (index: number) => {
 if (purchased || !aiGenerated) return false
 if (detectedBookType === 'picture' || detectedBookType === 'photobook') {
 return index > 1
 }
 return index > 0
 }

 const isLocked = isPageLocked(currentPage)

  // ============================================
  // SAVE FUNCTIONALITY
  // ============================================

 const saveChanges = useCallback(async () => {
 setSaving(true)
 try {
 const token = await getIdToken()

      // Build request body — for picture books, serialize updated pages back into chapters_json
 let saveBody: Record<string, unknown> = { chapters }
 if ((detectedBookType === 'picture' || detectedBookType === 'photobook') && pagesState && chaptersJson) {
 const parsed = typeof chaptersJson === 'string' ? JSON.parse(chaptersJson) : chaptersJson
 let updatedChaptersJson = { ...parsed }

        // Reconstruct chapters_json with updated text/captions from pagesState
 if (parsed.pictureBookConfig?.pages) {
 let flatIndex = 0
 const updatedPages = parsed.pictureBookConfig.pages.map((page: any) => ({
 ...page,
 panels: page.panels?.map((panel: any) => {
 const updatedPage = pagesState[flatIndex]
 flatIndex++
 return { ...panel, caption: updatedPage?.caption ?? panel.caption }
 }) || []
 }))
 updatedChaptersJson = { ...parsed, pictureBookConfig: { ...parsed.pictureBookConfig, pages: updatedPages } }
 } else if (Array.isArray(parsed.pages) && parsed.pages[0]?.panels) {
 let flatIndex = 0
 const updatedPages = parsed.pages.map((page: any) => ({
 ...page,
 panels: page.panels?.map((panel: any) => {
 const updatedPage = pagesState[flatIndex]
 flatIndex++
 return { ...panel, caption: updatedPage?.caption ?? panel.caption }
 }) || []
 }))
 updatedChaptersJson = { ...parsed, pages: updatedPages }
 } else if (Array.isArray(parsed.pages)) {
 const updatedPages = parsed.pages.map((page: any, index: number) => ({
 ...page,
 text: pagesState[index]?.text ?? page.text,
 caption: pagesState[index]?.caption ?? page.caption,
 }))
 updatedChaptersJson = { ...parsed, pages: updatedPages }
 }
 saveBody = { chapters, chapters_json: updatedChaptersJson }
 }

 const res = await fetch(`/api/books/${bookId}`, {
 method: 'PATCH',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify(saveBody)
 })

 if (!res.ok) throw new Error('Failed to save')

 setLastSaved(new Date())
 setUnsavedChanges(false)
 impact('light')
 onSave?.()
 } catch (error) {
      console.error('Save failed:', error)
 } finally {
 setSaving(false)
 }
 }, [bookId, chapters, getIdToken, impact, onSave])

  // Sync dirty / saving state into refs so the auto-save interval never reads stale values
 useEffect(() => { isDirtyRef.current = unsavedChanges }, [unsavedChanges])
 useEffect(() => { isSavingRef.current = saving }, [saving])
 saveChangesRef.current = saveChanges

  // Auto-save every 30 seconds
  // eslint-disable-next-line react-hooks/exhaustive-deps
 useEffect(() => {
 const intervalId = setInterval(() => {
 if (isDirtyRef.current && !isSavingRef.current) {
 saveChangesRef.current()
 }
 }, 30000)
 return () => clearInterval(intervalId)
 }, [])

  // Prevent data loss on tab close when there are unsaved changes
 useEffect(() => {
 const handleBeforeUnload = (e: BeforeUnloadEvent) => {
 if (isDirtyRef.current) {
 e.preventDefault()
 e.returnValue = ''
 }
 }
 window.addEventListener('beforeunload', handleBeforeUnload)
 return () => window.removeEventListener('beforeunload', handleBeforeUnload)
 }, [])

  // Compute relative "Saved X min. ago" text
 const computeSavedAgoText = useCallback((savedAt: Date) => {
 const minutes = Math.floor((Date.now() - savedAt.getTime()) / 60000)
 if (minutes < 1) return t('savedJustNow')
 return t('savedAgo', { minutes: String(minutes) })
 }, [t])

 useEffect(() => {
 if (!lastSaved) {
 setSavedAgoText(null)
 return
 }
 setSavedAgoText(computeSavedAgoText(lastSaved))
 }, [lastSaved, computeSavedAgoText])

 useEffect(() => {
 if (!lastSaved) return
 const tickId = setInterval(() => {
 setSavedAgoText(computeSavedAgoText(lastSaved))
 }, 60000)
 return () => clearInterval(tickId)
 }, [lastSaved, computeSavedAgoText])

  // ============================================
  // CHAPTER/PAGE UPDATES
  // ============================================

 const updateChapter = useCallback((index: number, updates: Partial<Chapter>) => {
 setChapters(prev => {
 const newChapters = [...prev]
 newChapters[index] = { ...newChapters[index], ...updates }
 return newChapters
 })
 setUnsavedChanges(true)

 if (!isUndoRedoAction.current) {
 setHistory(prev => {
 const newHistory = prev.slice(0, historyIndex + 1)
 newHistory.push({
 chapters: chapters,
 timestamp: Date.now()
 })
 return newHistory.slice(-50)
 })
 setHistoryIndex(prev => Math.min(prev + 1, 49))
 }
 }, [chapters, historyIndex])

 const updatePage = useCallback((index: number, updates: Partial<BookPage>) => {
 setPagesState(prev => {
 const current = prev ?? parsedPages
 const newPages = [...current]
 newPages[index] = { ...newPages[index], ...updates }
 return newPages
 })
 setUnsavedChanges(true)
 }, [parsedPages])

 const addChapter = useCallback(() => {
 const newChapter: Chapter = {
 id: `chapter-${Date.now()}`,
 title: t('chapterNumber', { number: chapters.length + 1 }),
 content: '',
 wordCount: 0
 }
 setChapters(prev => [...prev, newChapter])
 setCurrentPage(chapters.length)
 setUnsavedChanges(true)
 impact('medium')
 setShowBottomSheet(false)
 }, [chapters.length, impact, t])

 const deleteChapter = useCallback((index: number) => {
 if (chapters.length <= 1) return
 setChapters(prev => prev.filter((_, i) => i !== index))
 if (currentPage >= index && currentPage > 0) {
 setCurrentPage(prev => prev - 1)
 }
 setUnsavedChanges(true)
 impact('medium')
 }, [chapters.length, currentPage, impact])

  // ============================================
  // UNDO/REDO
  // ============================================

 const undo = useCallback(() => {
 if (canUndo) {
 isUndoRedoAction.current = true
 setHistoryIndex(prev => prev - 1)
 setChapters(history[historyIndex - 1].chapters)
 setUnsavedChanges(true)
 impact('light')
 setTimeout(() => { isUndoRedoAction.current = false }, 100)
 }
 }, [canUndo, history, historyIndex, impact])

 const redo = useCallback(() => {
 if (canRedo) {
 isUndoRedoAction.current = true
 setHistoryIndex(prev => prev + 1)
 setChapters(history[historyIndex + 1].chapters)
 setUnsavedChanges(true)
 impact('light')
 setTimeout(() => { isUndoRedoAction.current = false }, 100)
 }
 }, [canRedo, history, historyIndex, impact])

  // ============================================
  // NAVIGATION
  // ============================================

 const goToPage = useCallback((index: number) => {
 if (index >= 0 && index < totalPages) {
 if (isPageLocked(index)) {
 setShowPurchaseModal(true)
 setShowBottomSheet(false)
 return
 }
 selectionChanged()
 setCurrentPage(index)
 setShowBottomSheet(false)
 }
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [totalPages, selectionChanged])

 const nextPage = useCallback(() => {
 if (currentPage < totalPages - 1) {
 if (isPageLocked(currentPage + 1)) {
 setShowPurchaseModal(true)
 return
 }
 impact('light')
 setCurrentPage(prev => prev + 1)
 }
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [currentPage, totalPages, impact])

 const prevPage = useCallback(() => {
 if (currentPage > 0) {
 impact('light')
 setCurrentPage(prev => prev - 1)
 }
 }, [currentPage, impact])

  // Keyboard shortcuts
 useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 if ((e.metaKey || e.ctrlKey) && e.key === 's') {
 e.preventDefault()
 saveChanges()
 }
 if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
 e.preventDefault()
 undo()
 }
 if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
 e.preventDefault()
 redo()
 }
 if (e.key === 'Escape') {
 if (showBottomSheet) {
 setShowBottomSheet(false)
 } else {
 onClose?.()
 }
 }
 }

 window.addEventListener('keydown', handleKeyDown)
 return () => window.removeEventListener('keydown', handleKeyDown)
 }, [saveChanges, undo, redo, onClose, showBottomSheet])

  // ============================================
  // PREVIEW MODE
  // ============================================

 if (viewMode === 'preview') {
 return (
 <UniversalBookReader
 bookId={bookId}
 bookTitle={bookTitle}
 bookType={detectedBookType}
 chapters={chapters}
 chaptersJson={chaptersJson}
 purchased={purchased}
 aiGenerated={aiGenerated}
 coverImage={coverImage}
 author={author}
 onClose={onClose ?? (() => {})}
 onEditMode={() => setViewMode('edit')}
 initialChapterIndex={currentPage}
 />
 )
 }

  // ============================================
  // PROGRESS DOTS
  // ============================================

 const renderProgressDots = () => {
 if (totalPages <= 1) return null
    // For many pages, show a condensed version
 const maxDots = 7
 if (totalPages <= maxDots) {
 return (
 <div className="flex items-center gap-1.5">
 {Array.from({ length: totalPages }).map((_, i) => (
 <div
 key={i}
 className={`rounded-full transition-all duration-300 ${
 i === currentPage
 ? 'w-2 h-2 bg-foreground'
 : 'w-1.5 h-1.5 bg-foreground/25'
 }`}
 />
 ))}
 </div>
 )
 }
    // Show current/total for many pages
 return (
 <span className="text-xs font-medium text-foreground/50 tabular-nums">
 {currentPage + 1}/{totalPages}
 </span>
 )
 }

  // ============================================
  // RENDER EDITOR CONTENT
  // ============================================

 const renderEditorContent = () => {
 if (isLocked) {
 return (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6"
 >
 <div className="w-20 h-20 rounded-full bg-foreground/5 flex items-center justify-center mb-8">
 <Lock className="h-10 w-10 text-foreground/30" />
 </div>
 <h2 className="text-2xl font-serif font-medium mb-3 text-foreground">
 {detectedBookType === 'text' ? t('chapterLocked') : t('pageLocked')}
 </h2>
 <p className="mb-10 max-w-sm text-foreground/50 leading-relaxed">
 {t('buyBookToUnlock', {
 total: totalPages,
 type: detectedBookType === 'text' ? t('chapters') : t('pagesLabel')
 })}
 </p>
 <DigitalPurchaseModal
 bookId={bookId}
 bookData={{
 title: bookTitle,
 genre: 'book',
 chapters: totalPages,
 purchased: purchased
 }}
 price={getBookPrice(detectedBookType)}
 onPurchaseSuccess={() => {
 window.location.reload()
 }}
 triggerElement={
 <button className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-foreground text-background font-medium text-sm transition-transform active:scale-95">
 <ShoppingCart className="h-4 w-4" />
 {t('buyForPrice', { price: formatPrice(getBookPrice(detectedBookType)) })}
 </button>
 }
 />
 </motion.div>
 )
 }

    // Text Book Editor
 if (detectedBookType === 'text') {
 return (
 <motion.div
 key={currentPage}
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
 className="max-w-2xl mx-auto"
 >
 {/* Chapter Title — minimal inline input */}
 <Input
 value={currentChapter?.title || ''}
 onChange={(e) => updateChapter(currentPage, { title: e.target.value })}
 className="text-2xl md:text-3xl font-serif font-medium border-none shadow-none focus-visible:ring-0 px-0 mb-4 bg-transparent placeholder:text-foreground/20"
 placeholder={t('enterTitle')}
 />

 {/* Chapter Content — clean textarea */}
 <Textarea
 value={currentChapter?.content || ''}
 onChange={(e) => {
 const wordCount = e.target.value.trim().split(/\s+/).filter(Boolean).length
 updateChapter(currentPage, { content: e.target.value, wordCount })
 }}
 className="min-h-[60vh] font-serif text-lg md:text-xl leading-relaxed border-none shadow-none focus-visible:ring-0 resize-none px-0 bg-transparent placeholder:text-foreground/20"
 placeholder={t('writeYourStory')}
 />
 </motion.div>
 )
 }

    // Picture/Photobook Editor
 const page = pages[currentPage]
 return (
 <motion.div
 key={currentPage}
 initial={{ opacity: 0, scale: 0.98 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
 className="max-w-3xl mx-auto space-y-6"
 >
 {page?.imageUrl && (
 <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-muted">
 <ProtectedImage
 src={page.imageUrl}
 alt={t('pageNumber', { number: currentPage + 1 })}
 className="w-full h-full"
 watermarkText={purchased ? undefined : `\u00A9 ${bookTitle}`}
 showProtectionBadge={!purchased}
 blurOnInactive={!purchased}
 preventSave={!purchased}
 disabled={purchased}
 />
 </div>
 )}

 <Textarea
 value={page?.caption ?? page?.text ?? ''}
 onChange={(e) => {
 updatePage(currentPage, { caption: e.target.value, text: e.target.value })
 }}
 className="min-h-[100px] font-serif text-lg leading-relaxed border-none shadow-none focus-visible:ring-0 resize-none px-0 bg-transparent placeholder:text-foreground/20"
 placeholder={t('enterCaption')}
 />
 </motion.div>
 )
 }

  // ============================================
  // RENDER BOTTOM SHEET CONTENT
  // ============================================

 const renderBottomSheetContent = () => (
 <div className="px-1">
 {/* Chapter/Page List */}
 <div className="max-h-[40vh] overflow-y-auto overscroll-contain">
 {detectedBookType === 'text' ? (
 chapters.map((ch, index) => {
 const locked = isPageLocked(index)
 return (
 <div key={ch.id} className="group relative">
 <button
 onClick={() => goToPage(index)}
 className={`w-full flex items-center gap-4 px-5 py-3.5 transition-colors ${
 index === currentPage
 ? 'bg-foreground/5'
 : 'active:bg-foreground/5'
 }`}
 >
 {/* Number or lock */}
 <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium flex-shrink-0 ${
 locked
 ? 'bg-foreground/5 text-foreground/30'
 : index === currentPage
 ? 'bg-foreground text-background'
 : 'bg-foreground/5 text-foreground/50'
 }`}>
 {locked ? <Lock className="h-3.5 w-3.5" /> : index + 1}
 </span>
 <div className="flex-1 text-left min-w-0">
 <div className={`text-sm font-medium truncate ${
 locked ? 'text-foreground/30' : 'text-foreground'
 }`}>
 {ch.title}
 </div>
 {!locked && (
 <div className="text-xs text-foreground/40 mt-0.5">
 {ch.wordCount.toLocaleString()} {t('wordsCount')}
 </div>
 )}
 </div>
 {/* Current indicator */}
 {index === currentPage && (
 <div className="w-1.5 h-1.5 rounded-full bg-foreground flex-shrink-0" />
 )}
 </button>
 {/* Delete on hover (desktop) */}
 {!locked && chapters.length > 1 && (
 <button
 onClick={(e) => {
 e.stopPropagation()
 deleteChapter(index)
 }}
 className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-foreground/30 hover:text-red-500 hover:bg-red-500/10"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 )}
 </div>
 )
 })
 ) : (
 pages.map((page, index) => {
 const locked = isPageLocked(index)
 return (
 <button
 key={index}
 onClick={() => goToPage(index)}
 className={`w-full flex items-center gap-4 px-5 py-3 transition-colors ${
 index === currentPage
 ? 'bg-foreground/5'
 : 'active:bg-foreground/5'
 }`}
 >
 {/* Thumbnail or lock */}
 {locked ? (
 <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center flex-shrink-0">
 <Lock className="h-4 w-4 text-foreground/30" />
 </div>
 ) : page.imageUrl ? (
 <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
 <NextImage src={page.imageUrl} alt="" fill sizes="40px" className="object-cover" />
 </div>
 ) : (
 <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center flex-shrink-0">
 <ImageIcon className="h-4 w-4 text-foreground/30" />
 </div>
 )}
 <div className="flex-1 text-left min-w-0">
 <div className={`text-sm font-medium ${
 locked ? 'text-foreground/30' : 'text-foreground'
 }`}>
 {t('pageNumber', { number: index + 1 })}
 </div>
 {page.text && !locked && (
 <p className="text-xs text-foreground/40 truncate mt-0.5">
 {page.text.substring(0, 50)}
 </p>
 )}
 </div>
 {index === currentPage && (
 <div className="w-1.5 h-1.5 rounded-full bg-foreground flex-shrink-0" />
 )}
 </button>
 )
 })
 )}
 </div>

 {/* Divider */}
 <div className="h-px bg-border mx-5 my-2" />

 {/* Actions */}
 <div className="px-2 pb-2">
 <button
 onClick={() => {
 setShowBottomSheet(false)
 setViewMode('preview')
 }}
 className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-colors active:bg-foreground/5"
 >
 <Eye className="h-5 w-5 text-foreground/50" />
 <span className="text-sm font-medium text-foreground">{t('preview')}</span>
 </button>

 {detectedBookType === 'text' && (
 <button
 onClick={addChapter}
 className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-colors active:bg-foreground/5"
 >
 <Plus className="h-5 w-5 text-foreground/50" />
 <span className="text-sm font-medium text-foreground">{t('chapterNumber', { number: chapters.length + 1 })}</span>
 </button>
 )}

 <button
 onClick={() => {
 setShowBottomSheet(false)
            // Export handled elsewhere — just a placeholder tap target
            console.log('Export triggered')
 }}
 className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-colors active:bg-foreground/5"
 >
 <FileDown className="h-5 w-5 text-foreground/50" />
 <span className="text-sm font-medium text-foreground">{t('exportTab')}</span>
 </button>
 </div>
 </div>
 )

  // ============================================
  // RENDER MAIN UI
  // ============================================

 return (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 bg-background"
 onMouseMove={handleInteraction}
 onTouchStart={handleInteraction}
 >
 {/* TOP BAR — fades in/out */}
 <AnimatePresence>
 {barsVisible && (
 <motion.div
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
 className="absolute top-0 left-0 right-0 z-10"
 >
 <div className="bg-background/80 backdrop-blur-xl safe-area-top">
 <div className="flex items-center justify-between px-4 py-3">
 {/* Left: Back */}
 <button
 onClick={onClose}
 className="flex items-center gap-1 text-sm font-medium text-foreground/60 hover:text-foreground transition-colors -ml-1"
 >
 <ChevronLeft className="h-5 w-5" />
 <span className="hidden sm:inline">{t('close')}</span>
 </button>

 {/* Center: Chapter name with unsaved dot */}
 <div className="absolute left-1/2 -translate-x-1/2 text-center">
 <span className="text-sm font-medium text-foreground/80 flex items-center gap-1.5">
 {unsavedChanges && (
 <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 inline-block" />
 )}
 {detectedBookType === 'text'
 ? currentChapter?.title || bookTitle
 : t('pageNumber', { number: currentPage + 1 })
 }
 </span>
 </div>

 {/* Right: Progress dots */}
 <div className="flex items-center">
 {renderProgressDots()}
 </div>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* MAIN CONTENT AREA */}
 <ProtectedContent
 showWarningOnAttempt={!purchased}
 watermark={purchased ? undefined : `\u00A9 ${bookTitle}`}
 blurOnScreenshot={!purchased}
 blurOnDevTools={!purchased}
 blurOnFocusLoss={false}
 maxProtection={!purchased}
 showDevToolsWarning={!purchased}
 disabled={purchased}
 >
 <div
 className="h-full overflow-y-auto overscroll-contain"
 style={{
 WebkitOverflowScrolling: 'touch',
 touchAction: 'pan-y'
 }}
 >
 <SwipeNavigation
 currentPage={currentPage}
 totalPages={totalPages}
 onPageChange={goToPage}
 disabled={saving || (!purchased && isPageLocked(currentPage))}
 className="h-full"
 >
 <div className="max-w-4xl mx-auto px-6 pt-16 pb-24 min-h-screen">
 {renderEditorContent()}
 </div>
 </SwipeNavigation>
 </div>
 </ProtectedContent>

 {/* BOTTOM BAR — fades in/out */}
 <AnimatePresence>
 {barsVisible && (
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: 10 }}
 transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
 className="absolute bottom-0 left-0 right-0 z-10"
 >
 <div className="bg-background/80 backdrop-blur-xl safe-area-bottom">
 <div className="flex items-center justify-between px-5 py-3">
 {/* Left: Word count */}
 <span className="text-xs text-foreground/40 tabular-nums">
 {detectedBookType === 'text'
 ? `${(currentChapter?.wordCount || 0).toLocaleString()} ${t('wordsCount')}`
 : `${currentPage + 1} / ${totalPages}`
 }
 </span>

 {/* Right: More button */}
 <button
 onClick={() => {
 impact('light')
 setShowBottomSheet(true)
 }}
 className="w-9 h-9 rounded-full flex items-center justify-center text-foreground/50 hover:text-foreground hover:bg-foreground/5 transition-colors"
 >
 <MoreHorizontal className="h-5 w-5" />
 </button>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* BOTTOM SHEET — Chapter list + Actions */}
 <BottomSheet
 isOpen={showBottomSheet}
 onClose={() => setShowBottomSheet(false)}
 title={detectedBookType === 'text' ? t('chapters') : t('pagesLabel')}
 maxHeight={70}
 >
 {renderBottomSheetContent()}
 </BottomSheet>

 {/* Purchase Modal */}
 {showPurchaseModal && (
 <DigitalPurchaseModal
 bookId={bookId}
 bookData={{
 title: bookTitle,
 genre: 'book',
 chapters: totalPages,
 purchased: purchased
 }}
 price={getBookPrice(detectedBookType)}
 onPurchaseSuccess={() => {
 setShowPurchaseModal(false)
 window.location.reload()
 }}
 isOpen={showPurchaseModal}
 onClose={() => setShowPurchaseModal(false)}
 />
 )}
 </motion.div>
 )
}
