'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface CardSkeletonProps {
 className?: string
 variant?: 'default' | 'horizontal' | 'grid' | 'list'
 count?: number
 animated?: boolean
}

const Skeleton = ({ 
 className = '', 
 style = {},
 delay = 0 
}: { 
 className?: string
 style?: React.CSSProperties
 delay?: number 
}) => (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay, duration: 0.3 }}
 className={`relative overflow-hidden bg-[#3E86D7]/10 rounded-2xl ${className}`}
 style={style}
 >
 <div
 className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
 style={{
 background: "linear-gradient(90deg, rgba(99,198,233,0) 0%, rgba(99,198,233,0.08) 20%, rgba(194,87,217,0.15) 50%, rgba(99,198,233,0.08) 80%, rgba(99,198,233,0) 100%)",
 }}
 />
 </motion.div>
)

export function CardSkeleton({
 className = '',
 variant = 'default',
 count = 1,
 animated = true
}: CardSkeletonProps) {
 const [randomWidths] = useState(() =>
 Array.from({ length: count }, () => ({
 w1: 60 + Math.random() * 25,
 w2: 35 + Math.random() * 20,
 w3: 50 + Math.random() * 30,
 w4: 30 + Math.random() * 25,
 }))
 )
 const renderSkeleton = (index: number) => {
 const baseDelay = animated ? index * 0.1 : 0
 const rw = randomWidths[index] ?? { w1: 70, w2: 45, w3: 65, w4: 42 }
 
 switch (variant) {
 case 'horizontal':
 return (
 <motion.div 
 key={index}
 className={`bg-card rounded-3xl border border-border/30 p-6 shadow-lg dark:shadow-black/20 ${className}`}
 initial={animated ? { opacity: 0, y: 20 } : undefined}
 animate={animated ? { opacity: 1, y: 0 } : undefined}
 transition={animated ? { delay: baseDelay, duration: 0.4 } : undefined}
 >
 <div className="flex items-center gap-5">
 <Skeleton 
 className="rounded-2xl flex-shrink-0" 
 style={{ width: '64px', height: '80px' }} 
 delay={baseDelay}
 />
 <div className="flex-1 space-y-3">
 <Skeleton
 style={{ width: `${rw.w1}%`, height: '20px' }}
 delay={baseDelay + 0.1}
 />
 <Skeleton
 style={{ width: `${rw.w2}%`, height: '16px' }}
 delay={baseDelay + 0.2}
 />
 </div>
 <Skeleton 
 className="rounded-xl flex-shrink-0" 
 style={{ width: '24px', height: '24px' }} 
 delay={baseDelay + 0.3}
 />
 </div>
 </motion.div>
 )
 
 case 'grid':
 return (
 <motion.div 
 key={index}
 className={`bg-card rounded-3xl border border-border/30 p-6 shadow-lg dark:shadow-black/20 ${className}`}
 initial={animated ? { opacity: 0, scale: 0.9 } : undefined}
 animate={animated ? { opacity: 1, scale: 1 } : undefined}
 transition={animated ? { delay: baseDelay, duration: 0.4 } : undefined}
 >
 <div className="flex flex-col items-center text-center">
 <Skeleton 
 className="rounded-3xl mb-4" 
 style={{ width: '64px', height: '64px' }} 
 delay={baseDelay}
 />
 <Skeleton 
 style={{ width: '80%', height: '18px' }} 
 delay={baseDelay + 0.1}
 />
 <Skeleton 
 className="mt-2" 
 style={{ width: '60%', height: '14px' }} 
 delay={baseDelay + 0.2}
 />
 </div>
 </motion.div>
 )
 
 case 'list':
 return (
 <motion.div 
 key={index}
 className={`bg-card rounded-2xl border border-border/30 p-4 shadow-sm ${className}`}
 initial={animated ? { opacity: 0, x: -20 } : undefined}
 animate={animated ? { opacity: 1, x: 0 } : undefined}
 transition={animated ? { delay: baseDelay, duration: 0.4 } : undefined}
 >
 <div className="flex items-center gap-3">
 <Skeleton 
 className="rounded-xl flex-shrink-0" 
 style={{ width: '40px', height: '40px' }} 
 delay={baseDelay}
 />
 <div className="flex-1 space-y-2">
 <Skeleton
 style={{ width: `${rw.w3}%`, height: '16px' }}
 delay={baseDelay + 0.1}
 />
 <Skeleton
 style={{ width: `${rw.w4}%`, height: '12px' }}
 delay={baseDelay + 0.2}
 />
 </div>
 </div>
 </motion.div>
 )
 
 default:
 return (
 <motion.div 
 key={index}
 className={`bg-card rounded-3xl border border-border/30 overflow-hidden shadow-lg dark:shadow-black/20 ${className}`}
 initial={animated ? { opacity: 0, y: 20 } : undefined}
 animate={animated ? { opacity: 1, y: 0 } : undefined}
 transition={animated ? { delay: baseDelay, duration: 0.4 } : undefined}
 >
 {/* Header */}
 <div className="p-6 bg-gradient-to-br from-muted/30 to-muted/50">
 <div className="flex items-start justify-between mb-4">
 <Skeleton 
 className="rounded-2xl" 
 style={{ width: '56px', height: '56px' }} 
 delay={baseDelay}
 />
 <Skeleton 
 className="rounded-2xl" 
 style={{ width: '80px', height: '24px' }} 
 delay={baseDelay + 0.1}
 />
 </div>
 <Skeleton 
 style={{ width: '75%', height: '24px' }} 
 delay={baseDelay + 0.2}
 />
 <Skeleton 
 className="mt-2" 
 style={{ width: '60%', height: '16px' }} 
 delay={baseDelay + 0.3}
 />
 </div>
 
 {/* Content */}
 <div className="p-6 space-y-4">
 <div className="space-y-3">
 {[1, 2, 3].map((i) => (
 <div key={i} className="flex items-center gap-3">
 <Skeleton 
 className="rounded-full" 
 style={{ width: '8px', height: '8px' }} 
 delay={baseDelay + 0.3 + i * 0.05}
 />
 <Skeleton 
 style={{ width: `${60 + Math.random() * 25}%`, height: '14px' }} 
 delay={baseDelay + 0.35 + i * 0.05}
 />
 </div>
 ))}
 </div>
 
 <Skeleton 
 className="rounded-2xl mt-6" 
 style={{ width: '100%', height: '48px' }} 
 delay={baseDelay + 0.5}
 />
 </div>
 </motion.div>
 )
 }
 }

 return (
 <>
 {Array.from({ length: count }, (_, index) => renderSkeleton(index))}
 </>
 )
}

// Specialized skeleton variants
export const BookCardSkeleton = (props: Omit<CardSkeletonProps, 'variant'>) => (
 <CardSkeleton {...props} variant="horizontal" />
)

export const CreateCardSkeleton = (props: Omit<CardSkeletonProps, 'variant'>) => (
 <CardSkeleton {...props} variant="grid" />
)

export const ListItemSkeleton = (props: Omit<CardSkeletonProps, 'variant'>) => (
 <CardSkeleton {...props} variant="list" />
)