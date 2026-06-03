'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

type TransitionDirection = 'forward' | 'back' | 'fade' | 'up'

interface PageTransitionProps {
 children: ReactNode
 className?: string
  /** Direction of the page transition animation */
 direction?: TransitionDirection
  /** Custom delay before animation starts */
 delay?: number
}

const directionVariants = {
 forward: {
 initial: { opacity: 0, x: 60, scale: 0.98 },
 animate: { opacity: 1, x: 0, scale: 1 },
 exit: { opacity: 0, x: -60, scale: 0.98 },
 },
 back: {
 initial: { opacity: 0, x: -60, scale: 0.98 },
 animate: { opacity: 1, x: 0, scale: 1 },
 exit: { opacity: 0, x: 60, scale: 0.98 },
 },
 fade: {
 initial: { opacity: 0, scale: 0.98 },
 animate: { opacity: 1, scale: 1 },
 exit: { opacity: 0, scale: 0.98 },
 },
 up: {
 initial: { opacity: 0, y: 20, scale: 0.98 },
 animate: { opacity: 1, y: 0, scale: 1 },
 exit: { opacity: 0, y: -20, scale: 0.98 },
 },
}

const pageTransition = {
 type: 'spring' as const,
 stiffness: 300,
 damping: 30,
 mass: 0.8,
}

/**
 * PageTransition Component — iOS-style page transitions
 *
 * Provides smooth, spring-based page transitions with:
 * - Directional slide animations (forward/back/up/fade)
 * - Subtle scale effect for depth
 * - iOS-style spring physics
 * - GPU-accelerated transforms
 */
export default function PageTransition({
 children,
 className = '',
 direction = 'up',
 delay = 0,
}: PageTransitionProps) {
 const variants = directionVariants[direction]

 return (
 <motion.div
 initial={variants.initial}
 animate={variants.animate}
 exit={variants.exit}
 transition={{ ...pageTransition, delay }}
 className={className}
 style={{
 willChange: 'transform, opacity',
 transform: 'translateZ(0)', // GPU acceleration
 }}
 >
 {children}
 </motion.div>
 )
}

/**
 * StaggerContainer — Wraps children to animate them in sequence
 */
export function StaggerContainer({
 children,
 className = '',
 staggerDelay = 0.05,
}: {
 children: ReactNode
 className?: string
 staggerDelay?: number
}) {
 return (
 <motion.div
 initial="initial"
 animate="animate"
 className={className}
 transition={{ staggerChildren: staggerDelay }}
 >
 {children}
 </motion.div>
 )
}

/**
 * StaggerItem — Individual item that animates within a StaggerContainer
 */
export function StaggerItem({
 children,
 className = '',
}: {
 children: ReactNode
 className?: string
}) {
 return (
 <motion.div
 className={className}
 variants={{
 initial: { opacity: 0, y: 16, scale: 0.96 },
 animate: {
 opacity: 1,
 y: 0,
 scale: 1,
 transition: {
 type: 'spring',
 stiffness: 300,
 damping: 24,
 },
 },
 }}
 >
 {children}
 </motion.div>
 )
}

/**
 * AnimatedCard — Card wrapper with fade+slide animation on mount
 */
export function AnimatedCard({
 children,
 className = '',
 delay = 0,
 index = 0,
}: {
 children: ReactNode
 className?: string
 delay?: number
 index?: number
}) {
 return (
 <motion.div
 initial={{ opacity: 0, y: 20, scale: 0.96 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 transition={{
 type: 'spring',
 stiffness: 260,
 damping: 24,
 delay: delay + index * 0.06,
 }}
 whileHover={{
 y: -2,
 transition: { duration: 0.2 },
 }}
 whileTap={{ scale: 0.98 }}
 className={className}
 >
 {children}
 </motion.div>
 )
}

/**
 * AnimatedList — Renders list items with staggered animations
 */
export function AnimatedList({
 children,
 className = '',
}: {
 children: ReactNode
 className?: string
}) {
 return (
 <motion.div
 initial="initial"
 animate="animate"
 className={className}
 variants={{
 animate: {
 transition: { staggerChildren: 0.04 },
 },
 }}
 >
 {children}
 </motion.div>
 )
}

export function AnimatedListItem({
 children,
 className = '',
}: {
 children: ReactNode
 className?: string
}) {
 return (
 <motion.div
 className={className}
 variants={{
 initial: { opacity: 0, x: -12 },
 animate: {
 opacity: 1,
 x: 0,
 transition: {
 type: 'spring',
 stiffness: 300,
 damping: 24,
 },
 },
 }}
 >
 {children}
 </motion.div>
 )
}
