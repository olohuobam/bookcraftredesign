'use client'

import { useState, useEffect, useMemo } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
 Elements,
 PaymentElement,
 useStripe,
 useElements
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
 DialogTrigger
} from '@/components/ui/dialog'
import BottomSheet from '@/components/BottomSheet'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, CreditCard, Loader2, CheckCircle, X, Heart } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Badge } from '@/components/ui/badge'
import { calculateDynamicPrice, getIAPProductId, snapToIAPTier } from '@/lib/pricing'
import { useLanguage } from '@/context/LanguageContext'
import { useInAppPurchase } from '@/hooks/useInAppPurchase'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useToast } from '@/components/ui/toast'

// TypeScript declarations for PayPal
declare global {
 interface Window {
 paypal?: {
 Buttons: (config: any) => {
 render: (selector: string) => void
 }
 }
 }
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface DigitalPurchaseModalProps {
 bookId: string
 bookData: {
 title: string
 author?: string
 genre: string
 content?: string
 chapters?: number
 pages?: number // For picture books
 bookType?: string // 'picture' or 'text'
 purchased?: boolean
 }
 price?: number // Price in cents (if not provided, calculated dynamically based on chapters/pages)
 onPurchaseSuccess: () => void
 triggerElement?: React.ReactNode
 disabled?: boolean
  // Optional: Allow programmatic control of the modal
 isOpen?: boolean
 onClose?: () => void
}

// Stripe Checkout Form - Inner form component
function StripePaymentForm({
 bookId,
 price,
 onSuccess
}: {
 bookId: string
 price: number
 onSuccess: () => void
}) {
 const stripe = useStripe()
 const elements = useElements()
 const [isLoading, setIsLoading] = useState(false)
 const { t } = useLanguage()
 const { showToast } = useToast()

 const handleSubmit = async (event: React.FormEvent) => {
 event.preventDefault()

 if (!stripe || !elements) {
 return
 }

 setIsLoading(true)

 const { error } = await stripe.confirmPayment({
 elements,
 confirmParams: {
        // Redirect to book success page which will process the purchase
 return_url: `${window.location.origin}/payment/book/success?bookId=${bookId}`,
 },
 })

 if (error) {
      console.error('Payment error:', error)
      // Show error message in a more user-friendly way
 const errorMessage = error.message || t('unexpectedError')
 showToast(`${t('paymentFailed')}: ${errorMessage}`, 'error')
 } else {
      // Payment succeeded
 onSuccess()
 }

 setIsLoading(false)
 }

 return (
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="bg-muted rounded-lg p-4">
 <PaymentElement
 options={{
 layout: 'tabs',
 wallets: {
 applePay: 'auto',
 googlePay: 'auto'
 }
 }}
 />
 </div>

 <Button
 type="submit"
 disabled={!stripe || isLoading}
 className="w-full bg-gradient-to-r from-bookcraft-blue to-bookcraft-blue hover:brightness-110"
 size="lg"
 >
 {isLoading ? (
 <>
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 {t('paymentProcessing')}
 </>
 ) : (
 <>
 <CreditCard className="mr-2 h-4 w-4" />
 {t('buyNow')} - €{(price / 100).toFixed(2)}
 </>
 )}
 </Button>
 </form>
 )
}

// Stripe Checkout Wrapper - Creates payment intent and loads Elements
function DigitalCheckoutForm({
 bookId,
 bookData,
 price,
 onSuccess
}: {
 bookId: string
 bookData: DigitalPurchaseModalProps['bookData']
 price: number
 onSuccess: () => void
}) {
 const [clientSecret, setClientSecret] = useState('')
 const { getIdToken } = useAuth()
 const { t } = useLanguage()
 const { showToast } = useToast()

  // ✅ FIX: Move useMemo BEFORE early return to comply with Rules of Hooks
  // Memoize options to prevent "clientSecret is not mutable" error
 const options = useMemo(() => ({
 clientSecret,
 appearance: {
 theme: 'stripe' as const,
 },
 }), [clientSecret])

 useEffect(() => {
    // Create payment intent when component mounts
 const createPaymentIntent = async () => {
 try {
 const token = await getIdToken?.()
 const response = await fetch(`/api/books/${bookId}/purchase`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 ...(token ? { Authorization: `Bearer ${token}` } : {}),
 },
 body: JSON.stringify({
 title: bookData.title,
 price
 })
 })

 const data = await response.json()

 if (data.error) {
 if (data.alreadyPurchased) {
 showToast(`${t('alreadyOwnBook')} ${t('canReadInLibrary')}`, 'info')
 onSuccess() // Close modal and refresh
 return
 }
 throw new Error(data.error)
 }

 setClientSecret(data.client_secret)
 } catch (error) {
        console.error('Error creating payment intent:', error)
 const errorMsg = error instanceof Error ? error.message : t('unknownError')
 showToast(`${t('errorPreparingPayment')}: ${errorMsg}. ${t('pleaseTryAgain')}`, 'error')
 }
 }

 createPaymentIntent()
 }, [bookId, bookData.title, price, getIdToken, onSuccess])

  // Early return AFTER all hooks
 if (!clientSecret) {
 return (
 <div className="flex items-center justify-center p-6 bg-muted rounded-lg">
 <Loader2 className="h-5 w-5 animate-spin text-bookcraft-blue dark:text-bookcraft-blue/80" />
 <span className="ml-2 text-sm text-muted-foreground">{t('preparingPayment')}</span>
 </div>
 )
 }

 return (
 <Elements stripe={stripePromise} options={options}>
 <StripePaymentForm
 bookId={bookId}
 price={price}
 onSuccess={onSuccess}
 />
 </Elements>
 )
}

