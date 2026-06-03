'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export type CoverStyle =
 | 'classic-leather'
 | 'modern'
 | 'vintage'
 | 'fabric'
 | 'kids'
 | 'minimalist'

interface BookCoverProps {
 title: string
 subtitle?: string
 author?: string
 coverStyle?: CoverStyle
 customImage?: string
 className?: string
}

const coverStyles = {
 'classic-leather': {
 bg: 'bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950',
 texture: 'leather-texture',
 border: 'border-4 border-amber-950/30',
 shadow: 'shadow-2xl',
 title: 'text-yellow-200 font-serif text-shadow-gold',
 subtitle: 'text-yellow-300/70 font-serif text-sm italic',
 author: 'text-yellow-300/80 font-serif text-sm',
 accent: 'border-t-2 border-b-2 border-yellow-600/40 py-4 my-6'
 },
 'modern': {
 bg: 'bg-gradient-to-br from-slate-900 via-slate-800 to-black',
 texture: 'smooth-texture',
 border: 'border border-slate-700',
 shadow: 'shadow-xl',
 title: 'text-white font-bold tracking-tight',
 subtitle: 'text-slate-400 text-sm font-light tracking-wide',
 author: 'text-slate-300 text-sm font-light',
 accent: 'h-1 bg-gradient-to-r from-blue-500 to-cyan-500 my-6'
 },
 'vintage': {
 bg: 'bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100',
 texture: 'paper-texture',
 border: 'border-4 border-amber-800/40',
 shadow: 'shadow-lg',
 title: 'text-amber-900 font-serif italic',
 subtitle: 'text-amber-700/80 text-sm font-serif',
 author: 'text-amber-700 text-sm font-serif',
 accent: 'border-t border-b border-amber-400 py-3 my-6'
 },
 'fabric': {
 bg: 'bg-gradient-to-br from-blue-200 via-blue-100 to-cyan-100',
 texture: 'fabric-texture',
 border: 'border-4 border-blue-300',
 shadow: 'shadow-lg',
 title: 'text-blue-900 font-sans font-bold',
 subtitle: 'text-blue-700/80 text-sm',
 author: 'text-blue-700 text-sm',
 accent: 'border-t-2 border-blue-400/60 pt-4 mt-6'
 },
 'kids': {
 bg: 'bg-gradient-to-br from-pink-300 via-blue-300 to-blue-300',
 texture: 'smooth-texture',
 border: 'border-4 border-white/50',
 shadow: 'shadow-2xl',
 title: 'text-white font-bold drop-shadow-lg text-shadow-rainbow',
 subtitle: 'text-white/80 text-sm font-semibold',
 author: 'text-white/90 text-sm font-semibold',
 accent: 'h-2 bg-gradient-to-r from-yellow-300 via-pink-300 to-blue-300 rounded-full my-6'
 },
 'minimalist': {
 bg: 'bg-white',
 texture: '',
 border: 'border border-gray-200',
 shadow: 'shadow-md',
 title: 'text-gray-900 font-light tracking-wide',
 subtitle: 'text-gray-600 text-xs font-light tracking-wider',
 author: 'text-gray-600 text-sm font-light',
 accent: 'w-16 h-0.5 bg-gray-900 my-6 mx-auto'
 }
}

const BookCover = forwardRef<HTMLDivElement, BookCoverProps>(({
 title,
 subtitle,
 author,
 coverStyle = 'classic-leather',
 customImage,
 className
}, ref) => {
 const style = coverStyles[coverStyle]

 return (
 <div
 ref={ref}
 className={cn(
 "relative w-full h-full flex flex-col items-center justify-center p-8 sm:p-12",
 style.bg,
 style.texture,
 style.border,
 style.shadow,
 "overflow-hidden",
 className
 )}
 data-density="hard"
 >
 {/* Custom background image overlay */}
 {customImage && (
 <div className="absolute inset-0 opacity-20">
 <img
 src={customImage}
 alt=""
 className="w-full h-full object-cover"
 />
 </div>
 )}

 {/* Decorative corner elements (for classic/vintage styles) */}
 {(coverStyle === 'classic-leather' || coverStyle === 'vintage') && (
 <>
 <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-current opacity-30" />
 <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-current opacity-30" />
 <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-current opacity-30" />
 <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-current opacity-30" />
 </>
 )}

 {/* Content */}
 <div className="relative z-10 text-center space-y-4 sm:space-y-6">
 {/* Sparkle decoration for kids style */}
 {coverStyle === 'kids' && (
 <div className="text-4xl sm:text-6xl mb-4"></div>
 )}

 {/* Title */}
 <h1 className={cn(
 "text-2xl sm:text-3xl md:text-4xl font-bold leading-tight px-4",
 style.title
 )}>
 {title}
 </h1>

 {/* Subtitle */}
 {subtitle && (
 <p className={cn(
 "px-4 -mt-2 sm:-mt-3",
 style.subtitle
 )}>
 {subtitle}
 </p>
 )}

 {/* Decorative accent */}
 <div className={style.accent} />

 {/* Author */}
 {author && (
 <p className={cn("mt-4", style.author)}>
 von {author}
 </p>
 )}

 {/* Bottom decoration for kids style */}
 {coverStyle === 'kids' && (
 <div className="text-3xl sm:text-4xl mt-6"></div>
 )}
 </div>

 {/* Shine effect overlay (for modern/glossy styles) */}
 {coverStyle === 'modern' && (
 <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
 )}
 </div>
 )
})

BookCover.displayName = 'BookCover'

export default BookCover
