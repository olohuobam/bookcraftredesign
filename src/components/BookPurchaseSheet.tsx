'use client'

import { useState, type ReactNode } from 'react'
import { Capacitor } from '@capacitor/core'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import BottomSheet from '@/components/BottomSheet'
import { BookOpen, CreditCard, Loader2, CheckCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useInAppPurchase } from '@/hooks/useInAppPurchase'
import { useIsMobile } from '@/hooks/useIsMobile'
import { calculateDynamicPrice, formatPrice, getIAPProductId, snapToIAPTier } from '@/lib/pricing'
import { useToast } from '@/components/ui/toast'

interface BookPurchaseSheetProps {
  bookId: string
  bookData: {
    title: string
    author?: string
    genre: string
    chapters?: number
    pages?: number
    bookType?: string
    purchased?: boolean
  }
  price?: number // cents
  onPurchaseSuccess: () => void
  triggerElement?: ReactNode
  isOpen?: boolean
  onClose?: () => void
}

export default function BookPurchaseSheet({
  bookId,
  bookData,
  price: propPrice,
  onPurchaseSuccess,
  triggerElement,
  isOpen: externalIsOpen,
  onClose,
}: BookPurchaseSheetProps) {
  const isNative = Capacitor.isNativePlatform()
  const isMobile = useIsMobile()
  // Use bottom sheet on mobile (<768px) or native Capacitor app
  const useBottomSheet = isMobile || isNative

  // Calculate dynamic price if not explicitly provided
  const price = propPrice ?? (() => {
    const bookType = bookData.bookType || 'text'
    const count = bookType === 'picture'
      ? (bookData.pages || 12)
      : (bookData.chapters || 10)
    return calculateDynamicPrice(bookType, count)
  })()

  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const { t } = useLanguage()

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const setIsOpen = (value: boolean) => {
    if (externalIsOpen !== undefined) {
      if (!value && onClose) onClose()
    } else {
      setInternalIsOpen(value)
    }
  }

  const handleSuccess = () => {
    setPaymentSuccess(true)
    setTimeout(() => {
      setIsOpen(false)
      setPaymentSuccess(false)
      onPurchaseSuccess()
    }, 2000)
  }

  const defaultTrigger = (
    <Button
      variant="default"
      size="lg"
      disabled={bookData.purchased}
      className="bg-gradient-to-r from-bookcraft-blue to-bookcraft-blue hover:brightness-110"
    >
      <BookOpen className="mr-2 h-4 w-4" />
      {bookData.purchased
        ? (t('alreadyPurchased') || 'Already purchased')
        : `${t('purchaseBook') || 'Buy'} - ${formatPrice(price)}`}
    </Button>
  )

  const showTrigger = externalIsOpen === undefined

  const content = paymentSuccess ? (
    <SuccessView title={bookData.title} />
  ) : (
    <div className="space-y-4 px-5 pb-6 pt-2">
      {/* Book info */}
      <div className="flex items-center gap-4 py-2">
        <div className="w-14 h-[72px] bg-gradient-to-br from-bookcraft-blue to-bookcraft-blue rounded-lg shadow flex items-center justify-center flex-shrink-0">
          <BookOpen className="h-7 w-7 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{bookData.title}</p>
          {bookData.author && (
            <p className="text-sm text-muted-foreground">{bookData.author}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">{bookData.genre}</p>
        </div>
        <span className="text-xl font-bold text-bookcraft-blue dark:text-bookcraft-blue/80 flex-shrink-0">
          {formatPrice(price)}
        </span>
      </div>

      {/* Payment options */}
      <div className="space-y-3 pt-2">
        {isNative ? (
          <NativeIAPButton
            bookId={bookId}
            price={price}
            onSuccess={handleSuccess}
          />
        ) : (
          <WebPaymentButtons
            bookId={bookId}
            bookData={bookData}
            price={price}
            onSuccess={handleSuccess}
          />
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center pt-1">
        {t('securePaymentSsl') || 'Secure payment via SSL'}
      </p>
    </div>
  )

  // ── Bottom Sheet (mobile / native) ──
  if (useBottomSheet) {
    return (
      <>
        {showTrigger && (
          <span onClick={() => setIsOpen(true)} className="contents">
            {triggerElement || defaultTrigger}
          </span>
        )}
        <BottomSheet
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title={paymentSuccess ? undefined : (t('buyDigitalBook') || 'Buy Digital Book')}
          subtitle={paymentSuccess ? undefined : (t('instantDigitalAccess') || 'Instant digital access')}
        >
          {content}
        </BottomSheet>
      </>
    )
  }

  // ── Centered Dialog (desktop) ──
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          {triggerElement || defaultTrigger}
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-md">
        {paymentSuccess ? (
          <SuccessView title={bookData.title} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg">
                {t('buyDigitalBook') || 'Buy Digital Book'}
              </DialogTitle>
              <DialogDescription>
                {t('instantDigitalAccess') || 'Instant digital access'}
              </DialogDescription>
            </DialogHeader>

            {/* Book info */}
            <div className="flex items-center gap-4 py-2">
              <div className="w-14 h-[72px] bg-gradient-to-br from-bookcraft-blue to-bookcraft-blue rounded-lg shadow flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{bookData.title}</p>
                {bookData.author && (
                  <p className="text-sm text-muted-foreground">{bookData.author}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">{bookData.genre}</p>
              </div>
              <span className="text-xl font-bold text-bookcraft-blue dark:text-bookcraft-blue/80 flex-shrink-0">
                {formatPrice(price)}
              </span>
            </div>

            {/* Payment options */}
            <div className="space-y-3 pt-2">
              {isNative ? (
                <NativeIAPButton
                  bookId={bookId}
                  price={price}
                  onSuccess={handleSuccess}
                />
              ) : (
                <WebPaymentButtons
                  bookId={bookId}
                  bookData={bookData}
                  price={price}
                  onSuccess={handleSuccess}
                />
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center pt-1">
              {t('securePaymentSsl') || 'Secure payment via SSL'}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Success View ──

function SuccessView({ title }: { title: string }) {
  const { t } = useLanguage()
  return (
    <div className="text-center py-8 px-4">
      <div className="w-16 h-16 bg-green-100 dark:bg-green-950/40 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
      </div>
      <h3 className="text-xl font-bold font-display text-foreground mb-1">
        {t('paymentSuccessful') || 'Payment successful!'}
      </h3>
      <p className="text-sm text-muted-foreground">{title}</p>
    </div>
  )
}

// ── Native IAP Button ──

function NativeIAPButton({
  bookId,
  price,
  onSuccess,
}: {
  bookId: string
  price: number
  onSuccess: () => void
}) {
  const [isPurchasing, setIsPurchasing] = useState(false)
  const { user, getIdToken } = useAuth()
  const { t } = useLanguage()
  const { showToast } = useToast()
  const {
    isAvailable,
    isLoading: iapLoading,
    purchase,
    error: iapError,
    platform,
  } = useInAppPurchase()

  // Compute snapped price at component level so button label stays in sync
  const snappedPrice = snapToIAPTier(price)
  const productId = getIAPProductId(snappedPrice)

  const handlePurchase = async () => {
    if (!user?.id || isPurchasing) return
    setIsPurchasing(true)

    try {
      const token = await getIdToken?.()
      if (!token) {
        showToast('Authentication required. Please sign in again.', 'error')
        setIsPurchasing(false)
        return
      }
      const result = await purchase(bookId, user.id, productId, token)

      if (result.success) {
        onSuccess()
      } else {
        showToast(result.error || 'Purchase failed', 'error')
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Purchase failed', 'error')
    } finally {
      setIsPurchasing(false)
    }
  }

  if (!isAvailable && !iapError) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-bookcraft-blue dark:text-bookcraft-blue/80" />
        <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  if (iapError) {
    return (
      <div className="p-4 text-center bg-red-50 dark:bg-red-950/30 rounded-lg">
        <p className="text-red-600 dark:text-red-400 text-sm">{iapError}</p>
      </div>
    )
  }

  const storeName = platform === 'ios' ? 'App Store' : 'Google Play'

  return (
    <div className="space-y-3">
      <Button
        onClick={handlePurchase}
        disabled={isPurchasing || iapLoading}
        className="w-full h-14 bg-gradient-to-r from-bookcraft-blue to-bookcraft-blue hover:brightness-110 text-white font-semibold text-base"
        size="lg"
      >
        {isPurchasing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {t('paymentProcessing') || 'Processing...'}
          </>
        ) : (
          <>
            {t('buyNow') || 'Buy Now'} - {formatPrice(snappedPrice)}
          </>
        )}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        {`Secure purchase via ${storeName}`}
      </p>
    </div>
  )
}

// ── Web Payment Buttons (Stripe Checkout redirect + PayPal redirect) ──

function WebPaymentButtons({
  bookId,
  bookData,
  price,
  onSuccess,
}: {
  bookId: string
  bookData: BookPurchaseSheetProps['bookData']
  price: number
  onSuccess: () => void
}) {
  const [stripeLoading, setStripeLoading] = useState(false)
  const [paypalLoading, setPaypalLoading] = useState(false)
  const { getIdToken } = useAuth()
  const { t } = useLanguage()
  const { showToast } = useToast()

  const handleStripeCheckout = async () => {
    setStripeLoading(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'book', bookId }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (err) {
      console.error('Stripe checkout error:', err)
      showToast(err instanceof Error ? err.message : (t('unexpectedError') || 'An error occurred'), 'error')
      setStripeLoading(false)
    }
  }

  const handlePayPalCheckout = async () => {
    setPaypalLoading(true)
    try {
      const token = await getIdToken?.()
      const response = await fetch(`/api/books/${bookId}/purchase/paypal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: bookData.title,
          price: price / 100, // Convert cents to euros
        }),
      })

      const data = await response.json()

      if (data.error) {
        if (data.alreadyPurchased) {
          showToast(t('alreadyOwnBook') || 'You already own this book.', 'info')
          onSuccess()
          return
        }
        throw new Error(data.error)
      }

      if (data.approval_url) {
        window.location.href = data.approval_url
      } else {
        throw new Error('No PayPal approval URL received')
      }
    } catch (err) {
      console.error('PayPal checkout error:', err)
      showToast(err instanceof Error ? err.message : (t('unexpectedError') || 'An error occurred'), 'error')
      setPaypalLoading(false)
    }
  }

  return (
    <>
      {/* Stripe Checkout */}
      <Button
        onClick={handleStripeCheckout}
        disabled={stripeLoading || paypalLoading}
        className="w-full h-14 bg-gradient-to-r from-bookcraft-blue to-bookcraft-blue hover:brightness-110 text-white font-semibold text-base"
        size="lg"
      >
        {stripeLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {t('paymentProcessing') || 'Redirecting...'}
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-5 w-5" />
            {'Pay with Card'}
          </>
        )}
      </Button>

      {/* Divider */}
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-3 text-muted-foreground">{t('or') || 'or'}</span>
        </div>
      </div>

      {/* PayPal Checkout */}
      <Button
        onClick={handlePayPalCheckout}
        disabled={stripeLoading || paypalLoading}
        className="w-full h-12 bg-[#0070ba] hover:bg-[#005ea6] text-white font-semibold"
        size="lg"
      >
        {paypalLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {t('paymentProcessing') || 'Redirecting...'}
          </>
        ) : (
          <>
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 2.58c.048-.27.281-.469.556-.469h6.774c2.243 0 3.959.546 5.1 1.622.457.431.796.933 1.015 1.497.226.58.321 1.228.285 1.926-.018.338-.066.694-.145 1.064-.364 1.719-1.215 3.065-2.535 4.003-1.286.916-2.988 1.381-5.062 1.381h-1.07a.641.641 0 0 0-.633.545l-.795 5.038a.641.641 0 0 1-.633.545h-1.725v.605z"/>
            </svg>
            PayPal
          </>
        )}
      </Button>
    </>
  )
}
