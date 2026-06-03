'use client'

import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useRouter, usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { useHaptics } from '@/hooks/useHaptics'
import { cn } from '@/lib/utils'
import {
 User,
 LogOut,
 Library,
 Plus,
 Compass,
 Home,
 ChevronLeft,
 ChevronRight,
 Tag,
 Package,
 Crown,
 CheckCircle,
} from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Logo from '@/components/Logo'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { ThemeToggle } from '@/components/ThemeToggle'
import NotificationCenter from '@/components/notifications/NotificationCenter'
import { useSubscription } from '@/hooks/useSubscription'
import BottomSheet from '@/components/BottomSheet'
import { Button } from '@/components/ui/button'
import { Capacitor } from '@capacitor/core'
import { useNativeSubscription } from '@/hooks/useNativeSubscription'
import { ProSheetProvider, useProSheet } from '@/context/ProSheetContext'

interface DashboardLayoutProps {
 children: React.ReactNode
}

// Routes that hide the sidebar (full-screen / wizard / immersive flows)
const SIDEBAR_FREE_ROUTES = [
 '/dashboard/create/live-stream',
 '/dashboard/create/picture',
 '/dashboard/create/interactive',
 '/dashboard/create/manual',
 '/dashboard/create/photobook',
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
 return (
 <ProSheetProvider>
 <DashboardLayoutInner>{children}</DashboardLayoutInner>
 </ProSheetProvider>
 )
}

