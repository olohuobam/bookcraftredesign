'use client'

import { ReactNode } from 'react'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { CheckCircle } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

interface PullToRefreshContainerProps {
 children: ReactNode
 onRefresh: () => Promise<void>
 className?: string
}

export default function PullToRefreshContainer({
 children,
 onRefresh,
 className = '',
}: PullToRefreshContainerProps) {
 const { t } = useLanguage()
 const {
 containerRef,
 pullDistance,
 pullProgress,
 isRefreshing,
 shouldShowRefreshIndicator,
 showSuccess,
 isPullingActive,
 } = usePullToRefresh({ onRefresh })

 return (
 <div
 ref={containerRef}
 className={`relative overflow-y-auto premium-scroll flex-1 min-h-0 ${className}`}
 >
 {/* Pull-to-Refresh Indicator */}
 {shouldShowRefreshIndicator && !showSuccess && (
 <div
 className="absolute left-0 right-0 flex items-center justify-center transition-all duration-200 z-50"
 style={{
 top: -80,
 transform: `translateY(${Math.min(pullDistance, 80)}px)`,
 opacity: isRefreshing ? 1 : pullProgress,
 }}
 >
 <div className="glass-strong rounded-full px-6 py-3 shadow-2xl flex items-center gap-3">
 {isRefreshing ? (
 <>
 <div className="w-5 h-5 rounded-full border-2 border-bookcraft-blue border-t-transparent refresh-spinner" />
 <span className="text-sm font-semibold text-foreground">
 {t('refreshing') || 'Refreshing...'}
 </span>
 </>
 ) : (
 <>
 {/* Progress Circle */}
 <div className="relative w-5 h-5">
 <svg width="20" height="20" className="transform -rotate-90">
 <circle
 cx="10"
 cy="10"
 r="8"
 stroke="rgba(120, 120, 128, 0.2)"
 strokeWidth="2"
 fill="none"
 />
 <circle
 cx="10"
 cy="10"
 r="8"
 stroke="#3b82f6"
 strokeWidth="2"
 fill="none"
 strokeDasharray={`${pullProgress * 50.27} 50.27`}
 strokeLinecap="round"
 className="spring-smooth"
 />
 </svg>
 </div>
 <span className={`text-sm font-semibold text-foreground ${isPullingActive ? 'pull-indicator' : ''}`}>
 {pullProgress >= 1 ? (t('releaseToRefresh') || 'Release to refresh') : (t('pullToRefresh') || 'Pull to refresh')}
 </span>
 </>
 )}
 </div>
 </div>
 )}

 {/* Success Flash */}
 {showSuccess && (
 <div className="absolute left-0 right-0 flex items-center justify-center z-50" style={{ top: 20 }}>
 <div className="glass-strong rounded-full px-6 py-3 shadow-2xl flex items-center gap-3 success-flash">
 <CheckCircle className="w-5 h-5 text-green-500" />
 <span className="text-sm font-semibold text-foreground">
 {t('updated') || 'Updated!'}
 </span>
 </div>
 </div>
 )}

 {/* Content with Elastic Pull Effect */}
 <div
 className={isPullingActive ? 'pulling' : 'pull-container'}
 style={{
 transform: isRefreshing
 ? 'translateY(0)'
 : `translateY(${Math.min(pullDistance * 0.3, 40)}px)`,
 transition: isRefreshing || pullDistance === 0
 ? 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
 : 'none',
 }}
 >
 {children}
 </div>
 </div>
 )
}
