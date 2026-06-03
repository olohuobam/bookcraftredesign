'use client'

import { useState, useEffect, useCallback, startTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight, BookOpen, Menu } from 'lucide-react'
import { BookFormat, BookPage, BookLayout, BOOK_FORMATS, DEFAULT_FORMAT } from '@/types/book-formats'
import { generateBookLayout } from '@/lib/book-layout-engine'
import { ProtectedContent } from '@/components/ContentProtection'
import { useLanguage } from '@/context/LanguageContext'

interface Chapter {
 id: string
 title: string
 content: string
 wordCount?: number
}

interface BookPageViewProps {
 chapters: Chapter[]
 bookTitle: string
 initialFormat?: BookFormat
 onFormatChange?: (format: BookFormat) => void
 isPurchased?: boolean // New: Check if book is purchased
}

export default function BookPageView({
 chapters,
 bookTitle,
 initialFormat = DEFAULT_FORMAT,
 onFormatChange,
 isPurchased = false // Default to not purchased
}: BookPageViewProps) {
 const { t } = useLanguage()
 const [format, setFormat] = useState<BookFormat>(initialFormat)
 const [layout, setLayout] = useState<BookLayout | null>(null)
 const [currentPageNumber, setCurrentPageNumber] = useState(1)
 const [showDoublePages, setShowDoublePages] = useState(true)
 const [showChapterMenu, setShowChapterMenu] = useState(false)

  // Filter chapters based on purchase status
 const visibleChapters = isPurchased ? chapters : chapters.slice(0, 1)

  // Generate layout when chapters or format changes
 useEffect(() => {
 if (visibleChapters.length > 0) {
 const newLayout = generateBookLayout(visibleChapters, format)
 startTransition(() => {
 setLayout(newLayout)
 if (currentPageNumber > newLayout.totalPages) {
 setCurrentPageNumber(1)
 }
 })
 }
 }, [visibleChapters, format, isPurchased])

  // Handle format change
 const handleFormatChange = (formatId: string) => {
 const newFormat = Object.values(BOOK_FORMATS).find(f => f.id === formatId)
 if (newFormat) {
 setFormat(newFormat)
 if (onFormatChange) {
 onFormatChange(newFormat)
 }
 }
 }

  // Navigation
 const goToNextPage = useCallback(() => {
 if (!layout) return
 const nextPage = showDoublePages ? currentPageNumber + 2 : currentPageNumber + 1
 if (nextPage <= layout.totalPages) {
 setCurrentPageNumber(nextPage)
 }
 }, [layout, currentPageNumber, showDoublePages])

 const goToPreviousPage = useCallback(() => {
 if (!layout) return
 const prevPage = showDoublePages ? currentPageNumber - 2 : currentPageNumber - 1
 if (prevPage >= 1) {
 setCurrentPageNumber(prevPage)
 }
 }, [layout, currentPageNumber, showDoublePages])

 const goToChapter = (chapterIndex: number) => {
 if (!layout) return
 const startPage = layout.chaptersMap.get(chapterIndex)
 if (startPage) {
 setCurrentPageNumber(startPage)
 setShowChapterMenu(false)
 }
 }

  // Keyboard navigation
 useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 if (e.key === 'ArrowRight' || e.key === ' ') {
 e.preventDefault()
 goToNextPage()
 } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
 e.preventDefault()
 goToPreviousPage()
 }
 }

 window.addEventListener('keydown', handleKeyDown)
 return () => window.removeEventListener('keydown', handleKeyDown)
 }, [goToNextPage, goToPreviousPage])

  // Early return if no layout or chapters
 if (!layout || !layout.pages || layout.pages.length === 0 || !visibleChapters || visibleChapters.length === 0) {
 return (
 <div className="flex items-center justify-center h-full bg-[#fafafa]">
 <div className="text-center">
 <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
 <p className="text-gray-600 text-sm">Preparing book view...</p>
 </div>
 </div>
 )
 }

 const currentPage = layout.pages.find(p => p.pageNumber === currentPageNumber)
 const nextPageInDouble = showDoublePages ? layout.pages.find(p => p.pageNumber === currentPageNumber + 1) : null

 const canGoNext = showDoublePages
 ? currentPageNumber + 2 <= layout.totalPages
 : currentPageNumber < layout.totalPages
 const canGoPrev = currentPageNumber > 1

  // Calculate scale for page display - much larger for readability
  // A5 is 14.8cm wide, we want it to be about 450-500px wide on screen
 const pageScale = 32 // pixels per cm (was 3.5)

 return (
 <div className="h-full flex flex-col bg-[#fafafa]">
 {/* Apple-Style Top Bar - Ultra Minimal */}
 <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/60 px-6 py-2.5 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <Button
 size="sm"
 variant="ghost"
 onClick={() => setShowChapterMenu(!showChapterMenu)}
 className="text-gray-600 hover:text-gray-900 hover:bg-gray-100/50 transition-all"
 >
 <Menu className="h-4 w-4 mr-1.5" />
 <span className="text-sm font-medium">{t('chapter')}</span>
 </Button>

 <div className="hidden md:flex items-center gap-2">
 <Select value={format.id} onValueChange={handleFormatChange}>
 <SelectTrigger className="w-40 h-8 text-xs border-gray-200 hover:border-gray-300 transition-colors">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {Object.values(BOOK_FORMATS).map(f => (
 <SelectItem key={f.id} value={f.id} className="text-xs">
 {f.displayName}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="flex items-center gap-4">
 <div className="hidden lg:flex items-center gap-2">
 <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer hover:text-gray-900 transition-colors">
 <input
 type="checkbox"
 checked={showDoublePages}
 onChange={(e) => setShowDoublePages(e.target.checked)}
 className="rounded w-3.5 h-3.5"
 />
 <span className="font-medium">{t('doublePage')}</span>
 </label>
 </div>

 <div className="text-xs text-gray-500 font-medium tabular-nums">
 {currentPageNumber} / {layout.totalPages}
 </div>
 </div>
 </div>

 {/* Chapter Menu - Apple Style */}
 {showChapterMenu && layout && (
 <div className="bg-white/95 backdrop-blur-xl border-b border-gray-200/60 p-5">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
 {visibleChapters && visibleChapters.map((chapter, index) => {
 const startPage = layout.chaptersMap.get(index) || 1
 const isLocked = !isPurchased && index > 0
 return (
 <button
 key={chapter.id}
 onClick={() => !isLocked && goToChapter(index)}
 disabled={isLocked}
 className={`text-left px-3 py-2.5 rounded-lg transition-all ${
 isLocked
 ? 'opacity-40 cursor-not-allowed bg-gray-50'
 : 'hover:bg-gray-100 active:scale-[0.98]'
 }`}
 >
 <div className="font-medium text-sm text-gray-900 truncate">
 {chapter.title}
 </div>
 <div className="text-xs text-gray-500 mt-0.5 tabular-nums">
 Page {startPage}
 </div>
 </button>
 )
 })}
 </div>
 </div>
 )}

 {/* Book Pages Display - Apple Centered Design */}
 {/* For purchased books, copy protection is disabled */}
 <ProtectedContent
 className="flex-1 overflow-auto flex items-center justify-center p-8"
 showWarningOnAttempt={!isPurchased}
 warningMessage="This book content is copyrighted."
 disabled={isPurchased}
 >
 <div className="relative">
 {/* Minimal Navigation Buttons */}
 <button
 onClick={goToPreviousPage}
 disabled={!canGoPrev}
 className={`absolute left-[-80px] top-1/2 -translate-y-1/2 z-10 hidden xl:flex
 w-12 h-12 items-center justify-center rounded-full
 bg-white/90 backdrop-blur-sm border border-gray-200
 hover:bg-white hover:scale-110 active:scale-95
 disabled:opacity-30 disabled:cursor-not-allowed
 transition-all duration-200 shadow-sm hover:shadow-md`}
 >
 <ChevronLeft className="h-5 w-5 text-gray-700" />
 </button>

 {/* Pages Container */}
 <div className="flex gap-6">
 {currentPage && (
 <PageComponent
 page={currentPage}
 format={format}
 scale={pageScale}
 bookTitle={bookTitle}
 isLastFreePage={!isPurchased && currentPage.chapterIndex === 0 && !nextPageInDouble}
 />
 )}

 {showDoublePages && nextPageInDouble && (
 <PageComponent
 page={nextPageInDouble}
 format={format}
 scale={pageScale}
 bookTitle={bookTitle}
 isLastFreePage={false}
 />
 )}
 </div>

 <button
 onClick={goToNextPage}
 disabled={!canGoNext}
 className={`absolute right-[-80px] top-1/2 -translate-y-1/2 z-10 hidden xl:flex
 w-12 h-12 items-center justify-center rounded-full
 bg-white/90 backdrop-blur-sm border border-gray-200
 hover:bg-white hover:scale-110 active:scale-95
 disabled:opacity-30 disabled:cursor-not-allowed
 transition-all duration-200 shadow-sm hover:shadow-md`}
 >
 <ChevronRight className="h-5 w-5 text-gray-700" />
 </button>
 </div>
 </ProtectedContent>

 {/* Bottom Bar - Minimal Progress */}
 <div className="bg-white/80 backdrop-blur-xl border-t border-gray-200/60 px-6 py-3 flex items-center justify-center gap-6">
 <button
 onClick={goToPreviousPage}
 disabled={!canGoPrev}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
 text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed
 transition-all active:scale-95"
 >
 <ChevronLeft className="h-4 w-4" />
 <span>{t('back')}</span>
 </button>

 <div className="flex items-center gap-3">
 <div className="h-1 w-56 bg-gray-200 rounded-full overflow-hidden">
 <div
 className="h-full bg-gray-900 transition-all duration-300 ease-out rounded-full"
 style={{ width: `${(currentPageNumber / layout.totalPages) * 100}%` }}
 />
 </div>
 <span className="text-xs text-gray-500 font-medium tabular-nums min-w-[60px] text-center">
 {currentPageNumber} / {layout.totalPages}
 </span>
 </div>

 <button
 onClick={goToNextPage}
 disabled={!canGoNext}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
 text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed
 transition-all active:scale-95"
 >
 <span>{t('next')}</span>
 <ChevronRight className="h-4 w-4" />
 </button>
 </div>
 </div>
 )
}

// Single Page Component
interface PageComponentProps {
 page: BookPage
 format: BookFormat
 scale: number
 bookTitle: string
 isLastFreePage?: boolean
}

function PageComponent({
 page,
 format,
 scale,
 bookTitle,
 isLastFreePage = false
}: PageComponentProps) {
 const pageWidth = format.width * scale
 const pageHeight = format.height * scale
 const marginTop = format.margins.top * scale
 const marginBottom = format.margins.bottom * scale
 const marginInner = format.margins.inner * scale
 const marginOuter = format.margins.outer * scale

  // Left page: inner margin is on right, outer on left
  // Right page: inner margin is on left, outer on right
 const marginLeft = page.isLeftPage ? marginOuter : marginInner
 const marginRight = page.isLeftPage ? marginInner : marginOuter

 return (
 <div
 className="book-page shadow-2xl relative group"
 style={{
 width: `${pageWidth}px`,
 height: `${pageHeight}px`,
 minWidth: `${pageWidth}px`,
 minHeight: `${pageHeight}px`,
 }}
 >
 {/* Page Content */}
 <div
 className="absolute overflow-hidden"
 style={{
 top: `${marginTop}px`,
 left: `${marginLeft}px`,
 right: `${marginRight}px`,
 bottom: `${marginBottom}px`,
 }}
 >
 {/* Running Header - Minimal Apple Style */}
 {!page.hasChapterStart && (
 <div className="mb-5 pb-2 border-b border-gray-100">
 <div
 className={`text-gray-300 uppercase tracking-[0.15em] font-medium ${
 page.isRightPage ? 'text-right' : 'text-left'
 }`}
 style={{
 fontSize: '7px',
 fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif'
 }}
 >
 {page.isRightPage ? page.chapterTitle : bookTitle}
 </div>
 </div>
 )}

 {/* Chapter Title - Apple Typography */}
 {page.hasChapterStart && (
 <div className="mb-12 text-center">
 <h2
 className="font-semibold text-gray-900 tracking-tight"
 style={{
 fontSize: '15px',
 fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
 letterSpacing: '-0.01em',
 lineHeight: '1.3'
 }}
 >
 {page.chapterTitle}
 </h2>
 </div>
 )}

 {/* Page Text Content - Perfect Typography */}
 <div
 className="text-gray-900"
 style={{
 fontSize: '11.5px',
 lineHeight: '1.7',
 fontFamily: 'Georgia, Charter, "Times New Roman", serif',
 textAlign: 'justify',
 hyphens: 'none',
 wordSpacing: '0.01em',
 letterSpacing: '0.01em',
 maxHeight: '100%',
 overflow: 'hidden'
 }}
 >
 {page.content && typeof page.content === 'string' && page.content.split('\n\n').map((paragraph, idx) => (
 <p
 key={idx}
 className="mb-3.5 first:indent-0"
 style={{
 textIndent: idx === 0 ? '0' : '1.5em',
 color: '#1d1d1f' // Apple's text color
 }}
 >
 {paragraph}
 </p>
 ))}
 </div>

 {/* Page Number - Minimal */}
 <div
 className={`absolute bottom-0 text-gray-300 font-light tabular-nums ${
 page.isRightPage ? 'right-0' : 'left-0'
 }`}
 style={{
 fontSize: '9px',
 fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif'
 }}
 >
 {page.pageNumber}
 </div>
 </div>

 {/* Paywall Overlay for Last Free Page */}
 {isLastFreePage && (
 <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/60 to-transparent
 flex items-end justify-center pb-12 pointer-events-none">
 <div className="text-center pointer-events-auto">
 <div className="text-sm font-medium text-gray-900 mb-2">
 Continue Reading
 </div>
 <div className="text-xs text-gray-500">
 Purchase the book for full access
 </div>
 </div>
 </div>
 )}
 </div>
 )
}
