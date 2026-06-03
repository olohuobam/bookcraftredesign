'use client'

import { useRef } from 'react'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import { useLanguage } from '@/context/LanguageContext'
import { Zap, Heart, Globe, Users, Download, Wand2 } from 'lucide-react'

const features = [
  { icon: Zap,      titleKey: 'landingSaveTime' as const,          descKey: 'landingSaveTimeDesc' as const,          glow: '#3b82f6', gradient: 'from-blue-500 to-cyan-400' },
  { icon: Heart,    titleKey: 'landingYourVision' as const,         descKey: 'landingYourVisionDesc' as const,         glow: '#ec4899', gradient: 'from-pink-500 to-rose-400' },
  { icon: Download, titleKey: 'landingIdeaToPrint' as const,        descKey: 'landingIdeaToPrintDesc' as const,        glow: '#6366f1', gradient: 'from-indigo-500 to-violet-400' },
  { icon: Wand2,    titleKey: 'landingFeatureAI' as const,          descKey: 'landingFeatureAIDesc' as const,          glow: '#8b5cf6', gradient: 'from-violet-500 to-blue-500' },
  { icon: Globe,    titleKey: 'landingFeatureLanguages' as const,    descKey: 'landingFeatureLanguagesDesc' as const,    glow: '#10b981', gradient: 'from-emerald-500 to-teal-400' },
  { icon: Users,    titleKey: 'landingFeatureCommunity' as const,    descKey: 'landingFeatureCommunityDesc' as const,    glow: '#f59e0b', gradient: 'from-amber-500 to-orange-400' },
]

export default function FeaturesSection() {
  const { t } = useLanguage()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const bgY = useTransform(scrollYProgress, [0, 1], [50, -50])

  return (
    <section className="py-32 px-4 sm:px-6 relative overflow-hidden" id="features">
      <motion.div style={{ y: bgY }} className="absolute inset-0 pointer-events-none">
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 600, height: 600, borderRadius: '50%', background: 'rgba(236,72,153,0.04)', filter: 'blur(130px)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: 400, height: 400, borderRadius: '50%', background: 'rgba(59,130,246,0.04)', filter: 'blur(100px)' }} />
      </motion.div>

      <div ref={ref} className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6"
            style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(167,139,250,0.9)' }}>
            {t('features')}
          </div>
          <h2 style={{ fontFamily: "'Georgia',serif", fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 700, color: '#fff', lineHeight: 1.1, marginBottom: '1rem' }}>
            {t('landingWhyLove')}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '1.05rem', maxWidth: 480, margin: '0 auto', fontWeight: 300, lineHeight: 1.7 }}>
            {t('landingWhyLoveDesc')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <motion.div
                key={f.titleKey}
                initial={{ opacity: 0, y: 50, filter: 'blur(8px)' }}
                animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
                transition={{ duration: 0.75, delay: i * 0.09, ease: [0.16, 1, 0.3, 1] }}
                className="group relative"
              >
                <motion.div
                  whileHover={{ y: -6, borderColor: 'rgba(255,255,255,0.12)' }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                  className="h-full rounded-2xl p-7 overflow-hidden relative"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.055)' }}
                >
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse at 25% 25%, ${f.glow}10 0%, transparent 65%)` }} />

                  <motion.div
                    whileHover={{ scale: 1.12, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center shadow-lg mb-5`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </motion.div>

                  <h3 className="text-base font-bold text-white mb-2 group-hover:text-blue-300 transition-colors duration-300">
                    {t(f.titleKey)}
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', lineHeight: 1.7, fontWeight: 300 }}>
                    {t(f.descKey)}
                  </p>
                </motion.div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
