'use client'

import { useEffect, useState, startTransition } from 'react'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '@/context/AuthContext'
import AppOnboarding from '@/components/AppOnboarding'
import AppLoginScreen from '@/components/AppLoginScreen'
import LandingPage from '@/components/LandingPage'
import { useRouter } from 'next/navigation'
import { AuthModalProvider } from '@/context/AuthModalContext'
import { useLanguage } from '@/context/LanguageContext'

export default function Home() {
 const { t } = useLanguage()
 const [isNative, setIsNative] = useState(false)
 const [onboardingDone, setOnboardingDone] = useState(false)
 const [mounted, setMounted] = useState(false)
 const { user, isLoading: authLoading } = useAuth()
 const router = useRouter()

 useEffect(() => {
 startTransition(() => {
 setMounted(true)
 setIsNative(Capacitor.isNativePlatform())
 setOnboardingDone(localStorage.getItem('onboarding_complete') === 'true')
 })
 }, [])

  // Redirect logged-in native users to dashboard
 useEffect(() => {
 if (!mounted || !isNative) return
 if (user) {
 router.replace('/dashboard')
 }
 }, [mounted, isNative, user, router])

 if (!mounted) return null

  // While auth is resolving on native, show a neutral splash to prevent login screen flash
  // Scope to native only — web landing page should render immediately without waiting for auth
 if (authLoading && isNative) {
 return (
 <div
 className="flex items-center justify-center min-h-screen bg-background"
 role="status"
 aria-live="polite"
 aria-label={t('loading')}
 >
 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-bookcraft-blue" />
 <span className="sr-only">{t('loading')}</span>
 </div>
 )
 }

  // ---- NATIVE APP LOGIC ----
 if (isNative) {
    // Already logged in → redirect (handled by useEffect above), show nothing
 if (user) return null

    // First launch → show onboarding
 if (!onboardingDone) {
 return (
 <AppOnboarding
 onComplete={(action) => {
 localStorage.setItem('onboarding_complete', 'true')
 setOnboardingDone(true)
            // AppLoginScreen handles login/register from here;
            // action could be used to pre-select tab if needed
 }}
 />
 )
 }

    // Returning user, not logged in → login screen
 return <AppLoginScreen />
 }

  // ---- WEB: render existing landing page unchanged ----
 return <LandingPage />
}
