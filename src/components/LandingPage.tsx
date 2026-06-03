'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'
import BookLoadingSpinner from '@/components/BookLoadingSpinner'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import AuthButton from '@/components/AuthButton'
import { Menu, X } from 'lucide-react'
import Logo from '@/components/Logo'
import { AuthModalProvider } from '@/context/AuthModalContext'
import { MotionConfig, motion } from 'framer-motion'
import dynamic from 'next/dynamic'

const HeroSection = dynamic(() => import('@/components/landing/HeroSection'), { ssr: true })
const StatsSection = dynamic(() => import('@/components/landing/StatsSection'), { loading: () => <div className="py-20" />, ssr: true })
const HowItWorksSection = dynamic(() => import('@/components/landing/HowItWorksSection'), { loading: () => <div className="py-24" />, ssr: true })
const FeaturesSection = dynamic(() => import('@/components/landing/FeaturesSection'), { loading: () => <div className="py-24" />, ssr: true })
const BookTypesSection = dynamic(() => import('@/components/landing/BookTypesSection'), { loading: () => <div className="py-24" />, ssr: true })
const PricingSection = dynamic(() => import('@/components/landing/PricingSection'), { loading: () => <div className="py-24" />, ssr: true })
const CTASection = dynamic(() => import('@/components/landing/CTASection'), { loading: () => <div className="py-24" />, ssr: true })
const FooterSection = dynamic(() => import('@/components/landing/FooterSection'), { loading: () => <div className="py-12" />, ssr: true })

export default function LandingPage() {
  const { user, isLoading } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    if (isLoading) return
    if (!user) return
    const currentPath = window.location.pathname
    if (currentPath.includes('/payment/success')) return
    const urlParams = new URLSearchParams(window.location.search)
    const sessionId = urlParams.get('session_id')
    const paymentType = urlParams.get('type')
    if (sessionId && paymentType) { router.replace(`/payment/success${window.location.search}`); return }
    router.replace('/dashboard')
  }, [user, isLoading, router])

  if (isLoading || user) return <BookLoadingSpinner fullScreen />

  return (
    <AuthModalProvider>
      <div className="min-h-screen" style={{ background: '#04040a', color: '#fff' }}>
        <link rel="prefetch" href="/dashboard" />

        {/* Header */}
        <motion.header
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 150,
            backdropFilter: scrolled ? 'blur(20px)' : 'blur(0px)',
            background: scrolled ? 'rgba(4,4,10,0.85)' : 'transparent',
            borderBottom: scrolled ? '1px solid rgba(255,255,255,0.055)' : '1px solid transparent',
            transition: 'all 0.35s ease',
          }}
        >
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 max-w-7xl mx-auto">
            <Logo size="sm" />
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
              {[
                { href: '#how-it-works', label: t('landingHowItWorks') },
                { href: '#features', label: t('features') },
                { href: '#book-types', label: t('landingBookTypesLabel') },
                { href: '#pricing', label: t('pricing') },
              ].map(link => (
                <a key={link.href} href={link.href}
                  style={{ color: 'rgba(255,255,255,0.38)', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.38)')}
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <span className="hidden sm:block"><LanguageSwitcher /></span>
              <span className="hidden sm:block"><AuthButton /></span>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-colors"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden border-t" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(4,4,10,0.96)', backdropFilter: 'blur(20px)' }}>
              <nav className="flex flex-col px-4 py-3 gap-1">
                {[
                  { href: '#how-it-works', label: t('landingHowItWorks') },
                  { href: '#features', label: t('features') },
                  { href: '#book-types', label: t('landingBookTypesLabel') },
                  { href: '#pricing', label: t('pricing') },
                ].map(link => (
                  <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2.5 rounded-xl text-sm transition-colors"
                    style={{ color: 'rgba(255,255,255,0.38)', textDecoration: 'none' }}>
                    {link.label}
                  </a>
                ))}
              </nav>
              <div className="flex items-center gap-2 px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <LanguageSwitcher dropdownAlign="left" />
                <AuthButton />
              </div>
            </div>
          )}
        </motion.header>

        <div style={{ height: 57 }} />

        <main>
          <MotionConfig reducedMotion="user">
            <HeroSection />
            <StatsSection />
            <HowItWorksSection />
            <FeaturesSection />
            <BookTypesSection />
            <PricingSection />
            <CTASection />
            <FooterSection />
          </MotionConfig>
        </main>
      </div>
    </AuthModalProvider>
  )
}
