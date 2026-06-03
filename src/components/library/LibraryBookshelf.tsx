"use client"

import React, { useState, useMemo, useEffect, useRef, useCallback, TouchEvent, startTransition } from "react"
import NextImage from "next/image"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { gsap } from "gsap"
import {
 Search,
 BookOpen,
 Pencil,
 Share2,
 Trash2,
 ChevronDown,
 Calendar,
 SortAsc,
 Hash,
 FileText,
 Clock,
 LayoutGrid,
 List,
 Eye,
 X,
 ArrowLeft,
 RefreshCw,
 ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useLanguage } from '@/context/LanguageContext'
import type { TranslationKey } from '@/lib/translations'

// Types
interface Book {
 id: string
 title: string
 author?: string
 genre: string
 description: string
 chapters: number
 bookType?: "text" | "picture" | "production"
 status?: "draft" | "generating" | "processing" | "completed" | "error"
 coverImage?: string
 createdAt?: string
 updatedAt?: string
 chaptersJson?: { chapters?: { content?: string }[] }
 content?: string
 activeJobId?: string | null
 isPublic?: boolean
}

interface LibraryBookshelfProps {
 books: Book[]
 onDeleteBook?: (bookId: string) => void
 onReorderBooks?: (bookIds: string[]) => void
 onRefresh?: () => Promise<void>
 isLoading?: boolean
}

// Desktop Context Menu State
interface ContextMenuState {
 isOpen: boolean
 position: { x: number; y: number }
 book: Book | null
}

// Note: These will be translated in the component using t() function
const CATEGORIES = [
 { id: "all", labelKey: "all", icon: "" },
 { id: "fantasy", labelKey: "fantasy", icon: "" },
 { id: "romance", labelKey: "romance", icon: "" },
 { id: "thriller", labelKey: "thriller", icon: "" },
 { id: "sci-fi", labelKey: "sciFi", icon: "" },
 { id: "sachbuch", labelKey: "nonFiction", icon: "" },
] as const

const SORT_OPTIONS = [
 { id: "date", labelKey: "newest", icon: Calendar },
 { id: "title", labelKey: "aToZ", icon: SortAsc },
 { id: "words", labelKey: "words", icon: Hash },
 { id: "chapters", labelKey: "chapters", icon: FileText },
] as const

// Utility functions
const getWordCount = (book: Book): number => {
 let totalWords = 0
 if (book.chaptersJson?.chapters) {
 book.chaptersJson.chapters.forEach((chapter: { content?: string }) => {
 if (chapter.content) {
 totalWords += chapter.content.split(/\s+/).filter(Boolean).length
 }
 })
 } else if (book.content) {
 totalWords = book.content.split(/\s+/).filter(Boolean).length
 }
 return totalWords
}

const getBookThickness = (book: Book): number => {
 const chapters = book.chapters || 1
 const words = getWordCount(book)
 const baseThickness = 8
 const chapterBonus = Math.min(chapters * 1.2, 10)
 const wordBonus = Math.min(Math.floor(words / 2000), 6)
 return Math.round(baseThickness + chapterBonus + wordBonus)
}

const getStatusInfo = (book: Book, t: (key: TranslationKey) => string) => {
 if (book.activeJobId || book.status === "generating" || book.status === "processing") {
 return { color: "bg-bookcraft-blue/70", label: t("generating"), pulse: true }
 }
 if (book.status === "error") {
 return { color: "bg-red-500", label: t("errorStatus"), pulse: false }
 }
 if (book.status === "completed") {
 return { color: "bg-emerald-500", label: t("completedStatus"), pulse: false }
 }
 return { color: "bg-sky-400", label: t("draftStatus"), pulse: false }
}

const getBookColors = (genre: string, bookType?: string) => {
 if (bookType === "picture") return { primary: "#0ea5e9", secondary: "#0284c7" }
 const g = genre.toLowerCase()
 if (g.includes("fantasy")) return { primary: "#3b82f6", secondary: "#2563eb" }
 if (g.includes("romance")) return { primary: "#06b6d4", secondary: "#0891b2" }
 if (g.includes("thriller")) return { primary: "#64748b", secondary: "#475569" }
 if (g.includes("sci-fi")) return { primary: "#0ea5e9", secondary: "#0284c7" }
 if (g.includes("sach")) return { primary: "#1e40af", secondary: "#1e3a8a" }
 return { primary: "#0ea5e9", secondary: "#0284c7" }
}

// Hooks
const useIsMobile = () => {
 const [isMobile, setIsMobile] = useState(true)
 useEffect(() => {
 // Use touch capability + screen width for reliable mobile detection
 const check = () => {
 const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)
 setIsMobile(isTouch || window.innerWidth < 768)
 }
 check()
 window.addEventListener("resize", check)
 return () => window.removeEventListener("resize", check)
 }, [])
 return isMobile
}

const haptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
 if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
 navigator.vibrate({ light: 10, medium: 20, heavy: 30 }[style])
 }
}

// Shimmer Skeleton Component
const ShimmerSkeleton = ({ className }: { className?: string }) => (
 <div className={cn("relative overflow-hidden bg-muted rounded-xl", className)}>
 <div
 className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
 style={{
 background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
 }}
 />
 </div>
)

// Book Skeleton with Shimmer
const BookCardSkeleton = () => (
 <div className="flex flex-col">
 <ShimmerSkeleton className="aspect-[2/3] rounded-xl" />
 <div className="mt-3 space-y-2 px-1">
 <ShimmerSkeleton className="h-4 w-3/4 mx-auto" />
 <ShimmerSkeleton className="h-3 w-1/2 mx-auto" />
 </div>
 </div>
)

