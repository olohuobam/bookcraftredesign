'use client'

import { useRef } from 'react'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'

interface CinematicSectionProps {
  children: React.ReactNode
  className?: string
  id?: string
  style?: React.CSSProperties
}

export default function CinematicSection({ children, className = '', id, style }: CinematicSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-120px' })

  return (
    <div id={id} ref={ref} className={className} style={{ overflow: 'hidden', ...style }}>
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.96, filter: 'blur(14px)' }}
        animate={isInView ? { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' } : {}}
        transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </div>
  )
}
