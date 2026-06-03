'use client'

import { Play } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface ReadingProgress {
 book_id: string
 chapter_number: number
 page_number: number | null
 scroll_position: number | null
 updated_at: string
}

interface ReadingProgressBarProps {
 bookId: string
 totalChapters: number
 progress: ReadingProgress | null | undefined
 className?: string
  /** Show the "Weiterlesen" button */
 showButton?: boolean
}

/**
 * Calculates reading progress percentage.
 * chapter_number is always 1-based (1 = first chapter).
 * Example: chapter 3 of 10 → 30%.
 */
function calcPercent(chapterNumber: number, totalChapters: number): number {
 if (!totalChapters || totalChapters <= 0) return 0
 return Math.min(100, Math.round((chapterNumber / totalChapters) * 100))
}

export default function ReadingProgressBar({
 bookId,
 totalChapters,
 progress,
 className,
 showButton = true,
}: ReadingProgressBarProps) {
 const hasProgress = !!progress
 const percent = hasProgress ? calcPercent(progress.chapter_number, totalChapters) : 0
 const chapterNum = progress?.chapter_number ?? 0

 if (!hasProgress) {
 return null
 }

 return (
 <div className={cn('mt-2 space-y-1', className)}>
 {/* Progress bar */}
 <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
 <div
 className="h-full bg-bookcraft-blue rounded-full transition-all duration-500"
 style={{ width: `${percent}%` }}
 />
 </div>

 {/* Percentage label */}
 <p className="text-[10px] text-muted-foreground">{percent}% gelesen</p>

 {/* Continue reading button */}
 {showButton && (
 <Link
 href={`/dashboard/books/${bookId}?autoRead=1&chapter=${chapterNum}`}
 onClick={(e) => e.stopPropagation()}
 className={cn(
 'inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-lg',
 'bg-bookcraft-blue/10 hover:bg-bookcraft-blue/20 text-bookcraft-blue dark:text-bookcraft-blue/80',
 'text-[10px] font-medium transition-colors',
 'border border-bookcraft-blue/20 hover:border-bookcraft-blue/30',
 )}
 >
 <Play className="h-2.5 w-2.5 fill-current" />
 Weiterlesen ab Kap. {chapterNum}
 </Link>
 )}
 </div>
 )
}