// Pull to Refresh Component
const PullToRefresh = ({
 onRefresh,
 children
}: {
 onRefresh?: () => Promise<void>
 children: React.ReactNode
}) => {
 const [pullDistance, setPullDistance] = useState(0)
 const [isRefreshing, setIsRefreshing] = useState(false)
 const startY = useRef(0)
 const containerRef = useRef<HTMLDivElement>(null)

 const handleTouchStart = (e: TouchEvent) => {
 if (containerRef.current?.scrollTop === 0) {
 startY.current = e.touches[0].clientY
 }
 }

 const handleTouchMove = (e: TouchEvent) => {
 if (startY.current === 0 || isRefreshing) return
 const currentY = e.touches[0].clientY
 const diff = currentY - startY.current
 if (diff > 0 && containerRef.current?.scrollTop === 0) {
 setPullDistance(Math.min(diff * 0.5, 100))
 }
 }

 const handleTouchEnd = async () => {
 if (pullDistance > 60 && onRefresh) {
 setIsRefreshing(true)
 haptic('medium')
 await onRefresh()
 setIsRefreshing(false)
 }
 setPullDistance(0)
 startY.current = 0
 }

 return (
 <div
 ref={containerRef}
 className="relative"
 onTouchStart={handleTouchStart}
 onTouchMove={handleTouchMove}
 onTouchEnd={handleTouchEnd}
 >
 {/* Pull indicator */}
 <div
 className={cn(
 "absolute left-1/2 -translate-x-1/2 flex items-center justify-center transition-all duration-300 ease-out z-10",
 pullDistance > 0 ? "opacity-100" : "opacity-0"
 )}
 style={{ top: pullDistance - 45 }}
 >
 <div className={cn(
 "w-12 h-12 rounded-2xl bg-white/90 dark:bg-gray-800/90 shadow-xl backdrop-blur-md flex items-center justify-center border border-white/20",
 isRefreshing && "animate-spin",
 pullDistance > 60 && "scale-110"
 )}>
 <RefreshCw className={cn(
 "w-6 h-6 transition-all duration-200",
 pullDistance > 60 ? "text-bookcraft-blue" : "text-muted-foreground"
 )} style={{ transform: `rotate(${pullDistance * 3}deg)` }} />
 </div>
 </div>

 <div style={{ transform: `translateY(${pullDistance}px)`, transition: pullDistance === 0 ? 'transform 0.3s' : 'none' }}>
 {children}
 </div>
 </div>
 )
}

// Fullscreen Search Component
const FullscreenSearch = ({
 isOpen,
 onClose,
 searchQuery,
 setSearchQuery,
 books,
 onSelectBook,
 t,
}: {
 isOpen: boolean
 onClose: () => void
 searchQuery: string
 setSearchQuery: (q: string) => void
 books: Book[]
 onSelectBook: (book: Book) => void
 t: (key: TranslationKey) => string
}) => {
 const inputRef = useRef<HTMLInputElement>(null)
 const [mounted, setMounted] = useState(false)
 const [recentSearches] = useState<string[]>(() => {
 if (typeof window !== 'undefined') {
 const saved = localStorage.getItem('bookcraft-recent-searches')
 return saved ? JSON.parse(saved) : []
 }
 return []
 })

 useEffect(() => {
 startTransition(() => { setMounted(true) })
 }, [])

 useEffect(() => {
 if (isOpen && inputRef.current) {
 setTimeout(() => inputRef.current?.focus(), 100)
 }
 }, [isOpen])

 const filteredBooks = useMemo(() => {
 if (!searchQuery) return []
 const q = searchQuery.toLowerCase()
 return books.filter(b =>
 b.title.toLowerCase().includes(q) ||
 b.author?.toLowerCase().includes(q) ||
 b.genre.toLowerCase().includes(q)
 ).slice(0, 5)
 }, [searchQuery, books])

 const handleSelect = (book: Book) => {
    // Save to recent searches
 const searches = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5)
 localStorage.setItem('bookcraft-recent-searches', JSON.stringify(searches))
 onSelectBook(book)
 onClose()
 }

 if (!isOpen || !mounted) return null

 return createPortal(
 <div className="fixed inset-0 z-[9999] bg-background">
 {/* Header */}
 <div className="flex items-center gap-4 p-5 border-b border-border/30 bg-background/95 backdrop-blur-xl">
 <button onClick={onClose} className="p-3 -ml-1 min-w-[48px] min-h-[48px] rounded-2xl active:bg-muted/60 flex items-center justify-center transition-all duration-150 active:scale-[0.95]">
 <ArrowLeft className="w-6 h-6" />
 </button>
 <div className="flex-1 relative">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
 <input
 ref={inputRef}
 type="text"
 placeholder={t("searchBooks")}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full h-14 pl-12 pr-14 bg-muted/60 rounded-3xl text-[16px] outline-none focus:ring-2 focus:ring-bookcraft-blue/30 border border-border/30 backdrop-blur-sm transition-all duration-200 focus:bg-muted/80"
 />
 {searchQuery && (
 <button
 onClick={() => setSearchQuery('')}
 className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 min-w-[36px] min-h-[36px] rounded-2xl bg-muted-foreground/10 flex items-center justify-center active:scale-[0.9] transition-all duration-150"
 >
 <X className="w-4 h-4 text-muted-foreground" />
 </button>
 )}
 </div>
 </div>

 {/* Results or Recent */}
 <div className="p-5">
 {searchQuery ? (
 <>
 <p className="text-sm font-semibold text-muted-foreground mb-4">
 {filteredBooks.length} {t("results")}
 </p>
 <div className="space-y-3">
 {filteredBooks.map(book => {
 const colors = getBookColors(book.genre, book.bookType)
 return (
 <button
 key={book.id}
 onClick={() => handleSelect(book)}
 className="w-full flex items-center gap-4 p-4 rounded-3xl bg-muted/60 active:bg-muted/80 transition-all duration-200 text-left active:scale-[0.98] backdrop-blur-sm border border-border/30"
 >
 <div
 className="w-14 h-18 rounded-xl flex-shrink-0 flex items-center justify-center shadow-md"
 style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
 >
 {book.coverImage ? (
 <NextImage src={book.coverImage} alt="" fill sizes="56px" className="object-cover rounded-xl" loading="lazy" />
 ) : (
 <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 relative overflow-hidden rounded-xl">
 <div className="absolute top-0 right-0 w-8 h-8 bg-bookcraft-blue/20 rounded-full blur-md" />
 <div className="absolute bottom-0 left-0 w-6 h-6 bg-bookcraft-blue/20 rounded-full blur-md" />
 <span className="text-white/90 text-center text-[8px] font-semibold leading-tight line-clamp-3 relative z-10">{book.title}</span>
 </div>
 )}
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-semibold text-foreground truncate text-base">{book.title}</p>
 <p className="text-sm text-muted-foreground truncate mt-1 font-medium">{book.genre}</p>
 </div>
 <ChevronRight className="w-5 h-5 text-muted-foreground/60" />
 </button>
 )
 })}
 </div>
 </>
 ) : (
 <>
 {recentSearches.length > 0 && (
 <>
 <p className="text-sm font-bold text-foreground mb-4">{t("recentSearches")}</p>
 <div className="flex flex-wrap gap-3">
 {recentSearches.map((search, i) => (
 <button
 key={i}
 onClick={() => setSearchQuery(search)}
 className="px-5 py-3 bg-muted/60 rounded-2xl text-sm font-medium text-foreground active:bg-muted/80 transition-all duration-150 active:scale-[0.96] backdrop-blur-sm border border-border/30"
 >
 {search}
 </button>
 ))}
 </div>
 </>
 )}
 </>
 )}
 </div>
 </div>,
 document.body
 )
}

