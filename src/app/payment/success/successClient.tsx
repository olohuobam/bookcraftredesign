'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useNotifications } from '@/context/NotificationContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Check, ArrowLeft, Package, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import BookLoadingSpinner from '@/components/BookLoadingSpinner'
import { useLanguage } from '@/context/LanguageContext'

interface Props {
  sessionId: string
  type: string
  coins: string
  planName: string
}

export default function PaymentSuccessClient({ sessionId, type, coins, planName }: Props) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const { addNotification } = useNotifications()

  const [paymentData, setPaymentData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [processed, setProcessed] = useState(false)

  useEffect(() => {
    if (processed) return

    // Print orders: show success immediately (no auth needed for confirmation page)
    if (type === 'print_order') {
      setProcessed(true)
      if (sessionId) {
        fetch(`/api/stripe/session/${sessionId}`)
          .then(r => r.ok ? r.json() : null)
          .then(data => { if (data) setPaymentData(data) })
          .catch(() => {})
      }
      setIsLoading(false)
      return
    }

    // Other payment types: need auth
    if (!user) return

    const processPaymentSuccess = async () => {
      setProcessed(true)
      if (!sessionId) {
        setIsLoading(false)
        setTimeout(() => { window.location.href = '/dashboard' }, 2000)
        return
      }
      try {
        const response = await fetch(`/api/stripe/session/${sessionId}`)
        let data: any = null
        if (response.ok) {
          data = await response.json()
          setPaymentData(data)
        } else {
          data = { payment_status: 'paid', metadata: { type, coins, planName } }
        }
        if (data && data.payment_status === 'paid') {
          setTimeout(() => { window.location.href = '/dashboard' }, 3000)
        } else {
          addNotification({ type: 'error', title: t('paymentFailed'), message: t('tryAgain') })
          setTimeout(() => { window.location.href = '/dashboard' }, 2000)
        }
      } catch {
        addNotification({ type: 'error', title: 'Error', message: 'Processing failed.' })
        setTimeout(() => { window.location.href = '/dashboard' }, 2000)
      } finally { setIsLoading(false) }
    }

    processPaymentSuccess()
  }, [user, processed, sessionId, type, coins, planName, addNotification])

  if (isLoading) {
    return <BookLoadingSpinner fullScreen text={t('processingPayment')} />
  }

  // ─── Print Order Success ─────────────────────────────────────────────────────
  if (type === 'print_order') {
    const amount = paymentData?.amount_total
      ? `${(paymentData.amount_total / 100).toFixed(2)} €`
      : null

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-sm border border-border/60 shadow-lg">
          <CardContent className="pt-8 pb-6 px-6">
            {/* Success icon */}
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-500" strokeWidth={2.5} />
              </div>
            </div>

            {/* Title & description */}
            <h1 className="text-xl font-semibold text-center text-foreground mb-1">
              {t('orderPlaced')}
            </h1>
            <p className="text-sm text-center text-muted-foreground mb-6">
              {t('orderPrintingDesc')}
            </p>

            {/* Payment summary */}
            {amount && (
              <div className="bg-muted/50 rounded-lg p-4 mb-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('orderStatusLabel')}</span>
                  <span className="text-green-500 font-medium">{t('orderStatusPaid')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('orderAmountLabel')}</span>
                  <span className="font-medium text-foreground">{amount}</span>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="space-y-3">
              <Button asChild className="w-full" size="lg">
                <Link href="/dashboard/orders">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t('viewMyOrder')}
                </Link>
              </Button>
              <Button asChild variant="ghost" className="w-full" size="lg">
                <Link href="/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('backToDashboard')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Generic Payment Success ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm border border-border/60 shadow-lg">
        <CardContent className="pt-8 pb-6 px-6">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-500" strokeWidth={2.5} />
            </div>
          </div>

          <h1 className="text-xl font-semibold text-center text-foreground mb-1">
            {t('paymentSuccessTitle')}
          </h1>
          <p className="text-sm text-center text-muted-foreground mb-6">
            {t('paymentRedirectDesc')}
          </p>

          <Button asChild variant="ghost" className="w-full" size="lg">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('backToDashboard')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
