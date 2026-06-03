'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import SafeImage from '@/components/SafeImage'
import { cn } from '@/lib/utils'

interface BookHero3DProps {
  coverImage?: string | null
  backCoverImage?: string | null
  title: string
  author?: string | null
  onClick?: () => void
  className?: string
}

export default function BookHero3D({
  coverImage,
  backCoverImage,
  title,
  author,
  onClick,
  className,
}: BookHero3DProps) {
  const dragStartX = useRef(0)
  const baseRotation = useRef(-12)
  const dragDistance = useRef(0)
  const [, setShowingBack] = useState(false)
  const [hasEntryAnimated, setHasEntryAnimated] = useState(false)

  const rotateY = useMotionValue(-12)
  const springRotateY = useSpring(rotateY, { stiffness: 150, damping: 20 })

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragStartX.current = e.clientX
    baseRotation.current = rotateY.get()
    dragDistance.current = 0
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [rotateY])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    const delta = e.clientX - dragStartX.current
    dragDistance.current = Math.abs(delta)
    rotateY.set(baseRotation.current + delta * 0.5)
  }, [rotateY])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
    const wasDrag = dragDistance.current > 5
    if (!wasDrag && onClick) {
      onClick()
      return
    }
    const current = rotateY.get()
    const snapFront = -12
    const snapBack = -192
    const target = Math.abs(current - snapFront) < Math.abs(current - snapBack) ? snapFront : snapBack
    setShowingBack(target === snapBack)
    rotateY.set(target)
  }, [rotateY, onClick])

  return (
    <div
      className={cn('flex items-center justify-center', className)}
      style={{ perspective: '1600px' }}
    >
      <motion.div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
        className={cn('relative select-none touch-none', onClick ? 'cursor-pointer' : '')}
        style={{
          transformStyle: 'preserve-3d',
          rotateY: hasEntryAnimated ? springRotateY : undefined,
        }}
        initial={{ opacity: 0, y: 30, rotateY: -20 }}
        animate={{ opacity: 1, y: 0, rotateY: hasEntryAnimated ? undefined : -12 }}
        onAnimationComplete={() => setHasEntryAnimated(true)}
        whileTap={undefined}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* 3D Book Container */}
        <div
          className="relative"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'rotateX(3deg)',
          }}
        >
          {/* Front Cover */}
          <div
            className="relative w-[240px] h-[340px] md:w-[280px] md:h-[400px] rounded-r-sm rounded-l-[2px] overflow-hidden"
            style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
          >
            {coverImage ? (
              <>
                <SafeImage
                  src={coverImage}
                  alt={title}
                  width={280}
                  height={400}
                  className="absolute inset-0 w-full h-full object-cover"
                  sizes="(max-width: 768px) 240px, 280px"
                />
                {/* Light reflection / shine overlay */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 40%, transparent 60%)',
                  }}
                />
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-bookcraft-blue/20 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-bookcraft-blue/20 rounded-full blur-2xl" />
                {/* Title */}
                <span className="text-white/90 text-center text-xs sm:text-sm font-semibold font-display leading-tight line-clamp-3 relative z-10">{title}</span>
              </div>
            )}
          </div>

          {/* Back Cover */}
          <div
            className="absolute top-0 left-0 w-full h-full rounded-l-sm rounded-r-[2px] overflow-hidden"
            style={{
              transform: 'rotateY(180deg) translateZ(1px)',
              backfaceVisibility: 'hidden',
            }}
          >
            {backCoverImage ? (
              <SafeImage
                src={backCoverImage}
                alt="Back cover"
                width={280}
                height={400}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700" />
            )}
          </div>

          {/* Spine */}
          <div
            className="absolute top-0 left-0 h-full"
            style={{
              width: '24px',
              transformOrigin: 'left center',
              transform: 'rotateY(-90deg)',
              transformStyle: 'preserve-3d',
            }}
          >
            {coverImage ? (
              <div className="w-full h-full relative overflow-hidden">
                <SafeImage
                  src={coverImage}
                  alt=""
                  width={24}
                  height={400}
                  className="absolute inset-0 w-full h-full object-cover"
                  sizes="24px"
                />
                <div className="absolute inset-0 bg-black/40" />
              </div>
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-gray-400 to-gray-500 dark:from-gray-600 dark:to-gray-700" />
            )}
          </div>

          {/* Page Edges (right side) */}
          <div
            className="absolute top-[2px] right-0 bottom-[2px]"
            style={{
              width: '6px',
              transformOrigin: 'right center',
              transform: 'translateX(6px) rotateY(90deg)',
              transformStyle: 'preserve-3d',
              background:
                'repeating-linear-gradient(to bottom, #f5f0e8 0px, #f5f0e8 1px, #ede8df 1px, #ede8df 2px)',
              borderTop: '1px solid #e8e3da',
              borderBottom: '1px solid #e8e3da',
            }}
          />

          {/* Bottom page edge (thin strip) */}
          <div
            className="absolute bottom-0 left-[2px] right-[2px]"
            style={{
              height: '4px',
              transformOrigin: 'bottom center',
              transform: 'translateY(4px) rotateX(90deg)',
              background:
                'repeating-linear-gradient(to right, #f5f0e8 0px, #f5f0e8 1px, #ede8df 1px, #ede8df 2px)',
            }}
          />
        </div>

        {/* Drop Shadow */}
        <div
          className="absolute bottom-0 pointer-events-none"
          style={{
            left: '50%',
            width: '85%',
            height: '20px',
            background:
              'radial-gradient(ellipse at center, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.08) 50%, transparent 80%)',
            filter: 'blur(6px)',
            transform: 'translateX(-50%) translateY(10px) rotateX(80deg)',
          }}
        />
      </motion.div>
    </div>
  )
}
