'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, BookOpen, ArrowRight, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import BookLoadingSpinner from '@/components/BookLoadingSpinner'
import { useLanguage } from '@/context/LanguageContext'

function BookPurchaseSuccessContent() {
 const { t } = useLanguage()
 const searchParams = useSearchParams()
 const router = useRouter()
 const { user, getIdToken, isLoading: authLoading } = useAuth()

 const [status, setStatus] = useState<'loading' | 'success' | 'generating' | 'error'>('loading')
 const [bookData, setBookData] = useState<{
 id: string
 title: string
 status: string
 activeJobId?: string | null
 } | null>(null)
 const [errorMessage, setErrorMessage] = useState<string>('')
 const [showConfetti, setShowConfetti] = useState(false)

 const bookId = searchParams.get('bookId')
 const paymentIntent = searchParams.get('payment_intent')
 const redirectStatus = searchParams.get('redirect_status')

 useEffect(() => {
 const confettiTimer = setTimeout(() => setShowConfetti(false), 5000)
 return () => clearTimeout(confettiTimer)
 }, [])

 useEffect(() => {
    // Wait until auth has finished loading before acting
 if (authLoading) return

 if (!bookId || !paymentIntent) {
 setStatus('error')
 setErrorMessage('Missing payment information')
 return
 }

 if (!user) {
 setStatus('error')
 setErrorMessage('Please log in to complete your purchase')
 return
 }

    // Check redirect status from Stripe
 if (redirectStatus && redirectStatus !== 'succeeded') {
 setStatus('error')
 setErrorMessage('Payment was not completed')
 return
 }

 const completePurchase = async () => {
 try {
 const token = await getIdToken()

 const response = await fetch(`/api/books/${bookId}/complete-purchase`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({ paymentIntentId: paymentIntent })
 })

 const data = await response.json()

 if (!response.ok) {
 throw new Error(data.error || 'Purchase could not be completed')
 }

 setBookData(data.book)
 setShowConfetti(true)

 if (data.generationStarted && data.book.activeJobId) {
 setStatus('generating')
          // Auto-redirect to job live view after 3 seconds
 setTimeout(() => {
 router.push(`/dashboard/jobs/${data.book.activeJobId}`)
 }, 3000)
 } else {
 setStatus('success')
          // Auto-redirect to book page after 3 seconds
 setTimeout(() => {
 router.push(`/dashboard/books/${data.book.id}`)
 }, 3000)
 }

 } catch (error) {
        console.error('Error completing purchase:', error)
 setStatus('error')
 setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred')
 }
 }

 completePurchase()
 }, [authLoading, user, bookId, paymentIntent, redirectStatus, getIdToken, router])

 const handleGoToBook = () => {
 if (status === 'generating' && bookData?.activeJobId) {
 router.push(`/dashboard/jobs/${bookData.activeJobId}`)
 } else if (bookData?.id) {
 router.push(`/dashboard/books/${bookData.id}`)
 } else if (bookId) {
 router.push(`/dashboard/books/${bookId}`)
 } else {
 router.push('/dashboard/books')
 }
 }

 const handleRetry = () => {
 window.location.reload()
 }

 const renderConfetti = () => showConfetti && (
 <div className="fixed inset-0 pointer-events-none z-50">
 {Array.from({ length: 50 }).map((_, i) => (
 <div
 key={i}
 className="absolute animate-bounce"
 style={{
 left: `${Math.random() * 100}%`,
 top: `${Math.random() * 100}%`,
 animationDelay: `${Math.random() * 2}s`,
 animationDuration: `${2 + Math.random() * 2}s`
 }}
 >
 </div>
 ))}
 </div>
 )

 if (status === 'loading') {
 return <BookLoadingSpinner fullScreen text="Completing purchase..." />
 }

 if (status === 'error') {
 return (
 <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-950/30 dark:to-orange-950/30 flex items-center justify-center p-4">
 <Card className="w-full max-w-md shadow-xl border-0 bg-background/90 backdrop-blur-sm">
 <CardHeader className="text-center pb-4">
 <div className="mx-auto mb-4 p-3 bg-red-100 dark:bg-red-900/30 rounded-full w-fit">
 <AlertCircle className="h-12 w-12 text-red-500" />
 </div>
 <CardTitle className="text-2xl font-bold text-foreground mb-2">
 Purchase Error
 </CardTitle>
 <CardDescription className="text-lg text-muted-foreground">
 {errorMessage}
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <Button
 onClick={handleRetry}
 variant="outline"
 className="w-full"
 >
 <RefreshCw className="mr-2 h-4 w-4" />
 Try Again
 </Button>
 <Button
 onClick={() => router.push('/dashboard/books')}
 className="w-full bg-gradient-to-r from-bookcraft-blue to-bookcraft-blue"
 >
 Library
 <ArrowRight className="ml-2 h-4 w-4" />
 </Button>
 </CardContent>
 </Card>
 </div>
 )
 }

 return (
 <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/30 dark:to-emerald-950/30 flex items-center justify-center p-4">
 {renderConfetti()}
 <Card className="w-full max-w-md shadow-xl border-0 bg-background/90 backdrop-blur-sm">
 <CardHeader className="text-center pb-4">
 <div className="mx-auto mb-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-full w-fit">
 {status === 'generating' ? (
 <Loader2 className="h-12 w-12 text-bookcraft-blue animate-spin" />
 ) : (
 <Check className="h-12 w-12 text-green-500" />
 )}
 </div>
 <CardTitle className="text-2xl font-bold text-foreground mb-2">
 {status === 'generating' ? 'Chapters Being Generated!' : 'Purchase Successful!'}
 </CardTitle>
 <CardDescription className="text-lg text-muted-foreground">
 {status === 'generating'
 ? 'The remaining chapters of your book are now being created.'
 : 'You now have full access to your book.'
 }
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-6">
 {/* Book info */}
 {bookData && (
 <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
 <div className="w-12 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded shadow flex items-center justify-center">
 <BookOpen className="h-6 w-6 text-white" />
 </div>
 <div>
 <p className="font-semibold text-foreground">{bookData.title}</p>
 <p className="text-sm text-muted-foreground">
 {status === 'generating' ? 'Generating...' : 'Ready to Read'}
 </p>
 </div>
 </div>
 )}

 {/* Success indicator */}
 <div className="flex items-center justify-center">
 <div className="flex items-center space-x-3 text-green-600 dark:text-green-400">
 <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
 <Check className="h-6 w-6" />
 </div>
 <span className="font-medium">{t('paymentConfirmed')}</span>
 </div>
 </div>

 {/* Action button */}
 <div className="space-y-3">
 <Button
 onClick={handleGoToBook}
 className="w-full bg-gradient-to-r from-bookcraft-blue to-bookcraft-blue hover:brightness-110 text-white"
 size="lg"
 >
 {status === 'generating' ? 'Live View' : 'Open Book'}
 <ArrowRight className="ml-2 h-4 w-4" />
 </Button>
 <p className="text-center text-sm text-muted-foreground">
 You will be automatically redirected in 3 seconds...
 </p>
 </div>
 </CardContent>
 </Card>
 </div>
 )
}

export default function BookPurchaseSuccessPage() {
 return (
 <Suspense fallback={<BookLoadingSpinner fullScreen text="Loading..." />}>
 <BookPurchaseSuccessContent />
 </Suspense>
 )
}
