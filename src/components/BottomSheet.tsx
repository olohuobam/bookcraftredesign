'use client'

import { useEffect, useRef, useState, useCallback, startTransition } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useHaptics } from '@/hooks/useHaptics'

interface BottomSheetProps {
 isOpen: boolean
 onClose: () => void
 children: React.ReactNode
 title?: string
 subtitle?: string
 className?: string
  /** Maximum height as percentage of viewport (default: 90) */
 maxHeight?: number
  /** Show handle indicator (default: true) */
 showHandle?: boolean
}

/**
 * BottomSheet Component — Reusable iOS-style bottom sheet
 *
 * Features:
 * - Slides up from bottom with spring animation
 * - Swipe down to dismiss with velocity detection
 * - Backdrop blur overlay
 * - Drag handle with haptic feedback
 * - Portal-rendered for z-index safety
 * - Accessible: role="dialog", aria-modal
 */
export default function BottomSheet({
 isOpen,
 onClose,
 children,
 title,
 subtitle,
 className,
 maxHeight = 90,
 showHandle = true,
}: BottomSheetProps) {
 const [mounted, setMounted] = useState(false)
 const sheetRef = useRef<HTMLDivElement>(null)
 const { impact } = useHaptics()

 useEffect(() => {
 startTransition(() => {
 setMounted(true)
 })
 }, [])

  // Lock body scroll when open
 useEffect(() => {
 if (isOpen) {
 const originalOverflow = document.body.style.overflow
 document.body.style.overflow = 'hidden'
 return () => {
 document.body.style.overflow = originalOverflow
 }
 }
 }, [isOpen])

  // Close on Escape
 useEffect(() => {
 if (!isOpen) return
 const handleEsc = (e: KeyboardEvent) => {
 if (e.key === 'Escape') onClose()
 }
 document.addEventListener('keydown', handleEsc)
 return () => document.removeEventListener('keydown', handleEsc)
 }, [isOpen, onClose])

 const handleDragEnd = useCallback(
 (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
 const shouldClose = info.velocity.y > 300 || info.offset.y > 150
 if (shouldClose) {
 impact('light')
 onClose()
 }
 },
 [onClose, impact]
 )

 if (!mounted) return null

 return createPortal(
 <AnimatePresence>
 {isOpen && (
 <>
 {/* Backdrop */}
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.2 }}
 className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
 onClick={onClose}
 />

 {/* Sheet */}
 <motion.div
 ref={sheetRef}
 initial={{ y: '100%' }}
 animate={{ y: 0 }}
 exit={{ y: '100%' }}
 transition={{
 type: 'spring',
 damping: 30,
 stiffness: 300,
 mass: 0.8,
 }}
 drag="y"
 dragConstraints={{ top: 0 }}
 dragElastic={0.2}
 onDragEnd={handleDragEnd}
 role="dialog"
 aria-modal="true"
 aria-label={title || 'Bottom sheet'}
 className={cn(
 'fixed bottom-0 left-0 right-0 z-[9999]',
 'bg-card rounded-t-[28px] shadow-2xl',
 'overflow-hidden',
 className
 )}
 style={{ maxHeight: `${maxHeight}vh` }}
 >
 {/* Drag Handle */}
 {showHandle && (
 <div className="sticky top-0 bg-card pt-3 pb-2 z-10 cursor-grab active:cursor-grabbing">
 <div className="w-10 h-1 bg-border rounded-full mx-auto" />
 </div>
 )}

 {/* Header */}
 {(title || subtitle) && (
 <div className="px-5 pb-3 border-b border-border">
 {title && (
 <h2 className="text-lg font-bold font-display text-foreground">{title}</h2>
 )}
 {subtitle && (
 <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
 )}
 </div>
 )}

 {/* Content */}
 <div 
 className="overflow-y-auto overscroll-contain" 
 style={{ maxHeight: `calc(${maxHeight}vh - 80px - env(safe-area-inset-bottom, 0px))` }}
 >
 {children}
 </div>

 {/* Safe area bottom spacer */}
 <div className="safe-area-bottom" />
 </motion.div>
 </>
 )}
 </AnimatePresence>,
 document.body
 )
}
