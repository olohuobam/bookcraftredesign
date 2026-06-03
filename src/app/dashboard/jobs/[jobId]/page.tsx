'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { UnifiedLivePreview } from '@/components/UnifiedLivePreview'
import {
 Wand2, CheckCircle, AlertCircle, XCircle,
 RefreshCw, Home, BookOpen, Loader2, AlertTriangle
} from 'lucide-react'
import { motion } from 'framer-motion'
import BookLoadingSpinner from '@/components/BookLoadingSpinner'
import { AppBar } from '@/components/AppBar'
import PageTransition from '@/components/PageTransition'

interface JobStatus {
 id: string
 status: 'pending' | 'processing' | 'completed' | 'preview_completed' | 'failed' | 'cancelled'
 progress: number
 currentStep?: string
 errorMessage?: string
 bookId?: string
 createdAt?: string
 updatedAt?: string
 completedAt?: string
}

interface BookData {
 id: string
 title: string
 genre: string
 chapters: number
 status: string
 book_type?: string
 author?: string
}

export default function JobStatusPage() {
 const router = useRouter()
 const params = useParams()
 const { getIdToken } = useAuth()
 const { t } = useLanguage()
 const [job, setJob] = useState<JobStatus | null>(null)
 const [book, setBook] = useState<BookData | null>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)
 const [isRetrying, setIsRetrying] = useState(false)
 const [retryError, setRetryError] = useState<string | null>(null)
 const [stuckAt10, setStuckAt10] = useState(false)
 const stuckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
 const lastProgressRef = useRef<number>(0)

 const jobId = params.jobId as string

 const fetchJobStatus = async () => {
 try {
 const token = await getIdToken()
 if (!token) {
 throw new Error(t('notAuthenticated'))
 }

 const response = await fetch(`/api/jobs/${jobId}`, {
 headers: {
 'Authorization': `Bearer ${token}`
 }
 })

 if (!response.ok) {
 if (response.status === 404) {
 throw new Error(t('jobNotFound'))
 }
 throw new Error(t('errorLoadingJob'))
 }

 const data = await response.json()
 setJob(data.job)
 if (data.book) {
 setBook(data.book)
 }
 setError(null)
 } catch (err) {
      console.error('Error fetching job status:', err)
 setError(err instanceof Error ? err.message : t('unknownError'))
 } finally {
 setLoading(false)
 }
 }

  // Poll job status every 5 seconds
 useEffect(() => {
 fetchJobStatus()

 const interval = setInterval(() => {
 fetchJobStatus()
 }, 5000)

 return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [jobId])

  // Detect generation stuck at 10% for more than 60 seconds
 useEffect(() => {
 if (!job) return
 const progress = job.progress ?? 0

 if (job.status === 'processing' && progress <= 10 && progress === lastProgressRef.current) {
      // Progress hasn't moved — start or maintain stuck timer
 if (!stuckTimerRef.current) {
 stuckTimerRef.current = setTimeout(() => {
 setStuckAt10(true)
 }, 60000)
 }
 } else {
      // Progress moved or job finished — clear timer and reset
 if (stuckTimerRef.current) {
 clearTimeout(stuckTimerRef.current)
 stuckTimerRef.current = null
 }
 setStuckAt10(false)
 lastProgressRef.current = progress
 }

 return () => {
 if (stuckTimerRef.current) {
 clearTimeout(stuckTimerRef.current)
 stuckTimerRef.current = null
 }
 }
 }, [job?.status, job?.progress])

  // Redirect when completed
 useEffect(() => {
 if (job?.status === 'completed' && job.bookId) {
 setTimeout(() => {
 router.push(`/dashboard/books/${job.bookId}`)
 }, 3000)
 }
 }, [job?.status, job?.bookId, router])

 const handleCancel = async () => {
 if (!confirm(t('cancelConfirm'))) {
 return
 }

 try {
 const token = await getIdToken()
 if (!token) throw new Error(t('notAuthenticated'))

 const response = await fetch(`/api/jobs/${jobId}`, {
 method: 'DELETE',
 headers: {
 'Authorization': `Bearer ${token}`
 }
 })

 if (!response.ok) throw new Error(t('cancelError'))

 await fetchJobStatus()
 } catch (err) {
      console.error('Error cancelling job:', err)
 alert(t('cancelError'))
 }
 }

 const handleRetry = async () => {
 if (isRetrying) return

 setIsRetrying(true)
 setRetryError(null)

 try {
 const token = await getIdToken()
 if (!token) throw new Error(t('notAuthenticated'))

 const response = await fetch(`/api/jobs/${jobId}/retry`, {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${token}`,
 'Content-Type': 'application/json'
 },
 body: JSON.stringify({ force: true }) // Force retry for manual trigger
 })

 const result = await response.json()

 if (response.ok && result.success) {
        console.log('✅ Retry successful:', result)
 setRetryError(null)
 await fetchJobStatus() // Refresh job status
 } else {
        console.error('❌ Retry failed:', result)
 setRetryError(result.message || t('retryFailed'))
 }
 } catch (err) {
      console.error('Error retrying job:', err)
 setRetryError(err instanceof Error ? err.message : t('unknownError'))
 } finally {
 setIsRetrying(false)
 }
 }

 if (loading && !job) {
 return <BookLoadingSpinner fullScreen text={t('loadingJobStatus')} />
 }

 if (error) {
 return (
 <div className="min-h-[60vh] relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-blue-950 via-blue-950 to-blue-950">
 {/* Subtle radial glow overlay */}
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(62,134,215,0.15)_0%,_rgba(62,134,215,0.10)_50%,_transparent_100%)] pointer-events-none" />

 {/* Mobile App Bar */}
 <div className="lg:hidden absolute top-0 left-0 right-0">
 <AppBar
 title={t('errorTitle')}
 showBack
 onBack={() => router.push('/dashboard')}
 />
 </div>

 <motion.div
 initial={{ opacity: 0, y: 32 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.6, ease: 'easeOut' }}
 className="relative z-10 flex flex-col items-center text-center px-6 pt-20 lg:pt-0 max-w-md w-full"
 >
 {/* Book illustration */}
 <div className="relative mb-8 flex items-end justify-center">
 <div className="relative">
 <BookOpen className="w-24 h-24 text-bookcraft-blue/50" strokeWidth={1.2} />
 <div className="absolute -top-3 -right-3 bg-gradient-to-br from-[#3E86D7] to-[#3E86D7] rounded-full p-1.5 shadow-lg shadow-blue-900/50">
 <AlertTriangle className="w-5 h-5 text-white" strokeWidth={2} />
 </div>
 </div>
 </div>

 {/* Text */}
 <h1 className="text-5xl font-extrabold text-white mb-3 tracking-tight">
 {t('errorTitle')}
 </h1>
 <h2 className="text-xl font-semibold text-blue-200 mb-4">
 {t('errorSubtitle')}
 </h2>
 <p className="text-blue-100/60 text-sm leading-relaxed mb-3">
 {t('errorDescription')}
 </p>
 {error && (
 <p className="text-xs text-red-300/70 bg-red-900/20 rounded-lg px-4 py-2 mb-8 max-w-xs font-mono break-all">
 {error}
 </p>
 )}

 {/* Buttons */}
 <div className="flex flex-col sm:flex-row gap-3 w-full justify-center mt-2">
 <button
 onClick={() => router.push('/dashboard')}
 className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-all duration-200 border border-white/10 backdrop-blur-sm"
 >
 <Home className="h-4 w-4" />
 {t('goHome')}
 </button>
 <button
 onClick={() => window.location.reload()}
 className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all duration-200 shadow-lg shadow-blue-900/40"
 style={{ background: 'linear-gradient(135deg, #3E86D7 0%, #3E86D7 100%)' }}
 >
 <RefreshCw className="h-4 w-4" />
 {t('tryAgain')}
 </button>
 </div>
 </motion.div>
 </div>
 )
 }

 if (!job) return null

 const getStatusIcon = () => {
 switch (job.status) {
 case 'completed':
 return <CheckCircle className="w-8 h-8 text-green-600 animate-pulse" />
 case 'failed':
 case 'cancelled':
 return <XCircle className="w-8 h-8 text-red-600" />
 case 'processing':
 return <Wand2 className="w-8 h-8 text-bookcraft-blue animate-pulse" />
 default:
 return <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
 }
 }

 const getStatusColor = () => {
 switch (job.status) {
 case 'completed':
 return 'from-green-500 to-emerald-600'
 case 'failed':
 case 'cancelled':
 return 'from-red-500 to-rose-600'
 case 'processing':
 return 'from-bookcraft-blue to-bookcraft-blue'
 default:
 return 'from-gray-500 to-gray-600'
 }
 }

 const getStatusText = () => {
 switch (job.status) {
 case 'completed':
 case 'preview_completed':
 return t('jobCompleted')
 case 'failed':
 return t('jobFailed')
 case 'cancelled':
 return t('jobCancelled')
 case 'processing':
 return t('jobProcessing')
 default:
 return t('waitingToStart')
 }
 }

 const getAppBarTitle = () => {
 switch (job.status) {
 case 'completed':
 case 'preview_completed':
 return t('jobCompleted')
 case 'failed':
 return t('jobFailed')
 case 'cancelled':
 return t('jobCancelled')
 case 'processing':
 return t('jobProcessing')
 default:
 return t('waitingToStart')
 }
 }

  // Show live preview for processing/completed jobs
 if ((job.status === 'processing' || job.status === 'pending' || job.status === 'completed' || job.status === 'preview_completed') && job.bookId) {
 const isPictureBook = book?.book_type === 'picture'

 return (
 <UnifiedLivePreview
 jobId={jobId}
 bookId={job.bookId}
 bookType={isPictureBook ? 'picture' : 'text'}
 bookTitle={book?.title}
 bookAuthor={book?.author as string | undefined}
 onComplete={() => {
 setTimeout(() => {
 router.push(`/dashboard/books/${job.bookId}`)
 }, 2000)
 }}
 onClose={() => router.push('/dashboard')}
 />
 )
 }

 return (
 <PageTransition direction="fade">
 <div className="min-h-[60vh] bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 dark:from-blue-950 dark:via-blue-950 dark:to-blue-950 pb-32 lg:pb-8">
 {/* Mobile App Bar */}
 <div className="lg:hidden">
 <AppBar
 title={getAppBarTitle()}
 subtitle={book?.title}
 showBack
 onBack={() => router.push('/dashboard')}
 />
 </div>

 <div className="flex items-center justify-center p-4 min-h-[50vh]">
 <div className="w-full max-w-2xl">
 {/* Desktop Back Button */}
 <div className="hidden lg:block mb-4">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => router.push('/dashboard')}
 >
 <Home className="h-4 w-4 mr-2" />
 {t('backToDashboard')}
 </Button>
 </div>

 <Card className="shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
 <CardHeader className="text-center pb-6 p-6">
 <div className={`w-16 h-16 mx-auto bg-gradient-to-r ${getStatusColor()} rounded-full flex items-center justify-center mb-4`}>
 {getStatusIcon()}
 </div>
 <CardTitle className="text-2xl font-bold font-display text-foreground">
 {getStatusText()}
 </CardTitle>
 {book && (
 <p className="text-muted-foreground mt-2">
 &quot;{book.title}&quot;
 </p>
 )}
 </CardHeader>

 <CardContent className="space-y-6 p-6 pt-0">
 {/* Current Step */}
 {job.currentStep && (
 <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
 <div className="flex items-center gap-2">
 <span className="font-medium text-blue-800 dark:text-blue-200">{t('statusLabel')}</span>
 </div>
 <p className="text-bookcraft-blue dark:text-bookcraft-blue/80 mt-1 text-sm break-words overflow-hidden">{job.currentStep}</p>
 </div>
 )}

 {/* Error Message */}
 {job.errorMessage && (
 <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4 border border-red-200 dark:border-red-800">
 <div className="flex items-center gap-2">
 <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
 <span className="font-medium text-red-800 dark:text-red-200">{t('errorLabel')}</span>
 </div>
 <p className="text-red-700 dark:text-red-300 mt-1 text-sm">{job.errorMessage}</p>
 </div>
 )}

 {/* Success Message */}
 {job.status === 'completed' && (
 <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 border border-green-200 dark:border-green-800">
 <div className="flex items-center gap-2">
 <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
 <span className="font-medium text-green-800 dark:text-green-200">{t('successLabel')}</span>
 </div>
 <p className="text-green-700 dark:text-green-300 mt-1 text-sm">
 {t('bookCreatedSuccess')}
 </p>
 </div>
 )}

 {/* Stuck at 10% warning */}
 {stuckAt10 && job.status === 'processing' && (
 <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-4 border border-amber-300 dark:border-amber-700">
 <div className="flex items-center gap-2 mb-2">
 <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
 <span className="font-medium text-amber-800 dark:text-amber-200">{t('generationStuckTitle')}</span>
 </div>
 <p className="text-amber-700 dark:text-amber-300 text-sm mb-3">
 {t('generationStuckDescription')}
 </p>
 <Button
 size="sm"
 onClick={handleRetry}
 disabled={isRetrying}
 className="bg-amber-600 hover:bg-amber-700 text-white"
 >
 {isRetrying ? (
 <>
 <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
 {t('generationRetrying')}
 </>
 ) : (
 <>
 <RefreshCw className="h-4 w-4 mr-2" />
 {t('generationRetry')}
 </>
 )}
 </Button>
 </div>
 )}

 {/* Info Box */}
 {(job.status === 'pending' || job.status === 'processing') && (
 <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
 <p className="text-blue-800 dark:text-blue-200 text-sm">
 <strong> {t('generationNote')}</strong> {t('generationNoteText')}
 </p>
 </div>
 )}

 {/* Action Buttons */}
 <div className="flex gap-3">
 {job.status === 'completed' && job.bookId && (
 <Button
 className="flex-1"
 onClick={() => router.push(`/dashboard/books/${job.bookId}`)}
 >
 <BookOpen className="h-4 w-4 mr-2" />
 {t('goToBookEditor')}
 </Button>
 )}

 {(job.status === 'pending' || job.status === 'processing') && (
 <>
 <Button
 variant="outline"
 onClick={() => router.push('/dashboard')}
 className="flex-1"
 >
 <Home className="h-4 w-4 mr-2" />
 {t('dashboard')}
 </Button>
 <Button
 variant="destructive"
 onClick={handleCancel}
 className="flex-1"
 >
 <XCircle className="h-4 w-4 mr-2" />
 {t('cancelGeneration')}
 </Button>
 </>
 )}

 {(job.status === 'failed' || job.status === 'cancelled') && (
 <div className="space-y-3 w-full">
 {/* Retry Error */}
 {retryError && (
 <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3 border border-red-200 dark:border-red-800">
 <div className="flex items-center gap-2">
 <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
 <span className="text-red-700 dark:text-red-300 text-sm">{retryError}</span>
 </div>
 </div>
 )}
 <div className="flex gap-3">
 <Button
 variant="outline"
 onClick={() => router.push('/dashboard')}
 className="flex-1"
 >
 <Home className="h-4 w-4 mr-2" />
 {t('dashboard')}
 </Button>
 <Button
 onClick={handleRetry}
 disabled={isRetrying}
 className="flex-1"
 >
 {isRetrying ? (
 <>
 <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
 {t('retrying')}
 </>
 ) : (
 <>
 <RefreshCw className="h-4 w-4 mr-2" />
 {t('retryGeneration')}
 </>
 )}
 </Button>
 </div>
 <Button
 variant="ghost"
 onClick={() => router.push('/dashboard/create')}
 className="w-full text-muted-foreground hover:text-foreground"
 >
 <Wand2 className="h-4 w-4 mr-2" />
 {t('startNewBook')}
 </Button>
 </div>
 )}
 </div>

 {/* Job Info */}
 <div className="pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
 <div>{t('jobId')}: {job.id}</div>
 {job.createdAt && (
 <div>{t('createdLabel')}: {new Date(job.createdAt).toLocaleString()}</div>
 )}
 {job.completedAt && (
 <div>{t('completedLabel')}: {new Date(job.completedAt).toLocaleString()}</div>
 )}
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 </div>
 </PageTransition>
 )
}