// Mobile Book Card - Larger & Better
const MobileBookCard = ({
 book,
 index,
 onOpen,
 onLongPress,
 t,
}: {
 book: Book
 index: number
 onOpen: (book: Book) => void
 onLongPress: (book: Book) => void
 t: (key: TranslationKey) => string
}) => {
 const bookRef = useRef<HTMLDivElement>(null)
 const [isPressed, setIsPressed] = useState(false)
 const touchMoved = useRef(false)
 const touchStart = useRef({ x: 0, y: 0 })
 const longPressTimer = useRef<NodeJS.Timeout | null>(null)
 const longPressTriggered = useRef(false)

 const thickness = getBookThickness(book)
 const statusInfo = getStatusInfo(book, t)
 const colors = getBookColors(book.genre, book.bookType)

 useEffect(() => {
 if (bookRef.current) {
 gsap.fromTo(bookRef.current,
 { opacity: 0, y: 40, scale: 0.85 },
 {
 opacity: 1, y: 0, scale: 1,
 duration: 0.5,
 delay: index * 0.06,
 ease: "back.out(1.4)"
 }
 )
 }
 }, [index])

 const handleTouchStart = (e: TouchEvent) => {
 touchMoved.current = false
 longPressTriggered.current = false
 touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
 setIsPressed(true)

 // No long press timer — short tap opens menu directly
 longPressTimer.current = null
 }

 const handleTouchMove = (e: TouchEvent) => {
 const dx = Math.abs(e.touches[0].clientX - touchStart.current.x)
 const dy = Math.abs(e.touches[0].clientY - touchStart.current.y)
 if (dx > 10 || dy > 10) {
 touchMoved.current = true
 }
 setIsPressed(false)
 }

 const handleTouchEnd = (e: TouchEvent) => {
 setIsPressed(false)
 if (longPressTimer.current) {
 clearTimeout(longPressTimer.current)
 longPressTimer.current = null
 }
 if (!touchMoved.current && !longPressTriggered.current) {
 // Prevent the synthetic click event that would ghost-close the bottom sheet
 e.preventDefault()
 haptic('light')
 onOpen(book)
 }
 }

 return (
 <div
 ref={bookRef}
 className="relative touch-manipulation select-none"
 onTouchStart={handleTouchStart}
 onTouchMove={handleTouchMove}
 onTouchEnd={handleTouchEnd}
 >
 {/* Book Container */}
 <div className={cn(
 "relative mx-auto transition-all duration-300 ease-out",
 isPressed && "scale-94 -translate-y-2"
 )}>
 {/* Enhanced Shadow */}
 <div className={cn(
 "absolute left-3 right-3 h-7 bg-black/20 blur-2xl rounded-full -bottom-4 transition-all duration-300",
 isPressed && "bg-black/30 -bottom-5 blur-3xl h-8"
 )} />

 {/* Book */}
 <div
 className="relative rounded-2xl overflow-hidden aspect-[2/3]"
 style={{
 transformStyle: "preserve-3d",
 transform: "perspective(600px) rotateY(-5deg)",
 }}
 >
 {/* Spine */}
 <div
 className="absolute top-0 left-0 h-full rounded-l-2xl"
 style={{
 width: `${thickness}px`,
 background: `linear-gradient(to right, ${colors.secondary}, ${colors.primary})`,
 boxShadow: "inset -3px 0 8px rgba(0,0,0,0.25)",
 }}
 />

 {/* Cover */}
 <div
 className="absolute top-0 right-0 bottom-0 overflow-hidden rounded-r-2xl"
 style={{
 left: `${thickness}px`,
 background: `linear-gradient(145deg, ${colors.primary}, ${colors.secondary})`,
 boxShadow: "6px 6px 20px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)",
 }}
 >
 {book.coverImage ? (
 <NextImage
 src={book.coverImage}
 alt={book.title}
 fill
 sizes="(max-width: 640px) 40vw, (max-width: 1024px) 25vw, 20vw"
 loading="lazy"
 className={cn(
 "object-cover transition-transform duration-500 ease-out",
 isPressed && "scale-105"
 )}
 />
 ) : (
 <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 relative overflow-hidden">
 {/* Decorative elements */}
 <div className="absolute top-0 right-0 w-32 h-32 bg-bookcraft-blue/20 rounded-full blur-2xl" />
 <div className="absolute bottom-0 left-0 w-24 h-24 bg-bookcraft-blue/20 rounded-full blur-2xl" />
 {/* Title */}
 <span className="text-white/90 text-center text-xs sm:text-sm font-semibold font-display leading-tight line-clamp-3 relative z-10">{book.title}</span>
 </div>
 )}

 {/* Status */}
 <div className={cn(
 "absolute top-3 right-3 w-4 h-4 rounded-full ring-2 ring-white/70 shadow-sm",
 statusInfo.color,
 statusInfo.pulse && "animate-pulse"
 )} />

 {/* Enhanced Shine */}
 <div
 className="absolute inset-0 pointer-events-none"
 style={{
 background: "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 40%, transparent 70%)",
 }}
 />

 {/* Page edges with better depth */}
 <div className="absolute top-4 bottom-4 right-0 w-1.5 bg-gradient-to-r from-gray-100/80 to-white/90 rounded-r shadow-inner" />
 <div className="absolute top-5 bottom-5 right-1 w-0.5 bg-white/60 rounded-r" />
 </div>
 </div>
 </div>

 {/* Title with improved typography */}
 <div className="mt-4 px-1 text-center">
 <h3 className="font-semibold text-foreground truncate text-base leading-tight">{book.title}</h3>
 <p className="text-muted-foreground truncate text-sm mt-1 font-medium">{book.genre}</p>
 </div>
 </div>
 )
}

