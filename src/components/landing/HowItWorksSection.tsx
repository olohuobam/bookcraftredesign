'use client'

import { useRef } from 'react'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import { useLanguage } from '@/context/LanguageContext'
import { MessageSquareText, Cpu, BookOpen } from 'lucide-react'

const steps = [
  { icon: MessageSquareText, titleKey: 'landingStep1Title' as const, descKey: 'landingStep1Desc' as const, gradient: 'from-blue-500 to-cyan-400', glow: '#3b82f6', number: '01' },
  { icon: Cpu,               titleKey: 'landingStep2Title' as const, descKey: 'landingStep2Desc' as const, gradient: 'from-violet-500 to-blue-500', glow: '#8b5cf6', number: '02' },
  { icon: BookOpen,          titleKey: 'landingStep3Title' as const, descKey: 'landingStep3Desc' as const, gradient: 'from-emerald-500 to-teal-400', glow: '#10b981', number: '03' },
]

function StepCard({ step, index }: { step: typeof steps[0]; index: number }) {
  const { t } = useLanguage()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const Icon = step.icon
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60, filter: 'blur(10px)' }}
      animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
      transition={{ duration: 0.8, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="relative group"
    >
      {/* Connector line */}
      {index < steps.length - 1 && (
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={isInView ? { scaleX: 1, opacity: 1 } : {}}
          transition={{ duration: 1.2, delay: index * 0.15 + 0.5 }}
          className="hidden lg:block absolute top-[52px] left-[calc(100%-8px)] w-full h-px origin-left"
          style={{ background: 'linear-gradient(90deg,rgba(99,102,241,0.3),rgba(99,102,241,0.05))', zIndex: 0 }}
        />
      )}

      <div className="relative rounded-2xl p-8 overflow-hidden transition-all duration-500 group-hover:-translate-y-2"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Hover glow */}
        <motion.div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 30% 30%, ${step.glow}12 0%, transparent 70%)` }}
        />

        <div className="absolute top-5 right-5 font-black select-none" style={{ fontSize: '3.5rem', color: 'rgba(255,255,255,0.03)', lineHeight: 1, fontFamily: "'Georgia',serif" }}>
          {step.number}
        </div>

        <motion.div
          whileHover={{ scale: 1.1, rotate: 4 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center mb-6 shadow-lg`}
        >
          <Icon className="w-7 h-7 text-white" />
        </motion.div>

        <h3 className="text-lg font-bold text-white mb-3">{t(step.titleKey)}</h3>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 300 }}>{t(step.descKey)}</p>
      </div>
    </motion.div>
  )
}

export default function HowItWorksSection() {
  const { t } = useLanguage()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [40, -40])

  return (
    <section className="py-32 px-4 sm:px-6 relative overflow-hidden" id="how-it-works">
      <motion.div style={{ y }} className="absolute inset-0 pointer-events-none">
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 400, borderRadius: '50%', background: 'rgba(139,92,246,0.04)', filter: 'blur(120px)' }} />
      </motion.div>

      <div ref={ref} className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6"
            style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(99,102,241,0.9)' }}
          >
            {t('landingHowItWorks')}
          </motion.div>

          <h2 style={{ fontFamily: "'Georgia',serif", fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 700, color: '#fff', lineHeight: 1.1, marginBottom: '1rem' }}>
            {t('landingHowSimple')}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '1.05rem', maxWidth: 500, margin: '0 auto', fontWeight: 300, lineHeight: 1.7 }}>
            {t('landingThreeSteps')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-5">
          {steps.map((step, i) => <StepCard key={step.number} step={step} index={i} />)}
        </div>
      </div>
    </section>
  )
}
