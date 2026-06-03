'use client'

import { useRef } from 'react'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import { useLanguage } from '@/context/LanguageContext'

// No fake counters — replaced with real value props
const VALUE_PROPS = [
  { value: 'Free', label: 'To start, always', gradient: 'from-blue-400 to-cyan-300' },
  { value: '3 min', label: 'To your first chapter', gradient: 'from-violet-400 to-blue-400' },
  { value: 'PDF & EPUB', label: 'Export formats', gradient: 'from-pink-400 to-rose-300' },
]

export default function StatsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [20, -20])

  return (
    <section className="py-20 px-4 sm:px-6 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)' }} />
      <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)' }} />

      <motion.div style={{ y }} ref={ref} className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0">
          {VALUE_PROPS.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
              animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
              transition={{ duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="text-center px-8 py-6 relative group"
            >
              {i < VALUE_PROPS.length - 1 && (
                <div className="hidden sm:block absolute right-0 top-1/2 -translate-y-1/2 w-px h-12" style={{ background: 'rgba(255,255,255,0.06)' }} />
              )}
              <motion.div
                whileHover={{ scale: 1.04 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <div className={`text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r ${item.gradient} mb-2 leading-none`}
                  style={{ fontFamily: "'Georgia',serif" }}>
                  {item.value}
                </div>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500 }}>
                  {item.label}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
