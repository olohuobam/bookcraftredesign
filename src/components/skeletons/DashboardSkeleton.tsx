'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

// Enhanced Shimmer Skeleton Component
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
 transition={{ delay }}
 className={`relative overflow-hidden bg-[#3E86D7]/10 rounded-2xl ${className}`}
 style={style}
 >
 <div
 className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite]"
 style={{
 background: "linear-gradient(90deg, rgba(99,198,233,0) 0%, rgba(194,87,217,0.12) 50%, rgba(99,198,233,0) 100%)",
 }}
 />
 </motion.div>
)

export function DashboardSkeleton() {
 const [randomWidths] = useState(() =>
 Array.from({ length: 4 }, () => ({
 w1: 60 + Math.random() * 25,
 w2: 35 + Math.random() * 20,
 }))
 )
 return (
 <div className="min-h-screen bg-background pb-32">
 {/* Mobile Header Skeleton */}
 <div className="lg:hidden bg-card/80 backdrop-blur-lg p-6 safe-area-top border-b border-border/30">
 <div className="flex items-center gap-4">
 <div className="flex-1 min-w-0">
 <Skeleton className="mb-2" style={{ width: '220px', height: '28px' }} />
 <Skeleton delay={0.1} style={{ width: '160px', height: '18px' }} />
 </div>
 </div>
 </div>

 {/* Desktop Header Skeleton */}
 <div className="hidden lg:block bg-card border-b border-border/50 px-6 py-6">
 <Skeleton className="mb-3" style={{ width: '280px', height: '36px' }} />
 <Skeleton delay={0.1} style={{ width: '200px', height: '22px' }} />
 </div>

 {/* Main Content */}
 <div className="px-5 sm:px-6 py-5 space-y-6">
 {/* Stats Row Skeleton */}
 <div className="grid grid-cols-3 gap-4">
 {[1, 2, 3].map((i) => (
 <motion.div 
 key={i} 
 className="bg-card/80 rounded-3xl p-5 border border-border/50 backdrop-blur-sm"
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ delay: i * 0.1, duration: 0.5 }}
 >
 <div className="flex items-center justify-center">
 <Skeleton 
 className="rounded-2xl mb-4" 
 style={{ width: '48px', height: '48px' }} 
 delay={i * 0.1}
 />
 </div>
 <div className="text-center space-y-2">
 <Skeleton 
 className="mx-auto" 
 style={{ width: '42px', height: '32px' }} 
 delay={i * 0.1 + 0.2}
 />
 <Skeleton 
 className="mx-auto" 
 style={{ width: '56px', height: '16px' }} 
 delay={i * 0.1 + 0.3}
 />
 </div>
 </motion.div>
 ))}
 </div>

 {/* Quick Create Section Skeleton */}
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.4, duration: 0.5 }}
 >
 <Skeleton className="mb-4 ml-2" style={{ width: '140px', height: '18px' }} delay={0.4} />
 <div className="grid grid-cols-3 gap-4">
 {[1, 2, 3].map((i) => (
 <motion.div 
 key={i} 
 className="bg-card/80 rounded-3xl border border-border/50 p-5 backdrop-blur-sm"
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
 >
 <div className="flex flex-col items-center min-h-[120px] justify-center">
 <Skeleton 
 className="rounded-3xl mb-3" 
 style={{ width: '56px', height: '56px' }} 
 delay={0.5 + i * 0.1}
 />
 <Skeleton 
 style={{ width: '64px', height: '16px' }} 
 delay={0.6 + i * 0.1}
 />
 </div>
 </motion.div>
 ))}
 </div>
 </motion.div>

 {/* Recent Books Skeleton */}
 <motion.div 
 className="bg-card/80 rounded-3xl overflow-hidden border border-border/50 backdrop-blur-sm"
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.8, duration: 0.5 }}
 >
 <div className="flex items-center justify-between p-5 border-b border-border/30">
 <Skeleton style={{ width: '120px', height: '24px' }} delay={0.8} />
 <Skeleton style={{ width: '80px', height: '18px' }} delay={0.9} />
 </div>

 <div className="divide-y divide-border/30">
 {[1, 2, 3, 4].map((i) => (
 <motion.div 
 key={i} 
 className="p-5"
 initial={{ opacity: 0, x: -20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: 1 + i * 0.1, duration: 0.4 }}
 >
 <div className="flex items-center gap-4">
 <Skeleton 
 className="flex-shrink-0 rounded-xl" 
 style={{ width: '56px', height: '72px' }} 
 delay={1 + i * 0.1}
 />
 <div className="flex-1 min-w-0 space-y-3">
 <Skeleton
 style={{ width: `${randomWidths[i - 1].w1}%`, height: '20px' }}
 delay={1.1 + i * 0.1}
 />
 <Skeleton
 style={{ width: `${randomWidths[i - 1].w2}%`, height: '16px' }}
 delay={1.2 + i * 0.1}
 />
 </div>
 <Skeleton 
 className="rounded-xl" 
 style={{ width: '24px', height: '24px' }} 
 delay={1.3 + i * 0.1}
 />
 </div>
 </motion.div>
 ))}
 </div>
 </motion.div>

 {/* Additional breathing space */}
 <div className="h-8" />
 </div>
 </div>
 )
}