// Desktop Book Card
const DesktopBookCard = ({
 book,
 index,
 isSelected,
 isDragging,
 isDragOver,
 onOpen,
 onContextMenu,
 onDragStart,
 onDragEnd,
 onDragOver,
 onDragLeave,
 onDrop,
 t,
}: {
 book: Book
 index: number
 isSelected: boolean
 isDragging: boolean
 isDragOver: boolean
 onOpen: (book: Book) => void
 onContextMenu: (e: React.MouseEvent, book: Book) => void
 onDragStart: (book: Book) => void
 onDragEnd: () => void
 onDragOver: (book: Book) => void
 onDragLeave: () => void
 onDrop: (book: Book) => void
 t: (key: TranslationKey) => string
}) => {
 const bookRef = useRef<HTMLDivElement>(null)
 const isDraggingRef = useRef(false)
 const mouseDownPos = useRef({ x: 0, y: 0 })
 const thickness = getBookThickness(book)
 const statusInfo = getStatusInfo(book, t)
 const colors = getBookColors(book.genre, book.bookType)

 useEffect(() => {
 if (bookRef.current) {
 gsap.fromTo(bookRef.current,
 { opacity: 0, y: 20, scale: 0.95 },
 { opacity: 1, y: 0, scale: 1, duration: 0.4, delay: index * 0.03, ease: "power3.out" }
 )
 }
 }, [index])

 const handleMouseDown = (e: React.MouseEvent) => {
 mouseDownPos.current = { x: e.clientX, y: e.clientY }
 isDraggingRef.current = false
 }

 const handleDragStart = (e: React.DragEvent) => {
 isDraggingRef.current = true
 e.dataTransfer.effectAllowed = "move"
 e.dataTransfer.setData("text/plain", book.id)
 setTimeout(() => onDragStart(book), 0)
 }

 const handleClick = (e: React.MouseEvent) => {
 const dx = Math.abs(e.clientX - mouseDownPos.current.x)
 const dy = Math.abs(e.clientY - mouseDownPos.current.y)
 if (!isDraggingRef.current && dx < 5 && dy < 5) {
 onOpen(book)
 }
 isDraggingRef.current = false
 }

 return (
 <div
 ref={bookRef}
 tabIndex={0}
 draggable
 onMouseDown={handleMouseDown}
 onDragStart={handleDragStart}
 onDragEnd={() => { isDraggingRef.current = false; onDragEnd() }}
 onDragOver={(e) => { e.preventDefault(); onDragOver(book) }}
 onDragLeave={onDragLeave}
 onDrop={(e) => { e.preventDefault(); onDrop(book) }}
 onClick={handleClick}
 onContextMenu={(e) => onContextMenu(e, book)}
 onKeyDown={(e) => { if (e.key === "Enter") onOpen(book) }}
 className={cn(
 "group outline-none rounded-xl transition-all duration-150 cursor-pointer",
 "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900",
 "active:scale-[0.98] hover:shadow-lg",
 isSelected && "ring-2 ring-gray-900 ring-offset-2",
 isDragging && "opacity-30 scale-95",
 isDragOver && "scale-105"
 )}
 >
 {isDragOver && <div className="absolute -left-2 top-0 bottom-0 w-1 bg-bookcraft-blue rounded-full z-10" />}

 <div className="relative">
 <div className="relative transition-all duration-500 ease-out mx-auto group-hover:-translate-y-4" style={{ width: "140px" }}>
 <div className="absolute left-2 right-2 h-6 bg-black/15 blur-xl rounded-full -bottom-3 group-hover:bg-black/25 group-hover:-bottom-5 transition-all" />

 <div className="relative rounded-lg overflow-hidden" style={{ transformStyle: "preserve-3d", transform: "perspective(800px) rotateY(-5deg)" }}>
 <div
 className="absolute top-0 left-0 h-full rounded-l-lg"
 style={{
 width: `${thickness}px`,
 background: `linear-gradient(to right, ${colors.secondary}, ${colors.primary})`,
 boxShadow: "inset -2px 0 4px rgba(0,0,0,0.2)",
 }}
 />
 <div
 className="relative overflow-hidden rounded-r-lg"
 style={{
 marginLeft: `${thickness}px`,
 width: `${140 - thickness}px`,
 height: "200px",
 background: `linear-gradient(145deg, ${colors.primary}, ${colors.secondary})`,
 boxShadow: "4px 4px 15px rgba(0,0,0,0.2)",
 }}
 >
 {book.coverImage ? (
 <NextImage src={book.coverImage} alt={book.title} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
 ) : (
 <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 relative overflow-hidden">
 {/* Decorative elements */}
 <div className="absolute top-0 right-0 w-32 h-32 bg-bookcraft-blue/20 rounded-full blur-2xl" />
 <div className="absolute bottom-0 left-0 w-24 h-24 bg-bookcraft-blue/20 rounded-full blur-2xl" />
 {/* Title */}
 <span className="text-white/90 text-center text-xs sm:text-sm font-semibold font-display leading-tight line-clamp-3 relative z-10">{book.title}</span>
 </div>
 )}
 <div className={cn("absolute top-2 right-2 w-3 h-3 rounded-full ring-2 ring-white/50", statusInfo.color, statusInfo.pulse && "animate-pulse")} />
 <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
 <Eye className="w-5 h-5 text-white" />
 <span className="text-white text-sm font-medium">{t("openBook")}</span>
 </div>
 </div>
 <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 40%)" }} />
 </div>
 </div>
 </div>
 <div className="text-center mt-3">
 <h3 className="font-semibold text-foreground truncate text-sm">{book.title}</h3>
 <p className="text-muted-foreground truncate text-xs mt-0.5">{book.author || book.genre}</p>
 </div>
 </div>
 </div>
 )
}