function DashboardLayoutInner({ children }: DashboardLayoutProps) {
 const { user, logout, getIdToken, isLoading: authLoading, isServiceUnavailable } = useAuth()
 const { t, isLoading: langLoading } = useLanguage()
 const router = useRouter()
 const pathname = usePathname()
 const { impact } = useHaptics()
 const { isPro, isLoading: isSubLoading, refresh: refreshSubscription, subscription } = useSubscription()
 const [isHydrated, setIsHydrated] = useState(false)
 const { isOpen: isProSheetOpen, closeProSheet, openProSheet } = useProSheet()
 const [isCheckoutLoading, setIsCheckoutLoading] = useState(false)
 const [proSheetMessage, setProSheetMessage] = useState<string | null>(null)
 const [isRestoring, setIsRestoring] = useState(false)
 const isNativePlatform = Capacitor.isNativePlatform()
 const { subscribe: nativeSubscribe, restorePurchases, isLoading: isIAPLoading, isReady: isIAPReady, error: iapError } = useNativeSubscription()
 // Has the user ever had Pro? (status canceled = they cancelled but had it)
 const hasPreviousProSubscription = !!(subscription && (subscription.plan === 'pro') && subscription.status !== 'none')
 const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
 const [generationSidebarOpen, setGenerationSidebarOpen] = useState(false)

 useEffect(() => {
 setIsHydrated(true)
    // Restore sidebar state from localStorage
 const saved = localStorage.getItem('sidebar-collapsed')
 if (saved !== null) {
 setSidebarCollapsed(saved === 'true')
 }
 }, [])

 const toggleSidebar = () => {
 setSidebarCollapsed(prev => {
 const next = !prev
 localStorage.setItem('sidebar-collapsed', String(next))
 return next
 })
 }

 useEffect(() => {
    // Only redirect if auth has finished loading and there's no user
    // This prevents redirect during initial auth hydration on page reload
 if (isHydrated && !authLoading && !user) {
 if (typeof window !== 'undefined') {
 const { pathname: currentPathname, search, hash } = window.location
 const fullPath = `${currentPathname}${search}${hash}`
 if (fullPath && fullPath !== '/') {
 sessionStorage.setItem('auth_redirect', fullPath)
 }
 }
 router.push('/')
 }
 }, [isHydrated, authLoading, user, router])

 const openProSheetFromTopbar = () => {
 setProSheetMessage(null)
 openProSheet('topbar')
 }

 const handleProSubscribe = async () => {
 setIsCheckoutLoading(true)
 setProSheetMessage(null)
 try {
 if (isNativePlatform) {
 if (!isIAPReady) {
 setProSheetMessage(iapError || 'Der App Store wird noch geladen. Bitte einen Moment warten und erneut versuchen.')
 return
 }
 const result = await nativeSubscribe('pro_monthly')
 if (result.success) {
 await refreshSubscription()
 closeProSheet()
 return
 }
 const err = result.error ?? ''
 if (!err.includes('USER_CANCELED') && !err.toLowerCase().includes('cancel')) {
 setProSheetMessage(err || 'Subscription failed. Please try again.')
 }
 return
 }

 const token = await getIdToken()
 const response = await fetch('/api/stripe/checkout', {
 method: 'POST',
 headers: {
   'Content-Type': 'application/json',
   ...(token ? { Authorization: `Bearer ${token}` } : {}),
 },
 body: JSON.stringify({ type: 'subscription', itemId: 'pro' }),
 })
 const { url, error } = await response.json()
 if (error) {
 setProSheetMessage(error)
 return
 }
 if (url) window.location.href = url
 } catch (error) {
 console.error('Pro checkout error:', error)
 setProSheetMessage('An error occurred. Please try again.')
 } finally {
 setIsCheckoutLoading(false)
 }
 }

 useEffect(() => {
 if (
 pathname.startsWith('/dashboard/jobs/') ||
 pathname.startsWith('/dashboard/books/') ||
 SIDEBAR_FREE_ROUTES.includes(pathname)
 ) {
 setGenerationSidebarOpen(false)
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [pathname])

  // Show service unavailable error when auth backend is not configured
 if (isServiceUnavailable) {
 return (
 <div className="flex items-center justify-center h-screen bg-background">
 <div className="text-center max-w-sm px-6">
 <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3E86D7, #3E86D7)' }}>
 <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
 </svg>
 </div>
 <h1 className="text-xl font-semibold text-foreground mb-2">{t('serviceUnavailable')}</h1>
 <p className="text-muted-foreground text-sm leading-relaxed">
 {t('pleaseTryAgainLater')}
 </p>
 </div>
 </div>
 )
 }

  // Show loading during hydration, auth loading, or language loading
  // This prevents hydration mismatch and flash of unauthenticated state
 if (!isHydrated || authLoading || !user || langLoading) {
 return (
 <div className="flex items-center justify-center h-screen bg-background">
 <div className="text-center">
 <div className="w-12 h-12 rounded-full animate-spin mx-auto mb-4 border-4 border-border border-t-bookcraft-blue"></div>
 <p className="text-muted-foreground text-sm font-medium">Loading...</p>
 </div>
 </div>
 )
 }

 const navItems: Array<{ href: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; comingSoon?: boolean; desktopOnly?: boolean }> = [
 { href: '/dashboard', icon: Home, label: t('home') },
 { href: '/dashboard/books', icon: Library, label: t('library') },
 { href: '/dashboard/create', icon: Plus, label: t('create') },
 { href: '/dashboard/discover', icon: Compass, label: t('discover'), comingSoon: true },
 { href: '/dashboard/orders', icon: Package, label: t('orders'), desktopOnly: true },
 { href: '/pricing', icon: Tag, label: t('pricing'), desktopOnly: true },
 { href: '/dashboard/settings', icon: User, label: t('profile') },
 ]
 const mobileNavItems = navItems.filter(item => !item.desktopOnly)

 const isGenerationPage =
 pathname.startsWith('/dashboard/jobs/') ||
 pathname.startsWith('/dashboard/books/') ||
 SIDEBAR_FREE_ROUTES.includes(pathname)

 const hideMobileBottomBar =
 pathname.startsWith('/dashboard/books/') ||
 pathname.startsWith('/dashboard/jobs/') ||
 pathname.startsWith('/dashboard/create/')

 const isActive = (href: string) => {
 if (href === '/dashboard') {
 return pathname === '/dashboard'
 }
 return pathname.startsWith(href)
 }

 const showMobileTopBar =
 pathname === '/dashboard' ||
 pathname.startsWith('/dashboard/books') ||
 pathname.startsWith('/dashboard/settings')

 const mobileTitle =
 pathname === '/dashboard' ? t('home') :
 pathname.startsWith('/dashboard/books') ? t('library') :
 pathname.startsWith('/dashboard/settings') ? t('profile') :
 'Bookcraft'

 return (
 <div className="flex h-screen bg-background overflow-hidden">
 {/* ─── Sidebar: Tablet (md) + Desktop (lg) ─── */}
 {/* ─── Generation Page Floating Sidebar Toggle ─── */}
 {isGenerationPage && (
 <button
 onClick={() => setGenerationSidebarOpen(prev => !prev)}
 className="fixed left-0 top-1/2 -translate-y-1/2 z-[55] w-6 h-10 rounded-r-full bg-background/80 backdrop-blur border border-l-0 border-border hidden md:flex items-center justify-center shadow-sm hover:bg-muted transition-colors"
 title={generationSidebarOpen ? 'Sidebar einklappen' : 'Sidebar ausklappen'}
 >
 {generationSidebarOpen
 ? <ChevronLeft className="w-3 h-3 text-muted-foreground" />
 : <ChevronRight className="w-3 h-3 text-muted-foreground" />
 }
 </button>
 )}

 {/* Overlay backdrop when sidebar opens on generation pages */}
 {isGenerationPage && generationSidebarOpen && (
 <div
 className="fixed inset-0 z-[58] bg-black/40 backdrop-blur-sm md:block hidden"
 onClick={() => setGenerationSidebarOpen(false)}
 />
 )}

 <aside className={cn(
 "flex-col flex-shrink-0 border-r border-border bg-background backdrop-blur-xl transition-all duration-300",
 isGenerationPage
 ? generationSidebarOpen
 ? "fixed left-0 top-0 h-full z-[60] flex w-64 shadow-2xl"
 : "hidden"
 : "hidden md:flex relative z-40 " + (sidebarCollapsed ? "w-20" : "w-20 lg:w-64")
 )}>

 {/* Logo */}
 <div className="flex items-center h-16 px-4 border-b border-border flex-shrink-0">
 <Logo
 href="/dashboard"
 size="md"
 className={sidebarCollapsed ? "flex" : "lg:hidden"}
 />
 <Logo
 href="/dashboard"
 size="md"
 className={sidebarCollapsed ? "hidden" : "hidden lg:flex"}
 />
 </div>

 {/* Toggle Button */}
 <button
 onClick={toggleSidebar}
 className="absolute -right-3 top-20 z-50 hidden lg:flex w-6 h-6 rounded-full border border-border bg-background items-center justify-center shadow-sm hover:bg-muted transition-colors"
 title={sidebarCollapsed ? "Sidebar ausklappen" : "Sidebar einklappen"}
 >
 {sidebarCollapsed
 ? <ChevronRight className="w-3 h-3 text-muted-foreground" />
 : <ChevronLeft className="w-3 h-3 text-muted-foreground" />
 }
 </button>

 {/* Nav Items */}
 <nav className="flex flex-col gap-1 p-3 flex-1">
 {navItems.map((item) => {
 const active = isActive(item.href)
 const isCreateButton = item.href === '/dashboard/create'
 const isComingSoon = item.comingSoon

 const itemContent = (
 <>
 {isCreateButton ? (
 <div className={cn(
 'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200',
 'bg-gradient-to-br from-[#3E86D7] to-[#3E86D7] shadow-md shadow-bookcraft-blue/25'
 )}>
 <item.icon className="h-5 w-5 text-white" strokeWidth={2.5} />
 </div>
 ) : (
 <div className={cn(
 'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200',
 active ? 'bg-primary/15' : isComingSoon ? '' : 'group-hover:bg-muted'
 )}>
 <item.icon
 className="h-5 w-5"
 strokeWidth={active ? 2.5 : 2}
 />
 </div>
 )}
 {/* Label: hidden when collapsed */}
 {!sidebarCollapsed && (
 <span className="hidden lg:block font-medium text-sm truncate">
 {item.label}
 </span>
 )}
 {/* Coming Soon badge (desktop only, not collapsed) */}
 {isComingSoon && !sidebarCollapsed && (
 <span className="hidden lg:block ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground/70">
 {t('pdfComingSoon')}
 </span>
 )}
 {/* Active indicator bar */}
 {active && (
 <motion.div
 layoutId="sidebarIndicator"
 className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-gradient-to-b from-[#3E86D7] to-[#3E86D7]"
 initial={false}
 transition={{ type: 'spring', stiffness: 500, damping: 35 }}
 />
 )}
 </>
 )

 if (isComingSoon) {
 return (
 <div
 key={item.href}
 className="flex items-center gap-3 px-3 py-2.5 rounded-xl opacity-40 cursor-not-allowed relative"
 >
 {itemContent}
 </div>
 )
 }

 return (
 <Link
 key={item.href}
 href={item.href}
 onClick={() => impact(isCreateButton ? 'medium' : 'light')}
 className={cn(
 'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
 active
 ? 'bg-primary/10 text-primary'
 : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
 )}
 >
 {itemContent}
 </Link>
 )
 })}
 </nav>

 {/* Bottom: Notifications, Theme, Language, User, Logout */}
 <div className="flex flex-col gap-2 p-3 border-t border-border flex-shrink-0">
 {/* Notification Bell */}
 <div className={cn('flex items-center', sidebarCollapsed ? 'justify-center' : 'justify-center lg:justify-start lg:px-2')}>
 <NotificationCenter />
 </div>

 {/* Theme + Language row (desktop only, not collapsed) */}
 {!sidebarCollapsed && (
 <div className="hidden lg:flex items-center gap-2 px-1">
 <ThemeToggle />
 <LanguageSwitcher />
 </div>
 )}

 {/* User info (desktop only, not collapsed) */}
 {!sidebarCollapsed && (
 <div className="hidden lg:flex items-center gap-2 px-2 py-1.5 rounded-xl bg-muted/50">
 <div className="w-7 h-7 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
 <User className="h-3.5 w-3.5 text-muted-foreground" />
 </div>
 <span className="text-xs font-medium truncate text-foreground flex-1">
 {user.name || user.email}
 </span>
 </div>
 )}

 {/* Logout button */}
 <button
 onClick={() => {
 impact('medium')
 logout()
 router.push('/')
 }}
 className={cn(
 'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
 )}
 >
 <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
 <LogOut className="h-5 w-5" />
 </div>
 {!sidebarCollapsed && (
 <span className="hidden lg:block font-medium text-sm">{t('logout')}</span>
 )}
 </button>
 </div>
 </aside>

 {/* ─── Mobile Top Bar: Selected pages only (< md) ─── */}
 {showMobileTopBar && (
   <header
     className="md:hidden fixed top-0 left-0 right-0 z-[99] bg-background/95 backdrop-blur-xl border-b border-border"
     style={{ paddingTop: 'env(safe-area-inset-top)' }}
   >
     <div className="grid h-16 grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2 px-3">
       <div className="flex items-center justify-start min-w-0">
         <Logo href="/dashboard" size="md" className="shrink-0" />
       </div>

       <div className="flex items-center justify-center min-w-0 px-2">
         <div className="text-sm font-semibold text-foreground truncate text-center max-w-full">{mobileTitle}</div>
       </div>

       <div className="flex items-center justify-end gap-1.5 min-w-0 max-w-[46vw]">
         {!isSubLoading && (
           isPro ? (
             <Link
               href="/dashboard/billing"
               onClick={() => impact('light')}
               className="inline-flex items-center gap-1 px-2.5 py-2 rounded-full bg-gradient-to-r from-bookcraft-blue/10 to-bookcraft-blue/10 border border-bookcraft-blue/20 text-foreground shrink-0 max-w-full"
             >
               <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
               <span className="text-[11px] font-semibold whitespace-nowrap truncate">Pro</span>
             </Link>
           ) : (
             <Link
               href="/dashboard/billing"
               onClick={(e) => {
                 e.preventDefault()
                 impact('light')
                 openProSheetFromTopbar()
               }}
               className="inline-flex items-center gap-1 px-2.5 py-2 rounded-full bg-gradient-to-r from-bookcraft-blue/10 to-bookcraft-blue/10 border border-bookcraft-blue/30 text-bookcraft-blue hover:opacity-90 transition-opacity shrink-0 max-w-full"
             >
               <Crown className="w-4 h-4 shrink-0" />
               <span className="text-[11px] font-semibold whitespace-nowrap truncate">{t('proSheetBecomePro')}</span>
             </Link>
           )
         )}

         <div className="shrink-0">
           <NotificationCenter placement="topbar" />
         </div>
       </div>
     </div>
   </header>
 )}

 <BottomSheet
   isOpen={isProSheetOpen}
   onClose={() => closeProSheet()}
   maxHeight={92}
 >
   <div className="p-5 pb-8 space-y-5">

     {/* Crown Header with shimmer animation */}
     <div>
       <div className="inline-flex items-center gap-1.5 bg-bookcraft-blue/10 border border-bookcraft-blue/20 text-bookcraft-blue rounded-full px-3 py-1 mb-3 relative overflow-hidden">
         <Crown className="w-3.5 h-3.5 animate-pulse" />
         <span className="text-xs font-semibold">Pro</span>
         <span className="absolute inset-0 translate-x-[-100%] animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
       </div>

       {hasPreviousProSubscription ? (
         <>
           <h2 className="text-2xl font-bold font-display text-foreground leading-tight mb-1">
             {t('proSheetTitleReturning')}
           </h2>
           <p className="text-sm text-muted-foreground">
             {t('proSheetSubtitleReturning')}
           </p>
         </>
       ) : (
         <>
           <h2 className="text-2xl font-bold font-display text-foreground leading-tight mb-1">
             {t('proSheetTitle')}
           </h2>
           <p className="text-sm text-muted-foreground">
             {t('proSheetSubtitle')}
           </p>
         </>
       )}
     </div>

     {/* Free vs Pro comparison */}
     <div className="rounded-2xl border border-border overflow-hidden">
       <div className="grid grid-cols-2">
         <div className="p-3 bg-muted/40 border-r border-border">
           <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{t('proSheetFreeCol')}</p>
           <div className="space-y-1.5">
             {[
               t('proSheetFree1'),
               t('proSheetFree2'),
               t('proSheetFree3'),
             ].map(item => (
               <div key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                 <span className="text-muted-foreground/60">&mdash;</span>
                 <span>{item}</span>
               </div>
             ))}
           </div>
         </div>
         <div className="p-3 bg-bookcraft-blue/5">
           <p className="text-xs font-semibold text-bookcraft-blue mb-2 uppercase tracking-wide">{t('proSheetProCol')}</p>
           <div className="space-y-1.5">
             {[
               t('proSheetPro1'),
               t('proSheetPro2'),
               t('proSheetPro3'),
             ].map(item => (
               <div key={item} className="flex items-center gap-1.5 text-xs text-foreground">
                 <CheckCircle className="w-3 h-3 text-green-600 shrink-0" />
                 <span>{item}</span>
               </div>
             ))}
           </div>
         </div>
       </div>
     </div>

     {/* Full benefit list */}
     <div className="space-y-3">
       {[
         { label: t('proSheetBenefit1Label'), sub: t('proSheetBenefit1Sub') },
         { label: t('proSheetBenefit2Label'), sub: t('proSheetBenefit2Sub') },
         { label: t('proSheetBenefit3Label'), sub: t('proSheetBenefit3Sub') },
         { label: t('proSheetBenefit4Label'), sub: t('proSheetBenefit4Sub') },
       ].map((item) => (
         <div key={item.label} className="flex items-start gap-3">
           <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mt-0.5 shrink-0">
             <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
           </div>
           <div>
             <p className="text-sm font-semibold text-foreground">{item.label}</p>
             <p className="text-xs text-muted-foreground">{item.sub}</p>
           </div>
         </div>
       ))}
     </div>

     {/* Error */}
     {proSheetMessage && !proSheetMessage.includes('not ready') && (
       <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
         {proSheetMessage}
       </div>
     )}

     {/* CTA */}
     <div className="space-y-2">
       <Button
         onClick={handleProSubscribe}
         disabled={isCheckoutLoading || isIAPLoading || isRestoring}
         className="w-full h-14 rounded-2xl bg-bookcraft-blue hover:brightness-110 text-white text-base font-semibold"
       >
         {isCheckoutLoading || isIAPLoading
           ? t('proSheetCtaLoading')
           : isNativePlatform && !isIAPReady
             ? t('proSheetCtaStoreInit')
             : hasPreviousProSubscription
               ? t('proSheetCtaReturning')
               : t('proSheetCta')}
       </Button>

       {/* Restore purchases (native only) */}
       {isNativePlatform && (
         <button
           onClick={async () => {
             setIsRestoring(true)
             setProSheetMessage(null)
             try {
               const result = await restorePurchases()
               if (result.success && result.plan) {
                 impact('heavy')
                 await refreshSubscription()
                 closeProSheet()
               } else {
                 setProSheetMessage(result.error ?? t('proSheetRestoreNone'))
               }
             } finally {
               setIsRestoring(false)
             }
           }}
           disabled={isRestoring || isCheckoutLoading}
           className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
         >
           {isRestoring ? t('proSheetRestoring') : t('proSheetRestore')}
         </button>
       )}

       <p className="text-center text-xs text-muted-foreground">
         {hasPreviousProSubscription
           ? t('proSheetFooterReturning')
           : t('proSheetFooter')}
       </p>
     </div>
   </div>
 </BottomSheet>

 {/* ─── Main Content Area ─── */}
 <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
   <main
     className={cn(
       "flex-1 w-full overflow-y-auto md:pb-0",
       !hideMobileBottomBar && "pb-20",
       showMobileTopBar && "pt-[calc(4rem+env(safe-area-inset-top))] md:pt-0"
     )}
     style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehavior: 'contain' }}
   >
    {children}
 </main>
 </div>

 {/* ─── Bottom Tab Bar: Mobile only (< md / < 768px) ─── */}
 <nav className={cn("md:hidden fixed bottom-0 left-0 right-0 z-[100] backdrop-blur-xl bg-background/95 border-t border-border flex-shrink-0", hideMobileBottomBar && "hidden")}>
 <div className="flex items-center justify-around h-16 px-2 pb-[env(safe-area-inset-bottom)]">
 {mobileNavItems.map((item) => {
 const active = isActive(item.href)
 const isCreateButton = item.href === '/dashboard/create'
 const isComingSoon = item.comingSoon

 if (isComingSoon) {
 return (
 <div
 key={item.href}
 className="flex flex-col items-center justify-center flex-1 h-full relative opacity-35 cursor-not-allowed"
 >
 <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-0.5">
 <item.icon className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
 </div>
 <span className="text-[10px] font-semibold text-muted-foreground">
 {item.label}
 </span>
 <span className="text-[8px] font-semibold text-muted-foreground/70 leading-tight">{t('pdfComingSoon')}</span>
 </div>
 )
 }

 if (isCreateButton) {
 return (
 <Link
 key={item.href}
 href={item.href}
 onClick={() => impact('medium')}
 className="flex flex-col items-center justify-center flex-1 h-full relative"
 >
 <motion.div
 whileTap={{ scale: 0.85 }}
 className="w-11 h-11 -mt-2 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br from-[#3E86D7] to-[#3E86D7] shadow-bookcraft-blue/25"
 >
 <item.icon className="h-6 w-6 text-white" strokeWidth={2.5} />
 </motion.div>
 <span className={cn(
 "text-[10px] font-semibold transition-all duration-200 mt-0.5",
 active ? "text-primary" : "text-muted-foreground"
 )}>
 {item.label}
 </span>
 {active && (
 <motion.div
 layoutId="bottomNavIndicator"
 className="absolute bottom-0 w-5 h-1 rounded-full bg-gradient-to-r from-[#3E86D7] to-[#3E86D7]"
 initial={false}
 transition={{ type: 'spring', stiffness: 500, damping: 35 }}
 />
 )}
 </Link>
 )
 }

 return (
 <Link
 key={item.href}
 href={item.href}
 onClick={() => impact('light')}
 className="flex flex-col items-center justify-center flex-1 h-full relative"
 >
 <motion.div
 whileTap={{ scale: 0.85 }}
 className={cn(
 "w-10 h-10 rounded-xl flex items-center justify-center mb-0.5 transition-all duration-200",
 active ? "bg-primary/10" : ""
 )}
 >
 <item.icon
 className={cn(
 "w-5 h-5 transition-all duration-200",
 active ? "text-primary" : "text-muted-foreground"
 )}
 strokeWidth={active ? 2.5 : 2}
 />
 </motion.div>
 <span className={cn(
 "text-[10px] font-semibold transition-all duration-200",
 active ? "text-primary" : "text-muted-foreground"
 )}>
 {item.label}
 </span>
 {active && (
 <motion.div
 layoutId="bottomNavIndicator"
 className="absolute bottom-0 w-5 h-1 rounded-full bg-gradient-to-r from-[#3E86D7] to-[#3E86D7]"
 initial={false}
 transition={{ type: 'spring', stiffness: 500, damping: 35 }}
 />
 )}
 </Link>
 )
 })}
 </div>
 </nav>
 </div>
 )
}
