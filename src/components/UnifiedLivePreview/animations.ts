// Framer Motion Animation Variants for Unified Live Preview

import { Variants, Transition, Easing } from 'framer-motion'

// Spring transition for natural movement
export const springTransition: Transition = {
 type: 'spring',
 stiffness: 300,
 damping: 30,
 mass: 0.8
}

// Smooth easing for elegant animations
export const smoothEasing: Easing = 'easeOut'

// Card entrance animation
export const cardVariants: Variants = {
 hidden: {
 opacity: 0,
 y: 40,
 scale: 0.95
 },
 visible: {
 opacity: 1,
 y: 0,
 scale: 1,
 transition: springTransition
 },
 exit: {
 opacity: 0,
 y: -20,
 scale: 0.98,
 transition: { duration: 0.3 }
 }
}

// Stagger children animation
export const containerVariants: Variants = {
 hidden: { opacity: 0 },
 visible: {
 opacity: 1,
 transition: {
 staggerChildren: 0.15,
 delayChildren: 0.1
 }
 }
}

// Image reveal with blur effect
export const imageRevealVariants: Variants = {
 loading: {
 filter: 'blur(20px)',
 scale: 1.1,
 opacity: 0
 },
 revealed: {
 filter: 'blur(0px)',
 scale: 1,
 opacity: 1,
 transition: {
 duration: 0.8,
 ease: 'easeOut'
 }
 }
}

// NEW badge animation
export const newBadgeVariants: Variants = {
 hidden: {
 opacity: 0,
 scale: 0,
 rotate: -10
 },
 visible: {
 opacity: 1,
 scale: 1,
 rotate: 0,
 transition: {
 type: 'spring',
 stiffness: 500,
 damping: 25
 }
 },
 pulse: {
 scale: [1, 1.1, 1],
 transition: {
 duration: 0.6,
 repeat: Infinity,
 repeatDelay: 1
 }
 }
}

// Text fade in for streaming content
export const textFadeVariants: Variants = {
 hidden: {
 opacity: 0,
 y: 10
 },
 visible: {
 opacity: 1,
 y: 0,
 transition: {
 duration: 0.4,
 ease: 'easeOut'
 }
 }
}

// Cursor blink animation
export const cursorVariants: Variants = {
 blink: {
 opacity: [1, 0, 1],
 transition: {
 duration: 1,
 repeat: Infinity,
 ease: 'linear'
 }
 }
}

// Progress bar fill animation
export const progressFillVariants: Variants = {
 empty: { scaleX: 0 },
 fill: (progress: number) => ({
 scaleX: progress / 100,
 transition: {
 duration: 0.5,
 ease: 'easeOut'
 }
 })
}

// Celebration confetti animation
export const confettiVariants: Variants = {
 hidden: {
 opacity: 0,
 y: 0,
 scale: 0
 },
 visible: (i: number) => ({
 opacity: [0, 1, 1, 0],
 y: [0, -100 - Math.random() * 200],
 x: [-50 + Math.random() * 100],
 scale: [0, 1, 1, 0.5],
 rotate: [0, Math.random() * 360],
 transition: {
 duration: 2,
 delay: i * 0.02,
 ease: 'easeOut'
 }
 })
}

// Background blob animation (controlled by GSAP, but initial state here)
export const blobVariants: Variants = {
 animate: {
 scale: [1, 1.2, 1],
 x: [0, 30, -20, 0],
 y: [0, -20, 30, 0],
 transition: {
 duration: 20,
 repeat: Infinity,
 ease: 'easeInOut'
 }
 }
}

// Skeleton shimmer animation
export const skeletonVariants: Variants = {
 shimmer: {
 backgroundPosition: ['200% 0', '-200% 0'],
 transition: {
 duration: 1.5,
 repeat: Infinity,
 ease: 'linear'
 }
 }
}

// Cover image entrance
export const coverVariants: Variants = {
 hidden: {
 opacity: 0,
 scale: 0.8,
 y: 30
 },
 visible: {
 opacity: 1,
 scale: 1,
 y: 0,
 transition: {
 type: 'spring',
 stiffness: 200,
 damping: 20,
 delay: 0.2
 }
 }
}

// Header slide down
export const headerVariants: Variants = {
 hidden: {
 opacity: 0,
 y: -20
 },
 visible: {
 opacity: 1,
 y: 0,
 transition: {
 duration: 0.5,
 ease: 'easeOut'
 }
 }
}

// Progress panel slide up
export const progressPanelVariants: Variants = {
 hidden: {
 opacity: 0,
 y: 50
 },
 visible: {
 opacity: 1,
 y: 0,
 transition: {
 duration: 0.5,
 delay: 0.3,
 ease: 'easeOut'
 }
 }
}

// Floating animation for decorative elements
export const floatVariants: Variants = {
 float: {
 y: [0, -10, 0],
 transition: {
 duration: 3,
 repeat: Infinity,
 ease: 'easeInOut'
 }
 }
}