// Enhanced Bottom Sheet
const BottomSheet = ({
 book,
 isOpen,
 onClose,
 onOpenBook,
 onEdit,
 onShare,
 onDelete,
 t,
}: {
 book: Book | null
 isOpen: boolean
 onClose: () => void
 onOpenBook: (book: Book) => void
 onEdit: (book: Book) => void
 onShare: (book: Book) => void
 onDelete: (book: Book) => void
 t: (key: TranslationKey) => string
}) => {
 const sheetRef = useRef<HTMLDivElement>(null)
 const [dragOffset, setDragOffset] = useState(0)
 const [mounted, setMounted] = useState(false)
 const [backdropReady, setBackdropReady] = useState(false)
 const startY = useRef(0)

 useEffect(() => {
 startTransition(() => { setMounted(true) })
 }, [])

 // Delay backdrop click handler to prevent ghost-click from touch events
 useEffect(() => {
 if (isOpen) {
 startTransition(() => { setBackdropReady(false) })
 const timer = setTimeout(() => setBackdropReady(true), 400)
 return () => clearTimeout(timer)
 } else {
 startTransition(() => { setBackdropReady(false) })
 }
 }, [isOpen])

 useEffect(() => {
 if (isOpen && sheetRef.current) {
 gsap.fromTo(sheetRef.current, { y: "100%" }, { y: 0, duration: 0.4, ease: "power3.out" })
 }
 }, [isOpen])

 const handleDragStart = (e: TouchEvent<HTMLDivElement>) => {
 startY.current = e.touches[0].clientY
 }

 const handleDrag = (e: TouchEvent<HTMLDivElement>) => {
 const diff = e.touches[0].clientY - startY.current
 if (diff > 0) setDragOffset(diff)
 }

 const handleDragEnd = () => {
 if (dragOffset > 120) {
 onClose()
 }
 setDragOffset(0)
 }

 if (!book || !isOpen || !mounted) return null

 const wordCount = getWordCount(book)
 const colors = getBookColors(book.genre, book.bookType)
 const statusInfo = getStatusInfo(book, t)

 return createPortal(
 <>
 {/* Backdrop with blur */}
 <div
 className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] transition-opacity"
 onClick={backdropReady ? onClose : undefined}
 />

 {/* Sheet */}
 <div
 ref={sheetRef}
 className="fixed bottom-0 left-0 right-0 z-[9999] bg-card rounded-t-[28px] max-h-[92vh] overflow-hidden shadow-2xl"
 style={{ transform: `translateY(${dragOffset}px)` }}
 >
 {/* Handle */}
 <div
 className="sticky top-0 bg-card pt-3 pb-2 cursor-grab z-10"
 onTouchStart={handleDragStart}
 onTouchMove={handleDrag}
 onTouchEnd={handleDragEnd}
 >
 <div className="w-12 h-1.5 bg-border rounded-full mx-auto" />
 </div>

 {/* Cover - no lazy loading in modal since it's immediately visible */}
 <div className="relative h-52" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>
 {book.coverImage ? (
 <NextImage src={book.coverImage} alt={book.title} fill sizes="(max-width: 768px) 100vw, 400px" priority className="object-cover" />
 ) : (
 <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 relative overflow-hidden">
 {/* Decorative elements */}
 <div className="absolute top-0 right-0 w-32 h-32 bg-bookcraft-blue/20 rounded-full blur-2xl" />
 <div className="absolute bottom-0 left-0 w-24 h-24 bg-bookcraft-blue/20 rounded-full blur-2xl" />
 {/* Title */}
 <span className="text-white/90 text-center text-xs sm:text-sm font-semibold font-display leading-tight line-clamp-3 relative z-10">{book.title}</span>
 </div>
 )}
 <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

 {/* Status Badge */}
 <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md">
 <div className={cn("w-2.5 h-2.5 rounded-full", statusInfo.color, statusInfo.pulse && "animate-pulse")} />
 <span className="text-xs font-medium text-white">{statusInfo.label}</span>
 </div>

 {/* Title */}
 <div className="absolute bottom-0 left-0 right-0 p-5">
 <h2 className="text-2xl font-bold font-display text-white mb-1">{book.title}</h2>
 <p className="text-white/80">{book.author || book.genre}</p>
 </div>
 </div>

 {/* Content */}
 <div className="p-5 pb-8">
 {/* Stats */}
 <div className="grid grid-cols-3 gap-3 mb-5">
 {[
 { icon: FileText, value: book.chapters, label: t("chapters") },
 { icon: Hash, value: wordCount.toLocaleString(), label: t("words") },
 { icon: Clock, value: Math.max(1, Math.round(wordCount / 200)), label: t("minutes") },
 ].map(({ icon: Icon, value, label }) => (
 <div key={label} className="text-center p-4 rounded-2xl bg-muted">
 <Icon className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
 <p className="text-xl font-bold text-foreground">{value}</p>
 <p className="text-xs text-muted-foreground">{label}</p>
 </div>
 ))}
 </div>

 {book.description && (
 <p className="text-muted-foreground mb-5 line-clamp-2 text-[15px]">{book.description}</p>
 )}

 {/* Primary Action */}
 <Button
 onClick={() => { haptic('medium'); onOpenBook(book) }}
 className="w-full h-16 rounded-3xl font-bold text-white text-[18px] shadow-lg mb-6 active:scale-[0.96] transition-all duration-200"
 style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
 >
 <BookOpen className="w-6 h-6 mr-3" />
 {t("openBook")}
 </Button>

 {/* Actions Grid */}
 <div className="grid grid-cols-3 gap-4">
 {[
 { icon: Pencil, label: t("edit"), action: () => onEdit(book), danger: false },
 { icon: Share2, label: t("share"), action: () => onShare(book), danger: false },
 { icon: Trash2, label: t("delete"), action: () => onDelete(book), danger: true },
 ].map(({ icon: Icon, label, action, danger }) => (
 <button
 key={label}
 onClick={() => { haptic('light'); action() }}
 className={cn(
 "flex flex-col items-center gap-2 p-4 min-h-[72px] rounded-3xl transition-all duration-200 active:scale-[0.95] backdrop-blur-sm border",
 danger 
 ? "bg-red-50/80 dark:bg-red-950/50 border-red-200/50 dark:border-red-800/50 hover:bg-red-100/80 dark:hover:bg-red-950/70" 
 : "bg-muted/80 border-border/50 hover:bg-muted active:bg-muted"
 )}
 >
 <Icon className={cn("w-6 h-6", danger ? "text-red-500" : "text-muted-foreground")} />
 <span className={cn("text-xs font-semibold", danger ? "text-red-500" : "text-muted-foreground")}>{label}</span>
 </button>
 ))}
 </div>
 </div>
 </div>
 </>,
 document.body
 )
}

