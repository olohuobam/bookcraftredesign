'use client'

import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Crown,
  Check,
  BookOpen,
  Images,
  CheckCircle,
  Zap,
  RotateCcw,
  Smartphone,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AppBar } from '@/components/AppBar'
import PageTransition from '@/components/PageTransition'
import { PRICING, formatPrice, getPricingTiers } from '@/lib/pricing'
import { useSubscription } from '@/hooks/useSubscription'
import { ProBadge } from '@/components/ProBadge'
import { Capacitor } from '@capacitor/core'
import { useNativeSubscription } from '@/hooks/useNativeSubscription'

export default function BillingPage() {
  useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null)
  const { isPro, subscription, isLoading: isLoadingSubscription, refresh: refreshSubscription } = useSubscription()
  const isSubscriptionReady = !isLoadingSubscription

  // Platform detection — Native app uses IAP, web uses Stripe
  const isNativePlatform = Capacitor.isNativePlatform()
  const nativePlatform = Capacitor.getPlatform() as 'ios' | 'android' | 'web'

  // Native IAP (only active on native platform)
  const { subscribe: nativeSubscribe, restorePurchases, isLoading: isIAPLoading, isReady: isIAPReady, error: iapError } = useNativeSubscription()

  const pricingTiers = getPricingTiers()

  const proPlan = {
    id: 'pro',
    name: 'Bookcraft Pro',
    price: PRICING.SUBSCRIPTION.PRO / 100,
    period: '/ month',
    features: [
      'Unlimited Text Books',
      'Unlimited Picture Books',
      'All AI Models (GPT-4, DALL-E 3)',
      'All Export Formats (PDF, TXT, EPUB)',
      'Priority Support',
      'Early Access to New Features',
      'No Per-Book Charges',
    ],
    popular: true,
  }

  // ── Stripe checkout (web only) ────────────────────────────────────────────
  const handleStripeSubscribe = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'subscription', itemId: 'pro' }),
      })
      const { url, error } = await response.json()
      if (error) {
        alert(t('errorCreatingPayment') + ' ' + error)
        return
      }
      if (url) window.location.href = url
    } catch (error) {
      console.error('Payment error:', error)
      alert(t('paypalErrorOccurred'))
    } finally {
      setIsLoading(false)
    }
  }

  // ── Native IAP subscribe (iOS/Android only) ───────────────────────────────
  const handleNativeSubscribe = async () => {
    setIsLoading(true)
    setRestoreMessage(null)
    try {
      const result = await nativeSubscribe('pro_monthly')
      if (result.success) {
        await refreshSubscription()
        setRestoreMessage('Subscription activated!')
      } else {
        // USER_CANCELED = user closed the payment sheet — not an error, just ignore
        const err = result.error ?? ''
        if (!err.includes('USER_CANCELED') && !err.includes('cancelled') && !err.toLowerCase().includes('cancel')) {
          alert(err || t('subscriptionFailed'))
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  // ── Restore purchases (iOS/Android only) ─────────────────────────────────
  const handleRestorePurchases = async () => {
    setIsLoading(true)
    setRestoreMessage(null)
    try {
      const result = await restorePurchases()
      if (result.success && result.plan) {
        await refreshSubscription()
        setRestoreMessage('Subscription restored!')
      } else {
        setRestoreMessage(result.error ?? 'No active subscription found to restore.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubscribe = isNativePlatform ? handleNativeSubscribe : handleStripeSubscribe
  const isActionLoading = isLoading || isIAPLoading

  return (
    <PageTransition>
      <div className="min-h-[60vh]">
        <AppBar title={t('billing')} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-foreground font-display mb-4">Simple, Transparent Pricing</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Pay only for what you create, or go Pro for unlimited access.
            </p>

            {/* IAP init error — debug helper */}
            {isNativePlatform && iapError && (
              <div className="mt-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700 text-xs text-red-700 dark:text-red-300 text-left">
                IAP: {iapError}
              </div>
            )}

            {/* Native platform badge */}
            {isNativePlatform && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-200 dark:border-blue-700">
                <Smartphone className="h-4 w-4 text-bookcraft-blue dark:text-bookcraft-blue/80" />
                <span className="text-sm text-bookcraft-blue dark:text-bookcraft-blue/80">
                  In-app purchase via {nativePlatform === 'ios' ? 'App Store' : 'Google Play'}
                </span>
              </div>
            )}

            {isPro && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-bookcraft-blue/10 to-bookcraft-blue/10 dark:from-bookcraft-blue/20 dark:to-bookcraft-blue/20 rounded-full border border-bookcraft-blue/20 dark:border-bookcraft-blue/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="font-medium text-foreground">You&apos;re a Pro member!</span>
                <ProBadge variant="small" />
              </div>
            )}
          </div>

          {/* Pay-per-Book Pricing */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Text Books */}
            <Card className="p-8 bg-card hover:shadow-lg transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <BookOpen className="h-8 w-8 text-bookcraft-blue dark:text-bookcraft-blue/80" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-foreground font-display">{t('textBooks')}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">AI-generated chapters • Dynamic pricing based on length</p>
              <div className="space-y-3 mb-6">
                {pricingTiers.textBook.map((tier) => (
                  <div key={tier.chapters} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-muted-foreground">{tier.chapters} chapters</span>
                    <span className="font-semibold text-foreground">{formatPrice(tier.price)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground italic">
                Prices for intermediate chapter counts are calculated proportionally
              </p>
            </Card>

            {/* Picture Books */}
            <Card className="p-8 bg-card hover:shadow-lg transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Images className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-foreground font-display">{t('pictureBooks')}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">AI-generated illustrations • Dynamic pricing based on pages</p>
              <div className="space-y-3 mb-6">
                {pricingTiers.pictureBook.map((tier) => (
                  <div key={tier.pages} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-muted-foreground">{tier.pages} pages</span>
                    <span className="font-semibold text-foreground">{formatPrice(tier.price)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground italic">
                Prices for intermediate page counts are calculated proportionally
              </p>
            </Card>
          </div>

          {/* Pro Subscription */}
          <div className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold font-display text-foreground mb-2">{t('goPro')}</h2>
              <p className="text-lg text-muted-foreground">Unlock unlimited book creation with Bookcraft Pro.</p>
            </div>

            <Card className="max-w-2xl mx-auto p-8 bg-gradient-to-br from-bookcraft-blue/5 to-bookcraft-blue/5 dark:from-bookcraft-blue/10 dark:to-bookcraft-blue/10 border-2 border-bookcraft-blue/30 dark:border-bookcraft-blue/40 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span
                  className="inline-block px-3 py-1 text-white text-xs font-bold uppercase tracking-wide rounded-full shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #3E86D7, #3E86D7)' }}
                >
                  BEST VALUE
                </span>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 rounded-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #3E86D7, #3E86D7)' }}>
                  <Crown className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold tracking-tight text-foreground font-display">{proPlan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-4xl font-bold tracking-tight text-foreground font-display">€{proPlan.price.toFixed(2)}</span>
                    <span className="text-lg text-muted-foreground">{proPlan.period}</span>
                  </div>
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">
                      ✨ 7 Tage gratis testen
                    </span>
                  </div>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {proPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Restore message */}
              {restoreMessage && (
                <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-sm text-blue-800 dark:text-blue-200">
                  {restoreMessage}
                </div>
              )}

              {isPro ? (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-semibold text-foreground">You&apos;re already a Pro member!</span>
                  </div>
                  {subscription?.currentPeriodEnd &&
                    (() => {
                      const date = new Date(subscription.currentPeriodEnd)
                      return !isNaN(date.getTime()) ? (
                        <p className="text-sm text-muted-foreground mt-3">
                          Next billing date: {date.toLocaleDateString()}
                        </p>
                      ) : null
                    })()}
                </div>
              ) : (
                <>
                  {/* Subscribe button — IAP on native, Stripe on web */}
                  {isNativePlatform ? (
                    <Button
                      onClick={handleNativeSubscribe}
                      disabled={isActionLoading || !isIAPReady}
                      className="w-full text-white font-semibold py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
                      style={{ background: 'linear-gradient(135deg, #3E86D7, #3E86D7)' }}
                    >
                      <Zap className="h-5 w-5 mr-2" />
                      {isActionLoading
                        ? 'Processing...'
                        : !isIAPReady
                        ? 'Loading Store...'
                        : `Subscribe via ${nativePlatform === 'ios' ? 'App Store' : 'Google Play'}`}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStripeSubscribe}
                      disabled={isActionLoading}
                      className="w-full text-white font-semibold py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
                      style={{ background: 'linear-gradient(135deg, #3E86D7, #3E86D7)' }}
                    >
                      <Zap className="h-5 w-5 mr-2" />
                      {isActionLoading ? 'Processing...' : 'Upgrade to Pro'}
                    </Button>
                  )}

                  {/* Restore Purchases — native only (App Store / Play Store requirement) */}
                  {isNativePlatform && (
                    <Button
                      variant="ghost"
                      onClick={handleRestorePurchases}
                      disabled={isActionLoading}
                      className="w-full mt-3 text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore Purchases
                    </Button>
                  )}

                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Cancel anytime. No long-term commitment.
                  </p>
                </>
              )}
            </Card>
          </div>

          {/* When is Pro worth it? */}
          <Card className="max-w-4xl mx-auto p-8 bg-card">
            <h3 className="text-2xl font-bold font-display text-foreground mb-6 flex items-center gap-3">
              When is Pro worth it?
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-foreground">
                  <strong>If you create 3+ text books</strong> (15+ chapters total) per month
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-foreground">
                  <strong>If you create 2+ picture books</strong> (24+ pages total) per month
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-foreground">
                  <strong>{t('predictableCostsTip')}</strong>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-foreground">
                  <strong>{t('prioritySupportTip')}</strong>
                </span>
              </li>
            </ul>
          </Card>

          {/* Try Before You Buy */}
          <div className="text-center mt-12 p-8 bg-blue-50 dark:bg-blue-900/10 rounded-xl">
            <h3 className="text-2xl font-bold font-display text-foreground mb-3">{t('tryBeforeYouBuy')}</h3>
            <p className="text-lg text-muted-foreground mb-4">
              The first chapter of every text book and the first page of every picture book is free!
            </p>
            <Button
              onClick={() => router.push('/dashboard/create')}
              className="bg-bookcraft-blue hover:brightness-110 text-white"
            >
              Start Creating Free
            </Button>
            <p className="text-sm text-muted-foreground mt-3">
              Or go Pro for <strong>€{proPlan.price.toFixed(2)}/month</strong> unlimited
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
