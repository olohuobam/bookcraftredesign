'use client'

import { useState, useEffect, startTransition } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'
import { X, Cookie, ChevronUp } from 'lucide-react'
import { Capacitor } from '@capacitor/core'

export default function CookieBanner() {
 const { language, isLoading, t: tr } = useLanguage()
 const [showBanner, setShowBanner] = useState<boolean | null>(null)
 const [isDismissing, setIsDismissing] = useState(false)

 const copy = {
 en: {
 text: 'We use cookies to enhance your experience and analyze our traffic.',
 learnMore: 'Learn more',
 decline: 'Decline',
 accept: 'Accept All',
 essential: 'Accept Essential',
 },
 de: {
 text: 'Wir verwenden Cookies, um Ihre Erfahrung zu verbessern und unseren Traffic zu analysieren.',
 learnMore: 'Mehr erfahren',
 decline: 'Ablehnen',
 accept: 'Alle akzeptieren',
 essential: 'Notwendige akzeptieren',
 },
 es: {
 text: 'Usamos cookies para mejorar tu experiencia y analizar nuestro tráfico.',
 learnMore: 'Saber más',
 decline: 'Rechazar',
 accept: 'Aceptar todo',
 essential: 'Aceptar esenciales',
 },
 }

 const t = copy[language] ?? copy.en

 useEffect(() => {
    if (typeof window !== 'undefined') {
      if (Capacitor.isNativePlatform()) {
        startTransition(() => { setShowBanner(false) })
        return
      }
      const consent = localStorage.getItem('cookie-consent')
      startTransition(() => { setShowBanner(!consent) })
    }
  }, [])

 const acceptCookies = () => {
 try {
 if (typeof window !== 'undefined' && window.localStorage) {
 window.localStorage.setItem('cookie-consent', 'accepted')
 }
 } catch (error) {
      console.error('Failed to persist cookie consent (accepted):', error)
 }
 dismissBanner()
 }

 const acceptEssential = () => {
 try {
 if (typeof window !== 'undefined' && window.localStorage) {
 window.localStorage.setItem('cookie-consent', 'essential')
 }
 } catch (error) {
      console.error('Failed to persist cookie consent (essential):', error)
 }
 dismissBanner()
 }

 const declineCookies = () => {
 try {
 if (typeof window !== 'undefined' && window.localStorage) {
 window.localStorage.setItem('cookie-consent', 'declined')
 }
 } catch (error) {
      console.error('Failed to persist cookie consent (declined):', error)
 }
 dismissBanner()
 }

 const dismissBanner = () => {
 setIsDismissing(true)
 setTimeout(() => {
 startTransition(() => {
 setShowBanner(false)
 setIsDismissing(false)
 })
 }, 300)
 }

  // Wait for language and localStorage to load
 if (isLoading || showBanner === null || !showBanner) return null

 return (
 <>
 {/* Backdrop */}
 <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-40" onClick={dismissBanner} />
 
 {/* Cookie Banner */}
 <div className={`fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300 ease-out ${
 isDismissing ? 'translate-y-full' : 'translate-y-0'
 }`}>
 <div className="mx-4 mb-4 safe-area-bottom">
 <div className="bg-background/95 backdrop-blur-xl border border-border rounded-3xl shadow-2xl overflow-hidden">
 {/* Swipe Indicator */}
 <div className="flex justify-center py-2">
 <div className="w-12 h-1.5 bg-muted rounded-full" />
 </div>
 
 <div className="px-6 pb-6">
 {/* Header */}
 <div className="flex items-start justify-between mb-4">
 <div className="flex items-center space-x-3">
 <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
 <Cookie className="h-5 w-5 text-bookcraft-blue dark:text-bookcraft-blue/80" />
 </div>
 <div>
 <h3 className="font-semibold text-foreground text-base">{tr('cookieSettings')}</h3>
 <p className="text-sm text-muted-foreground">{tr('customizeExperience')}</p>
 </div>
 </div>
 <button
 onClick={dismissBanner}
 className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center touch-target"
 >
 <X className="h-4 w-4 text-muted-foreground" />
 </button>
 </div>

 {/* Content */}
 <div className="mb-6">
 <p className="text-sm text-muted-foreground leading-relaxed mb-3">
 {t.text}
 </p>
 <Link 
 href="/privacy" 
 className="text-sm text-bookcraft-blue dark:text-bookcraft-blue/80 font-medium hover:underline touch-target inline-flex items-center"
 >
 {t.learnMore}
 <ChevronUp className="h-3 w-3 ml-1 rotate-90" />
 </Link>
 </div>

 {/* Action Buttons */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <button
 onClick={declineCookies}
 className="px-4 py-3 text-sm font-medium text-muted-foreground bg-muted hover:bg-muted/80 rounded-xl transition-colors touch-target"
 >
 {t.decline}
 </button>
 <button
 onClick={acceptEssential}
 className="px-4 py-3 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-xl transition-colors touch-target"
 >
 {t.essential}
 </button>
 <button
 onClick={acceptCookies}
 className="px-4 py-3 text-sm font-medium text-white bg-bookcraft-blue hover:brightness-110 rounded-xl transition-colors touch-target"
 >
 {t.accept}
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 </>
 )
}