// Desktop Context Menu Component
const DesktopContextMenu = ({
 contextMenu,
 onClose,
 onOpenBook,
 onEdit,
 onShare,
 onDelete,
 t,
}: {
 contextMenu: ContextMenuState
 onClose: () => void
 onOpenBook: (book: Book) => void
 onEdit: (book: Book) => void
 onShare: (book: Book) => void
 onDelete: (book: Book) => void
 t: (key: TranslationKey) => string
}) => {
 const menuRef = useRef<HTMLDivElement>(null)
 const [mounted, setMounted] = useState(false)
 const [focusedIndex, setFocusedIndex] = useState(0)
 const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])
 const MENU_ITEMS_COUNT = 4

 useEffect(() => {
 startTransition(() => { setMounted(true) })
 }, [])

 useEffect(() => {
 const handleClickOutside = (e: MouseEvent) => {
 if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
 onClose()
 }
 }
 const handleEsc = (e: KeyboardEvent) => {
 if (e.key === "Escape") onClose()
 }

 if (contextMenu.isOpen) {
 document.addEventListener("mousedown", handleClickOutside)
 document.addEventListener("keydown", handleEsc)
 }

 return () => {
 document.removeEventListener("mousedown", handleClickOutside)
 document.removeEventListener("keydown", handleEsc)
 }
 }, [contextMenu.isOpen, onClose])

  // Focus first item when menu opens
 useEffect(() => {
 if (contextMenu.isOpen) {
 startTransition(() => { setFocusedIndex(0) })
 setTimeout(() => buttonRefs.current[0]?.focus(), 0)
 }
 }, [contextMenu.isOpen])

  // Keyboard navigation handler
 const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
 switch (e.key) {
 case "ArrowDown":
 e.preventDefault()
 setFocusedIndex(prev => {
 const next = prev < MENU_ITEMS_COUNT - 1 ? prev + 1 : 0
 buttonRefs.current[next]?.focus()
 return next
 })
 break
 case "ArrowUp":
 e.preventDefault()
 setFocusedIndex(prev => {
 const next = prev > 0 ? prev - 1 : MENU_ITEMS_COUNT - 1
 buttonRefs.current[next]?.focus()
 return next
 })
 break
 case "Home":
 e.preventDefault()
 setFocusedIndex(0)
 buttonRefs.current[0]?.focus()
 break
 case "End":
 e.preventDefault()
 setFocusedIndex(MENU_ITEMS_COUNT - 1)
 buttonRefs.current[MENU_ITEMS_COUNT - 1]?.focus()
 break
 }
 }, [])

 if (!contextMenu.isOpen || !contextMenu.book || !mounted) return null

 const book = contextMenu.book
 const menuItems = [
 { icon: Eye, label: t("openBook"), action: () => { onOpenBook(book); onClose() }, danger: false },
 { icon: Pencil, label: t("edit"), action: () => { onEdit(book); onClose() }, danger: false },
 { icon: Share2, label: t("share"), action: () => { onShare(book); onClose() }, danger: false },
 { icon: Trash2, label: t("delete"), action: () => { onDelete(book); onClose() }, danger: true },
 ]

  // Adjust position to keep menu in viewport (ensure non-negative values)
 const adjustedPosition = {
 x: Math.max(0, Math.min(contextMenu.position.x, window.innerWidth - 200)),
 y: Math.max(0, Math.min(contextMenu.position.y, window.innerHeight - 250)),
 }

 return createPortal(
 <>
 {/* Invisible backdrop */}
 <div
 className="fixed inset-0 z-[9998]"
 onClick={onClose}
 aria-hidden="true"
 />

 {/* Context Menu */}
 <div
 ref={menuRef}
 role="menu"
 aria-label={t("bookActions")}
 onKeyDown={handleKeyDown}
 className="fixed z-[9999] w-48 bg-card rounded-xl shadow-xl border border-border py-2 animate-in fade-in zoom-in-95 duration-150"
 style={{
 left: adjustedPosition.x,
 top: adjustedPosition.y,
 }}
 >
 {menuItems.map(({ icon: Icon, label, action, danger }, index) => (
 <React.Fragment key={label}>
 {index === menuItems.length - 1 && (
 <div className="h-px bg-border my-1" aria-hidden="true" />
 )}
 <button
 ref={(el) => { buttonRefs.current[index] = el }}
 role="menuitem"
 tabIndex={focusedIndex === index ? 0 : -1}
 onClick={action}
 className={cn(
 "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset",
 danger
 ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
 : "text-foreground hover:bg-muted"
 )}
 >
 <Icon className={cn("w-4 h-4", danger && "text-red-500")} aria-hidden="true" />
 {label}
 </button>
 </React.Fragment>
 ))}
 </div>
 </>,
 document.body
 )
}

// Animated Empty State
const EmptyState = ({ onCreateBook, t }: { onCreateBook: () => void, t: (key: TranslationKey) => string }) => {
 const containerRef = useRef<HTMLDivElement>(null)

 useEffect(() => {
 if (containerRef.current) {
 gsap.fromTo(containerRef.current.children,
 { opacity: 0, y: 40 },
 { opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: "back.out(1.4)" }
 )
 }
 }, [])

 return (
 <div ref={containerRef} className="flex flex-col items-center justify-center py-24 px-6 text-center">
 {/* Animated Books Illustration */}
 <div className="relative w-36 h-36 mb-10">
 <div className="absolute inset-0 flex items-center justify-center">
 <div className="w-16 h-22 bg-gradient-to-br from-bookcraft-blue to-bookcraft-blue rounded-xl transform -rotate-12 shadow-xl" />
 <div className="w-16 h-22 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl transform rotate-6 shadow-xl -ml-8" />
 <div className="w-16 h-22 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl transform rotate-12 shadow-xl -ml-8" />
 </div>
 <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-28 h-5 bg-black/8 blur-2xl rounded-full" />
 </div>

 <h3 className="text-3xl font-bold font-display text-foreground mb-4">{t("yourLibraryEmpty")}</h3>
 <p className="text-muted-foreground mb-10 max-w-sm text-[16px] leading-relaxed font-medium">
 {t("createFirstBookDesc")}
 </p>

 <div
 style={{
  animation: 'pulse-glow 2.2s ease-in-out infinite',
 }}
 className="rounded-3xl"
 >
 <style>{`@keyframes pulse-glow{0%,100%{box-shadow:0 0 0 0 rgba(62,134,215,0)}50%{box-shadow:0 0 0 8px rgba(62,134,215,0.18)}}`}</style>
 <Button
  onClick={onCreateBook}
  className="bg-gradient-to-r from-bookcraft-blue to-bookcraft-blue hover:brightness-110 text-white rounded-3xl h-16 px-10 font-bold text-[17px] shadow-xl shadow-bookcraft-blue/25 active:scale-[0.95] transition-all duration-200"
 >
  {t("createFirstBook")}
 </Button>
 </div>
 </div>
 )
}

// Category Chips with horizontal scroll
const CategoryChips = ({
 categories,
 activeCategory,
 onChange,
 t,
}: {
 categories: typeof CATEGORIES
 activeCategory: string
 onChange: (id: string) => void
 t: (key: TranslationKey) => string
}) => {
 const scrollRef = useRef<HTMLDivElement>(null)

 return (
 <div
 ref={scrollRef}
 className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5 snap-x"
 >
 {categories.map((cat) => (
 <button
 key={cat.id}
 onClick={() => { haptic('light'); onChange(cat.id) }}
 className={cn(
 "flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-semibold whitespace-nowrap snap-start transition-all duration-200 backdrop-blur-sm border min-h-[48px]",
 activeCategory === cat.id
 ? "bg-bookcraft-blue text-white shadow-lg shadow-bookcraft-blue/25 border-bookcraft-blue scale-105"
 : "bg-card/80 text-muted-foreground border-border/50 active:scale-[0.96] hover:bg-card"
 )}
 >
 <span className="text-lg">{cat.icon}</span>
 {t(cat.labelKey)}
 </button>
 ))}
 </div>
 )
}

