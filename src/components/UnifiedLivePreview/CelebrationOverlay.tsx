'use client'

import { useEffect, useRef, useState, startTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import { CheckCircle2 } from 'lucide-react'
import { CelebrationOverlayProps } from './types'
import { useLanguage } from '@/context/LanguageContext'

interface Particle {
 id: number
 x: number
 y: number
 color: string
 size: number
 rotation: number
 isRound: boolean
}

export default function CelebrationOverlay({
 isVisible,
 onAnimationComplete
}: CelebrationOverlayProps) {
 const { t } = useLanguage()
 const containerRef = useRef<HTMLDivElement>(null)
 const [particles, setParticles] = useState<Particle[]>([])

  // Generate confetti particles
 useEffect(() => {
 if (!isVisible) return

 const colors = [
 '#3b82f6', // blue
 '#d946ef', // fuchsia
 '#22c55e', // green
 '#3b82f6', // blue
 '#f59e0b', // amber
 '#ec4899', // pink
 ]

 const newParticles: Particle[] = Array.from({ length: 50 }, (_, i) => ({
 id: i,
 x: Math.random() * 100,
 y: 100 + Math.random() * 20,
 color: colors[Math.floor(Math.random() * colors.length)],
 size: 4 + Math.random() * 8,
 rotation: Math.random() * 360,
 isRound: Math.random() > 0.5
 }))

 startTransition(() => { setParticles(newParticles) })

    // Trigger completion callback after animation
 const timer = setTimeout(() => {
 onAnimationComplete?.()
 }, 3000)

 return () => clearTimeout(timer)
 }, [isVisible, onAnimationComplete])

  // GSAP particle animation
 useEffect(() => {
 if (!isVisible || !containerRef.current) return

 const particleElements = containerRef.current.querySelectorAll('.confetti-particle')

 particleElements.forEach((particle, i) => {
 gsap.fromTo(particle,
 {
 y: '100vh',
 x: `${Math.random() * 100}vw`,
 rotation: 0,
 opacity: 1,
 scale: 0
 },
 {
 y: `${-20 - Math.random() * 80}vh`,
 x: `+=${(Math.random() - 0.5) * 200}`,
 rotation: `random(-180, 180)`,
 opacity: 0,
 scale: 1,
 duration: 2 + Math.random(),
 delay: i * 0.02,
 ease: 'power2.out'
 }
 )
 })
 }, [isVisible, particles])

 return (
 <AnimatePresence>
 {isVisible && (
 <motion.div
 ref={containerRef}
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.5 }}
 className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
 >
 {/* Radial glow */}
 <motion.div
 initial={{ scale: 0, opacity: 0 }}
 animate={{ scale: 2, opacity: [0, 0.3, 0] }}
 transition={{ duration: 1.5, ease: 'easeOut' }}
 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full"
 style={{
 background: 'radial-gradient(circle, rgba(62, 134, 215, 0.5) 0%, transparent 70%)'
 }}
 />

 {/* Success icon */}
 <motion.div
 initial={{ scale: 0, rotate: -180 }}
 animate={{ scale: 1, rotate: 0 }}
 transition={{
 type: 'spring',
 stiffness: 200,
 damping: 15,
 delay: 0.2
 }}
 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
 >
 <div className="relative">
 {/* Glow rings */}
 <motion.div
 initial={{ scale: 1, opacity: 0.5 }}
 animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
 transition={{ duration: 2, repeat: Infinity }}
 className="absolute inset-0 rounded-full bg-green-400/30 blur-xl"
 style={{ width: 120, height: 120, margin: -20 }}
 />

 <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-2xl shadow-green-500/50">
 <CheckCircle2 className="w-10 h-10 text-white" />
 </div>

 {/* Particles */}
 {[...Array(4)].map((_, i) => (
 <motion.div
 key={i}
 initial={{ scale: 0, opacity: 0 }}
 animate={{
 scale: [0, 1, 0],
 opacity: [0, 1, 0],
 x: [0, (i % 2 === 0 ? 1 : -1) * 40],
 y: [0, (i < 2 ? -1 : 1) * 40]
 }}
 transition={{
 duration: 1,
 delay: 0.5 + i * 0.1,
 repeat: Infinity,
 repeatDelay: 1.5
 }}
 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
 >
 <CheckCircle2 className="w-4 h-4 text-yellow-400" />
 </motion.div>
 ))}
 </div>
 </motion.div>

 {/* Confetti particles */}
 {particles.map((particle) => (
 <div
 key={particle.id}
 className="confetti-particle absolute"
 style={{
 left: `${particle.x}%`,
 width: particle.size,
 height: particle.size,
 backgroundColor: particle.color,
 borderRadius: particle.isRound ? '50%' : '2px',
 transform: `rotate(${particle.rotation}deg)`
 }}
 />
 ))}

 {/* Success text */}
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.8, duration: 0.5 }}
 className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-[88px] text-center px-5 py-3 rounded-2xl bg-black/60 backdrop-blur-md shadow-2xl max-w-[90vw]"
 >
 <h2 className="text-xl sm:text-2xl font-bold font-display text-white mb-1 whitespace-nowrap">{t('generationComplete')}</h2>
 <p className="text-sm text-white/80 whitespace-nowrap">{t('contentReadyToView')}</p>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 )
}
