'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState, useCallback, useRef, startTransition } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

interface ThemeToggleProps {
 variant?: 'icon' | 'dropdown' | 'pills'
 className?: string
}

export function ThemeToggle({ variant = 'icon', className = '' }: ThemeToggleProps) {
 const { t } = useLanguage()
 const { theme, setTheme, resolvedTheme } = useTheme()
 const [mounted, setMounted] = useState(false)
 const [isAnimating, setIsAnimating] = useState(false)
 const toggleRef = useRef<HTMLButtonElement>(null)

 useEffect(() => {
 startTransition(() => {
 setMounted(true)
 })
 }, [])

  /**
   * Trigger a circular reveal animation using the View Transitions API.
   * Falls back to the existing smooth CSS transition for older browsers.
   */
 const handleThemeChangeWithReveal = useCallback((newTheme: string, event?: React.MouseEvent) => {
    // Prevent double-clicks during animation
 if (isAnimating) return

    // Determine the origin point for the circular reveal
 let x: number
 let y: number

 if (event) {
      // Use the click position directly
 x = event.clientX
 y = event.clientY
 } else if (toggleRef.current) {
      // Fallback: center of the toggle button
 const rect = toggleRef.current.getBoundingClientRect()
 x = rect.left + rect.width / 2
 y = rect.top + rect.height / 2
 } else {
      // Last resort: top-right corner
 x = window.innerWidth - 40
 y = 40
 }

    // Check if View Transitions API is supported
 if (!document.startViewTransition) {
      // Fallback: smooth CSS transition (existing behavior from PR #121)
 document.documentElement.classList.add('transitioning')
 setIsAnimating(true)
 setTheme(newTheme)
 setTimeout(() => {
 document.documentElement.classList.remove('transitioning')
 setIsAnimating(false)
 }, 500)
 return
 }

    // Set CSS custom properties for the clip-path origin
 document.documentElement.style.setProperty('--theme-toggle-x', `${x}px`)
 document.documentElement.style.setProperty('--theme-toggle-y', `${y}px`)

 setIsAnimating(true)

 const transition = document.startViewTransition(() => {
 setTheme(newTheme)
 })

 transition.finished.then(() => {
 setIsAnimating(false)
 }).catch(() => {
 setIsAnimating(false)
 })
 }, [setTheme, isAnimating])

  // Keep the non-reveal version for pills/dropdown (no event needed)
 const handleThemeChange = useCallback((newTheme: string) => {
 handleThemeChangeWithReveal(newTheme)
 }, [handleThemeChangeWithReveal])

 if (!mounted) {
 return (
 <button
 className={`p-2.5 min-w-[44px] min-h-[44px] rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center ${className}`}
 aria-label={t('loading')}
 >
 <div className="w-5 h-5" />
 </button>
 )
 }

 if (variant === 'pills') {
 return (
 <div className={`inline-flex rounded-lg bg-muted p-1 ${className}`}>
 <button
 onClick={() => handleThemeChange('light')}
 className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-md text-sm font-medium transition-all duration-300 ${
 theme === 'light'
 ? 'bg-background text-foreground shadow-sm'
 : 'text-muted-foreground hover:text-foreground'
 }`}
 aria-label={t('lightTheme')}
 >
 <Sun className={`w-4 h-4 transition-transform duration-300 ${theme === 'light' ? 'rotate-0 scale-100' : 'rotate-90 scale-75'}`} />
 <span className="hidden sm:inline">{t('themeLight')}</span>
 </button>
 <button
 onClick={() => handleThemeChange('dark')}
 className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-md text-sm font-medium transition-all duration-300 ${
 theme === 'dark'
 ? 'bg-background text-foreground shadow-sm'
 : 'text-muted-foreground hover:text-foreground'
 }`}
 aria-label={t('darkTheme')}
 >
 <Moon className={`w-4 h-4 transition-transform duration-300 ${theme === 'dark' ? 'rotate-0 scale-100' : '-rotate-90 scale-75'}`} />
 <span className="hidden sm:inline">{t('themeDark')}</span>
 </button>
 <button
 onClick={() => handleThemeChange('system')}
 className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-md text-sm font-medium transition-all duration-300 ${
 theme === 'system'
 ? 'bg-background text-foreground shadow-sm'
 : 'text-muted-foreground hover:text-foreground'
 }`}
 aria-label={t('systemTheme')}
 >
 <Monitor className="w-4 h-4" />
 <span className="hidden sm:inline">{t('themeSystem')}</span>
 </button>
 </div>
 )
 }

 if (variant === 'dropdown') {
 return (
 <div className={`relative group ${className}`}>
 <button
 className="flex items-center gap-2 p-2.5 min-w-[44px] min-h-[44px] rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all duration-300"
 aria-label={t('toggleTheme')}
 >
 <div className="relative w-5 h-5">
 <Sun className={`w-5 h-5 absolute inset-0 transition-all duration-500 ${
 resolvedTheme === 'dark'
 ? 'rotate-90 scale-0 opacity-0'
 : 'rotate-0 scale-100 opacity-100'
 }`} />
 <Moon className={`w-5 h-5 absolute inset-0 transition-all duration-500 ${
 resolvedTheme === 'dark'
 ? 'rotate-0 scale-100 opacity-100'
 : '-rotate-90 scale-0 opacity-0'
 }`} />
 </div>
 </button>
 <div className="absolute right-0 top-full mt-2 py-2 w-40 bg-popover border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
 <button
 onClick={() => handleThemeChange('light')}
 className={`flex items-center gap-3 w-full px-4 py-3 min-h-[44px] text-sm hover:bg-accent transition-colors ${
 theme === 'light' ? 'text-primary font-medium' : 'text-popover-foreground'
 }`}
 >
 <Sun className="w-4 h-4" />
 {t('themeLight')}
 </button>
 <button
 onClick={() => handleThemeChange('dark')}
 className={`flex items-center gap-3 w-full px-4 py-3 min-h-[44px] text-sm hover:bg-accent transition-colors ${
 theme === 'dark' ? 'text-primary font-medium' : 'text-popover-foreground'
 }`}
 >
 <Moon className="w-4 h-4" />
 {t('themeDark')}
 </button>
 <button
 onClick={() => handleThemeChange('system')}
 className={`flex items-center gap-3 w-full px-4 py-3 min-h-[44px] text-sm hover:bg-accent transition-colors ${
 theme === 'system' ? 'text-primary font-medium' : 'text-popover-foreground'
 }`}
 >
 <Monitor className="w-4 h-4" />
 {t('themeSystem')}
 </button>
 </div>
 </div>
 )
 }

  // Default: animated icon toggle between light and dark
 const isDark = resolvedTheme === 'dark'

 return (
 <button
 ref={toggleRef}
 onClick={(e) => handleThemeChangeWithReveal(isDark ? 'light' : 'dark', e)}
 className={`relative p-2.5 min-w-[44px] min-h-[44px] rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all duration-300 flex items-center justify-center overflow-hidden group ${className}`}
 aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
 aria-disabled={isAnimating}
 >
 {/* Sun Icon */}
 <Sun className={`w-5 h-5 absolute transition-all duration-500 ease-in-out ${
 isDark
 ? 'rotate-90 scale-0 opacity-0'
 : 'rotate-0 scale-100 opacity-100'
 }`} />
 {/* Moon Icon */}
 <Moon className={`w-5 h-5 absolute transition-all duration-500 ease-in-out ${
 isDark
 ? 'rotate-0 scale-100 opacity-100'
 : '-rotate-90 scale-0 opacity-0'
 }`} />
 {/* Hover ring effect */}
 <span className="absolute inset-0 rounded-lg ring-0 ring-primary/20 group-hover:ring-2 transition-all duration-300" />
 </button>
 )
}