// Helper to detect mobile devices
function isMobileDevice() {
 if (typeof window === 'undefined') return false
 return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
 window.innerWidth < 768
}

// Native IAP Purchase Component for iOS/Android apps
function NativeIAPPurchase({
 bookId,
 bookData,
 price,
 onSuccess
}: {
 bookId: string
 bookData: DigitalPurchaseModalProps['bookData']
 price: number
 onSuccess: () => void
}) {
 const [isPurchasing, setIsPurchasing] = useState(false)
 const { user, getIdToken } = useAuth()
 const { t } = useLanguage()
 const {
 isAvailable,
 isLoading: iapLoading,
 purchase,
 product,
 error: iapError,
 platform,
 } = useInAppPurchase()
 const { showToast } = useToast()

 const handlePurchase = async () => {
 if (!user?.id || isPurchasing) return

 setIsPurchasing(true)

 try {
 const token = await getIdToken?.()
 if (!token) {
 showToast("Authentifizierung fehlgeschlagen. Bitte erneut einloggen.", 'error')
 setIsPurchasing(false)
 return
 }
 const snappedPrice = snapToIAPTier(price)
 const productId = getIAPProductId(snappedPrice)
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

  // Loading state
 if (!isAvailable && !iapError) {
 return (
 <div className="p-6 text-center">
 <Loader2 className="h-8 w-8 animate-spin text-bookcraft-blue dark:text-bookcraft-blue/80 mx-auto mb-3" />
 <p className="text-sm text-muted-foreground">Loading purchase options...</p>
 </div>
 )
 }

  // Error state
 if (iapError) {
 return (
 <div className="p-4 text-center bg-red-50 dark:bg-red-950/30 rounded-lg">
 <p className="text-red-600 dark:text-red-400 text-sm mb-2">{t('purchaseOptionsUnavailable')}</p>
 <p className="text-muted-foreground text-xs">{iapError}</p>
 </div>
 )
 }

 const storeName = platform === 'ios' ? 'App Store' : 'Google Play'
 const storeIcon = platform === 'ios' ? '' : ''

 return (
 <div className="space-y-4">
 <Button
 onClick={handlePurchase}
 disabled={isPurchasing || iapLoading}
 className="w-full h-14 bg-gradient-to-r from-bookcraft-blue to-bookcraft-blue hover:brightness-110 text-white font-semibold text-lg shadow-lg"
 size="lg"
 >
 {isPurchasing ? (
 <>
 <Loader2 className="mr-2 h-5 w-5 animate-spin" />
 Purchasing...
 </>
 ) : (
 <>
 <span className="mr-2">{storeIcon}</span>
 {t('buyNow')} - {product?.price || `€${(price / 100).toFixed(2)}`}
 </>
 )}
 </Button>

 <p className="text-xs text-muted-foreground text-center">
 Secure purchase via {storeName} • Face ID / Touch ID supported
 </p>
 </div>
 )
}

// PayPal Redirect Button for Mobile - redirects to PayPal instead of using modal
function PayPalRedirectButton({
 bookId,
 bookData,
 price
}: {
 bookId: string
 bookData: DigitalPurchaseModalProps['bookData']
 price: number
}) {
 const [isLoading, setIsLoading] = useState(false)
 const { getIdToken } = useAuth()
 const { t } = useLanguage()
 const { showToast } = useToast()

 const handlePayPalRedirect = async () => {
 setIsLoading(true)
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
 price: price / 100 // Convert cents to euros
 }),
 })

 const data = await response.json()

 if (data.error) {
 if (data.alreadyPurchased) {
 showToast(`${t('alreadyOwnBook')} ${t('canReadInLibrary')}`, 'info')
 window.location.reload()
 return
 }
 throw new Error(data.error)
 }

      // Redirect to PayPal approval URL
 if (data.approval_url) {
 window.location.href = data.approval_url
 } else {
 throw new Error('No PayPal approval URL received')
 }
 } catch (error) {
      console.error('Error creating PayPal order:', error)
 const errorMsg = error instanceof Error ? error.message : t('unknownError')
 showToast(`${t('paypalOrderCreateFailed')}: ${errorMsg}. ${t('pleaseTryOtherMethod')}`, 'error')
 setIsLoading(false)
 }
 }

 return (
 <Button
 onClick={handlePayPalRedirect}
 disabled={isLoading}
 className="w-full h-12 bg-[#0070ba] hover:bg-[#005ea6] text-white font-semibold"
 size="lg"
 >
 {isLoading ? (
 <>
 <Loader2 className="mr-2 h-5 w-5 animate-spin" />
 Weiterleitung zu PayPal...
 </>
 ) : (
 <>
 <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
 <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 2.58c.048-.27.281-.469.556-.469h6.774c2.243 0 3.959.546 5.1 1.622.457.431.796.933 1.015 1.497.226.58.321 1.228.285 1.926-.018.338-.066.694-.145 1.064-.364 1.719-1.215 3.065-2.535 4.003-1.286.916-2.988 1.381-5.062 1.381h-1.07a.641.641 0 0 0-.633.545l-.795 5.038a.641.641 0 0 1-.633.545h-1.725v.605z"/>
 </svg>
 Mit PayPal bezahlen
 </>
 )}
 </Button>
 )
}

