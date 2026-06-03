'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { Language, getTranslations, TranslationKey } from '@/lib/translations'

interface LanguageContextType {
 language: Language
 setLanguage: (lang: Language) => void
 t: (key: TranslationKey, params?: Record<string, string | number>) => string
 isLoading: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

interface LanguageProviderProps {
 children: ReactNode
}

const LANGUAGE_STORAGE_KEY = 'bookcraft-language'

export function LanguageProvider({ children }: LanguageProviderProps) {
 const { user, getIdToken } = useAuth()

  // Always initialize with 'en' to prevent hydration mismatch
  // Will be updated from localStorage in useEffect on client-side
 const [language, setLanguageState] = useState<Language>('en')
 const [isLoading, setIsLoading] = useState(true)

  // Load language from localStorage and sync with server
 useEffect(() => {
 // Safety timeout: if loading takes more than 5 seconds, fall back to English
 const loadingTimeout = setTimeout(() => {
 setIsLoading(false)
 }, 5000)

 const initLanguage = async () => {
      // First, load from localStorage immediately
 if (typeof window !== 'undefined') {
 const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
 if (stored === 'de' || stored === 'en' || stored === 'es') {
 setLanguageState(stored)
 }
 }

      // If no user, we're done
 if (!user) {
 clearTimeout(loadingTimeout)
 setIsLoading(false)
 return
 }

 try {
 const token = await getIdToken()
 if (!token) {
 clearTimeout(loadingTimeout)
 setIsLoading(false)
 return
 }

        // Check if we have a localStorage value - if so, it takes priority
 const storedLanguage = typeof window !== 'undefined'
 ? localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null
 : null

 if (storedLanguage && (storedLanguage === 'de' || storedLanguage === 'en' || storedLanguage === 'es')) {
          // localStorage exists - sync TO server, not FROM server
 setLanguageState(storedLanguage)

          // Update server with localStorage value
 await fetch('/api/user/profile', {
 method: 'PATCH',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`,
 },
 body: JSON.stringify({ language: storedLanguage }),
 })
 } else {
          // No localStorage - load from server (first time / new device)
 const res = await fetch('/api/user/profile', {
 method: 'GET',
 headers: {
 'Authorization': `Bearer ${token}`,
 },
 })

 if (res.ok) {
 const data = await res.json()
 const profileData = data.profile || data.user
 if (profileData && profileData.language) {
 const serverLanguage = profileData.language as Language
 setLanguageState(serverLanguage)
 localStorage.setItem(LANGUAGE_STORAGE_KEY, serverLanguage)
 }
 }
 }
 } catch (error) {
        console.error('Error syncing language:', error)
 } finally {
 clearTimeout(loadingTimeout)
 setIsLoading(false)
 }
 }

 initLanguage()

 return () => clearTimeout(loadingTimeout)
 }, [user, getIdToken])

  // Save language preference to localStorage and profile when changed
 const setLanguage = async (newLanguage: Language) => {
 setLanguageState(newLanguage)

    // Always save to localStorage for immediate persistence across page navigations
 if (typeof window !== 'undefined') {
 localStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage)
 }

 if (!user) return

 try {
 const token = await getIdToken()
 if (!token) return

 await fetch('/api/user/profile', {
 method: 'PATCH',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`,
 },
 body: JSON.stringify({ language: newLanguage }),
 })
 } catch (error) {
      console.error('Error saving language preference:', error)
 }
 }

  // Translation function with parameter interpolation
 const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
 const translations = getTranslations(language)
 let text = translations[key] ?? key
 if (params) {
 Object.entries(params).forEach(([paramKey, value]) => {
 text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value))
 })
 }
 return text
 }

 const value: LanguageContextType = {
 language,
 setLanguage,
 t,
 isLoading
 }

 return (
 <LanguageContext.Provider value={value}>
 {children}
 </LanguageContext.Provider>
 )
}

export function useLanguage(): LanguageContextType {
 const context = useContext(LanguageContext)
 if (context === undefined) {
 throw new Error('useLanguage must be used within a LanguageProvider')
 }
 return context
}