// Main Component
export default function LibraryBookshelf({
 books,
 onDeleteBook,
 onReorderBooks,
 onRefresh,
 isLoading = false,
}: LibraryBookshelfProps) {
 const router = useRouter()
 const isMobile = useIsMobile()
 const { t } = useLanguage()
 const [searchQuery, setSearchQuery] = useState("")
 const [activeCategory, setActiveCategory] = useState("all")
 const [sortBy, setSortBy] = useState("date")
 const [selectedBook, setSelectedBook] = useState<Book | null>(null)
 const [isModalOpen, setIsModalOpen] = useState(false)
 const [viewMode, setViewMode] = useState<"shelf" | "list">("shelf")
 const [showSearch, setShowSearch] = useState(false)
 const [showSortMenu, setShowSortMenu] = useState(false)
 const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
 const [draggingBookId, setDraggingBookId] = useState<string | null>(null)
 const [dragOverBookId, setDragOverBookId] = useState<string | null>(null)
 const [localBooks, setLocalBooks] = useState<Book[]>(books)
 const [contextMenu, setContextMenu] = useState<ContextMenuState>({
 isOpen: false,
 position: { x: 0, y: 0 },
 book: null,
 })

 useEffect(() => {
 setLocalBooks(books)
 }, [books])

 const filteredBooks = useMemo(() => {
 let result = [...localBooks]

 if (searchQuery) {
 const q = searchQuery.toLowerCase()
 result = result.filter(b =>
 b.title.toLowerCase().includes(q) ||
 b.author?.toLowerCase().includes(q) ||
 b.genre.toLowerCase().includes(q)
 )
 }

 if (activeCategory !== "all") {
 result = result.filter(b => b.genre.toLowerCase().includes(activeCategory.toLowerCase()))
 }

 switch (sortBy) {
 case "title": result.sort((a, b) => a.title.localeCompare(b.title)); break
 case "words": result.sort((a, b) => getWordCount(b) - getWordCount(a)); break
 case "chapters": result.sort((a, b) => b.chapters - a.chapters); break
 default: result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
 }

 return result
 }, [localBooks, searchQuery, activeCategory, sortBy])

  // Handlers
  // For mobile: opens bottom sheet, for desktop: navigates directly to book
 const handleOpenBook = useCallback((book: Book) => {
 if (isMobile) {
      // Mobile: Open bottom sheet with options
 setSelectedBook(book)
 setIsModalOpen(true)
 } else {
      // Desktop: Navigate directly to the book
 router.push(`/dashboard/books/${book.id}`)
 }
 }, [isMobile, router])

  // Context menu handler for desktop (right-click)
 const handleContextMenu = useCallback((e: React.MouseEvent, book: Book) => {
 e.preventDefault()
 setContextMenu({
 isOpen: true,
 position: { x: e.clientX, y: e.clientY },
 book,
 })
 }, [])

 const handleCloseContextMenu = useCallback(() => {
 setContextMenu(prev => ({ ...prev, isOpen: false }))
 }, [])

 const handleEditBook = useCallback((book: Book) => {
 setIsModalOpen(false)
 router.push(`/dashboard/books/${book.id}`)
 }, [router])

 const handleShareBook = useCallback((book: Book) => {
    // Point to the public shareable preview page (works without auth)
 const url = `${window.location.origin}/preview/${book.id}`
 if (navigator.share) {
 navigator.share({
 title: book.title,
 text: `Check out "${book.title}" — created with bookcraft.dev`,
 url,
 })
 } else {
 navigator.clipboard.writeText(url)
 }
 }, [])

 const handleDeleteBook = useCallback((book: Book) => {
 setIsModalOpen(false)
 onDeleteBook?.(book.id)
 }, [onDeleteBook])

 const handleModalOpenBook = useCallback((book: Book) => {
 setIsModalOpen(false)
 router.push(`/dashboard/books/${book.id}`)
 }, [router])

 const handleDrop = useCallback((targetBook: Book) => {
 if (!draggingBookId || draggingBookId === targetBook.id) return
 setLocalBooks(prev => {
 const newBooks = [...prev]
 const srcIdx = newBooks.findIndex(b => b.id === draggingBookId)
 const tgtIdx = newBooks.findIndex(b => b.id === targetBook.id)
 if (srcIdx === -1 || tgtIdx === -1) return prev
 const [removed] = newBooks.splice(srcIdx, 1)
 newBooks.splice(tgtIdx, 0, removed)
 onReorderBooks?.(newBooks.map(b => b.id))
 return newBooks
 })
 setDraggingBookId(null)
 setDragOverBookId(null)
 }, [draggingBookId, onReorderBooks])

  // Loading State
 if (isLoading) {
 return (
 <div className="w-full px-4 pt-4">
 <div className="flex gap-3 mb-6">
 <ShimmerSkeleton className="flex-1 h-12 rounded-2xl" />
 <ShimmerSkeleton className="w-12 h-12 rounded-2xl" />
 </div>
 <div className="flex gap-2 mb-6 overflow-hidden">
 {[1,2,3,4].map(i => <ShimmerSkeleton key={i} className="w-20 h-10 rounded-full flex-shrink-0" />)}
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
 {[1,2,3,4,5,6].map(i => <BookCardSkeleton key={i} />)}
 </div>
 </div>
 )
 }

 return (
 <PullToRefresh onRefresh={onRefresh}>
 <div className="w-full pb-24">
 {/* Header */}
 <div className="sticky top-0 z-20 bg-background/95 dark:bg-background/98 backdrop-blur-xl border-b border-border/30 px-5 py-4">
 {/* Search Bar */}
 <div className="flex gap-4 mb-5">
 <button
 onClick={() => setShowSearch(true)}
 className="flex-1 flex items-center gap-3 h-14 px-5 bg-muted/60 rounded-3xl text-muted-foreground backdrop-blur-sm border border-border/30 active:scale-[0.98] transition-all duration-200"
 >
 <Search className="w-5 h-5" />
 <span className="text-[16px] font-medium">{searchQuery || t("search")}</span>
 </button>

 {/* Sort Button */}
 <div className="relative">
 <button
 onClick={() => setShowSortMenu(!showSortMenu)}
 className={cn(
 "h-14 w-14 rounded-3xl flex items-center justify-center transition-all duration-200 backdrop-blur-sm border",
 showSortMenu 
 ? "bg-primary/10 text-primary border-primary/30" 
 : "bg-muted/60 text-muted-foreground border-border/30 active:scale-[0.95]"
 )}
 >
 <ChevronDown className={cn("w-5 h-5 transition-transform duration-200", showSortMenu && "rotate-180")} />
 </button>

 {showSortMenu && (
 <>
 <div className="fixed inset-0 z-30" onClick={() => setShowSortMenu(false)} />
 <div className="absolute right-0 top-full mt-3 w-48 bg-card/95 rounded-3xl shadow-2xl border border-border/50 p-2 z-40 backdrop-blur-xl">
 {SORT_OPTIONS.map(opt => (
 <button
 key={opt.id}
 onClick={() => { setSortBy(opt.id); setShowSortMenu(false); haptic('light') }}
 className={cn(
 "w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-medium transition-all duration-150",
 sortBy === opt.id 
 ? "bg-primary/10 text-primary" 
 : "hover:bg-muted/60 active:scale-[0.98]"
 )}
 >
 <opt.icon className="w-4 h-4" />
 {t(opt.labelKey)}
 </button>
 ))}
 </div>
 </>
 )}
 </div>

 {/* View Toggle */}
 <div className="flex bg-muted/60 rounded-3xl p-1.5 backdrop-blur-sm border border-border/30" role="group" aria-label={t("viewMode")}>
 {[
 { mode: "shelf" as const, icon: LayoutGrid, labelKey: "gridView" as const },
 { mode: "list" as const, icon: List, labelKey: "listView" as const },
 ].map(({ mode, icon: Icon, labelKey }) => (
 <button
 key={mode}
 onClick={() => setViewMode(mode)}
 aria-label={t(labelKey)}
 aria-pressed={viewMode === mode}
 className={cn(
 "p-3 min-w-[48px] min-h-[48px] rounded-2xl transition-all duration-200 flex items-center justify-center",
 viewMode === mode 
 ? "bg-card text-foreground shadow-md scale-105" 
 : "text-muted-foreground active:scale-[0.95]"
 )}
 >
 <Icon className="w-5 h-5" aria-hidden="true" />
 </button>
 ))}
 </div>
 </div>

 {/* Categories */}
 <CategoryChips
 categories={CATEGORIES}
 activeCategory={activeCategory}
 onChange={setActiveCategory}
 t={t}
 />
 </div>

 {/* Content */}
 <div className="px-4 pt-5">
 {books.length === 0 ? (
 <EmptyState onCreateBook={() => router.push("/dashboard/create")} t={t} />
 ) : filteredBooks.length === 0 ? (
 <div className="flex flex-col items-center py-16 text-center">
 <Search className="w-12 h-12 text-muted-foreground/50 mb-4" />
 <h3 className="text-lg font-semibold text-foreground mb-2">{t("noBooksFound")}</h3>
 <p className="text-muted-foreground mb-6">{t("tryDifferentSearch")}</p>
 <Button variant="outline" onClick={() => { setSearchQuery(""); setActiveCategory("all") }} className="rounded-2xl">
 {t("resetFilters")}
 </Button>
 </div>
 ) : (
 <div className={cn(
 "grid gap-5",
 viewMode === "shelf"
 ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
 : "grid-cols-1 max-w-2xl"
 )}>
 {filteredBooks.map((book, i) => (
 isMobile && viewMode === "shelf" ? (
 <MobileBookCard
 key={book.id}
 book={book}
 index={i}
 onOpen={handleOpenBook}
 onLongPress={handleOpenBook}
 t={t}
 />
 ) : viewMode === "shelf" ? (
 <DesktopBookCard
 key={book.id}
 book={book}
 index={i}
 isSelected={selectedBookId === book.id}
 isDragging={draggingBookId === book.id}
 isDragOver={dragOverBookId === book.id}
 onOpen={handleOpenBook}
 onContextMenu={handleContextMenu}
 onDragStart={(b) => setDraggingBookId(b.id)}
 onDragEnd={() => { setDraggingBookId(null); setDragOverBookId(null) }}
 onDragOver={(b) => draggingBookId && b.id !== draggingBookId && setDragOverBookId(b.id)}
 onDragLeave={() => setDragOverBookId(null)}
 onDrop={handleDrop}
 t={t}
 />
 ) : (
 <button
 key={book.id}
 onClick={() => handleOpenBook(book)}
 onContextMenu={(e) => !isMobile && handleContextMenu(e, book)}
 className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border active:bg-muted active:scale-[0.98] hover:shadow-md transition-all duration-150 text-left"
 >
 <div
 className="w-14 h-20 rounded-xl flex-shrink-0 shadow-md flex items-center justify-center"
 style={{ background: `linear-gradient(135deg, ${getBookColors(book.genre, book.bookType).primary}, ${getBookColors(book.genre, book.bookType).secondary})` }}
 >
 {book.coverImage ? (
 <NextImage src={book.coverImage} alt="" fill sizes="56px" className="object-cover rounded-xl" loading="lazy" />
 ) : (
 <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 relative overflow-hidden rounded-xl">
 <div className="absolute top-0 right-0 w-8 h-8 bg-bookcraft-blue/20 rounded-full blur-md" />
 <div className="absolute bottom-0 left-0 w-6 h-6 bg-bookcraft-blue/20 rounded-full blur-md" />
 <span className="text-white/90 text-center text-[8px] font-semibold leading-tight line-clamp-3 relative z-10">{book.title}</span>
 </div>
 )}
 </div>
 <div className="flex-1 min-w-0">
 <h3 className="font-semibold text-foreground truncate">{book.title}</h3>
 <p className="text-sm text-muted-foreground truncate">{book.genre}</p>
 <p className="text-xs text-muted-foreground/70 mt-1">{book.chapters} {t("chapters")}</p>
 </div>
 <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
 </button>
 )
 ))}
 </div>
 )}
 </div>

 {/* Fullscreen Search */}
 <FullscreenSearch
 isOpen={showSearch}
 onClose={() => setShowSearch(false)}
 searchQuery={searchQuery}
 setSearchQuery={setSearchQuery}
 books={books}
 onSelectBook={handleOpenBook}
 t={t}
 />

 {/* Bottom Sheet (Mobile) */}
 <BottomSheet
 book={selectedBook}
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 onOpenBook={handleModalOpenBook}
 onEdit={handleEditBook}
 onShare={handleShareBook}
 onDelete={handleDeleteBook}
 t={t}
 />

 {/* Desktop Context Menu (Right-click) */}
 <DesktopContextMenu
 contextMenu={contextMenu}
 onClose={handleCloseContextMenu}
 onOpenBook={handleModalOpenBook}
 onEdit={handleEditBook}
 onShare={handleShareBook}
 onDelete={handleDeleteBook}
 t={t}
 />
 </div>
 </PullToRefresh>
 )
}
