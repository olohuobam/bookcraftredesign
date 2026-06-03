'use client'

import { useState, useEffect, startTransition } from 'react'
import { Capacitor } from '@capacitor/core'
import { Check, Crown, Zap, ChevronDown, ChevronUp, ArrowLeft, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PRICING, formatPrice, getPricingTiers } from '@/lib/pricing'
import { useSubscription } from '@/hooks/useSubscription'
import { useNativeSubscription } from '@/hooks/useNativeSubscription'
import { useLanguage } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'

function FAQItem({ question, answer, id }: { question: string; answer: string; id: string }) {
  const [open, setOpen] = useState(false)
  const answerId = `${id}-answer`
  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={answerId}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/40 transition-colors gap-3"
      >
        <span className="font-medium text-sm sm:text-base">{question}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {open && (
        <div id={answerId} className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  )
}

export default function PricingPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [isNative, setIsNative] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [subscribeError, setSubscribeError] = useState<string | null>(null)
  const [isStripeLoading, setIsStripeLoading] = useState(false)

  const { isPro, isLoading: isLoadingSubscription } = useSubscription()
  const {
    subscribe: nativeSubscribe,
    isLoading: isIAPLoading,
  } = useNativeSubscription()

  useEffect(() => {
    startTransition(() => {
      setMounted(true)
      setIsNative(Capacitor.isNativePlatform())
    })
  }, [])

  const pricingTiers = getPricingTiers()

  const FAQ_ITEMS = [
    {
      question: t('pricingFaqQ1'),
      answer: t('pricingFaqA1'),
    },
    {
      question: t('pricingFaqQ2'),
      answer: t('pricingFaqA2'),
    },
    {
      question: t('pricingFaqQ3'),
      answer: t('pricingFaqA3'),
    },
    {
      question: t('pricingFaqQ4'),
      answer: t('pricingFaqA4'),
    },
  ]

  const FREE_FEATURES = [
    t('pricingFreeFeature1'),
    t('pricingFreeFeature2'),
    t('pricingFreeFeature3'),
    t('pricingFreeFeature4'),
  ]

  const PRO_FEATURES = [
    t('pricingProFeature1'),
    t('pricingProFeature2'),
    t('pricingProFeature3'),
    t('pricingProFeature4'),
    t('pricingProFeature5'),
    t('pricingProFeature6'),
  ]

  const handleStripeCheckout = async () => {
    setIsStripeLoading(true)
    setSubscribeError(null)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'subscription', itemId: 'pro' }),
      })
      const { url, error } = await response.json()
      if (!response.ok || error || !url) {
        setSubscribeError(error ? `${t('purchaseFailed')}: ${error}` : t('purchaseFailed'))
        return
      }
      window.location.href = url
    } catch (err) {
      console.error('Payment error:', err)
      setSubscribeError(t('purchaseFailed'))
    } finally {
      setIsStripeLoading(false)
    }
  }

  const handleProClick = async () => {
    setSubscribeError(null)
    if (isPro) return

    if (isNative) {
      const result = await nativeSubscribe('pro_monthly')
      if (!result.success) {
        setSubscribeError(result.error ?? t('purchaseFailed'))
      }
    } else {
      await handleStripeCheckout()
    }
  }

  const proButtonLabel = () => {
    if (!mounted || isLoadingSubscription) return '...'
    if (isPro) return t('pricingProButtonAlreadyPro')
    if (isNative) return t('pricingProButtonTrialNative')
    return t('pricingProButtonWeb')
  }

  const isButtonDisabled = !mounted || isLoadingSubscription || isPro || isIAPLoading || isStripeLoading

  const COMPARE_ROWS = [
    { feature: t('pricingCompareRow1Feature'), free: t('pricingCompareRow1Free'), pro: t('pricingCompareRow1Pro') },
    { feature: t('pricingCompareRow2Feature'), free: t('pricingCompareRow2Free'), pro: t('pricingCompareRow2Pro') },
    { feature: t('pricingCompareRow3Feature'), free: t('pricingCompareRow3Free'), pro: t('pricingCompareRow3Pro') },
    { feature: t('pricingCompareRow4Feature'), free: t('pricingCompareRow4Free'), pro: t('pricingCompareRow4Pro') },
    { feature: t('pricingCompareRow5Feature'), free: t('pricingCompareRow5Free'), pro: t('pricingCompareRow5Pro') },
  ]

  return (
    <div className="min-h-screen bg-background overflow-y-auto ios-scroll">
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-background/90 border-b border-border/30 shadow-sm">
        <div className="flex items-center gap-4 px-4 sm:px-6 h-16 max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            aria-label={t('pricingBackAriaLabel')}
            title={t('pricingBackAriaLabel')}
            className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-muted/60 transition-all duration-200 flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold text-lg">{t('pricingPageTitle')}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 space-y-12">
        {/* Page Title */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {t('pricingTransparentTitle')}
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            {t('pricingTransparentSubtitle')}
          </p>
        </div>

        {/* Free vs Pro Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Free Card */}
          <Card className="rounded-3xl p-6 border border-border relative overflow-hidden">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold">{t('pricingFreeTitle')}</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {t('pricingFreeSubtitle')}
                </p>
              </div>

              <div className="text-3xl font-bold">
                {t('pricingFreePrice')}
              </div>

              <ul className="space-y-2.5">
                {FREE_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                variant="outline"
                className="w-full rounded-2xl h-12"
                asChild
              >
                <Link href="/auth/login">{t('pricingFreeButton')}</Link>
              </Button>
            </div>
          </Card>

          {/* Pro Card */}
          <Card className={cn(
            'rounded-3xl p-6 border-2 relative overflow-hidden',
            'border-transparent',
            // Animated gradient border via background trick
            'bg-gradient-to-br from-[#1a2a3f] to-[#0f1c2e] dark:from-[#0f1c2e] dark:to-[#070f1a]',
            '[background-clip:padding-box]',
            'shadow-[0_0_40px_rgba(62,134,215,0.25)] hover:shadow-[0_0_60px_rgba(62,134,215,0.4)]',
            'transition-shadow duration-500',
            'outline outline-2 outline-offset-[-2px] outline-[#3E86D7]/60'
          )}>
            {/* Glossy shimmer overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none rounded-3xl" />

            {/* Popular badge */}
            <div className="absolute top-4 right-4">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-[#3E86D7] to-[#7B4AE8] text-white shadow-md">
                {t('pricingProPopular')}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-[#3E86D7]" />
                  <h2 className="text-xl font-bold text-white">{t('pricingProTitle')}</h2>
                </div>
                <p className="text-blue-200/70 text-sm mt-1">
                  {t('pricingProSubtitle')}
                </p>
              </div>

              {/* Prominent price display */}
              <div className="space-y-1">
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-extrabold text-white tracking-tight">
                    {formatPrice(PRICING.SUBSCRIPTION.PRO)}
                  </span>
                  <span className="text-blue-200/70 text-sm pb-1.5">{t('pricingProPerMonth')}</span>
                </div>
                {/* Trial badge */}
                {!isNative && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 border border-green-400/40 text-green-300 text-xs font-semibold">
                    <Sparkles className="w-3 h-3" />
                    {t('pricingTrialBadge')}
                  </div>
                )}
              </div>

              <ul className="space-y-2.5">
                {PRO_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm text-blue-100">
                    <Check className="w-4 h-4 text-[#3E86D7] flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {subscribeError && (
                <p className="text-red-400 text-sm">{subscribeError}</p>
              )}

              {/* Big CTA button with glow + pulse */}
              <div className="relative">
                {!isPro && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#3E86D7] to-[#7B4AE8] blur-md opacity-50 animate-pulse" />
                )}
                <Button
                  onClick={handleProClick}
                  disabled={isButtonDisabled}
                  className={cn(
                    'relative w-full rounded-2xl h-14 text-white font-bold text-base',
                    isPro
                      ? 'bg-green-600 hover:bg-green-600 cursor-default'
                      : 'bg-gradient-to-r from-[#3E86D7] to-[#7B4AE8] hover:brightness-110 shadow-xl'
                  )}
                >
                  {(isIAPLoading || isStripeLoading) ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      {t('pricingProButtonProcessing')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {!isPro && <Zap className="w-5 h-5" />}
                      {proButtonLabel()}
                    </span>
                  )}
                </Button>
              </div>

              {/* Cancel anytime badge */}
              {mounted && !isPro && (
                <div className="text-center space-y-1">
                  <p className="text-blue-200/60 text-xs">
                    {isNative
                      ? t('pricingProTrialNativeHint')
                      : t('pricingProWebHint')}
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs text-blue-200/50">
                    <span>✓</span>
                    <span>{t('pricingProCancelAnytimeHint')}</span>
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="text-left px-5 py-3.5 font-semibold">{t('pricingCompareFeatureTitle')}</th>
                <th className="text-center px-4 py-3.5 font-semibold">{t('pricingCompareFeatureFree')}</th>
                <th className="text-center px-4 py-3.5 font-semibold text-[#3E86D7]">{t('pricingCompareFeaturePro')}</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row, i) => (
                <tr
                  key={row.feature}
                  className={cn('border-t border-border', i % 2 === 1 && 'bg-muted/20')}
                >
                  <td className="px-5 py-3 font-medium">{row.feature}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{row.free}</td>
                  <td className="px-4 py-3 text-center font-medium text-[#3E86D7]">{row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pay-as-you-go Section */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-5 h-5 text-[#3E86D7]" />
              <h2 className="text-2xl font-bold">{t('pricingPaygTitle')}</h2>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base">
              {t('pricingPaygSubtitle')}
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#3E86D7]/10 text-[#3E86D7] text-xs font-semibold">
              <Crown className="w-3 h-3" />
              {t('pricingPaygProHint')}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            {/* Text Books */}
            <Card className="rounded-2xl p-5 border border-border overflow-visible">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <span className="text-lg">📖</span>
                {t('pricingTextBooksTitle')}
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left pb-2 font-medium">{t('pricingChapters').replace('{n}', '')}</th>
                    <th className="text-right pb-2 font-medium">{t('price')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingTiers.textBook.map((tier) => (
                    <tr key={tier.chapters} className="border-t border-border/50">
                      <td className="py-2.5">{t('pricingChapters').replace('{n}', String(tier.chapters))}</td>
                      <td className="py-2.5 text-right font-semibold">
                        {formatPrice(tier.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Picture Books */}
            <Card className="rounded-2xl p-5 border border-border overflow-visible">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <span className="text-lg">🖼️</span>
                {t('pricingPictureBookTitle')}
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left pb-2 font-medium">{t('pricingPages').replace('{n}', '')}</th>
                    <th className="text-right pb-2 font-medium">{t('price')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingTiers.pictureBook.map((tier) => (
                    <tr key={tier.pages} className="border-t border-border/50">
                      <td className="py-2.5">{t('pricingPages').replace('{n}', String(tier.pages))}</td>
                      <td className="py-2.5 text-right font-semibold">
                        {formatPrice(tier.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </section>

        {/* FAQ */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-center">{t('pricingFaqTitle')}</h2>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, index) => (
              <FAQItem key={item.question} id={`faq-${index}`} question={item.question} answer={item.answer} />
            ))}
          </div>
        </section>

        {/* Footer CTA */}
        <div className="text-center pb-8 sm:pb-12 md:pb-16 space-y-4">
          <p className="text-muted-foreground text-sm">
            {t('pricingFooterQuestion')}{' '}
            <Link href="/kontakt" className="text-[#3E86D7] hover:underline font-medium">
              {t('pricingFooterContactLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
