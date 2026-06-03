'use client'

import { useLanguage } from '@/context/LanguageContext'
import { Images, BookOpen, ArrowRight, Upload, FileText, Camera, Layout, Mic, type LucideIcon } from 'lucide-react'
import { AppBar } from '@/components/AppBar'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function CreateBookPage() {
 const { t, isLoading } = useLanguage()

 if (isLoading) {
 return (
 <div className="flex items-center justify-center h-full min-h-[60vh]">
 <div className="w-10 h-10 rounded-full animate-spin border-4 border-border border-t-bookcraft-blue" />
 </div>
 )
 }

 const primaryCards: Array<{
 href?: string
 icon: LucideIcon
 color: string
 title: string
 description: string
 comingSoon?: boolean
 }> = [
 {
 href: '/dashboard/create/live-stream',
 icon: BookOpen,
 color: 'blue',
 title: t('liveGenerationTitle') || 'Text Book',
 description: t('liveGenerationDescription') || 'AI writes your book chapter by chapter',
 },
 {
 href: '/dashboard/create/picture',
 icon: Images,
 color: 'indigo',
 title: t('pictureBookTitle') || 'Picture Book',
 description: t('pictureBookDescription') || 'AI-generated illustrations and story',
 },
 {
 href: '/dashboard/create/photobook',
 icon: Camera,
 color: 'rose',
 title: t('photobookTitle') || 'Photo Book',
 description: t('photobookDescription') || 'Upload photos, AI arranges them',
 },
 {
 href: '/dashboard/create/templates',
 icon: Layout,
 color: 'blue',
 title: 'Templates',
 description: 'Start from a pre-designed template',
 },
 {
 icon: Mic,
 color: 'purple',
 title: 'Interactive Book',
 description: 'Co-create your story with AI',
 comingSoon: true,
 },
 ]

 const colorMap: Record<string, { bg: string; icon: string }> = {
 blue: { bg: 'bg-gradient-to-br from-blue-500 to-cyan-500', icon: 'text-white' },
 indigo: { bg: 'bg-gradient-to-br from-blue-500 to-blue-500', icon: 'text-white' },
 purple: { bg: 'bg-gradient-to-br from-blue-500 to-pink-500', icon: 'text-white' },
 rose: { bg: 'bg-gradient-to-br from-rose-500 to-orange-400', icon: 'text-white' },
 }

 return (
 <div className="min-h-[60vh]">
 {/* App Bar */}
 <div className="lg:hidden">
 <AppBar title={t('createBookTitle') || 'Create Book'} showBack />
 </div>
 <div className="hidden lg:block border-b border-border px-6 py-5">
 <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">{t('createBookTitle') || 'Create Book'}</h1>
 <p className="text-sm text-muted-foreground mt-0.5">{t('chooseHowToCreate') || 'Choose your book type'}</p>
 </div>

 <div className="px-4 sm:px-6 py-8 max-w-2xl mx-auto space-y-6">
 {/* Primary Cards — 2x2 Grid */}
 <div className="grid grid-cols-2 gap-3">
 {primaryCards.map((card, index) => {
 const Icon = card.icon
 const colors = colorMap[card.color]

 const cardContent = (
 <motion.div
 whileHover={card.comingSoon ? {} : { scale: 1.02 }}
 whileTap={card.comingSoon ? {} : { scale: 0.96 }}
 className={`relative flex flex-col items-center text-center gap-3 p-5 sm:p-6 bg-card rounded-2xl border border-border shadow-sm transition-all aspect-square justify-center ${
 card.comingSoon
 ? 'opacity-50 cursor-not-allowed'
 : 'hover:border-bookcraft-blue/30 hover:shadow-lg hover:shadow-bookcraft-blue/5'
 }`}
 >
 {card.comingSoon && (
 <span className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
 {t('availableSoon')}
 </span>
 )}
 <div className={`w-14 h-14 rounded-2xl ${colors.bg} flex items-center justify-center`}>
 <Icon className={`h-7 w-7 ${colors.icon}`} />
 </div>
 <div>
 <h3 className="text-base font-semibold text-foreground">{card.title}</h3>
 <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{card.description}</p>
 </div>
 </motion.div>
 )

 if (card.comingSoon) {
 return <div key={index}>{cardContent}</div>
 }

 return (
 <Link key={card.href} href={card.href!} className="block">
 {cardContent}
 </Link>
 )
 })}
 </div>

 {/* Divider */}
 <div className="flex items-center gap-3">
 <div className="flex-1 h-px bg-border" />
 <span className="text-xs text-muted-foreground font-medium">{'More options'}</span>
 <div className="flex-1 h-px bg-border" />
 </div>

 {/* Secondary Options */}
 <div className="space-y-2">
 {/* Write Manually */}
 <Link href="/dashboard/create/manual" className="block">
 <motion.div
 whileHover={{ scale: 1.01 }}
 whileTap={{ scale: 0.97 }}
 className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-muted-foreground/20 shadow-sm hover:shadow transition-all"
 >
 <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
 <FileText className="h-5 w-5 text-muted-foreground" />
 </div>
 <div className="flex-1 min-w-0">
 <h3 className="text-sm font-medium text-foreground">{t('manualEditor') || 'Write Manually'}</h3>
 <p className="text-xs text-muted-foreground">{t('writeBookYourself') || 'Start from scratch'}</p>
 </div>
 <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
 </motion.div>
 </Link>

 {/* Import */}
 <Link href="/dashboard/create/manual?import=true" className="block">
 <motion.div
 whileHover={{ scale: 1.01 }}
 whileTap={{ scale: 0.97 }}
 className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-muted-foreground/20 shadow-sm hover:shadow transition-all"
 >
 <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
 <Upload className="h-5 w-5 text-muted-foreground" />
 </div>
 <div className="flex-1 min-w-0">
 <h3 className="text-sm font-medium text-foreground">{'Import Book'}</h3>
 <p className="text-xs text-muted-foreground">{'Upload an existing document'}</p>
 </div>
 <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
 </motion.div>
 </Link>
 </div>
 </div>

 <div className="h-24 lg:h-8" />
 </div>
 )
}
