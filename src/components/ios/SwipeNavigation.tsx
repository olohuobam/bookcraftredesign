'use client'

import { useState, useEffect } from 'react'
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface SwipeNavigationProps {
 children: React.ReactNode
 currentPage: number
 totalPages: number
 onPageChange: (page: number) => void
 disabled?: boolean
 className?: string
}

export function SwipeNavigation({
 children,
 currentPage,
 totalPages,
 onPageChange,
 disabled = false,
 className = ''
}: SwipeNavigationProps) {
 const x = useMotionValue(0)
 const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
 
  // Transform values for visual feedback
 const opacity = useTransform(x, [-200, 0, 200], [0.7, 1, 0.7])
 const scale = useTransform(x, [-200, 0, 200], [0.95, 1, 0.95])
 
  // Visual indicators
 const leftIndicatorOpacity = useTransform(x, [0, 150], [0, 1])
 const rightIndicatorOpacity = useTransform(x, [-150, 0], [1, 0])

 const handlePanEnd = (event: any, info: PanInfo) => {
 if (disabled) return
 
 const { offset } = info
 const swipeThreshold = 100
 
 if (offset.x > swipeThreshold && currentPage > 0) {
      // Swipe right - go to previous page
 onPageChange(currentPage - 1)
 setSwipeDirection('right')
 } else if (offset.x < -swipeThreshold && currentPage < totalPages - 1) {
      // Swipe left - go to next page  
 onPageChange(currentPage + 1)
 setSwipeDirection('left')
 }
 
    // Reset position
 x.set(0)
 
    // Clear direction indicator after animation
 setTimeout(() => setSwipeDirection(null), 300)
 }

 const handlePan = (event: any, info: PanInfo) => {
 if (disabled) return
 
 const { offset } = info
 const maxOffset = 200
 
    // Constrain the drag
 if (offset.x > 0 && currentPage === 0) {
      // At first page, reduce drag distance for right swipe
 x.set(Math.min(offset.x * 0.3, maxOffset * 0.3))
 } else if (offset.x < 0 && currentPage === totalPages - 1) {
      // At last page, reduce drag distance for left swipe
 x.set(Math.max(offset.x * 0.3, -maxOffset * 0.3))
 } else {
      // Normal drag
 x.set(Math.max(Math.min(offset.x, maxOffset), -maxOffset))
 }
 }

 return (
 <div className={`relative overflow-hidden ${className}`}>
 {/* Swipe Indicators */}
 <motion.div
 style={{ opacity: leftIndicatorOpacity }}
 className="absolute right-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none"
 >
 <div className="flex items-center justify-center w-12 h-12 bg-bookcraft-blue/20 backdrop-blur-sm rounded-full">
 <ChevronRight className="w-6 h-6 text-bookcraft-blue dark:text-bookcraft-blue/80" />
 </div>
 </motion.div>
 
 <motion.div
 style={{ opacity: rightIndicatorOpacity }}
 className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none"
 >
 <div className="flex items-center justify-center w-12 h-12 bg-bookcraft-blue/20 backdrop-blur-sm rounded-full">
 <ChevronLeft className="w-6 h-6 text-bookcraft-blue dark:text-bookcraft-blue/80" />
 </div>
 </motion.div>

 {/* Content */}
 <motion.div
 drag="x"
 dragConstraints={{ left: 0, right: 0 }}
 dragElastic={0.2}
 onPan={handlePan}
 onPanEnd={handlePanEnd}
 style={{ 
 x, 
 opacity, 
 scale
 }}
 className="chapter-swipe"
 >
 {children}
 </motion.div>



 {/* Direction Animation Overlay */}
 {swipeDirection && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="absolute inset-0 pointer-events-none"
 >
 <div className={`absolute inset-0 bg-gradient-to-${
 swipeDirection === 'left' ? 'l' : 'r'
 } from-bookcraft-blue/10 to-transparent`} />
 </motion.div>
 )}
 </div>
 )
}

export default SwipeNavigation