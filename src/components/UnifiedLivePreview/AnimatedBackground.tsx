'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import { AnimatedBackgroundProps } from './types'

export default function AnimatedBackground({ intensity = 'medium' }: AnimatedBackgroundProps) {
 const blob1Ref = useRef<HTMLDivElement>(null)
 const blob2Ref = useRef<HTMLDivElement>(null)
 const blob3Ref = useRef<HTMLDivElement>(null)

 const intensityConfig = {
 subtle: { scale: 0.8, duration: 25, distance: 30 },
 medium: { scale: 1, duration: 20, distance: 50 },
 high: { scale: 1.2, duration: 15, distance: 80 }
 }

 const config = intensityConfig[intensity]

 useEffect(() => {
 const blobs = [blob1Ref.current, blob2Ref.current, blob3Ref.current]

 blobs.forEach((blob, i) => {
 if (!blob) return

      // Random starting position
 gsap.set(blob, {
 x: Math.random() * config.distance - config.distance / 2,
 y: Math.random() * config.distance - config.distance / 2,
 scale: config.scale * (0.8 + Math.random() * 0.4)
 })

      // Continuous floating animation
 gsap.to(blob, {
 x: `random(-${config.distance}, ${config.distance})`,
 y: `random(-${config.distance}, ${config.distance})`,
 scale: `random(${config.scale * 0.8}, ${config.scale * 1.2})`,
 rotation: `random(-10, 10)`,
 duration: config.duration + i * 3,
 repeat: -1,
 yoyo: true,
 ease: 'sine.inOut',
 delay: i * 2
 })
 })

 return () => {
 blobs.forEach(blob => {
 if (blob) gsap.killTweensOf(blob)
 })
 }
 }, [config])

 return (
 <div className="fixed inset-0 overflow-hidden pointer-events-none">
 {/* Base gradient */}
 <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950" />

 {/* Animated gradient mesh blobs */}
 <motion.div
 ref={blob1Ref}
 className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full opacity-40"
 style={{
 background: 'radial-gradient(circle, rgba(62, 134, 215, 0.6) 0%, rgba(62, 134, 215, 0.3) 50%, transparent 70%)',
 filter: 'blur(60px)'
 }}
 initial={{ opacity: 0 }}
 animate={{ opacity: 0.4 }}
 transition={{ duration: 2 }}
 />

 <motion.div
 ref={blob2Ref}
 className="absolute top-1/4 -right-1/4 w-2/3 h-2/3 rounded-full opacity-30"
 style={{
 background: 'radial-gradient(circle, rgba(168, 85, 247, 0.5) 0%, rgba(192, 132, 252, 0.2) 50%, transparent 70%)',
 filter: 'blur(80px)'
 }}
 initial={{ opacity: 0 }}
 animate={{ opacity: 0.3 }}
 transition={{ duration: 2, delay: 0.5 }}
 />

 <motion.div
 ref={blob3Ref}
 className="absolute -bottom-1/4 left-1/4 w-1/2 h-1/2 rounded-full opacity-35"
 style={{
 background: 'radial-gradient(circle, rgba(79, 70, 229, 0.5) 0%, rgba(99, 102, 241, 0.2) 50%, transparent 70%)',
 filter: 'blur(70px)'
 }}
 initial={{ opacity: 0 }}
 animate={{ opacity: 0.35 }}
 transition={{ duration: 2, delay: 1 }}
 />

 {/* Subtle noise overlay for texture */}
 <div
 className="absolute inset-0 opacity-[0.03]"
 style={{
 backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
 }}
 />

 {/* Vignette effect */}
 <div
 className="absolute inset-0"
 style={{
 background: 'radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0,0,0,0.4) 100%)'
 }}
 />
 </div>
 )
}
