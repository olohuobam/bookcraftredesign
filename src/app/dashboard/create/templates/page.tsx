'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import BookTemplateSelector from '@/components/BookTemplateSelector'
import { useLanguage } from '@/context/LanguageContext'
import { AppBar } from '@/components/AppBar'
import PageTransition from '@/components/PageTransition'

export default function TemplatesPage() {
 const router = useRouter()
 const { t } = useLanguage()

 return (
 <PageTransition direction="up">
 <div className="min-h-[60vh] bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 dark:from-blue-950 dark:via-blue-950 dark:to-blue-950 pb-32 lg:pb-8">
 {/* Mobile App Bar */}
 <div className="lg:hidden">
 <AppBar
 title={t('templates')}
 subtitle={t('startWithTemplate')}
 showBack
 onBack={() => router.replace('/dashboard/create')}
 />
 </div>

 <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
 <div className="max-w-7xl mx-auto">
 {/* Desktop Header */}
 <div className="hidden lg:flex items-center gap-4 mb-6">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => router.replace('/dashboard/create')}
 >
 <ArrowLeft className="h-4 w-4 mr-2" />
 {t('back')}
 </Button>
 </div>

 {/* Template Selector */}
 <BookTemplateSelector showAsPage />
 </div>
 </div>
 </div>
 </PageTransition>
 )
}
