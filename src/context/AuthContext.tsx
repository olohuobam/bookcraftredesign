'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { Capacitor } from '@capacitor/core'
import { unregisterDeviceToken } from '@/lib/push-notification-service'

/**
 * Returns the Supabase OAuth redirect URL for the CURRENT environment.
 * Uses window.location.origin so Vercel preview deployments redirect back
 * to the preview URL instead of the production site_url.
 *
 * NOTE: Supabase must have the pattern `https://*.vercel.app/**` in
 * Authentication → URL Configuration → Redirect URLs (already configured).
 */
export function getAuthRedirectUrl(): string {
  if (Capacitor.isNativePlatform()) {
    return 'com.bookcraft.app://login-callback'
  }
  // window.location.origin resolves dynamically:
  //   - production:       https://bookcraft.dev
  //   - Vercel preview:   https://bookcraft-git-fix-xxx-jbdm.vercel.app
  //   - local dev:        http://localhost:5000
  return `${window.location.origin}/auth/callback`
}

interface User {
 id: string
 name: string
 email: string
}

interface AuthContextType {
 user: User | null
 login: (email: string, password: string) => Promise<boolean>
 loginWithGoogle: () => Promise<boolean>
 loginWithApple: () => Promise<boolean>
 register: (name: string, email: string, password: string) => Promise<boolean>
 logout: () => Promise<void>
 getIdToken: () => Promise<string | null>
 isLoading: boolean
 isServiceUnavailable: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Module-level tracking to prevent stacked deep-link listeners
let activeDeepLinkListener: { remove: () => Promise<void> } | null = null

export function AuthProvider({ children }: { children: ReactNode }) {
 const [user, setUser] = useState<User | null>(null)
 const [isLoading, setIsLoading] = useState(true)
 const [isServiceUnavailable, setIsServiceUnavailable] = useState(false)

  // Check if Supabase is available
 const isSupabaseAvailable = supabase !== null

 useEffect(() => {
 if (isSupabaseAvailable) {
      // Supabase is available - use real authentication
 
 const getSession = async () => {
 const { data: { session } } = await supabase.auth.getSession()
 
 if (session?.user) {
 try {
 const appUser: User = {
 id: session.user.id,
 name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
 email: session.user.email || ''
 }
 setUser(appUser)
 } catch (error) {
            console.error('Error creating app user:', error)
 setUser(null)
 }
 } else {
 setUser(null)
 }
 setIsLoading(false)
 }

 getSession()

      // Listen for auth state changes
 const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
        // Don't set isLoading to true here - only update user state
        // This prevents unnecessary re-renders and redirect loops

 if (session?.user) {
 try {
 const appUser: User = {
 id: session.user.id,
 name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
 email: session.user.email || ''
 }
 setUser(appUser)
 } catch (error) {
            console.error('Error creating app user:', error)
 setUser(null)
 }
 } else {
 setUser(null)
 }
 })

 return () => subscription.unsubscribe()
 } else {
      // Supabase not available
 if (process.env.NODE_ENV === 'development') {
        // Development only: allow mock authentication for local testing
        console.log('🔧 [DEV] Using mock authentication system')
 if (typeof window !== 'undefined') {
 const savedUser = localStorage.getItem('mockUser')
 if (savedUser) {
 setUser(JSON.parse(savedUser))
 }
 }
 setIsLoading(false)
 } else {
        // Production: mark service as unavailable, do not allow any login
        console.error('Authentication service unavailable: Supabase is not configured.')
 setIsServiceUnavailable(true)
 setIsLoading(false)
 }
 }
 }, [isSupabaseAvailable])

 const login = async (email: string, password: string): Promise<boolean> => {
 if (isSupabaseAvailable) {
      // Use real Supabase authentication
      // NOTE: Don't set global isLoading here - it causes dialog to close on error
 try {
 const { data, error } = await supabase.auth.signInWithPassword({
 email,
 password
 })

 if (error) throw error

        // Set user immediately after successful login to avoid race condition
        // with dashboard redirect checking for user
 if (data.user) {
 const appUser: User = {
 id: data.user.id,
 name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
 email: data.user.email || ''
 }
 setUser(appUser)
 }

 return true
 } catch (error: any) {
        console.error('Supabase authentication error:', error.message)
 throw error
 }
 } else {
      if (process.env.NODE_ENV !== 'development') {
 throw new Error('Authentication service is currently unavailable. Please try again later.')
 }
      // Development only: mock authentication
 setIsLoading(true)
 await new Promise(resolve => setTimeout(resolve, 1000))
 const mockUser: User = {
 id: 'mock-user-' + Date.now(),
 name: email.split('@')[0],
 email: email
 }
 setUser(mockUser)
 if (typeof window !== 'undefined') {
 localStorage.setItem('mockUser', JSON.stringify(mockUser))
 }
 setIsLoading(false)
      console.log('🔧 [DEV] Mock login successful for:', email)
 return true
 }
 }

 const register = async (name: string, email: string, password: string): Promise<boolean> => {
 if (isSupabaseAvailable) {
      // Use real Supabase registration
      // NOTE: Don't set global isLoading here - it causes dialog to close on error
 try {
 const { data, error } = await supabase.auth.signUp({
 email,
 password,
 options: {
 data: {
 name: name
 }
 }
 })

 if (error) throw error

        // Set user immediately after successful registration to avoid race condition
        // with dashboard redirect checking for user
 if (data.user) {
 const appUser: User = {
 id: data.user.id,
 name: name || data.user.email?.split('@')[0] || 'User',
 email: data.user.email || ''
 }
 setUser(appUser)
 }

 return true
 } catch (error: any) {
        console.error('Registration error:', error)
 throw error
 }
 } else {
      if (process.env.NODE_ENV !== 'development') {
 throw new Error('Authentication service is currently unavailable. Please try again later.')
 }
      // Development only: mock registration
 setIsLoading(true)
 await new Promise(resolve => setTimeout(resolve, 1000))
 const mockUser: User = {
 id: 'mock-user-' + Date.now(),
 name: name,
 email: email
 }
 setUser(mockUser)
 if (typeof window !== 'undefined') {
 localStorage.setItem('mockUser', JSON.stringify(mockUser))
 }
 setIsLoading(false)
      console.log('🔧 [DEV] Mock registration successful for:', email)
 return true
 }
 }

 const logout = async (): Promise<void> => {
 try {
 setIsLoading(true)

      // Unregister device push token before signing out (best-effort)
      await unregisterDeviceToken(getIdToken).catch(() => {})
 
 if (isSupabaseAvailable) {
        // Use real Supabase logout
        console.log('🔄 Performing Supabase logout...')
 const { error } = await supabase.auth.signOut()
 if (error) {
          console.error('Supabase logout error:', error)
 throw error
 }
        console.log('✅ Supabase logout successful')
 } else {
        // Mock logout
        console.log('🔄 Performing mock logout...')
 setUser(null)
 if (typeof window !== 'undefined') {
 localStorage.removeItem('mockUser')
 }
        console.log('✅ Mock logout successful')
 }
 } catch (error) {
      console.error('❌ Logout error:', error)
      // Force logout even if there's an error
 setUser(null)
 if (typeof window !== 'undefined') {
 localStorage.removeItem('mockUser')
 }
      console.log('⚠️ Force logout completed')
 throw error
 } finally {
 setIsLoading(false)
 }
 }

 const loginWithGoogle = async (): Promise<boolean> => {
 if (isSupabaseAvailable) {
 try {
 setIsLoading(true)
 const redirectTo = getAuthRedirectUrl()

 const { data, error } = await supabase.auth.signInWithOAuth({
 provider: 'google',
 options: {
 redirectTo,
 skipBrowserRedirect: Capacitor.isNativePlatform(),
 }
 })
 
 if (error) throw error

        // If native, open the OAuth URL manually with Browser plugin
 if (Capacitor.isNativePlatform() && data?.url) {
 const { Browser } = await import('@capacitor/browser')
 const { App } = await import('@capacitor/app')

 await Browser.open({ url: data.url })

          // Prevent multiple stacked listeners on retry
 if (activeDeepLinkListener) {
 await activeDeepLinkListener.remove()
 activeDeepLinkListener = null
 }

          // Listen for the deep link callback (com.bookcraft.app://login-callback)
 const listener = await App.addListener('appUrlOpen', async ({ url: callbackUrl }) => {
            // Only handle our app's exact deep-link path
 if (!callbackUrl.startsWith('com.bookcraft.app://login-callback')) return

            // Clear tracking and remove listener immediately to prevent double-firing
 activeDeepLinkListener = null
 await listener.remove()
 await browserFinishedListener.remove()

 try {
              // Parse hash params (implicit flow: #access_token=...&refresh_token=...)
 const hashPart = callbackUrl.includes('#') ? callbackUrl.split('#')[1] : ''
 const queryPart = callbackUrl.includes('?') ? callbackUrl.split('?')[1].split('#')[0] : ''

 const hashParams = new URLSearchParams(hashPart)
 const queryParams = new URLSearchParams(queryPart)

 const accessToken = hashParams.get('access_token')
 const refreshToken = hashParams.get('refresh_token')
 const code = queryParams.get('code')

 if (accessToken && refreshToken) {
                // Implicit flow: set session directly
 const { error: sessionError } = await supabase.auth.setSession({
 access_token: accessToken,
 refresh_token: refreshToken,
 })
 if (sessionError) throw sessionError
 } else if (code) {
                // PKCE flow: exchange code for session
 const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
 if (exchangeError) throw exchangeError
 } else {
 throw new Error('No auth tokens or code found in deep link callback')
 }

 await Browser.close()
 setIsLoading(false)
 window.location.href = '/dashboard'
 } catch (err: any) {
              console.error('Deep link OAuth error:', err)
 await Browser.close()
 setIsLoading(false)
 }
 })

          // Cancel if user closes the browser without completing OAuth
 const browserFinishedListener = await Browser.addListener('browserFinished', async () => {
 await browserFinishedListener.remove()
 if (activeDeepLinkListener) {
 await activeDeepLinkListener.remove()
 activeDeepLinkListener = null
 }
 setIsLoading(false)
 })

 activeDeepLinkListener = listener
 }
 
        // OAuth redirects, so we don't need to wait for the result here
 return true
 } catch (error: any) {
        console.error('Google OAuth error:', error)
 setIsLoading(false)
 throw error
 }
 } else {
      if (process.env.NODE_ENV !== 'development') {
 throw new Error('Authentication service is currently unavailable. Please try again later.')
 }
      // Development only: mock Google login
 setIsLoading(true)
 await new Promise(resolve => setTimeout(resolve, 1000))
 const mockUser: User = {
 id: 'mock-google-user-' + Date.now(),
 name: 'Google User',
 email: 'google.user@example.com'
 }
 setUser(mockUser)
 if (typeof window !== 'undefined') {
 localStorage.setItem('mockUser', JSON.stringify(mockUser))
 }
 setIsLoading(false)
      console.log('🔧 [DEV] Mock Google login successful')
 return true
 }
 }

 const loginWithApple = async (): Promise<boolean> => {
 if (isSupabaseAvailable) {
 try {
 setIsLoading(true)
 const redirectTo = getAuthRedirectUrl()

 const { data, error } = await supabase.auth.signInWithOAuth({
 provider: 'apple',
 options: {
 redirectTo,
 skipBrowserRedirect: Capacitor.isNativePlatform(),
 }
 })

 if (error) throw error

 if (Capacitor.isNativePlatform() && data?.url) {
 const { Browser } = await import('@capacitor/browser')
 const { App } = await import('@capacitor/app')

 await Browser.open({ url: data.url })

 if (activeDeepLinkListener) {
 await activeDeepLinkListener.remove()
 activeDeepLinkListener = null
 }

 const listener = await App.addListener('appUrlOpen', async ({ url: callbackUrl }) => {
 if (!callbackUrl.startsWith('com.bookcraft.app://login-callback')) return

 activeDeepLinkListener = null
 await listener.remove()
 await browserFinishedListener.remove()

 try {
 const hashPart = callbackUrl.includes('#') ? callbackUrl.split('#')[1] : ''
 const queryPart = callbackUrl.includes('?') ? callbackUrl.split('?')[1].split('#')[0] : ''

 const hashParams = new URLSearchParams(hashPart)
 const queryParams = new URLSearchParams(queryPart)

 const accessToken = hashParams.get('access_token')
 const refreshToken = hashParams.get('refresh_token')
 const code = queryParams.get('code')

 if (accessToken && refreshToken) {
 const { error: sessionError } = await supabase.auth.setSession({
 access_token: accessToken,
 refresh_token: refreshToken,
 })
 if (sessionError) throw sessionError
 } else if (code) {
 const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
 if (exchangeError) throw exchangeError
 } else {
 throw new Error('No auth tokens or code found in deep link callback')
 }

 await Browser.close()
 setIsLoading(false)
 window.location.href = '/dashboard'
 } catch (err: any) {
              console.error('Apple deep link OAuth error:', err)
 await Browser.close()
 setIsLoading(false)
 }
 })

 const browserFinishedListener = await Browser.addListener('browserFinished', async () => {
 await browserFinishedListener.remove()
 if (activeDeepLinkListener) {
 await activeDeepLinkListener.remove()
 activeDeepLinkListener = null
 }
 setIsLoading(false)
 })

 activeDeepLinkListener = listener
 } else if (data?.url) {
 window.location.href = data.url
 }

 return true
 } catch (error: any) {
        console.error('Apple OAuth error:', error)
 setIsLoading(false)
 throw error
 }
 } else {
      if (process.env.NODE_ENV !== 'development') {
 throw new Error('Authentication service is currently unavailable. Please try again later.')
 }
      // Development only: mock Apple login
 setIsLoading(true)
 await new Promise(resolve => setTimeout(resolve, 1000))
 const mockUser: User = {
 id: 'mock-apple-user-' + Date.now(),
 name: 'Apple User',
 email: 'apple.user@example.com'
 }
 setUser(mockUser)
 if (typeof window !== 'undefined') {
 localStorage.setItem('mockUser', JSON.stringify(mockUser))
 }
 setIsLoading(false)
      console.log('🔧 [DEV] Mock Apple login successful')
 return true
 }
 }

 const getIdToken = async (): Promise<string | null> => {
 if (isSupabaseAvailable && user) {
 try {
 const { data: { session } } = await supabase.auth.getSession()
 return session?.access_token || null
 } catch (error) {
        console.error('Error getting access token:', error)
 return null
 }
 } else {
      // Return mock token in development only
 if (process.env.NODE_ENV === 'development') {
 return user ? 'mock-token-' + user.id : null
 }
 return null
 }
 }

 return (
 <AuthContext.Provider value={{ user, login, loginWithGoogle, loginWithApple, register, logout, getIdToken, isLoading, isServiceUnavailable }}>
 {children}
 </AuthContext.Provider>
 )
}

export function useAuth() {
 const context = useContext(AuthContext)
 if (context === undefined) {
 throw new Error('useAuth must be used within an AuthProvider')
 }
 return context
}
