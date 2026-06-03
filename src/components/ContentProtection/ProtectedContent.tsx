'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useContentProtection, contentProtectionStyles } from '@/hooks/useContentProtection'
import { Shield, ShieldAlert, ShieldOff, AlertTriangle } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

interface ProtectedContentProps {
 children: React.ReactNode
 className?: string
 showWarningOnAttempt?: boolean
 warningMessage?: string
 watermark?: string
 blurOnScreenshot?: boolean
 blurOnDevTools?: boolean
 blurOnFocusLoss?: boolean
 maxProtection?: boolean
 showDevToolsWarning?: boolean
  /** If true, all protection is disabled (e.g., for purchased books) */
 disabled?: boolean
}

export function ProtectedContent({
 children,
 className = '',
 showWarningOnAttempt = true,
 warningMessage = 'This content is copyrighted.',
 watermark,
 blurOnScreenshot = true,
 blurOnDevTools = true,
 blurOnFocusLoss = false,
 maxProtection = false,
 showDevToolsWarning = true,
 disabled = false,
}: ProtectedContentProps) {
  // All hooks MUST be called before any return (React Hook rules)
 const { t } = useLanguage()
 const [showWarning, setShowWarning] = useState(false)
 const [warningType, setWarningType] = useState<string>('')
 const [attemptCount, setAttemptCount] = useState(0)
 const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null)

 const handleProtectionTriggered = useCallback((type: string) => {
 if (showWarningOnAttempt && !disabled) {
 setWarningType(type)
 setShowWarning(true)
 setAttemptCount(prev => prev + 1)

      // Clear previous timeout
 if (warningTimeoutRef.current) {
 clearTimeout(warningTimeoutRef.current)
 }

      // Extended warning for multiple attempts
 const duration = attemptCount > 3 ? 5000 : 3000
 warningTimeoutRef.current = setTimeout(() => setShowWarning(false), duration)
 }
 }, [showWarningOnAttempt, attemptCount, disabled])

  // All protection disabled
 const { isBlurred, devToolsOpen } = useContentProtection({
 disableCopy: false,
 disableContextMenu: false,
 disablePrint: false,
 disableKeyboardShortcuts: false,
 disableDevTools: false,
 disableDragDrop: false,
 disableSelection: false,
 blurOnFocusLoss: false,
 detectScreenCapture: false,
 onProtectionTriggered: handleProtectionTriggered,
 })

  // Blur is now always disabled
 const shouldBlur = false

  // Cleanup timeout on unmount
 useEffect(() => {
 return () => {
 if (warningTimeoutRef.current) {
 clearTimeout(warningTimeoutRef.current)
 }
 }
 }, [])

  // If disabled=true, render content without any protection
 if (disabled) {
 return (
 <div className={`h-full ${className}`}>
 {children}
 </div>
 )
 }

 const getWarningText = (type: string) => {
 switch (type) {
 case 'copy':
 return ' Copying not allowed!'
 case 'contextmenu':
 return ' Right-click disabled!'
 case 'print':
 return ' Printing not allowed!'
 case 'keyboard':
 return ' This key combination is blocked!'
 case 'screenshot':
 return ' Screenshots not allowed!'
 case 'devtools':
 return ' Developer tools blocked!'
 case 'blur':
 return ' Window focus lost detected!'
 case 'drag':
 return ' Drag & drop blocked!'
 default:
 return warningMessage
 }
 }

 const getWarningIcon = (type: string) => {
 switch (type) {
 case 'devtools':
 return <ShieldOff className="h-5 w-5" />
 case 'screenshot':
 case 'blur':
 return <AlertTriangle className="h-5 w-5" />
 default:
 return <ShieldAlert className="h-5 w-5" />
 }
 }

 return (
 <div
 className={`protected-content relative h-full ${className}`}
 style={{
 ...contentProtectionStyles,
 filter: shouldBlur ? 'blur(25px) grayscale(100%)' : 'none',
 transition: 'filter 0.3s ease',
 WebkitFilter: shouldBlur ? 'blur(25px) grayscale(100%)' : 'none',
 }}
 onDragStart={undefined}
 onDrop={undefined}
 onCopy={undefined}
 onCut={undefined}
 onPaste={undefined}
 onContextMenu={undefined}
 >
 {/* Invisible overlay to block interactions during blur */}
 {shouldBlur && (
 <div
 className="absolute inset-0 z-50 cursor-not-allowed"
 style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
 onClick={(e) => e.preventDefault()}
 />
 )}

 {/* Watermark overlay - Enhanced */}
 {watermark && (
 <div
 className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
 aria-hidden="true"
 style={{
 opacity: shouldBlur ? 0.2 : 0.04,
 }}
 >
 <div
 className="absolute inset-0"
 style={{
 backgroundImage: `repeating-linear-gradient(
 -45deg,
 transparent,
 transparent 100px,
 rgba(128, 128, 128, 0.03) 100px,
 rgba(128, 128, 128, 0.03) 200px
 )`,
 }}
 />
 <div
 className="flex flex-wrap justify-center items-center h-full"
 style={{
 transform: 'rotate(-30deg) scale(1.5)',
 transformOrigin: 'center center',
 }}
 >
 {Array(50).fill(null).map((_, i) => (
 <span
 key={i}
 className="text-gray-500 font-medium text-xs mx-12 my-8 whitespace-nowrap"
 style={{
 userSelect: 'none',
 WebkitUserSelect: 'none',
 }}
 >
 {watermark}
 </span>
 ))}
 </div>
 </div>
 )}

 {/* DevTools Warning Overlay */}
 {devToolsOpen && showDevToolsWarning && (
 <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm">
 <div className="text-center p-8 bg-red-900/90 rounded-2xl border-2 border-red-500 shadow-2xl max-w-md mx-4">
 <ShieldOff className="h-16 w-16 text-red-400 mx-auto mb-4" />
 <h3 className="text-2xl font-bold font-display text-white mb-2">
 Developer Tools Detected!
 </h3>
 <p className="text-red-200 mb-4">
 The content is protected and will not be displayed while developer tools are open.
 </p>
 <p className="text-red-300 text-sm">
 Please close the developer tools to continue.
 </p>
 </div>
 </div>
 )}

 {/* Content */}
 <div
 className="relative h-full"
 style={{
 pointerEvents: shouldBlur ? 'none' : 'auto',
 }}
 >
 {children}
 </div>

 {/* Warning toast - Enhanced */}
 {showWarning && (
 <div
 className="fixed bottom-4 left-1/2 z-[9999] -translate-x-1/2 transform"
 role="alert"
 style={{
 animation: 'slideUp 0.3s ease-out, shake 0.5s ease-in-out',
 }}
 >
 <div className={`flex items-center gap-3 rounded-xl px-5 py-4 text-white shadow-2xl border ${
 attemptCount > 3
 ? 'bg-gradient-to-r from-red-700 to-red-900 border-red-400'
 : 'bg-gradient-to-r from-red-600 to-red-700 border-red-500'
 }`}>
 {getWarningIcon(warningType)}
 <div>
 <span className="font-bold block">{getWarningText(warningType)}</span>
 {attemptCount > 3 && (
 <span className="text-red-200 text-sm">
 Repeated attempts are being logged.
 </span>
 )}
 </div>
 </div>
 </div>
 )}

 {/* Protection indicator */}
 <div
 className="pointer-events-none absolute right-2 top-2 z-20"
 title="Content protected"
 >
 <div className={`flex items-center gap-1 rounded-full px-2 py-1 ${
 shouldBlur ? 'bg-red-500/80' : 'bg-gray-500/30'
 }`}>
 <Shield className={`h-3 w-3 ${shouldBlur ? 'text-white' : 'text-gray-400'}`} />
 {shouldBlur && (
 <span className="text-white text-xs font-medium">{t('protectedBadge')}</span>
 )}
 </div>
 </div>

 {/* CSS Animations + Mobile Protection */}
 <style jsx global>{`
 @keyframes slideUp {
 from {
 transform: translate(-50%, 100%);
 opacity: 0;
 }
 to {
 transform: translate(-50%, 0);
 opacity: 1;
 }
 }

 @keyframes shake {
 0%, 100% { transform: translate(-50%, 0); }
 10%, 30%, 50%, 70%, 90% { transform: translate(calc(-50% - 5px), 0); }
 20%, 40%, 60%, 80% { transform: translate(calc(-50% + 5px), 0); }
 }

        /* Protection disabled */
 `}</style>
 </div>
 )
}

// Maximum protection wrapper - Use this for highest security
export function MaxProtectedContent({
 children,
 className = '',
 watermark,
 disabled = false,
}: {
 children: React.ReactNode
 className?: string
 watermark?: string
  /** If true, all protection is disabled (e.g., for purchased books) */
 disabled?: boolean
}) {
 return (
 <ProtectedContent
 className={className}
 showWarningOnAttempt={true}
 watermark={watermark}
 blurOnScreenshot={true}
 blurOnDevTools={true}
 blurOnFocusLoss={true}
 maxProtection={true}
 showDevToolsWarning={true}
 disabled={disabled}
 >
 {children}
 </ProtectedContent>
 )
}

export default ProtectedContent
