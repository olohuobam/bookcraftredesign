'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Loader2, CreditCard } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

interface CoverGeneratorButtonProps {
 bookId: string
 onCoverGenerated?: (coverUrl: string, backCoverUrl?: string | null) => void
 className?: string
}

export default function CoverGeneratorButton({ bookId, onCoverGenerated, className }: CoverGeneratorButtonProps) {
 const { getIdToken } = useAuth()
 const { t } = useLanguage()
 const [loading, setLoading] = useState(false)
 const [credits, setCredits] = useState<number | null>(null)
 const [showPayment, setShowPayment] = useState(false)
 const [clientSecret, setClientSecret] = useState<string | null>(null)
 const [error, setError] = useState<string | null>(null)

  // Fetch user's cover generation credits
 useEffect(() => {
 fetchCredits()
 }, [])

 const fetchCredits = async () => {
 try {
 const token = await getIdToken()
 if (!token) return

 const res = await fetch('/api/user/profile', {
 headers: { 'Authorization': `Bearer ${token}` }
 })

 if (res.ok) {
 const data = await res.json()
 setCredits(data.profile?.cover_generation_credits ?? 3)
 }
 } catch (err) {
      console.error('Error fetching credits:', err)
 }
 }

 const handleGenerateCover = async () => {
 setLoading(true)
 setError(null)

 try {
 const token = await getIdToken()
 if (!token) {
 setError(t('pleaseSignIn'))
 setLoading(false)
 return
 }

      // Use direct GPT Image 1.5 API for cover generation
 const res = await fetch(`/api/books/${bookId}/generate-cover`, {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${token}`,
 'Content-Type': 'application/json'
 }
 })

 const data = await res.json()

 if (res.status === 402) {
        // Payment required
 setShowPayment(true)
 await initializePayment()
 setLoading(false)
 return
 }

 if (!res.ok) {
 throw new Error(data.error || 'Cover generation failed')
 }

      // Direct API success
 setCredits(data.creditsRemaining)
 if (onCoverGenerated && data.coverImageUrl) {
 onCoverGenerated(data.coverImageUrl, data.backCoverImageUrl || null)
 }

 setLoading(false)
 } catch (err: any) {
      console.error('Error generating cover:', err)
 setError(err.message || 'Cover generation failed. Please try again or choose a different style.')
 setLoading(false)
 }
 }

 const initializePayment = async () => {
 try {
 const token = await getIdToken()
 if (!token) return

 const res = await fetch(`/api/books/${bookId}/generate-cover/payment`, {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${token}`,
 'Content-Type': 'application/json'
 }
 })

 if (!res.ok) {
 throw new Error('Could not initialize payment')
 }

 const data = await res.json()
 setClientSecret(data.clientSecret)
 } catch (err: any) {
      console.error('Error initializing payment:', err)
 setError(err.message)
 }
 }

 const getCreditsDisplay = () => {
 if (credits === null) return '...'
 if (credits > 0) return t('freeCredits').replace('{credits}', credits.toString())
 return t('perCover').replace('{price}', '0.99')
 }

 if (showPayment && clientSecret) {
 return (
 <div className="space-y-4 p-4 border rounded-lg bg-white dark:bg-gray-800">
 <div className="text-center">
 <h3 className="text-lg font-semibold mb-2">{t('buyCoverGeneration')}</h3>
 <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
 One-time payment: <strong>€0.99</strong>
 </p>
 </div>

 <Elements stripe={stripePromise} options={{ clientSecret }}>
 <PaymentForm
 bookId={bookId}
 onSuccess={() => {
 setShowPayment(false)
 setClientSecret(null)
 fetchCredits()
 handleGenerateCover()
 }}
 onCancel={() => {
 setShowPayment(false)
 setClientSecret(null)
 }}
 />
 </Elements>
 </div>
 )
 }

 return (
 <div className={`space-y-2 ${className}`}>
 <Button
 onClick={handleGenerateCover}
 disabled={loading}
 className="w-full bg-gradient-to-r from-bookcraft-blue to-bookcraft-blue hover:brightness-110 text-white"
 >
 {loading ? (
 <>
 <Loader2 className="w-4 h-4 mr-2 animate-spin" />
 {t('generatingCover')}
 </>
 ) : (
 <>
 {t('generateAICover')}
 </>
 )}
 </Button>

 <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
 <span>{getCreditsDisplay()}</span>
 {credits !== null && credits > 0 && (
 <span className="text-green-600 dark:text-green-400"> Free</span>
 )}
 </div>

 {error && (
 <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
 )}
 </div>
 )
}

function PaymentForm({
 bookId,
 onSuccess,
 onCancel
}: {
 bookId: string
 onSuccess: () => void
 onCancel: () => void
}) {
 const stripe = useStripe()
 const elements = useElements()
 const { getIdToken } = useAuth()
 const { t } = useLanguage()
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState<string | null>(null)

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()

 if (!stripe || !elements) return

 setLoading(true)
 setError(null)

 try {
 const result = await stripe.confirmPayment({
 elements,
 redirect: 'if_required'
 })

 if (result.error) {
 setError(result.error.message || 'Payment failed')
 setLoading(false)
 return
 }

 if (result.paymentIntent?.status === 'succeeded') {
        // Verify payment and add credit
 const token = await getIdToken()
 if (!token) {
 setError(t('authenticationFailed'))
 setLoading(false)
 return
 }

 const res = await fetch(
 `/api/books/${bookId}/generate-cover/payment?payment_intent=${result.paymentIntent.id}`,
 {
 headers: { 'Authorization': `Bearer ${token}` }
 }
 )

 if (res.ok) {
 onSuccess()
 } else {
 setError(t('paymentSuccessfulCreditFailed'))
 }
 }

 setLoading(false)
 } catch (err: any) {
      console.error('Payment error:', err)
 setError(err.message || 'Payment failed')
 setLoading(false)
 }
 }

 return (
 <form onSubmit={handleSubmit} className="space-y-4">
 <PaymentElement />

 {error && (
 <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
 )}

 <div className="flex gap-2">
 <Button
 type="button"
 variant="outline"
 onClick={onCancel}
 disabled={loading}
 className="flex-1"
 >
 Cancel
 </Button>
 <Button
 type="submit"
 disabled={!stripe || loading}
 className="flex-1 bg-green-600 hover:bg-green-700 text-white"
 >
 {loading ? (
 <>
 <Loader2 className="w-4 h-4 mr-2 animate-spin" />
 Paying...
 </>
 ) : (
 <>
 <CreditCard className="w-4 h-4 mr-2" />
 Pay €0.99
 </>
 )}
 </Button>
 </div>
 </form>
 )
}
