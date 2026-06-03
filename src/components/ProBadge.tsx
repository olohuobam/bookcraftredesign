'use client'

import { Crown, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useProSheet } from '@/context/ProSheetContext'
import { useLanguage } from '@/context/LanguageContext'

interface ProBadgeProps {
 variant?: 'default' | 'small' | 'inline' | 'glow'
 className?: string
 showIcon?: boolean
}

/**
 * Pro badge to display next to user name or in other locations
 */
export function ProBadge({
 variant = 'default',
 className = '',
 showIcon = true,
}: ProBadgeProps) {
 if (variant === 'small') {
 return (
 <span
 className={cn(
 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide',
 'text-white shadow-sm',
 className
 )}
 style={{ background: 'linear-gradient(135deg, #3E86D7, #3E86D7)' }}
 >
 {showIcon && <Crown className="h-2.5 w-2.5" />}
 Pro
 </span>
 )
 }

 if (variant === 'inline') {
 return (
 <span
 className={cn(
 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
 'bg-bookcraft-blue/10 dark:bg-bookcraft-blue/20',
 'text-bookcraft-blue dark:text-bookcraft-blue/80 border border-bookcraft-blue/30 dark:border-bookcraft-blue/40',
 className
 )}
 >
 Pro
 </span>
 )
 }

 if (variant === 'glow') {
 return (
 <span
 className={cn(
 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold',
 'text-white',
 'shadow-lg ring-2 ring-bookcraft-blue/50',
 'animate-pulse',
 className
 )}
 style={{ background: 'linear-gradient(135deg, #3E86D7, #3E86D7)', boxShadow: '0 10px 25px rgba(62,134,215,0.25)' }}
 >
 {showIcon && <Crown className="h-4 w-4" />}
 PRO
 </span>
 )
 }

  // Default variant
 return (
 <span
 className={cn(
 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide',
 'text-white shadow-sm',
 className
 )}
 style={{ background: 'linear-gradient(135deg, #3E86D7, #3E86D7)' }}
 >
 {showIcon && <Crown className="h-3 w-3" />}
 Pro
 </span>
 )
}

interface UpgradeToProButtonProps {
 variant?: 'default' | 'compact' | 'navbar'
 className?: string
}

/**
 * Button to upgrade to Pro subscription
 */
export function UpgradeToProButton({
 variant = 'default',
 className = '',
}: UpgradeToProButtonProps) {
 const { t } = useLanguage()
 const { openProSheet } = useProSheet()
 if (variant === 'navbar') {
 return (
 <button
 onClick={() => openProSheet('generic')}
 className={cn(
 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
 'text-white shadow-sm hover:shadow-md',
 'hover:scale-105 active:scale-95',
 className
 )}
 style={{ background: 'linear-gradient(135deg, #3E86D7, #3E86D7)' }}
 >
 <Zap className="h-4 w-4" />
 <span>{t('upgradeToPro')}</span>
 </button>
 )
 }

 if (variant === 'compact') {
 return (
 <button
 onClick={() => openProSheet('generic')}
 className={cn(
 'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all',
 'text-white shadow-sm hover:shadow',
 className
 )}
 style={{ background: 'linear-gradient(135deg, #3E86D7, #3E86D7)' }}
 >
 <Zap className="h-3 w-3" />
 Upgrade
 </button>
 )
 }

  // Default variant
 return (
 <button
 onClick={() => openProSheet('generic')}
 className={cn(
 'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
 'text-white shadow-md hover:shadow-lg',
 'hover:scale-105 active:scale-95',
 className
 )}
 style={{ background: 'linear-gradient(135deg, #3E86D7, #3E86D7)' }}
 >
 <Crown className="h-4 w-4" />
 <span>{t('upgradeToPro')}</span>
 </button>
 )
}
