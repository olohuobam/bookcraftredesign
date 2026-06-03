'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import PDFViewer from '@/components/PDFViewer'
import DashboardLayout from '@/components/DashboardLayout'
import { AppBar } from '@/components/AppBar'
import PageTransition from '@/components/PageTransition'

export default function PDFViewerPage() {
 const params = useParams()
 const searchParams = useSearchParams()
 const router = useRouter()
 const { user, getIdToken } = useAuth()
 const { t } = useLanguage()
 const [bookTitle, setBookTitle] = useState<string>('Book')

 const bookId = params.id as string
 const type = (searchParams.get('type') as 'cover' | 'interior') || 'interior'

 useEffect(() => {
    // Fetch book title for display
 const fetchBookTitle = async () => {
 try {
 const token = await getIdToken()
 const response = await fetch(`/api/books/${bookId}`, {
 headers: {
 'Authorization': `Bearer ${token}`
 }
 })
 if (response.ok) {
 const book = await response.json()
 setBookTitle(book.title || 'Book')
 }
 } catch (error) {
        console.error('Error fetching book title:', error)
 }
 }

 if (user && bookId) {
 fetchBookTitle()
 }
 }, [user, bookId, getIdToken])

 const handleGoBack = () => {
 router.back()
 }

 if (!user) {
 return (
 <DashboardLayout>
 <div className="text-center py-8">
 <p>{t('loginToViewPdf') || 'Please log in to view PDFs.'}</p>
 </div>
 </DashboardLayout>
 )
 }

 const subtitle = type === 'cover'
 ? (t('coverPreview') || 'Cover Preview')
 : (t('interiorPreview') || 'Interior Preview')

 return (
 <DashboardLayout>
 <PageTransition direction="forward">
 <div className="pb-32 lg:pb-8">
 {/* Mobile App Bar */}
 <div className="lg:hidden">
 <AppBar
 title={bookTitle}
 subtitle={subtitle}
 showBack
 onBack={handleGoBack}
 />
 </div>

 <div className="container mx-auto px-4 py-6 max-w-7xl">
 {/* Desktop Header — show back button only on desktop */}
 <div className="hidden lg:flex lg:items-center lg:gap-4 mb-4">
 <button
 onClick={handleGoBack}
 className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
 >
 ← {t('backToEditor') || 'Back to Editor'}
 </button>
 <span className="text-muted-foreground/50">|</span>
 <h1 className="text-lg font-semibold text-foreground">{bookTitle} — {subtitle}</h1>
 </div>

 <PDFViewer
 bookId={bookId}
 bookTitle={bookTitle}
 type={type}
 onClose={handleGoBack}
 />
 </div>
 </div>
 </PageTransition>
 </DashboardLayout>
 )
}
