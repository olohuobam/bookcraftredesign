'use client'

import { useState, useRef } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { BookOpen, Download, Share2 } from 'lucide-react'
import { useHaptics } from '@/hooks/useHaptics'

interface BookCoverMobileProps {
 imageUrl?: string | null
 title: string
 author?: string
 className?: string
 onTap?: () => void
 onLongPress?: () => void
 showActions?: boolean
 purchased?: boolean
}

export function BookCoverMobile({
 imageUrl,
 title,
 author,
 className = '',
 onTap,
 onLongPress,
 showActions = true,
 purchased = false
}: BookCoverMobileProps) {
 const { impact } = useHaptics()
 const [isPressed, setIsPressed] = useState(false)
 const longPressTimer = useRef<NodeJS.Timeout | null>(null)
 
  // 3D tilt effect
 const x = useMotionValue(0)
 const y = useMotionValue(0)
 const rotateX = useTransform(y, [-100, 100], [10, -10])
 const rotateY = useTransform(x, [-100, 100], [-10, 10])

 const handlePointerDown = () => {
 setIsPressed(true)
 impact('light')
 
 if (onLongPress) {
 longPressTimer.current = setTimeout(() => {
 onLongPress()
 impact('medium')
 }, 500)
 }
 }

 const handlePointerUp = () => {
 setIsPressed(false)
 
 if (longPressTimer.current) {
 clearTimeout(longPressTimer.current)
 }
 
 if (onTap) {
 onTap()
 }
 }

 const handlePointerMove = (event: React.PointerEvent) => {
 const rect = event.currentTarget.getBoundingClientRect()
 const centerX = rect.left + rect.width / 2
 const centerY = rect.top + rect.height / 2
 
 x.set((event.clientX - centerX) * 0.5)
 y.set((event.clientY - centerY) * 0.5)
 }

 const handlePointerLeave = () => {
 setIsPressed(false)
 x.set(0)
 y.set(0)
 
 if (longPressTimer.current) {
 clearTimeout(longPressTimer.current)
 }
 }

 return (
 <motion.div
 className={`relative group ${className}`}
 style={{
 rotateX,
 rotateY,
 transformStyle: 'preserve-3d'
 }}
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.95 }}
 onPointerDown={handlePointerDown}
 onPointerUp={handlePointerUp}
 onPointerMove={handlePointerMove}
 onPointerLeave={handlePointerLeave}
 >
 {/* Main Cover Container */}
 <div 
 className={`
 book-cover-mobile relative overflow-hidden transform-gpu
 ${isPressed ? 'scale-95' : ''}
 transition-all duration-150 ease-out
 `}
 >
 {imageUrl ? (
 <img
 src={imageUrl}
 alt={title}
 className="w-full h-full object-cover"
 loading="lazy"
 />
 ) : (
 <div className="w-full h-full bg-gradient-to-br from-blue-100 to-sky-200 dark:from-blue-900 dark:to-blue-800 flex items-center justify-center p-4">
 <div className="text-center">
 <BookOpen className="w-8 h-8 text-bookcraft-blue dark:text-bookcraft-blue/80 mx-auto mb-2" />
 <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 text-center leading-tight">
 {title}
 </h3>
 {author && (
 <p className="text-xs text-bookcraft-blue dark:text-bookcraft-blue/80 mt-1">
 {author}
 </p>
 )}
 </div>
 </div>
 )}

 {/* Shine Effect Overlay */}
 <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
 
 {/* Glass Reflection */}
 <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/20 opacity-60" />
 
 {/* Premium Badge */}
 {purchased && (
 <div className="absolute top-2 right-2 bg-green-500/90 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        </div>
 )}

 {/* Long Press Ripple Effect */}
 {isPressed && (
 <motion.div
 initial={{ scale: 0, opacity: 0.5 }}
 animate={{ scale: 2, opacity: 0 }}
 transition={{ duration: 0.6 }}
 className="absolute inset-0 bg-white/20 rounded-[inherit]"
 />
 )}
 </div>

 {/* Quick Actions - Show on Hover/Touch */}
 {showActions && (
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ 
 opacity: isPressed ? 1 : 0, 
 y: isPressed ? 0 : 10 
 }}
 transition={{ duration: 0.2 }}
 className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-2 z-10"
 >
 <motion.button
 whileTap={{ scale: 0.9 }}
 className="w-8 h-8 bg-bookcraft-blue text-white rounded-full flex items-center justify-center shadow-lg"
 onClick={(e) => {
 e.stopPropagation()
              // Handle quick read
 }}
 >
 <BookOpen className="w-4 h-4" />
 </motion.button>
 
 {purchased && (
 <>
 <motion.button
 whileTap={{ scale: 0.9 }}
 className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg"
 onClick={(e) => {
 e.stopPropagation()
                  // Handle download
 }}
 >
 <Download className="w-4 h-4" />
 </motion.button>
 
 <motion.button
 whileTap={{ scale: 0.9 }}
 className="w-8 h-8 bg-sky-600 text-white rounded-full flex items-center justify-center shadow-lg"
 onClick={(e) => {
 e.stopPropagation()
                  // Handle share
 }}
 >
 <Share2 className="w-4 h-4" />
 </motion.button>
 </>
 )}
 </motion.div>
 )}

 {/* 3D Shadow */}
 <div 
 className="absolute inset-0 -z-10 bg-black/20 blur-xl translate-y-2 scale-105 opacity-60"
 style={{ transform: 'translateZ(-50px)' }}
 />
 </motion.div>
 )
}

export default BookCoverMobile