'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, BookOpen, ArrowRight, Loader2, Home, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import BookLoadingSpinner from '@/components/BookLoadingSpinner'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'

function SuccessContent() {
 const { t } = useLanguage()
 const searchParams = useSearchParams()
 const router = useRouter()
 const [purchaseData, setPurchaseData] = useState<any>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)
 const [redirecting, setRedirecting] = useState(false)

 useEffect(() => {
 const id = searchParams.get('session_id')
 if (id) {
 processPurchase(id)
 } else {
 setLoading(false)
 }
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [])

 const processPurchase = async (sessionId: string) => {
 try {
 setLoading(true)
 // SECURITY: include Supabase auth token so the API can verify the caller
 const { data: sessionData } = await supabase.auth.getSession()
 const accessToken = sessionData?.session?.access_token || ''
 const response = await fetch('/api/process-purchase', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
 },
 body: JSON.stringify({ sessionId }),
 })

 const data = await response.json()

 if (response.ok) {
 setPurchaseData(data)

        // Bug 5b fix: redirect to job status page if generation started
 const firstBookWithJob = data.purchasedBooks?.find((b: any) => b.generationStarted && b.jobId)
 if (firstBookWithJob) {
 setRedirecting(true)
 setTimeout(() => {
 router.push(`/dashboard/jobs/${firstBookWithJob.jobId}`)
 }, 3500)
 } else {
          // No active generation — go to books library after a short pause
 setTimeout(() => {
 router.push('/dashboard/books')
 }, 4000)
 }
 } else {
 setError(data.error || t('purchaseProcessingError'))
 }
 } catch {
 setError(t('purchaseProcessingError'))
 } finally {
 setLoading(false)
 }
 }

 if (loading) {
 return <BookLoadingSpinner fullScreen text="Processing your purchase..." />
 }

 if (error) {
 return (
 <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
 <div className="w-full max-w-md bg-[#111118] border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
 <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
 <AlertCircle className="h-8 w-8 text-red-400" />
 </div>
 <h1 className="text-2xl font-bold text-white mb-3">{t('somethingWentWrong')}</h1>
 <p className="text-white/50 mb-6">{error}</p>
 <Button
 onClick={() => router.push('/dashboard/books')}
 className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10"
 size="lg"
 >
 <Home className="mr-2 h-5 w-5" />
 My Books
 </Button>
 </div>
 </div>
 )
 }

 const firstBook = purchaseData?.purchasedBooks?.[0]
 const generationStarted = firstBook?.generationStarted

 return (
 <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 overflow-hidden">
 {/* Background glow */}
 <div className="fixed inset-0 pointer-events-none">
 <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
 <div className="absolute top-2/3 left-1/3 w-[400px] h-[400px] bg-bookcraft-blue/8 rounded-full blur-3xl" />
 </div>

 <motion.div
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
 {generationStarted ? ' Chapters Unlocked!' : ' Purchase Successful!'}
 </h1>
 <p className="text-white/50 mb-6">
 {generationStarted
 ? 'Your book is now being fully generated. We\'re writing all the remaining chapters for you.'
 : 'You now have full access to your book.'}
 </p>
 </motion.div>

 {/* Book card */}
 {firstBook && (
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
 <p className="font-semibold text-white truncate">{firstBook.title}</p>
 <p className="text-sm text-white/40">{firstBook.genre}</p>
 {generationStarted && (
 <div className="flex items-center gap-1.5 mt-1">
 <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
 <span className="text-xs text-blue-400 font-medium">Generating…</span>
 </div>
 )}
 </div>
 </motion.div>
 )}

 {/* Status */}
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: 0.4 }}
 className="flex items-center justify-center gap-2 text-green-400 mb-6"
 >
 <CheckCircle className="h-4 w-4" />
 <span className="text-sm font-medium">{t('paymentConfirmed')}</span>
 </motion.div>

 {/* Redirect button */}
 <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
 <Button
 onClick={() => {
 if (generationStarted && firstBook?.jobId) {
 router.push(`/dashboard/jobs/${firstBook.jobId}`)
 } else {
 router.push('/dashboard/books')
 }
 }}
 size="lg"
 className="w-full h-12 font-semibold text-base rounded-xl"
 style={{ background: 'linear-gradient(135deg, #3E86D7, #2563eb)' }}
 >
 {redirecting ? (
 <>
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 Redirecting…
 </>
 ) : generationStarted ? (
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
 </div>
 )
}

export default function SuccessPage() {
 return (
 <Suspense fallback={<BookLoadingSpinner fullScreen text="Loading..." />}>
 <SuccessContent />
 </Suspense>
 )
}
