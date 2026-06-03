'use client'

import { useRef } from 'react'
import { motion, useInView, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion'
import { useLanguage } from '@/context/LanguageContext'
import { ArrowRight, BookOpen, Sparkles } from 'lucide-react'
import { useAuthModal } from '@/context/AuthModalContext'

export default function CTASection() {
  const { t } = useLanguage()
  const { requestAuthModal } = useAuthModal()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.94, 1, 0.96])

  // Magnetic CTA button
  const btnRef = useRef<HTMLButtonElement>(null)
  const bx = useMotionValue(0); const by = useMotionValue(0)
  const sbx = useSpring(bx, { stiffness: 180, damping: 18 })
  const sby = useSpring(by, { stiffness: 180, damping: 18 })

  return (
    <section className="py-28 px-4 sm:px-6 relative overflow-hidden">
      <motion.div ref={ref} style={{ scale }} className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40, filter: 'blur(12px)' }}
          animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-3xl overflow-hidden"
        >
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,#0d1f5c,#2a0e70,#5c0e3a)' }} />

          {/* Animated grain */}
          <motion.div
            className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
          />

          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: `radial-gradient(circle,rgba(255,255,255,0.9) 1px,transparent 1px)`, backgroundSize: '28px 28px' }} />

          {/* Moving highlight */}
          <motion.div
            className="absolute inset-0"
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            style={{ background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.04) 50%,transparent 100%)', backgroundSize: '200% 100%' }}
          />

          {/* Blobs */}
          <motion.div animate={{ scale: [1, 1.15, 1], x: [0, 20, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            style={{ position: 'absolute', top: '-20%', left: '15%', width: 300, height: 300, borderRadius: '50%', background: 'rgba(99,102,241,0.18)', filter: 'blur(80px)', pointerEvents: 'none' }} />
          <motion.div animate={{ scale: [1, 1.2, 1], x: [0, -15, 0] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            style={{ position: 'absolute', bottom: '-10%', right: '10%', width: 280, height: 280, borderRadius: '50%', background: 'rgba(219,39,119,0.15)', filter: 'blur(70px)', pointerEvents: 'none' }} />

          {/* Floating decorative icons */}
          <motion.div
            animate={{ y: [0, -14, 0], rotate: [0, 6, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-6 right-10 hidden sm:flex w-14 h-14 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <Sparkles className="w-7 h-7" style={{ color: 'rgba(255,255,255,0.5)' }} />
          </motion.div>
          <motion.div
            animate={{ y: [0, 12, 0], rotate: [0, -5, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
            className="absolute bottom-6 left-10 hidden sm:flex w-12 h-12 items-center justify-center rounded-xl"
            style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <BookOpen className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.4)' }} />
          </motion.div>

          {/* Content */}
          <div className="relative px-8 sm:px-14 lg:px-20 py-18 sm:py-20 text-center" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              style={{ fontFamily: "'Georgia',serif", fontSize: 'clamp(2rem,4vw,3.2rem)', fontWeight: 700, color: '#fff', lineHeight: 1.1, marginBottom: '1rem' }}
            >
              {t('landingReadyToWrite')}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', marginBottom: '2.5rem', maxWidth: 480, margin: '0 auto 2.5rem' }}
            >
              {t('landingThousandsDone')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <motion.button
                ref={btnRef}
                style={{ x: sbx, y: sby }}
                onMouseMove={(e) => {
                  if (!btnRef.current) return
                  const r = btnRef.current.getBoundingClientRect()
                  bx.set((e.clientX - r.left - r.width / 2) * 0.25)
                  by.set((e.clientY - r.top - r.height / 2) * 0.25)
                }}
                onMouseLeave={() => { bx.set(0); by.set(0) }}
                onClick={requestAuthModal}
                whileTap={{ scale: 0.97 }}
                className="group relative overflow-hidden inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full font-bold text-base"
                style={{ background: '#fff', color: '#1a0a40', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <motion.span
                  style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.15),transparent)' }}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
                />
                {t('landingStartFree')}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.5 }}
              style={{ marginTop: '1.25rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.25)' }}
            >
              {t('landingNoCreditCard')}
            </motion.p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
