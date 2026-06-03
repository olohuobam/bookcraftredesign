'use client'

import { ArrowLeft, MoreVertical } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useHaptics } from '@/hooks/useHaptics'
import { useLanguage } from '@/context/LanguageContext'

interface AppBarProps {
 title: string
 subtitle?: string
 showBack?: boolean
 actions?: React.ReactNode
 className?: string
 onBack?: () => void
}

export function AppBar({
 title,
 subtitle,
 showBack = false,
 actions,
 className,
 onBack
}: AppBarProps) {
 const router = useRouter()
 const { impact } = useHaptics()

 const handleBack = () => {
 impact('light')
 if (onBack) {
 onBack()
 } else {
 router.back()
 }
 }

 return (
 <div
 className={cn(
 "sticky top-0 z-20 backdrop-blur-xl bg-background/90 border-b border-border/30 safe-area-top shadow-sm",
 className
 )}
 >
 <div className="flex items-center justify-between px-4 sm:px-6 h-16">
 <div className="flex items-center gap-4 flex-1 min-w-0">
 {showBack && (
 <button
 onClick={handleBack}
 className="min-w-[44px] min-h-[44px] rounded-2xl flex items-center justify-center hover:bg-muted/60 active:bg-muted/80 active:scale-95 transition-all duration-200 ios-spring flex-shrink-0 group"
 >
 <ArrowLeft className="w-6 h-6 text-primary group-hover:text-primary/80 transition-colors" />
 </button>
 )}
 <div className="flex-1 min-w-0">
 <h1 className="text-xl font-black truncate tracking-tight text-foreground font-display">{title}</h1>
 {subtitle && (
 <p className="text-sm text-muted-foreground truncate font-medium leading-tight mt-0.5">{subtitle}</p>
 )}
 </div>
 </div>
 {actions && (
 <div className="flex items-center gap-2 flex-shrink-0 ml-3">
 {actions}
 </div>
 )}
 </div>
 </div>
 )
}

// Preset action buttons
interface AppBarActionProps {
 onClick: () => void
 icon: React.ComponentType<{ className?: string }>
 label?: string
}

export function AppBarAction({ onClick, icon: Icon, label }: AppBarActionProps) {
 const { impact } = useHaptics()

 return (
 <button
 onClick={() => {
 impact('light')
 onClick()
 }}
 className="min-w-[44px] min-h-[44px] rounded-2xl flex items-center justify-center hover:bg-muted/60 active:bg-muted/80 active:scale-95 transition-all duration-200 ios-spring group"
 aria-label={label}
 >
 <Icon className="w-6 h-6 text-muted-foreground group-hover:text-foreground group-active:text-primary transition-colors" />
 </button>
 )
}

// Three-dot menu button
export function AppBarMenu({ onClick }: { onClick: () => void }) {
 const { t } = useLanguage()
 return <AppBarAction onClick={onClick} icon={MoreVertical} label={t('menu')} />
}
