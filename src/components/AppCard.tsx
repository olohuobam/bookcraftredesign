'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useHaptics } from '@/hooks/useHaptics'

interface AppCardProps {
 children: React.ReactNode
 href?: string
 onClick?: () => void
 className?: string
 hapticStyle?: 'light' | 'medium' | 'heavy'
 pressScale?: number
 disabled?: boolean
}

/**
 * AppCard Component
 *
 * A native-app-style card with:
 * - Press state animation (scale down)
 * - Haptic feedback on touch
 * - Smooth transitions
 * - Optional navigation
 */
export default function AppCard({
 children,
 href,
 onClick,
 className = '',
 hapticStyle = 'light',
 pressScale = 0.98,
 disabled = false,
}: AppCardProps) {
 const [isPressed, setIsPressed] = useState(false)
 const router = useRouter()
 const { impact } = useHaptics()

 const handlePress = async () => {
 if (disabled) return

 await impact(hapticStyle)

 if (onClick) {
 onClick()
 } else if (href) {
 router.push(href)
 }
 }

 return (
 <div
 role={href || onClick ? 'button' : undefined}
 tabIndex={href || onClick ? 0 : undefined}
 onClick={handlePress}
 onTouchStart={() => !disabled && setIsPressed(true)}
 onTouchEnd={() => setIsPressed(false)}
 onTouchCancel={() => setIsPressed(false)}
 onMouseDown={() => !disabled && setIsPressed(true)}
 onMouseUp={() => setIsPressed(false)}
 onMouseLeave={() => setIsPressed(false)}
 onKeyDown={(e) => {
 if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
 handlePress()
 }
 }}
 className={`
 bg-card rounded-2xl shadow-sm border border-border overflow-hidden
 transition-all duration-150 ease-out
 ${isPressed ? `scale-[${pressScale}] shadow-none` : 'scale-100 shadow-sm'}
 ${(href || onClick) && !disabled ? 'cursor-pointer active:bg-accent' : ''}
 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
 ${className}
 `}
 style={{
 transform: isPressed ? `scale(${pressScale})` : 'scale(1)',
 }}
 >
 {children}
 </div>
 )
}

/**
 * AppListItem Component
 *
 * A native-app-style list item with press states
 */
export function AppListItem({
 children,
 href,
 onClick,
 className = '',
 showChevron = true,
 hapticStyle = 'light',
 disabled = false,
}: AppCardProps & { showChevron?: boolean }) {
 const [isPressed, setIsPressed] = useState(false)
 const router = useRouter()
 const { impact } = useHaptics()

 const handlePress = async () => {
 if (disabled) return

 await impact(hapticStyle)

 if (onClick) {
 onClick()
 } else if (href) {
 router.push(href)
 }
 }

 return (
 <div
 role={href || onClick ? 'button' : undefined}
 tabIndex={href || onClick ? 0 : undefined}
 onClick={handlePress}
 onTouchStart={() => !disabled && setIsPressed(true)}
 onTouchEnd={() => setIsPressed(false)}
 onTouchCancel={() => setIsPressed(false)}
 onKeyDown={(e) => {
 if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
 handlePress()
 }
 }}
 className={`
 px-4 py-3 transition-all duration-100
 ${isPressed ? 'bg-accent' : 'bg-card'}
 ${(href || onClick) && !disabled ? 'cursor-pointer' : ''}
 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
 border-b border-border last:border-b-0
 ${className}
 `}
 >
 <div className="flex items-center gap-3">
 <div className="flex-1 min-w-0">
 {children}
 </div>
 {showChevron && (href || onClick) && (
 <svg
 className={`w-5 h-5 text-muted-foreground transition-transform ${isPressed ? 'translate-x-1' : ''}`}
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
 </svg>
 )}
 </div>
 </div>
 )
}
