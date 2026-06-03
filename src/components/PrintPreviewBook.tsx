'use client'

import { motion } from 'framer-motion'
import SafeImage from '@/components/SafeImage'
import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PrintPreviewBookProps {
  coverImage?: string | null
  title: string
  /** Book format — affects aspect ratio */
  format: string
  /** Paper color — affects page edge color */
  paper: 'white' | 'cream' | 'premium'
  /** Color mode */
  isColor: boolean
  className?: string
}

// Aspect ratios for each format (width/height)
const FORMAT_RATIOS: Record<string, { w: number; h: number; label: string }> = {
  '6x9':     { w: 6, h: 9, label: '6×9' },
  '5.5x8.5': { w: 5.5, h: 8.5, label: '5.5×8.5' },
  '8.5x11':  { w: 8.5, h: 11, label: '8.5×11' },
  '7.5x7.5': { w: 7.5, h: 7.5, label: '7.5×7.5' },
  '8.5x8.5': { w: 8.5, h: 8.5, label: '8.5×8.5' },
}

const PAPER_COLORS: Record<string, string> = {
  white:   '#f8f8f8',
  cream:   '#f5f0e0',
  premium: '#fafafa',
}

/**
 * Compact 3D book preview for the print configurator.
 * Shows the user's cover image with correct aspect ratio,
 * paper color on page edges, and a subtle 3D perspective.
 */
export default function PrintPreviewBook({
  coverImage,
  title,
  format,
  paper,
  isColor,
  className,
}: PrintPreviewBookProps) {
  const ratio = FORMAT_RATIOS[format] || FORMAT_RATIOS['6x9']
  const pageColor = PAPER_COLORS[paper] || PAPER_COLORS.white

  // Calculate dimensions — fit within max 160px height
  const maxH = 160
  const h = maxH
  const w = Math.round((ratio.w / ratio.h) * h)

  return (
    <div className={cn('flex items-center justify-center', className)} style={{ perspective: '800px' }}>
      <motion.div
        className="relative select-none"
        style={{ transformStyle: 'preserve-3d' }}
        initial={{ opacity: 0, rotateY: -30 }}
        animate={{ opacity: 1, rotateY: -18 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      >
        <div style={{ transformStyle: 'preserve-3d', transform: 'rotateX(3deg)' }}>
          {/* Front Cover */}
          <motion.div
            className="relative rounded-r-sm rounded-l-[2px] overflow-hidden shadow-lg"
            style={{ backfaceVisibility: 'hidden' }}
            animate={{ width: w, height: h }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            {coverImage ? (
              <>
                <SafeImage
                  src={coverImage}
                  alt={title}
                  width={w}
                  height={h}
                  className="absolute inset-0 w-full h-full object-cover"
                  sizes="160px"
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
                  }}
                />
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-200 to-gray-400 dark:from-gray-700 dark:to-gray-900">
                <BookOpen className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center px-3 line-clamp-2">
                  {title}
                </p>
              </div>
            )}
          </motion.div>

          {/* Spine */}
          <motion.div
            className="absolute top-0 left-0 overflow-hidden"
            style={{
              transformOrigin: 'left center',
              transform: 'rotateY(-90deg)',
            }}
            animate={{ width: 16, height: h }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            {coverImage ? (
              <div className="w-full h-full relative">
                <SafeImage
                  src={coverImage}
                  alt=""
                  width={16}
                  height={h}
                  className="absolute inset-0 w-full h-full object-cover"
                  sizes="16px"
                />
                <div className="absolute inset-0 bg-black/40" />
              </div>
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-gray-400 to-gray-500 dark:from-gray-600 dark:to-gray-700" />
            )}
          </motion.div>

          {/* Page Edges (right side) — color changes with paper selection */}
          <motion.div
            className="absolute top-[2px] right-0 bottom-[2px]"
            style={{
              width: '5px',
              transformOrigin: 'right center',
              transform: 'translateX(5px) rotateY(90deg)',
              borderTop: '1px solid rgba(0,0,0,0.06)',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
            }}
            animate={{
              background: `repeating-linear-gradient(to bottom, ${pageColor} 0px, ${pageColor} 1px, ${adjustBrightness(pageColor, -8)} 1px, ${adjustBrightness(pageColor, -8)} 2px)`,
            }}
            transition={{ duration: 0.3 }}
          />

          {/* Bottom page edge */}
          <div
            className="absolute bottom-0 left-[2px] right-[2px]"
            style={{
              height: '3px',
              transformOrigin: 'bottom center',
              transform: 'translateY(3px) rotateX(90deg)',
              background: `repeating-linear-gradient(to right, ${pageColor} 0px, ${pageColor} 1px, ${adjustBrightness(pageColor, -8)} 1px, ${adjustBrightness(pageColor, -8)} 2px)`,
            }}
          />
        </div>

        {/* Shadow */}
        <div
          className="absolute bottom-0 pointer-events-none"
          style={{
            left: '50%',
            width: '80%',
            height: '12px',
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.2) 0%, transparent 70%)',
            filter: 'blur(4px)',
            transform: 'translateX(-50%) translateY(8px) rotateX(80deg)',
          }}
        />
      </motion.div>

      {/* Format label */}
      <div className="ml-4 text-center">
        <p className="text-xs font-medium text-muted-foreground">{ratio.label}&quot;</p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
          {isColor ? 'Farbe' : 'S/W'}
        </p>
      </div>
    </div>
  )
}

/** Adjust hex color brightness */
function adjustBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount))
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
