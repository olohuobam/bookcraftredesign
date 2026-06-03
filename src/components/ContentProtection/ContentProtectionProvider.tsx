'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, startTransition } from 'react'
import { Capacitor } from '@capacitor/core'

interface ContentProtectionContextType {
 isProtectionEnabled: boolean
 setProtectionEnabled: (enabled: boolean) => void
 protectionLevel: 'none' | 'basic' | 'strict'
 setProtectionLevel: (level: 'none' | 'basic' | 'strict') => void
 attempts: ProtectionAttempt[]
 clearAttempts: () => void
 isNativeApp: boolean
 platform: 'web' | 'ios' | 'android'
}

interface ProtectionAttempt {
 type: string
 timestamp: Date
 blocked: boolean
}

const ContentProtectionContext = createContext<ContentProtectionContextType | null>(null)

export function useContentProtectionContext() {
 const context = useContext(ContentProtectionContext)
 if (!context) {
 throw new Error('useContentProtectionContext must be used within ContentProtectionProvider')
 }
 return context
}

interface ContentProtectionProviderProps {
 children: React.ReactNode
 defaultEnabled?: boolean
 defaultLevel?: 'none' | 'basic' | 'strict'
}

export function ContentProtectionProvider({
 children,
 defaultEnabled = false,
 defaultLevel = 'none',
}: ContentProtectionProviderProps) {
 const [isProtectionEnabled, setProtectionEnabled] = useState(defaultEnabled)
 const [protectionLevel, setProtectionLevel] = useState<'none' | 'basic' | 'strict'>(defaultLevel)
 const [attempts, setAttempts] = useState<ProtectionAttempt[]>([])
 const [isNativeApp, setIsNativeApp] = useState(false)
 const [platform, setPlatform] = useState<'web' | 'ios' | 'android'>('web')

  // Detect platform
 useEffect(() => {
 if (Capacitor.isNativePlatform()) {
 startTransition(() => {
 setIsNativeApp(true)
 setPlatform(Capacitor.getPlatform() as 'ios' | 'android')
 })
 }
 }, [])

 const addAttempt = useCallback((type: string, blocked: boolean) => {
 setAttempts((prev) => [
 ...prev.slice(-49), // Keep last 50 attempts
 { type, timestamp: new Date(), blocked },
 ])
 }, [])

 const clearAttempts = useCallback(() => {
 setAttempts([])
 }, [])

  // Global protection based on level
 useEffect(() => {
 if (!isProtectionEnabled || protectionLevel === 'none') return

 const handleGlobalCopy = (e: ClipboardEvent) => {
      // Check if target is within a protected-content element
 const target = e.target as HTMLElement
 const isProtected = target.closest('.protected-content')

 if (isProtected) {
 e.preventDefault()
 addAttempt('copy', true)
 }
 }

 const handleGlobalContextMenu = (e: MouseEvent) => {
 if (protectionLevel === 'strict') {
 const target = e.target as HTMLElement
 const isProtected = target.closest('.protected-content')

 if (isProtected) {
 e.preventDefault()
 addAttempt('contextmenu', true)
 }
 }
 }

 const handleGlobalKeyDown = (e: KeyboardEvent) => {
 if (protectionLevel !== 'strict') return

 const target = e.target as HTMLElement
 const isProtected = target.closest('.protected-content')

 if (!isProtected) return

 const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
 const modifier = isMac ? e.metaKey : e.ctrlKey

 if (modifier && (e.key === 'c' || e.key === 'a' || e.key === 's' || e.key === 'p')) {
 e.preventDefault()
 addAttempt('keyboard', true)
 }
 }

 document.addEventListener('copy', handleGlobalCopy, true)
 document.addEventListener('contextmenu', handleGlobalContextMenu, true)
 document.addEventListener('keydown', handleGlobalKeyDown, true)

 return () => {
 document.removeEventListener('copy', handleGlobalCopy, true)
 document.removeEventListener('contextmenu', handleGlobalContextMenu, true)
 document.removeEventListener('keydown', handleGlobalKeyDown, true)
 }
 }, [isProtectionEnabled, protectionLevel, addAttempt])

  // Add print protection CSS
 useEffect(() => {
 if (!isProtectionEnabled) return

 const styleId = 'content-protection-print-styles'
 let styleElement = document.getElementById(styleId) as HTMLStyleElement | null

 if (!styleElement) {
 styleElement = document.createElement('style')
 styleElement.id = styleId
 document.head.appendChild(styleElement)
 }

 styleElement.textContent = `
 @media print {
 .protected-content {
 visibility: hidden !important;
 }

 .protected-content::before {
 content: "This content is copyrighted and cannot be printed.";
 visibility: visible;
 display: block;
 text-align: center;
 padding: 2rem;
 font-size: 1.25rem;
 color: #666;
 }

 body::after {
 content: "© Bookcraft - Copyrighted Content";
 position: fixed;
 bottom: 0;
 left: 0;
 right: 0;
 text-align: center;
 padding: 1rem;
 background: white;
 color: #999;
 font-size: 0.875rem;
 }
 }
 `

 return () => {
 styleElement?.remove()
 }
 }, [isProtectionEnabled])

 const value: ContentProtectionContextType = {
 isProtectionEnabled,
 setProtectionEnabled,
 protectionLevel,
 setProtectionLevel,
 attempts,
 clearAttempts,
 isNativeApp,
 platform,
 }

 return (
 <ContentProtectionContext.Provider value={value}>
 {children}
 </ContentProtectionContext.Provider>
 )
}

export default ContentProtectionProvider
