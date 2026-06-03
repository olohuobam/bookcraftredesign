'use client'

import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react'
import { ProtectedContent } from '@/components/ContentProtection'
import { useLanguage } from '@/context/LanguageContext'

interface Chapter {
 number: number
 title: string
 content: string
 wordCount: number
 isComplete: boolean
 isStreaming: boolean
}

interface LiveFlipBookProps {
 chapters: Chapter[]
 currentChapterIndex: number
 displayedText: string
 isTyping: boolean
 isFlipping: boolean
 bookTitle?: string
 bookAuthor?: string
 coverImage?: string | null
 onPrevChapter: () => void
 onNextChapter: () => void
 scrollContainerRef?: React.RefObject<HTMLDivElement | null>
 className?: string
}

export function LiveFlipBook({
 chapters,
 currentChapterIndex,
 displayedText,
 isTyping,
 isFlipping,
 bookTitle = 'Your Book',
 bookAuthor = 'is being written...',
 coverImage,
 onPrevChapter,
 onNextChapter,
 scrollContainerRef,
 className
}: LiveFlipBookProps) {
 const { t } = useLanguage()
 const [isHovered, setIsHovered] = useState(false)
 const currentChapter = chapters[currentChapterIndex]
 const internalScrollRef = useRef<HTMLDivElement>(null)
 const scrollRef = scrollContainerRef || internalScrollRef

  // Show cover when no chapters yet
 const showCover = chapters.length === 0

 return (
 <ProtectedContent
 className={cn('relative', className)}
 showWarningOnAttempt={true}
 warningMessage="This book content is copyrighted."
 >
 <div
 style={{ perspective: '2000px' }}
 onMouseEnter={() => setIsHovered(true)}
 onMouseLeave={() => setIsHovered(false)}
 >
 {/* Book Shadow */}
 <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[90%] h-8 bg-black/30 blur-2xl rounded-full" />

 {/* The Book */}
 <div
 className={cn(
 'relative transition-transform duration-500',
 isHovered && 'rotate-y-2 -rotate-x-1'
 )}
 style={{
 transformStyle: 'preserve-3d',
 transform: isHovered ? 'rotateY(2deg) rotateX(-1deg)' : 'none'
 }}
 >
 {/* Book Container */}
 <div
 className="relative bg-amber-900 rounded-sm overflow-hidden"
 style={{
 minHeight: '500px',
 maxWidth: '800px',
 margin: '0 auto',
 boxShadow: `
 0 0 0 1px rgba(139, 69, 19, 0.5),
 5px 5px 20px rgba(0, 0, 0, 0.4),
 10px 10px 40px rgba(0, 0, 0, 0.3),
 inset 0 0 30px rgba(0, 0, 0, 0.2)
 `
 }}
 >
 {/* Spine */}
 <div
 className="absolute left-1/2 top-0 bottom-0 w-6 -ml-3 z-30"
 style={{
 background: 'linear-gradient(to right, #5D3A1A 0%, #8B4513 30%, #6B3510 50%, #8B4513 70%, #5D3A1A 100%)',
 boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5), 0 0 5px rgba(0,0,0,0.3)'
 }}
 >
 {/* Spine ridges */}
 {[...Array(5)].map((_, i) => (
 <div
 key={i}
 className="absolute left-0 right-0 h-0.5 bg-amber-400/20"
 style={{ top: `${15 + i * 18}%` }}
 />
 ))}
 </div>

 {/* Two-Page Spread */}
 <div className="flex min-h-[500px]">
 {/* Left Page */}
 <div
 className={cn(
 'w-1/2 relative transition-all duration-500',
 isFlipping && 'opacity-80'
 )}
 style={{
 background: showCover
 ? (coverImage
 ? `url(${coverImage}) center/cover`
 : 'linear-gradient(135deg, #8B4513 0%, #A0522D 25%, #8B4513 50%, #6B3510 75%, #8B4513 100%)')
 : 'linear-gradient(to right, #f5f0e6 0%, #faf8f3 50%, #fdfcfa 100%)',
 boxShadow: showCover ? 'inset 0 0 60px rgba(0,0,0,0.4)' : 'inset -4px 0 10px rgba(0,0,0,0.08)'
 }}
 onClick={onPrevChapter}
 >
 {showCover ? (
                // Cover design
 <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
 {/* Gold border */}
 <div className="absolute inset-4 border-2 border-amber-400/60 rounded-sm" />
 <div className="absolute inset-6 border border-amber-500/40 rounded-sm" />

 {/* Decorative top */}
 <div className="w-32 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent mb-6" />

 {/* Title */}
 <h1 className="text-2xl md:text-3xl font-serif font-bold text-amber-100 drop-shadow-lg mb-4 leading-tight">
 {bookTitle}
 </h1>

 {/* Divider */}
 <div className="w-24 h-0.5 bg-amber-400/60 my-4" />

 {/* Author */}
 <p className="text-lg font-serif text-amber-200/80 italic">
 {bookAuthor}
 </p>

 {/* Loading indicator */}
 <div className="mt-8 flex items-center gap-2 text-amber-200/60">
 <Loader2 className="h-4 w-4 animate-spin" />
 <span className="text-sm">Creating...</span>
 </div>

 {/* Decorative bottom */}
 <div className="w-32 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent mt-6" />

 {/* Corner decorations */}
 <CornerDecoration position="top-left" />
 <CornerDecoration position="top-right" />
 <CornerDecoration position="bottom-left" />
 <CornerDecoration position="bottom-right" />
 </div>
 ) : (
                // Content page (left)
 <div className="h-full p-6 md:p-8 flex flex-col">
 {/* Paper texture */}
 <div
 className="absolute inset-0 opacity-20 pointer-events-none"
 style={{
 backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
 }}
 />

 {/* Previous chapter content if available */}
 {currentChapterIndex > 0 && chapters[currentChapterIndex - 1] && (
 <div className="relative h-full overflow-hidden">
 <p className="text-muted-foreground text-xs uppercase tracking-widest mb-2">
 {t('chapterNumber', { number: chapters[currentChapterIndex - 1].number })}
 </p>
 <h3 className="text-foreground/70 dark:text-foreground/60 font-serif text-lg mb-4">
 {chapters[currentChapterIndex - 1].title}
 </h3>
 <div className="text-muted-foreground font-serif text-sm leading-relaxed line-clamp-[20]">
 {chapters[currentChapterIndex - 1].content?.slice(-1500) || '...'}
 </div>

 {chapters[currentChapterIndex - 1].isComplete && (
 <div className="absolute bottom-0 left-0 right-0 pt-4 bg-gradient-to-t from-[#faf8f3] to-transparent">
 <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs">
 <CheckCircle2 className="w-3 h-3" />
 <span>{chapters[currentChapterIndex - 1].wordCount?.toLocaleString()} {t('wordsCount')}</span>
 </div>
 </div>
 )}
 </div>
 )}

 {currentChapterIndex === 0 && (
 <div className="h-full flex items-center justify-center text-muted-foreground font-serif italic">
 {t('storyBegins')}
 </div>
 )}

 {/* Page number */}
 <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-muted-foreground text-xs">
 {currentChapterIndex > 0 ? currentChapterIndex * 2 - 1 : ''}
 </div>
 </div>
 )}
 </div>

 {/* Right Page */}
 <div
 className={cn(
 'w-1/2 relative transition-all duration-500',
 isFlipping && 'opacity-80 scale-[0.99]'
 )}
 style={{
 background: 'linear-gradient(to left, #f0ebe0 0%, #faf8f3 50%, #fdfcfa 100%)',
 boxShadow: 'inset 4px 0 10px rgba(0,0,0,0.08)'
 }}
 onClick={onNextChapter}
 >
 {/* Paper texture */}
 <div
 className="absolute inset-0 opacity-20 pointer-events-none"
 style={{
 backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
 }}
 />

 <div className="h-full p-6 md:p-8 flex flex-col">
 {currentChapter ? (
 <>
 {/* Chapter header */}
 <div className="text-center mb-6">
 <p className="text-muted-foreground text-xs uppercase tracking-widest mb-2">
 {t('chapterNumber', { number: currentChapter.number })}
 </p>
 <h2 className="text-foreground dark:text-foreground font-serif text-xl md:text-2xl font-medium flex items-center justify-center gap-2">
 {currentChapter.title}
 {currentChapter.isStreaming && (
 <span className="inline-block w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
 )}
 </h2>
 <div className="w-12 h-0.5 bg-amber-400/60 mx-auto mt-3" />
 </div>

 {/* Chapter content */}
 <div
 ref={scrollRef as React.RefObject<HTMLDivElement>}
 className="flex-1 overflow-y-auto pr-2"
 style={{ maxHeight: '380px' }}
 >
 <div className="text-foreground/80 dark:text-foreground/70 font-serif text-base leading-7">
 {currentChapter.isStreaming ? (
 <div className="whitespace-pre-wrap">
 {displayedText}
 {isTyping && (
 <span className="inline-block w-0.5 h-5 bg-amber-600 ml-0.5 animate-pulse" />
 )}
 </div>
 ) : (
 <div className="space-y-4">
 {(currentChapter.content || '')
 .split(/\n\s*\n/)
 .map(p => p.trim())
 .filter(p => p.length > 0)
 .map((paragraph, idx) => (
 <p key={idx} className="text-justify first-letter:text-3xl first-letter:font-bold first-letter:mr-1 first-letter:float-left first-letter:leading-none first-letter:text-amber-800">
 {paragraph}
 </p>
 ))}
 </div>
 )}
 </div>

 {currentChapter.isComplete && (
 <div className="mt-6 pt-4 border-t border-amber-200/50 flex items-center justify-center gap-2 text-amber-700">
 <CheckCircle2 className="w-4 h-4" />
 <span className="text-sm">{currentChapter.wordCount?.toLocaleString()} {t('wordsCount')}</span>
 </div>
 )}
 </div>
 </>
 ) : (
 <div className="flex-1 flex items-center justify-center">
 <div className="text-center">
 <Loader2 className="h-8 w-8 text-amber-600 animate-spin mx-auto mb-4" />
 <p className="text-foreground/70 dark:text-foreground/60 font-serif text-lg">{t('storyBegins')}</p>
 </div>
 </div>
 )}

 {/* Page number */}
 <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-muted-foreground text-xs">
 {chapters.length > 0 ? currentChapterIndex * 2 : ''}
 </div>
 </div>
 </div>
 </div>

 {/* Page flip effect overlay */}
 {isFlipping && (
 <div
 className="absolute inset-0 pointer-events-none z-20"
 style={{
 background: 'linear-gradient(90deg, transparent 45%, rgba(0,0,0,0.1) 50%, transparent 55%)'
 }}
 />
 )}
 </div>

 {/* Navigation Buttons */}
 {chapters.length > 0 && (
 <>
 <button
 onClick={(e) => { e.stopPropagation(); onPrevChapter(); }}
 disabled={currentChapterIndex === 0 || isFlipping}
 className={cn(
 'absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 z-40',
 'w-12 h-12 rounded-full',
 'bg-amber-100 hover:bg-amber-200 border-2 border-amber-300',
 'flex items-center justify-center transition-all shadow-lg',
 'hover:scale-110 hover:shadow-xl',
 'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100'
 )}
 >
 <ChevronLeft className="h-6 w-6 text-amber-900" />
 </button>
 <button
 onClick={(e) => { e.stopPropagation(); onNextChapter(); }}
 disabled={currentChapterIndex >= chapters.length - 1 || isFlipping}
 className={cn(
 'absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 z-40',
 'w-12 h-12 rounded-full',
 'bg-amber-100 hover:bg-amber-200 border-2 border-amber-300',
 'flex items-center justify-center transition-all shadow-lg',
 'hover:scale-110 hover:shadow-xl',
 'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100'
 )}
 >
 <ChevronRight className="h-6 w-6 text-amber-900" />
 </button>
 </>
 )}
 </div>

 {/* Chapter indicators */}
 {chapters.length > 1 && (
 <div className="flex justify-center gap-2 mt-6">
 {chapters.map((ch, idx) => (
 <div
 key={ch.number}
 className={cn(
 'w-2 h-2 rounded-full transition-all cursor-pointer',
 idx === currentChapterIndex
 ? 'bg-amber-500 scale-125'
 : ch.isComplete
 ? 'bg-amber-300 hover:bg-amber-400'
 : 'bg-white/30 hover:bg-white/50'
 )}
 onClick={() => {
 if (idx !== currentChapterIndex) {
 if (idx < currentChapterIndex) onPrevChapter();
 else onNextChapter();
 }
 }}
 title={`${t('chapterNumber', { number: ch.number })}: ${ch.title}`}
 />
 ))}
 </div>
 )}
 </div>
 </ProtectedContent>
 )
}

// Corner decoration component
function CornerDecoration({ position }: { position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
 const positionClasses = {
 'top-left': 'top-3 left-3',
 'top-right': 'top-3 right-3 rotate-90',
 'bottom-left': 'bottom-3 left-3 -rotate-90',
 'bottom-right': 'bottom-3 right-3 rotate-180'
 }

 return (
 <div className={cn('absolute w-6 h-6', positionClasses[position])}>
 <svg viewBox="0 0 24 24" className="w-full h-full text-amber-400/60">
 <path
 fill="currentColor"
 d="M0 0 L8 0 L8 2 L2 2 L2 8 L0 8 Z"
 />
 </svg>
 </div>
 )
}

export default LiveFlipBook
