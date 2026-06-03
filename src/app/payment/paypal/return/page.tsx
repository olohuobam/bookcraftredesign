'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { CheckCircle, XCircle, BookOpen, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import BookLoadingSpinner from '@/components/BookLoadingSpinner'
import { useLanguage } from '@/context/LanguageContext'

function PayPalReturnContent() {
 const { t } = useLanguage()
 const searchParams = useSearchParams()
 const router = useRouter()
 const { getIdToken } = useAuth()

 const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
 const [errorMessage, setErrorMessage] = useState('')
 const [bookData, setBookData] = useState<{ id?: string; title?: string; activeJobId?: string } | null>(null)
 const [generationStarted, setGenerationStarted] = useState(false)

 useEffect(() => {
 const capturePayment = async () => {
 const token = searchParams.get('token') // PayPal order ID
 const payerID = searchParams.get('PayerID')
 const returnBookId = searchParams.get('bookId')

 if (!token || !payerID) {
 setStatus('error')
 setErrorMessage('Payment information missing. Please try again.')
 return
 }

 try {
 const authToken = await getIdToken?.()

 const response = await fetch('/api/capture-paypal-order', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
 },
 body: JSON.stringify({
 orderId: token,
 ...(returnBookId ? { bookId: returnBookId } : {}),
 }),
 })

 const result = await response.json()

 if (result.success) {
 setStatus('success')
 setBookData(result.book || null)
 setGenerationStarted(!!result.generationStarted)

          // Bug 5b fix: redirect to job status page if generation started
 const jobId = result.book?.activeJobId
 if (result.generationStarted && jobId) {
 setTimeout(() => {
 router.push(`/dashboard/jobs/${jobId}`)
 }, 3500)
 } else if (result.book?.id || returnBookId) {
 setTimeout(() => {
 router.push(`/dashboard/books/${result.book?.id || returnBookId}`)
 }, 4000)
 } else {
 setTimeout(() => {
 router.push('/dashboard/books')
 }, 4000)
 }
 } else {
 setStatus('error')
 setErrorMessage(result.error || 'Payment could not be completed.')
 }
 } catch (error) {
        console.error('PayPal capture error:', error)
 setStatus('error')
 setErrorMessage('An error occurred. Please contact support.')
 }
 }

 capturePayment()
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [])

 return (
 <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 overflow-hidden">
 {/* Background glow */}
 <div className="fixed inset-0 pointer-events-none">
 <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-bookcraft-blue/10 rounded-full blur-3xl" />
 <div className="absolute top-2/3 right-1/3 w-[400px] h-[400px] bg-blue-600/8 rounded-full blur-3xl" />
 </div>

 <AnimatePresence mode="wait">
 {status === 'loading' && (
 <motion.div
 key="loading"
 initial={{ opacity: 0, y: 16 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -16 }}
 className="w-full max-w-md relative z-10"
 >
 <div className="bg-[#111118] border border-white/10 rounded-2xl p-10 shadow-2xl text-center">
 <motion.div
 className="w-20 h-20 rounded-full border-4 border-bookcraft-blue/20 border-t-bookcraft-blue mx-auto mb-6"
 animate={{ rotate: 360 }}
 transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
 />
 <h2 className="text-xl font-bold text-white mb-2">Processing Payment…</h2>
 <p className="text-white/40 text-sm">Please wait while we confirm your PayPal payment.</p>
 </div>
 </motion.div>
 )}

 {status === 'success' && (
 <motion.div
 key="success"
 initial={{ opacity: 0, y: 24 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.5 }}
 className="w-full max-w-md relative z-10"
 >
 <div className="bg-[#111118] border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
 {/* Icon */}
 <motion.div
 initial={{ scale: 0.5, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
 className="mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center"
 style={{ background: 'radial-gradient(circle, rgba(62,134,215,0.3) 0%, rgba(62,134,215,0.05) 70%)' }}
 >
 <CheckCircle className="h-10 w-10 text-blue-400" />
 </motion.div>

 <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
 <h1 className="text-3xl font-bold text-white mb-2">
 {generationStarted ? ' Chapters Unlocked!' : ' Payment Successful!'}
 </h1>
 <p className="text-white/50 mb-6 text-sm leading-relaxed">
 {generationStarted
 ? 'Your book is now being fully generated. We\'re writing all the remaining chapters — redirecting to live view…'
 : 'Your book has been unlocked. Redirecting you to your library…'}
 </p>
 </motion.div>

 {/* Book card */}
 {bookData?.title && (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ delay: 0.3 }}
 className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 flex items-center gap-4 text-left"
 >
 <div className="w-12 h-16 bg-gradient-to-br from-bookcraft-blue to-bookcraft-blue rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
 <BookOpen className="h-6 w-6 text-white" />
 </div>
 <div className="min-w-0">
 <p className="font-semibold text-white truncate">{bookData.title}</p>
 {generationStarted && (
 <div className="flex items-center gap-1.5 mt-1">
 <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
 <span className="text-xs text-blue-400 font-medium">Generating…</span>
 </div>
 )}
 </div>
 </motion.div>
 )}

 {/* Status check */}
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: 0.4 }}
 className="flex items-center justify-center gap-2 text-green-400 mb-6"
 >
 <CheckCircle className="h-4 w-4" />
 <span className="text-sm font-medium">{t('paymentConfirmed')} · PayPal</span>
 </motion.div>

 <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
 <Button
 onClick={() => {
 const jobId = bookData?.activeJobId
 if (generationStarted && jobId) {
 router.push(`/dashboard/jobs/${jobId}`)
 } else if (bookData?.id) {
 router.push(`/dashboard/books/${bookData.id}`)
 } else {
 router.push('/dashboard/books')
 }
 }}
 size="lg"
 className="w-full h-12 font-semibold text-base rounded-xl"
 style={{ background: 'linear-gradient(135deg, #3E86D7, #2563eb)' }}
 >
 {generationStarted ? (
 <>
 Watch Live Generation
 </>
 ) : (
 <>
 <BookOpen className="mr-2 h-4 w-4" />
 Open My Book
 </>
 )}
 <ArrowRight className="ml-2 h-4 w-4" />
 </Button>
 <p className="text-center text-xs text-white/25 mt-3">
 Redirecting automatically in a few seconds…
 </p>
 </motion.div>
 </div>
 </motion.div>
 )}

 {status === 'error' && (
 <motion.div
 key="error"
 initial={{ opacity: 0, y: 24 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.5 }}
 className="w-full max-w-md relative z-10"
 >
 <div className="bg-[#111118] border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
 <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
 <XCircle className="h-10 w-10 text-red-400" />
 </div>
 <h2 className="text-2xl font-bold text-white mb-2">{t('paymentFailed')}</h2>
 <p className="text-white/40 mb-6 text-sm">{errorMessage}</p>
 <div className="space-y-3">
 <Button
 onClick={() => router.push('/dashboard/books')}
 variant="outline"
 className="w-full border-white/10 text-white hover:bg-white/10"
 >
 Back to Library
 </Button>
 <Button
 onClick={() => window.location.reload()}
 className="w-full"
 style={{ background: 'linear-gradient(135deg, #3E86D7, #2563eb)' }}
 >
 <Loader2 className="mr-2 h-4 w-4" />
 Try Again
 </Button>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 )
}

export default function PayPalReturnPage() {
 return (
 <Suspense fallback={<BookLoadingSpinner fullScreen text="Loading…" />}>
 <PayPalReturnContent />
 </Suspense>
 )
}