// PayPal Digital Purchase Component - Uses redirect on mobile, SDK buttons on desktop
function PayPalDigitalPurchase({
 bookId,
 bookData,
 price,
 onSuccess
}: {
 bookId: string
 bookData: DigitalPurchaseModalProps['bookData']
 price: number
 onSuccess: () => void
}) {
 const [isLoading, setIsLoading] = useState(false)
 const [paypalLoaded, setPaypalLoaded] = useState(false)
 const [isMobile, setIsMobile] = useState(false)
 const { getIdToken } = useAuth()
 const { t } = useLanguage()
 const { showToast } = useToast()

  // Detect mobile on mount
 useEffect(() => {
 setIsMobile(isMobileDevice())
 }, [])

 useEffect(() => {
    // On mobile, use redirect-based flow instead of SDK buttons
 if (isMobile) {
 setPaypalLoaded(true)
 return
 }

    // Load PayPal SDK only on desktop
 const script = document.createElement('script')
 script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=EUR&components=buttons`
 script.async = true

 script.onload = () => {
 setPaypalLoaded(true)

      // Wait for DOM element to be available and PayPal to be loaded
 const initializePayPal = () => {
 const container = document.getElementById('paypal-button-container-digital')

 if (window.paypal && container) {
          // Clear any existing buttons
 container.innerHTML = ''

 window.paypal.Buttons({
 createOrder: async () => {
 setIsLoading(true)
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
 price: price / 100 // Convert cents to euros
 }),
 })

 const data = await response.json()

 if (data.error) {
 if (data.alreadyPurchased) {
 showToast(`${t('alreadyOwnBook')} ${t('canReadInLibrary')}`, 'info')
 onSuccess()
 return
 }
 throw new Error(data.error)
 }

 return data.order_id
 } catch (error) {
              console.error('Error creating PayPal order:', error)
 const errorMsg = error instanceof Error ? error.message : t('unknownError')
 showToast(`${t('paypalOrderCreateFailed')}: ${errorMsg}. ${t('pleaseTryOtherMethod')}`, 'error')
 throw error
 } finally {
 setIsLoading(false)
 }
 },
 onApprove: async (data: any) => {
 setIsLoading(true)
 try {
 const token = await getIdToken?.()
 const response = await fetch('/api/capture-paypal-order', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 ...(token ? { Authorization: `Bearer ${token}` } : {}),
 },
 body: JSON.stringify({
 orderId: data.orderID,
 }),
 })

 const result = await response.json()
 if (result.success) {
 onSuccess()
 } else {
 throw new Error(result.error || 'Payment capture failed')
 }
 } catch (error) {
              console.error('Error capturing PayPal payment:', error)
 const errorMsg = error instanceof Error ? error.message : t('unknownError')
 showToast(`${t('paypalPaymentCaptureFailed')}: ${errorMsg}. ${t('paymentNotCharged')}`, 'error')
 } finally {
 setIsLoading(false)
 }
 },
 onError: (err: any) => {
            console.error('PayPal error:', err)
 showToast(`${t('paypalError')}: ${t('paypalErrorOccurred')}`, 'error')
 setIsLoading(false)
 },
 style: {
 layout: 'vertical',
 color: 'blue',
 shape: 'rect',
 label: 'paypal',
 height: 45
 }
 }).render('#paypal-button-container-digital')
 } else {
          // Retry after a short delay if element not found
 setTimeout(initializePayPal, 100)
 }
 }

      // Start initialization
 initializePayPal()
 }

 document.head.appendChild(script)

 return () => {
      // Cleanup: remove script and clear PayPal container
 if (document.head.contains(script)) {
 document.head.removeChild(script)
 }
 const container = document.getElementById('paypal-button-container-digital')
 if (container) {
 container.innerHTML = ''
 }
 }
 }, [bookId, bookData.title, price, getIdToken, onSuccess, isMobile, t])

  // Mobile: Show redirect button
 if (isMobile) {
 return (
 <PayPalRedirectButton
 bookId={bookId}
 bookData={bookData}
 price={price}
 />
 )
 }

  // Desktop: Show PayPal SDK buttons
 return (
 <div className="space-y-3">
 {!paypalLoaded ? (
 <div className="flex items-center justify-center p-6 bg-muted rounded-lg">
 <Loader2 className="h-5 w-5 animate-spin text-bookcraft-blue dark:text-bookcraft-blue/80" />
 <span className="ml-2 text-sm text-muted-foreground">{t('paypalLoading')}</span>
 </div>
 ) : (
 <div id="paypal-button-container-digital" className="min-h-[45px]" />
 )}

 {isLoading && (
 <div className="flex items-center justify-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
 <Loader2 className="h-4 w-4 animate-spin text-bookcraft-blue dark:text-bookcraft-blue/80" />
 <span className="ml-2 text-sm text-bookcraft-blue dark:text-bookcraft-blue/80 font-medium">{t('paymentProcessing')}</span>
 </div>
 )}
 </div>
 )
}

export default function DigitalPurchaseModal({
 bookId,
 bookData,
 price: propPrice,
 onPurchaseSuccess,
 triggerElement,
 disabled = false,
 isOpen: externalIsOpen,
 onClose
}: DigitalPurchaseModalProps) {
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
 const { isNative } = useInAppPurchase()
 const isMobileViewport = useIsMobile()
 // Use bottom sheet on mobile (<768px) or native Capacitor app
 const useBottomSheet = isMobileViewport || isNative

  // Use external control if provided, otherwise use internal state
 const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
 const setIsOpen = (value: boolean) => {
 if (externalIsOpen !== undefined) {
      // External control - call onClose when closing
 if (!value && onClose) {
 onClose()
 }
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
 disabled={disabled || bookData.purchased}
 className="bg-gradient-to-r from-bookcraft-blue to-bookcraft-blue hover:brightness-110"
 >
 <BookOpen className="mr-2 h-4 w-4" />
 {bookData.purchased ? t('alreadyPurchased') : `${t('purchaseBook')} - €${(price / 100).toFixed(2)}`}
 </Button>
 )

  // When externally controlled, don't render trigger
 const showTrigger = externalIsOpen === undefined

 const modalContent = paymentSuccess ? (
 <div className="text-center py-12 px-4">
 <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
 <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
 </div>
 <h3 className="text-2xl font-bold font-display text-foreground mb-2">
 {t('paymentSuccessful')}
 </h3>
 <p className="text-base text-muted-foreground mb-4">
 {t('fullAccessGranted')}
 </p>
 <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-950/30 rounded-full">
 <BookOpen className="h-4 w-4 text-green-700 dark:text-green-400" />
 <span className="text-sm font-medium text-green-700 dark:text-green-300">{bookData.title}</span>
 </div>
 </div>
 ) : (
 <div className="px-5 pb-6 pt-2 space-y-4">
 {/* Book Preview Card */}
 <Card className="border-2 border-blue-100 dark:border-blue-900 shadow-sm">
 <CardContent className="p-5">
 <div className="flex items-start gap-4">
 <div className="w-16 h-20 bg-gradient-to-br from-bookcraft-blue to-bookcraft-blue rounded-lg shadow-md flex items-center justify-center flex-shrink-0">
 <BookOpen className="h-8 w-8 text-white" />
 </div>
 <div className="flex-1 min-w-0">
 <h4 className="font-bold text-base text-foreground mb-1">{bookData.title}</h4>
 <p className="text-sm text-muted-foreground mb-1">{bookData.genre}</p>
 {bookData.chapters && (
 <p className="text-xs text-muted-foreground mb-3">{bookData.chapters} {t('chapters')}</p>
 )}
 <div className="flex items-center gap-3">
 <Badge variant="secondary" className="text-xs bg-bookcraft-blue/10 dark:bg-bookcraft-blue/20 text-bookcraft-blue dark:text-bookcraft-blue/80 hover:bg-blue-100 dark:hover:bg-blue-900/50">
 {t('digitalDownload')}
 </Badge>
 <span className="text-2xl font-bold text-bookcraft-blue dark:text-bookcraft-blue/80">
 €{(price / 100).toFixed(2)}
 </span>
 </div>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Payment Section - Native IAP or Web Payment */}
 <div className="space-y-4">
 {isNative ? (
                /* Native App: Use App Store / Google Play IAP */
 <NativeIAPPurchase
 bookId={bookId}
 bookData={bookData}
 price={price}
 onSuccess={handleSuccess}
 />
 ) : (
                /* Web: Use Stripe and PayPal */
 <>
 <div className="text-center pb-2">
 <h3 className="font-bold text-base text-foreground mb-1">{t('choosePaymentMethod')}</h3>
 <p className="text-xs text-muted-foreground">{t('creditCardAppleGooglePay')}</p>
 </div>

 {/* Stripe Payment Element with built-in payment options */}
 <DigitalCheckoutForm
 bookId={bookId}
 bookData={bookData}
 price={price}
 onSuccess={handleSuccess}
 />

 {/* PayPal as alternative - streamlined */}
 <div className="relative py-2">
 <div className="absolute inset-0 flex items-center">
 <span className="w-full border-t border-border" />
 </div>
 <div className="relative flex justify-center text-xs uppercase">
 <span className="bg-background px-3 text-muted-foreground font-medium">{t('or')}</span>
 </div>
 </div>

 <PayPalDigitalPurchase
 bookId={bookId}
 bookData={bookData}
 price={price}
 onSuccess={handleSuccess}
 />
 </>
 )}
 </div>

 {/* Benefits Section */}
 <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-950/30 dark:to-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900">
 <div className="flex items-start gap-3">
 <div className="w-8 h-8 bg-bookcraft-blue rounded-full flex items-center justify-center flex-shrink-0">
 <Heart className="h-4 w-4 text-white" />
 </div>
 <div className="flex-1">
 <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
 {t('whatsIncluded')}
 </p>
 <ul className="text-sm text-bookcraft-blue dark:text-bookcraft-blue/80 space-y-1.5">
 <li className="flex items-center gap-2">
 <span className="w-1.5 h-1.5 bg-bookcraft-blue rounded-full"></span>
 {t('instantDigitalAccessBenefit')}
 </li>
 <li className="flex items-center gap-2">
 <span className="w-1.5 h-1.5 bg-bookcraft-blue rounded-full"></span>
 {t('pdfDownloadAllDevices')}
 </li>
 <li className="flex items-center gap-2">
 <span className="w-1.5 h-1.5 bg-bookcraft-blue rounded-full"></span>
 {t('printOrderLater')}
 </li>
 </ul>
 </div>
 </div>
 </div>

 {/* Security Badge */}
 <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
 <span> {t('securePaymentSsl')}</span>
 </div>
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
 title={paymentSuccess ? undefined : t('buyDigitalBook')}
 subtitle={paymentSuccess ? undefined : t('instantDigitalAccess')}
 >
 {modalContent}
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

 <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2 text-xl">
 <BookOpen className="h-6 w-6 text-bookcraft-blue" />
 {t('buyDigitalBook')}
 </DialogTitle>
 <DialogDescription className="text-sm">
 {t('instantDigitalAccess')}
 </DialogDescription>
 </DialogHeader>
 {modalContent}
 </DialogContent>
 </Dialog>
 )
}