'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useLanguage } from '@/context/LanguageContext'
import { Check, ArrowRight, Zap, Crown } from 'lucide-react'
import { useAuthModal } from '@/context/AuthModalContext'

export default function PricingSection() {
  const { t } = useLanguage()
  const { requestAuthModal } = useAuthModal()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  const freeFeatures = ['landingPriceFree1', 'landingPriceFree2', 'landingPriceFree3', 'landingPriceFree4'] as const
  const otpFeatures = ['landingPriceOtp1', 'landingPriceOtp2', 'landingPriceOtp3', 'landingPriceOtp4'] as const
  const proFeatures = ['landingPriceSub1', 'landingPriceSub2', 'landingPriceSub3', 'landingPriceSub4', 'landingPriceSub5'] as const

  return (
    <section className="py-28 px-4 sm:px-6 relative overflow-hidden" id="pricing">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(15,15,25,0.8) 50%, transparent 100%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-violet-700/5 blur-[150px]" />
      </div>
      <div ref={ref} className="max-w-6xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-amber-400 text-sm font-medium mb-5">{t('pricing')}</div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">{t('landingPricingTitle')}</h2>
          <p className="text-lg text-white/40 max-w-2xl mx-auto">{t('landingPricingDesc')}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {/* Free */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.1 }}>
            <div className="h-full rounded-2xl border border-white/[0.07] bg-white/[0.03] p-7">
              <div className="mb-6">
                <h3 className="text-base font-semibold text-white/50 mb-2">{t('landingPriceFreeName')}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">{t('landingPriceFreePrice')}</span>
                  <span className="text-white/35 text-sm">{t('landingPriceForever')}</span>
                </div>
              </div>
              <div className="space-y-3 mb-8">
                {freeFeatures.map(k => (
                  <div key={k} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0 mt-0.5"><Check className="w-3 h-3 text-emerald-400" /></div>
                    <span className="text-sm text-white/45">{t(k)}</span>
                  </div>
                ))}
              </div>
              <button onClick={requestAuthModal} className="w-full py-3.5 rounded-xl border border-white/10 text-white/70 text-sm font-medium hover:bg-white/5 hover:text-white hover:border-white/20 transition-all duration-300 flex items-center justify-center gap-2">
                {t('getStarted')}<ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* Popular / OTP */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.2 }} className="relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
              <div className="px-4 py-1.5 rounded-full text-white text-xs font-bold shadow-lg" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>{t('landingPricePopular')}</div>
            </div>
            <div className="h-full rounded-2xl p-[1px] relative" style={{ background: 'linear-gradient(135deg, #3b82f680, #8b5cf680, #3b82f640)' }}>
              <div className="h-full rounded-2xl bg-[#0a0a14] p-7">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2"><h3 className="text-base font-semibold text-white">{t('landingPriceOtpName')}</h3><Zap className="w-4 h-4 text-blue-400" /></div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">{t('landingPriceOtpPrice')}</span>
                    <span className="text-white/35 text-sm">{t('landingPriceOtpPerBook')}</span>
                  </div>
                </div>
                <div className="space-y-3 mb-8">
                  {otpFeatures.map(k => (
                    <div key={k} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5"><Check className="w-3 h-3 text-blue-400" /></div>
                      <span className="text-sm text-white/70">{t(k)}</span>
                    </div>
                  ))}
                </div>
                <button onClick={requestAuthModal} className="w-full py-3.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300 hover:opacity-90 hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                  {t('getStarted')}<ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Pro */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.3 }} className="relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
              <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-lg">{t('landingPriceBestValue')}</div>
            </div>
            <div className="h-full rounded-2xl border border-amber-500/20 bg-white/[0.03] p-7">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2"><h3 className="text-base font-semibold text-white">{t('landingPriceSubName')}</h3><Crown className="w-4 h-4 text-amber-400" /></div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">{t('landingPriceSubPrice')}</span>
                  <span className="text-white/35 text-sm">{t('landingPriceSubPeriod')}</span>
                </div>
              </div>
              <div className="space-y-3 mb-8">
                {proFeatures.map(k => (
                  <div key={k} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5"><Check className="w-3 h-3 text-amber-400" /></div>
                    <span className="text-sm text-white/45">{t(k)}</span>
                  </div>
                ))}
              </div>
              <button onClick={requestAuthModal} className="w-full py-3.5 rounded-xl border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-500/10 transition-all duration-300 flex items-center justify-center gap-2">
                {t('getStarted')}<ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
