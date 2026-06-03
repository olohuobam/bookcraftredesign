'use client'

import { useRef, useState, useCallback, type TouchEvent, type ReactNode } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useHaptics } from '@/hooks/useHaptics'

interface SwipeActionProps {
 children: ReactNode
 onSwipeLeft?: () => void
 onSwipeRight?: () => void
  /** Content shown when swiping left (right side) */
 leftAction?: ReactNode
  /** Content shown when swiping right (left side) */
 rightAction?: ReactNode
  /** Background color for left action area */
 leftActionBg?: string
  /** Background color for right action area */
 rightActionBg?: string
  /** Swipe threshold in pixels before action triggers (default: 80) */
 threshold?: number
 className?: string
  /** Whether swipe is disabled */
 disabled?: boolean
}

/**
 * SwipeAction Component — iOS-style swipe-to-reveal actions
 *
 * Features:
 * - Swipe left to reveal delete/action button
 * - Swipe right for alternative action
 * - Haptic feedback at threshold
 * - Elastic resistance past threshold
 * - Snap back animation
 * - Touch-only (no mouse drag on desktop)
 */
export default function SwipeAction({
 children,
 onSwipeLeft,
 onSwipeRight,
 leftAction,
 rightAction,
 leftActionBg = 'bg-red-500',
 rightActionBg = 'bg-green-500',
 threshold = 80,
 className,
 disabled = false,
}: SwipeActionProps) {
 const x = useMotionValue(0)
 const startX = useRef(0)
 const startY = useRef(0)
 const isDragging = useRef(false)
 const isHorizontal = useRef<boolean | null>(null)
 const hasTriggeredHaptic = useRef(false)
 const [isRevealed, setIsRevealed] = useState<'left' | 'right' | null>(null)
 const { impact } = useHaptics()

  // Transform for action opacity
 const leftOpacity = useTransform(x, [-threshold, -threshold / 2, 0], [1, 0.5, 0])
 const rightOpacity = useTransform(x, [0, threshold / 2, threshold], [0, 0.5, 1])

 const handleTouchStart = useCallback((e: TouchEvent) => {
 if (disabled) return
 startX.current = e.touches[0].clientX
 startY.current = e.touches[0].clientY
 isDragging.current = true
 isHorizontal.current = null
 hasTriggeredHaptic.current = false
 }, [disabled])

 const handleTouchMove = useCallback((e: TouchEvent) => {
 if (!isDragging.current || disabled) return

 const currentX = e.touches[0].clientX
 const currentY = e.touches[0].clientY
 const deltaX = currentX - startX.current
 const deltaY = currentY - startY.current

    // Determine direction on first significant movement
 if (isHorizontal.current === null) {
 if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
 isHorizontal.current = Math.abs(deltaX) > Math.abs(deltaY)
 }
 return
 }

    // Only handle horizontal swipes
 if (!isHorizontal.current) return

    // Prevent vertical scroll
 e.preventDefault()

    // Apply resistance past threshold
 let adjustedDelta = deltaX
 if (Math.abs(deltaX) > threshold) {
 const excess = Math.abs(deltaX) - threshold
 adjustedDelta = (deltaX > 0 ? 1 : -1) * (threshold + excess * 0.3)
 }

    // Check for actions availability
 if (adjustedDelta < 0 && !onSwipeLeft) return
 if (adjustedDelta > 0 && !onSwipeRight) return

 x.set(adjustedDelta)

    // Haptic feedback at threshold
 if (Math.abs(deltaX) >= threshold && !hasTriggeredHaptic.current) {
 hasTriggeredHaptic.current = true
 impact('medium')
 }
 }, [disabled, threshold, x, onSwipeLeft, onSwipeRight, impact])

 const handleTouchEnd = useCallback(() => {
 if (!isDragging.current || disabled) return
 isDragging.current = false

 const currentX = x.get()

 if (currentX < -threshold && onSwipeLeft) {
      // Reveal left action (swiped left)
 animate(x, -threshold, { type: 'spring', stiffness: 300, damping: 30 })
 setIsRevealed('left')
 } else if (currentX > threshold && onSwipeRight) {
      // Reveal right action (swiped right)
 animate(x, threshold, { type: 'spring', stiffness: 300, damping: 30 })
 setIsRevealed('right')
 } else {
      // Snap back
 animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 })
 setIsRevealed(null)
 }
 }, [disabled, threshold, x, onSwipeLeft, onSwipeRight])

 const resetPosition = useCallback(() => {
 animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 })
 setIsRevealed(null)
 }, [x])

 const handleActionClick = useCallback((action: 'left' | 'right') => {
 impact('medium')
 if (action === 'left' && onSwipeLeft) {
 onSwipeLeft()
 } else if (action === 'right' && onSwipeRight) {
 onSwipeRight()
 }
 resetPosition()
 }, [impact, onSwipeLeft, onSwipeRight, resetPosition])

 return (
 <div className={cn('relative overflow-hidden', className)}>
 {/* Left Action (revealed when swiping right) */}
 {rightAction && (
 <motion.div
 className={cn(
 'absolute inset-y-0 left-0 flex items-center justify-start px-5',
 rightActionBg
 )}
 style={{ opacity: rightOpacity, width: threshold }}
 onClick={() => handleActionClick('right')}
 >
 {rightAction}
 </motion.div>
 )}

 {/* Right Action (revealed when swiping left) */}
 {leftAction && (
 <motion.div
 className={cn(
 'absolute inset-y-0 right-0 flex items-center justify-end px-5',
 leftActionBg
 )}
 style={{ opacity: leftOpacity, width: threshold }}
 onClick={() => handleActionClick('left')}
 >
 {leftAction}
 </motion.div>
 )}

 {/* Main Content */}
 <motion.div
 style={{ x }}
 className="relative bg-card z-10"
 onTouchStart={handleTouchStart}
 onTouchMove={handleTouchMove}
 onTouchEnd={handleTouchEnd}
 >
 {children}
 </motion.div>

 {/* Tap outside to reset when revealed */}
 {isRevealed && (
 <div
 className="fixed inset-0 z-[5]"
 onClick={resetPosition}
 />
 )}
 </div>
 )
}
