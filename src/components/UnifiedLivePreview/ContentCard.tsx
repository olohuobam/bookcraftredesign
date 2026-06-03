'use client'

import { motion } from 'framer-motion'
import { BookOpen, ImageIcon } from 'lucide-react'
import { cardVariants, newBadgeVariants } from './animations'
import { ContentCardProps } from './types'
import StreamingContent from './StreamingContent'
import ImageReveal from './ImageReveal'
import { useLanguage } from '@/context/LanguageContext'

export default function ContentCard({ item, isActive = false }: ContentCardProps) {
 const { t } = useLanguage()
 const getTypeIcon = () => {
 switch (item.type) {
 case 'cover':
 return <BookOpen className="w-4 h-4" />
 case 'chapter':
 return <BookOpen className="w-4 h-4" />
 case 'image':
 return <ImageIcon className="w-4 h-4" />
 }
 }

 const getTypeLabel = () => {
 switch (item.type) {
 case 'cover':
 return 'Cover'
 case 'chapter':
 return `Chapter ${item.index + 1}`
 case 'image':
 return `Page ${item.index + 1}`
 }
 }

 const getTypeColor = () => {
 switch (item.type) {
 case 'cover':
 return 'from-blue-500 to-blue-600'
 case 'chapter':
 return 'from-blue-500 to-blue-500'
 case 'image':
 return 'from-blue-500 to-cyan-500'
 }
 }

 return (
 <motion.div
 variants={cardVariants}
 initial="hidden"
 animate="visible"
 exit="exit"
 layout
 className={`
 relative p-6 rounded-2xl
 bg-white/[0.08] backdrop-blur-xl
 border border-white/[0.12]
 shadow-xl shadow-black/10
 ${isActive ? 'ring-2 ring-bookcraft-blue/50' : ''}
 ${item.isNew ? 'ring-2 ring-green-500/30' : ''}
 `}
 >
 {/* Card Header */}
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 {/* Type Badge */}
 <div className={`
 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white
 bg-gradient-to-r ${getTypeColor()}
 `}>
 {getTypeIcon()}
 <span>{getTypeLabel()}</span>
 </div>

 {/* Title (for chapters) */}
 {item.type === 'chapter' && item.title && (
 <span className="text-white/70 text-sm font-medium truncate max-w-[200px]">
 {item.title}
 </span>
 )}
 </div>

 {/* Status indicators */}
 <div className="flex items-center gap-2">
 {/* NEW badge */}
 {item.isNew && (
 <motion.span
 variants={newBadgeVariants}
 initial="hidden"
 animate="visible"
 className="px-2 py-0.5 text-xs font-bold text-white bg-green-500 rounded-full"
 >
 NEW
 </motion.span>
 )}

 {/* Streaming indicator */}
 {item.isStreaming && (
 <div className="flex items-center gap-1.5">
 <div className="w-2 h-2 rounded-full bg-bookcraft-blue animate-pulse" />
 <span className="text-xs text-bookcraft-blue">Generating...</span>
 </div>
 )}

 {/* Complete indicator */}
 {item.isComplete && !item.isStreaming && (
 <div className="flex items-center gap-1.5">
 <div className="w-2 h-2 rounded-full bg-green-400" />
 <span className="text-xs text-green-400">{t('complete')}</span>
 </div>
 )}
 </div>
 </div>

 {/* Card Content */}
 <div className="mt-2">
 {/* Text content (chapters) */}
 {item.type === 'chapter' && item.content !== undefined && (
 <StreamingContent
 content={item.content}
 isStreaming={item.isStreaming}
 isComplete={item.isComplete}
 />
 )}

 {/* Image content */}
 {(item.type === 'image' || item.type === 'cover') && item.imageUrl && (
 <ImageReveal
 imageUrl={item.imageUrl}
 alt={item.title || `${item.type} image`}
 isNew={item.isNew}
 aspectRatio={item.type === 'cover' ? 'portrait' : 'landscape'}
 />
 )}

 {/* Placeholder for pending content */}
 {!item.content && !item.imageUrl && (
 <div className="h-32 rounded-lg bg-white/5 flex items-center justify-center">
 <div className="flex flex-col items-center gap-2 text-white/40">
 <motion.div
 animate={{ rotate: 360 }}
 transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
 >
 <BookOpen className="w-6 h-6" />
 </motion.div>
 <span className="text-sm">Waiting for content...</span>
 </div>
 </div>
 )}
 </div>
 </motion.div>
 )
}
