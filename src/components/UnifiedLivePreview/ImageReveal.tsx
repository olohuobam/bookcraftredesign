'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { imageRevealVariants, newBadgeVariants, skeletonVariants } from './animations'
import { ImageRevealProps } from './types'

export default function ImageReveal({
 imageUrl,
 alt = 'Generated image',
 isNew = false,
 aspectRatio = 'landscape',
 onLoad
}: ImageRevealProps) {
 const [isLoaded, setIsLoaded] = useState(false)
 const [showNewBadge, setShowNewBadge] = useState(isNew)

  // Auto-hide NEW badge after 3 seconds
 useState(() => {
 if (isNew) {
 const timer = setTimeout(() => setShowNewBadge(false), 3000)
 return () => clearTimeout(timer)
 }
 })

 const aspectClasses = {
 square: 'aspect-square',
 portrait: 'aspect-[3/4]',
 landscape: 'aspect-[4/3]'
 }

 const handleImageLoad = () => {
 setIsLoaded(true)
 onLoad?.()
 }

 return (
 <div className={`relative w-full ${aspectClasses[aspectRatio]} rounded-lg overflow-hidden bg-white/5`}>
 {/* Skeleton loader */}
 <AnimatePresence>
 {!isLoaded && (
 <motion.div
 initial={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.3 }}
 className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5"
 >
 <motion.div
 variants={skeletonVariants}
 animate="shimmer"
 className="absolute inset-0"
 style={{
 background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
 backgroundSize: '200% 100%'
 }}
 />
 </motion.div>
 )}
 </AnimatePresence>

 {/* Actual image with reveal animation */}
 <motion.div
 variants={imageRevealVariants}
 initial="loading"
 animate={isLoaded ? 'revealed' : 'loading'}
 className="absolute inset-0"
 >
 <Image
 src={imageUrl}
 alt={alt}
 fill
 className="object-cover"
 onLoad={handleImageLoad}
 sizes="(max-width: 768px) 100vw, 50vw"
 priority={isNew}
 />
 </motion.div>

 {/* NEW badge */}
 <AnimatePresence>
 {showNewBadge && isLoaded && (
 <motion.div
 variants={newBadgeVariants}
 initial="hidden"
 animate={['visible', 'pulse']}
 exit="hidden"
 className="absolute top-3 right-3 z-10"
 >
 <span className="px-2.5 py-1 text-xs font-bold text-white bg-green-500 rounded-full shadow-lg shadow-green-500/30">
 NEW
 </span>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Subtle glow effect for new images */}
 <AnimatePresence>
 {isNew && isLoaded && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.5 }}
 className="absolute inset-0 pointer-events-none"
 style={{
 boxShadow: 'inset 0 0 30px rgba(34, 197, 94, 0.2)',
 borderRadius: 'inherit'
 }}
 />
 )}
 </AnimatePresence>

 {/* Hover overlay */}
 <motion.div
 initial={{ opacity: 0 }}
 whileHover={{ opacity: 1 }}
 className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 transition-opacity cursor-pointer"
 >
 <motion.div
 initial={{ scale: 0.8 }}
 whileHover={{ scale: 1 }}
 className="p-3 rounded-full bg-white/20 backdrop-blur-sm"
 >
 <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
 </svg>
 </motion.div>
 </motion.div>
 </div>
 )
}
