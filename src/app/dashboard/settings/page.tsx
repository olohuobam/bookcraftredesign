'use client'

import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
 User,
 Bell,
 Download,
 Trash2,
 Save,
 Check,
 Camera,
 Loader2,
 LogOut,
 Globe,
 FileText,
 ChevronRight,
 Scale,
 CreditCard,
 Lock,
 Package,
 Crown,
 ArrowUpRight,
 RotateCcw,
 Smartphone,
} from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { useNativeSubscription } from '@/hooks/useNativeSubscription'
import { useRouter } from 'next/navigation'
import type { Language } from '@/lib/translations'
import Link from 'next/link'
import Swal from 'sweetalert2'
import { useToast } from '@/components/ui/toast'
import { Share } from '@capacitor/share'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { AppBar } from '@/components/AppBar'
import PullToRefreshContainer from '@/components/PullToRefreshContainer'
import { useProSheet } from '@/context/ProSheetContext'

// Removed inline translations - now using global translation system

interface ProfileData {
 id: string
 name?: string
 email: string
 bio?: string
 image?: string
 language?: Language
 theme?: string
 emailNotifications?: boolean
 pushNotifications?: boolean
 weeklyReport?: boolean
 bookCompletionAlert?: boolean
 createdAt?: string
 updatedAt?: string
}

export default function SettingsPage() {
 const { user, logout, getIdToken } = useAuth()
 const { t, setLanguage: setAppLanguage } = useLanguage()
 const router = useRouter()
  const { openProSheet } = useProSheet()
 const { showToast } = useToast()
 const { theme: currentTheme, setTheme } = useTheme()
 const [mounted, setMounted] = useState(false)

 const [, setProfileData] = useState<ProfileData | null>(null)
 const [isLoading, setIsLoading] = useState(true)

  // Form states
 const [profile, setProfile] = useState({
 name: '',
 email: '',
 bio: '',
 language: 'en',
 theme: 'system'
 })

  // Handle hydration mismatch for theme
 useEffect(() => {
 setMounted(true)
 }, [])
 
 const [preferences, setPreferences] = useState({
 emailNotifications: true,
 pushNotifications: false,
 weeklyReport: true,
 bookCompletionAlert: true
 })
 
 const [isSaving, setIsSaving] = useState(false)
 const [saveStatus, setSaveStatus] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle')
 const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
 const isInitialLoadRef = useRef(true)
 const lastSavedRef = useRef<string>('')

 // Auto-save function
 const performAutoSave = useCallback(async (profileData: typeof profile, prefsData: typeof preferences) => {
   try {
     setSaveStatus('saving')
     setIsSaving(true)
     const token = await getIdToken()
     if (!token) return

     const res = await fetch('/api/user/profile', {
       method: 'PATCH',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${token}`,
       },
       body: JSON.stringify({
         name: profileData.name,
         email: profileData.email,
         bio: profileData.bio,
         language: profileData.language,
         theme: profileData.theme,
         ...prefsData
       }),
     })

     if (!res.ok) throw new Error('Save failed')
     
     const updatedData = await res.json()
     if (updatedData.user) setProfileData(updatedData.user)
     
     setSaveStatus('saved')
     setTimeout(() => setSaveStatus('idle'), 2000)
   } catch {
     setSaveStatus('error')
     setTimeout(() => setSaveStatus('idle'), 3000)
   } finally {
     setIsSaving(false)
   }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [getIdToken])

 // Debounced auto-save for profile fields (name, email, bio)
 useEffect(() => {
   if (isInitialLoadRef.current || isLoading) return
   const currentSnapshot = JSON.stringify({ ...profile, ...preferences })
   if (currentSnapshot === lastSavedRef.current) return
   
   setSaveStatus('pending')
   if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
   debounceTimerRef.current = setTimeout(() => {
     lastSavedRef.current = currentSnapshot
     performAutoSave(profile, preferences)
   }, 1500)
   
   return () => {
     if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
   }
 }, [profile.name, profile.email, profile.bio, profile.language, preferences, isLoading, performAutoSave, profile])

 // Mark initial load done after profile loads
 useEffect(() => {
   if (!isLoading && isInitialLoadRef.current) {
     setTimeout(() => {
       isInitialLoadRef.current = false
       lastSavedRef.current = JSON.stringify({ ...profile, ...preferences })
     }, 500)
   }
 }, [isLoading, profile, preferences])
 const [profileImage, setProfileImage] = useState<string | null>(null)
 const [isUploadingImage, setIsUploadingImage] = useState(false)
 const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false)
 const [isLoggingOut, setIsLoggingOut] = useState(false)

 // Data export state
 const [isExporting, setIsExporting] = useState(false)

 // Subscription state
 const [subscription, setSubscription] = useState<{ plan: string; status: string } | null>(null)
 const [isLoadingSubscription, setIsLoadingSubscription] = useState(false)
 const [restoreMessage, setRestoreMessage] = useState<string | null>(null)

 // Platform detection — Native app uses IAP, web uses Stripe
 // IMPORTANT: Capacitor.isNativePlatform() must be evaluated client-side only.
 // Using state with useEffect ensures SSR always renders false, then hydrates correctly.
 // If we used it directly, SSR would always produce `false` and the toggle would appear
 // permanently disabled (mismatched disabled state causes hydration mismatch).
 const [isNativePlatform, setIsNativePlatform] = useState(false)
 const [nativePlatform, setNativePlatform] = useState<'ios' | 'android' | 'web'>('web')

 useEffect(() => {
   const native = Capacitor.isNativePlatform()
   const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web'
   console.log('[Settings] Platform detection — isNative:', native, '| platform:', platform)
   setIsNativePlatform(native)
   setNativePlatform(platform)
 }, [])

 // Native IAP subscription hook (only active on native)
 const { restorePurchases, isLoading: isIAPLoading } = useNativeSubscription()

 // Password change state
 const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' })
 const [isChangingPassword, setIsChangingPassword] = useState(false)
 const [passwordError, setPasswordError] = useState('')

 // Push notification support state
 // On native: always supported via Capacitor push notifications
 // On web: depends on browser Notification API
 // Default to true so the toggle isn't disabled until we confirm otherwise
 const [pushSupported, setPushSupported] = useState(true)
 const [pushPermissionDenied, setPushPermissionDenied] = useState(false)
 // Track whether a push permission request is in progress (prevents double-clicks)
 const [isPushRequesting, setIsPushRequesting] = useState(false)
 const [debugPushStep, setDebugPushStep] = useState('idle')
 // Email provider detection
 const [isEmailUser, setIsEmailUser] = useState(false)

 useEffect(() => {
   if (isNativePlatform) {
     // Native app always supports push via Capacitor @capacitor/push-notifications
     setPushSupported(true)
     // Check if permission is already permanently denied (don't block UI, just update state)
     // Skip pre-check for permanently denied — Capacitor checkPermissions() can hang
     // on some Android devices when loading from remote URL. The toggle handler has its
     // own timeout-protected flow.
     console.log('[Settings] Skipping isPushPermissionPermanentlyDenied pre-check (can hang on Android)')
   } else if (typeof window !== 'undefined' && !('Notification' in window)) {
     // Web browser without Notification API support
     setPushSupported(false)
   }
 }, [isNativePlatform])

 useEffect(() => {
   const checkProvider = async () => {
     try {
       const { supabase } = await import('@/lib/supabase')
       if (!supabase) return
       const { data: { session } } = await supabase.auth.getSession()
       if (session?.user) {
         const identities = session.user.identities ?? []
         const hasEmailIdentity = identities.some((id: { provider: string }) => id.provider === 'email')
         setIsEmailUser(hasEmailIdentity)
       }
     } catch {
       // ignore
     }
   }
   if (user) checkProvider()
 }, [user])

  // Using global translation system

  // Load profile data on mount
 useEffect(() => {
 const loadProfileData = async () => {
 if (!user) return
 
 try {
 setIsLoading(true)
 const token = await getIdToken()
 if (!token) return

 const res = await fetch('/api/user/profile', {
 method: 'GET',
 headers: {
 'Authorization': `Bearer ${token}`,
 },
 })

 if (res.ok) {
 const data = await res.json()
 const profileData = data.profile || data.user // API returns "profile"
 if (profileData) {
 setProfileData(profileData)
            // Update profile image
 if (profileData.image) {
 setProfileImage(profileData.image)
 }
            // Update form states with loaded data
 const savedTheme = profileData.theme === 'auto' ? 'system' : (profileData.theme || 'system')
 setProfile(prev => ({
 ...prev,
 name: profileData.name || '',
 email: profileData.email || '',
 bio: profileData.bio || '',
 language: profileData.language || 'en',
 theme: savedTheme
 }))
            // Apply the saved theme globally
 setTheme(savedTheme)
 setPreferences(prev => ({
 ...prev,
 emailNotifications: profileData.emailNotifications ?? true,
 pushNotifications: profileData.pushNotifications ?? false,
 weeklyReport: profileData.weeklyReport ?? true,
 bookCompletionAlert: profileData.bookCompletionAlert ?? true
 }))
 }
 }
 } catch (error) {
        console.error('Error loading profile:', error)
 } finally {
 setIsLoading(false)
 }
 }

 loadProfileData()
 }, [user, getIdToken, setTheme])

 // Load subscription
 useEffect(() => {
   const loadSubscription = async () => {
     if (!user) return
     try {
       setIsLoadingSubscription(true)
       const token = await getIdToken()
       if (!token) return
       const res = await fetch('/api/user/subscription', {
         headers: { 'Authorization': `Bearer ${token}` },
       })
       if (res.ok) {
         const data = await res.json()
         setSubscription(data.subscription)
       }
     } catch (error) {
       console.error('Error loading subscription:', error)
     } finally {
       setIsLoadingSubscription(false)
     }
   }
   loadSubscription()
 }, [user, getIdToken])

 const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0]
 if (!file) return

    // Validate file type
 if (!file.type.startsWith('image/')) {
 await Swal.fire({
 title: t('error'),
 text: t('selectImageFile'),
 icon: 'error',
 confirmButtonText: t('ok')
 })
 return
 }

    // Validate file size (max 5MB)
 if (file.size > 5 * 1024 * 1024) {
 await Swal.fire({
 title: t('error'),
 text: t('imageSizeLimit'),
 icon: 'error',
 confirmButtonText: t('ok')
 })
 return
 }

 try {
 setIsUploadingImage(true)
 const token = await getIdToken()
 if (!token) throw new Error(t('noToken'))

      // Upload image
 const formData = new FormData()
 formData.append('image', file)

 const uploadRes = await fetch('/api/upload-image', {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${token}`,
 },
 body: formData,
 })

 if (!uploadRes.ok) {
 const data = await uploadRes.json().catch(() => ({}))
 throw new Error(data.error || t('uploadError'))
 }

 const uploadData = await uploadRes.json()
 const imageUrl = uploadData.imageUrl

      // Update profile with new image
 const profileRes = await fetch('/api/user/profile', {
 method: 'PATCH',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`,
 },
 body: JSON.stringify({ image: imageUrl }),
 })

 if (!profileRes.ok) {
 throw new Error(t('profileUpdateFailed'))
 }

 setProfileImage(imageUrl)

 await Swal.fire({
 title: t('success'),
 text: t('profilePictureUpdated'),
 icon: 'success',
 timer: 2000,
 showConfirmButton: false
 })
 } catch (e: any) {
 await Swal.fire({
 title: t('error'),
 text: e.message || t('uploadError'),
 icon: 'error',
 confirmButtonText: t('ok')
 })
 } finally {
 setIsUploadingImage(false)
 }
 }

 const handleGenerateAvatar = async () => {
 try {
 setIsGeneratingAvatar(true)
 const token = await getIdToken()
 if (!token) throw new Error(t('noToken'))

 const res = await fetch('/api/user/generate-avatar', {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${token}`,
 },
 })

 if (!res.ok) {
 const data = await res.json().catch(() => ({}))
 throw new Error(data.error || t('avatarGenerationFailed'))
 }

 const data = await res.json()
 setProfileImage(data.imageUrl)

 await Swal.fire({
 title: t('success'),
 text: t('avatarGeneratedSuccess'),
 icon: 'success',
 timer: 2000,
 showConfirmButton: false
 })
 } catch (e: any) {
 await Swal.fire({
 title: t('error'),
 text: e.message || t('avatarGenerationFailed'),
 icon: 'error',
 confirmButtonText: t('ok')
 })
 } finally {
 setIsGeneratingAvatar(false)
 }
 }

 const handleSaveProfile = async () => {
 try {
 setIsSaving(true)
 const token = await getIdToken()
 if (!token) throw new Error(t('noToken'))

 const res = await fetch('/api/user/profile', {
 method: 'PATCH',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`,
 },
 body: JSON.stringify({
 name: profile.name,
 email: profile.email,
 bio: profile.bio,
 language: profile.language,
 theme: profile.theme,
 ...preferences
 }),
 })

 if (!res.ok) {
 const data = await res.json().catch(() => ({}))
 throw new Error(data.error || t('saveFailed'))
 }

 const updatedData = await res.json()

 if (updatedData.user) {
 setProfileData(updatedData.user)
 }

 await Swal.fire({
 title: t('saved'),
 text: t('profileSavedSuccess'),
 icon: 'success',
 timer: 2000,
 showConfirmButton: false
 })
 } catch (e: any) {
 await Swal.fire({
 title: t('error'),
 text: e.message || t('saveError'),
 icon: 'error',
 confirmButtonText: t('ok')
 })
 } finally {
 setIsSaving(false)
 }
 }

 const handleDeleteAccount = async () => {
 const result = await Swal.fire({
 title: t('deleteAccountQuestion'),
 text: t('deleteConfirm'),
 icon: 'warning',
 showCancelButton: true,
 confirmButtonColor: '#d33',
 cancelButtonColor: '#3085d6',
 confirmButtonText: t('yesDelete'),
 cancelButtonText: t('cancel')
 })

 if (!result.isConfirmed) return

 try {
 const token = await getIdToken()
 if (!token) throw new Error(t('noToken'))
 const res = await fetch('/api/user/profile', {
 method: 'DELETE',
 headers: { 'Authorization': `Bearer ${token}` },
 })
 if (!res.ok) {
 const data = await res.json().catch(() => ({}))
 throw new Error(data.error || t('deleteFailed'))
 }

 await Swal.fire({
 title: t('deleted'),
 text: t('accountDeletedSuccess'),
 icon: 'success',
 confirmButtonText: t('ok')
 })

 await logout()
 router.push('/')
 } catch (e: any) {
 await Swal.fire({
 title: t('error'),
 text: e.message || t('deleteError'),
 icon: 'error',
 confirmButtonText: t('ok')
 })
 }
 }

 const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
 try {
      // Apply theme immediately for visual feedback
 setTheme(newTheme)
 setProfile({ ...profile, theme: newTheme })

      // Save to database
 const token = await getIdToken()
 if (!token) return

 const res = await fetch('/api/user/profile', {
 method: 'PATCH',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`,
 },
 body: JSON.stringify({ theme: newTheme }),
 })

 if (!res.ok) {
 throw new Error('Failed to save theme preference')
 }
 } catch (error) {
      console.error('Error saving theme:', error)
      // Silently fail - theme is still applied visually
 }
 }

 const handleLogout = async () => {
 try {
 setIsLoggingOut(true)
 await logout()
 router.push('/')
 } catch (e: any) {
 await Swal.fire({
 title: t('error'),
 text: e.message || t('logoutError'),
 icon: 'error',
 confirmButtonText: t('ok')
 })
 } finally {
 setIsLoggingOut(false)
 }
 }

 const handleRefreshSettings = async () => {
 if (!user) return
 try {
 setIsLoading(true)
 const token = await getIdToken()
 if (!token) return

 const res = await fetch('/api/user/profile', {
 method: 'GET',
 headers: { 'Authorization': `Bearer ${token}` },
 })

 if (res.ok) {
 const data = await res.json()
 const profileData = data.profile || data.user
 if (profileData) {
 setProfileData(profileData)
 if (profileData.image) setProfileImage(profileData.image)
 const savedTheme = profileData.theme === 'auto' ? 'system' : (profileData.theme || 'system')
 setProfile(prev => ({
 ...prev,
 name: profileData.name || '',
 email: profileData.email || '',
 bio: profileData.bio || '',
 language: profileData.language || 'en',
 theme: savedTheme
 }))
 setPreferences(prev => ({
 ...prev,
 emailNotifications: profileData.emailNotifications ?? true,
 pushNotifications: profileData.pushNotifications ?? false,
 weeklyReport: profileData.weeklyReport ?? true,
 bookCompletionAlert: profileData.bookCompletionAlert ?? true
 }))
 }
 }
 } catch (error) {
      console.error('Error refreshing profile:', error)
 } finally {
 setIsLoading(false)
 }
 }

 // Data export handler (DSGVO Art. 20)
 const handleExportData = async () => {
   try {
     setIsExporting(true)
     const token = await getIdToken()
     if (!token) throw new Error('No token')
     
     const res = await fetch('/api/user/export-data', {
       method: 'POST',
       headers: { 
         'Authorization': `Bearer ${token}`,
         'Content-Type': 'application/json'
       },
     })
     
     // Handle rate limiting
     if (res.status === 429) {
       const data = await res.json()
       showToast(data.error || t('rateLimit'), 'warning')
       setIsExporting(false)
       return
     }
     
     if (!res.ok) {
       const errorData = await res.json().catch(() => ({}))
       throw new Error(errorData.error || 'Export failed')
     }
     
     const data = await res.json()
     const jsonString = JSON.stringify(data, null, 2)

     if (Capacitor.isNativePlatform()) {
       // Native (iOS/Android): save file then share
       try {
         const fileName = 'bookcraft-data-export.json'
         await Filesystem.writeFile({
           path: fileName,
           data: jsonString,
           directory: Directory.Cache,
           encoding: 'utf8' as Parameters<typeof Filesystem.writeFile>[0]['encoding'],
         })
         const fileUri = await Filesystem.getUri({ path: fileName, directory: Directory.Cache })
         await Share.share({
           title: 'BookCraft Datenexport',
           url: fileUri.uri,
           dialogTitle: 'Daten exportieren',
         })
       } catch {
         // Fallback: share as text
         await Share.share({
           title: 'BookCraft Datenexport',
           text: jsonString,
           dialogTitle: 'Daten exportieren',
         })
       }
       showToast(t('exportData') + ' ✓', 'success')
     } else {
       // Web: trigger file download
       const blob = new Blob([jsonString], { type: 'application/json' })
       const url = URL.createObjectURL(blob)
       const a = document.createElement('a')
       a.href = url
       a.download = 'bookcraft-data-export.json'
       document.body.appendChild(a)
       a.click()
       document.body.removeChild(a)
       URL.revokeObjectURL(url)
     }
   } catch (e: unknown) {
     const message = e instanceof Error ? e.message : 'Export failed'
     showToast(message, 'error')
   } finally {
     setIsExporting(false)
   }
 }

 // Password change handler
 const handlePasswordChange = async () => {
   setPasswordError('')
   if (passwordForm.newPassword.length < 6) {
     setPasswordError(t('passwordMinLength'))
     return
   }
   if (passwordForm.newPassword !== passwordForm.confirmPassword) {
     setPasswordError(t('passwordMismatch'))
     return
   }
   try {
     setIsChangingPassword(true)
     const token = await getIdToken()
     if (!token) throw new Error('No token')
     const res = await fetch('/api/user/password', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
       body: JSON.stringify({ password: passwordForm.newPassword }),
     })
     if (!res.ok) {
       const data = await res.json().catch(() => ({}))
       throw new Error(data.error || t('passwordChangeFailed'))
     }
     setPasswordForm({ newPassword: '', confirmPassword: '' })
     await Swal.fire({ title: t('success'), text: t('passwordChangedSuccess'), icon: 'success', timer: 2000, showConfirmButton: false })
   } catch (e: unknown) {
     const message = e instanceof Error ? e.message : t('passwordChangeFailed')
     setPasswordError(message)
   } finally {
     setIsChangingPassword(false)
   }
 }

 // Push notification toggle handler
 const handlePushToggle = async (enabled: boolean) => {
   if (!enabled) {
     // User is disabling — just update the preference
     setPreferences(prev => ({ ...prev, pushNotifications: false }))
     setPushPermissionDenied(false)
     return
   }

   // Prevent double-tap / re-entrant calls
   if (isPushRequesting) {
     console.log('[Settings] Push permission request already in progress, ignoring')
     return
   }

   if (isNativePlatform) {
     // Native: use Capacitor Push Notifications
     setIsPushRequesting(true)
     setDebugPushStep('importing...')
     try {
       const { getFcmTokenNative } = await import('@/lib/fcm-token-native')
       const { PushNotifications } = await import('@capacitor/push-notifications')

       setDebugPushStep('imported OK — activating optimistically...')
       setPushPermissionDenied(false)
       setPreferences(prev => ({ ...prev, pushNotifications: true }))

       // Request permission with timeout (shows OS dialog on fresh install)
       setDebugPushStep('requesting permission...')
       const permTimeout = new Promise<void>(resolve => setTimeout(resolve, 5000))
       await Promise.race([PushNotifications.requestPermissions().catch(() => {}), permTimeout])

       const saveToken = async (token: string) => {
         setDebugPushStep(`token: ${token.slice(0, 15)}...`)
         try {
           const authToken = await getIdToken()
           if (!authToken) { setDebugPushStep('ERROR: no auth token'); return }
           const res = await fetch('/api/device-tokens', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
             body: JSON.stringify({ token, platform: 'android' }),
           })
           if (!res.ok) {
             const body = await res.text().catch(() => '')
             setDebugPushStep(`save failed HTTP ${res.status}: ${body.slice(0, 50)}`)
           } else {
             setDebugPushStep('token saved to DB ✅')
           }
         } catch (err) {
           setDebugPushStep(`save error: ${err instanceof Error ? err.message : err}`)
         }
       }

       // Primary: native FcmTokenPlugin (reliable with remote URL)
       setDebugPushStep('calling native FcmTokenPlugin...')
       const nativeToken = await Promise.race([
         getFcmTokenNative(),
         new Promise<null>(resolve => setTimeout(() => resolve(null), 8000))
       ])
       if (nativeToken) {
         await saveToken(nativeToken)
       } else {
         // Fallback: standard register() fire-and-forget
         setDebugPushStep('native plugin timeout — fallback register()...')
         PushNotifications.addListener('registration', (t) => saveToken(t.value)).catch(() => {})
         PushNotifications.register().then(() => {
           setDebugPushStep('fallback register() called')
         }).catch(err => {
           setDebugPushStep(`fallback register() error: ${err?.message}`)
         })
       }

     } catch (err) {
       console.error('[Settings] Push notification setup error:', err)
       setDebugPushStep(`ERROR: ${err instanceof Error ? err.message : String(err)}`)
       setPreferences(prev => ({ ...prev, pushNotifications: false }))
     } finally {
       setIsPushRequesting(false)
     }
   } else {
     // Web: use browser Notification API
     if (typeof window !== 'undefined' && 'Notification' in window) {
       const permission = await Notification.requestPermission()
       if (permission !== 'granted') {
         setPushPermissionDenied(true)
         return
       }
       setPushPermissionDenied(false)
     }
     setPreferences(prev => ({ ...prev, pushNotifications: enabled }))
   }
 }

 if (!user) {
 return null
 }

 return (
 <div className="h-full flex flex-col bg-background">
 {/* Mobile App Bar */}
 <div className="lg:hidden">
 <AppBar
 title={t('settings')}
 subtitle={t('manageYourAccount')}
 />
 {saveStatus !== 'idle' && (
 <div className={`mx-6 -mt-2 mb-2 flex items-center justify-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
   saveStatus === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
   saveStatus === 'saving' ? 'bg-bookcraft-blue/10 text-bookcraft-blue dark:bg-bookcraft-blue/20 dark:text-bookcraft-blue/80' :
   saveStatus === 'saved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
 }`}>
   {saveStatus === 'pending' && <><Loader2 className="h-3 w-3 animate-spin" /> {t('pendingChanges')}</>}
   {saveStatus === 'saving' && <><Loader2 className="h-3 w-3 animate-spin" /> {t('saving')}</>}
   {saveStatus === 'saved' && <><Check className="h-3 w-3" /> {t('savedConfirm')}</>}
   {saveStatus === 'error' && <>{t('errorSaving')}</>}
 </div>
 )}
 </div>

 <PullToRefreshContainer onRefresh={handleRefreshSettings} className="flex-1 min-h-0">
 <div className="px-6 py-6 pb-[calc(10rem+env(safe-area-inset-bottom))] lg:pb-8">
 {/* Desktop Header */}
 <div className="hidden lg:block mb-8">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">{t('settings')}</h1>
 <p className="text-muted-foreground mt-1">{t('manageYourAccount')}</p>
 </div>
 {saveStatus !== 'idle' && (
 <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
   saveStatus === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
   saveStatus === 'saving' ? 'bg-bookcraft-blue/10 text-bookcraft-blue dark:bg-bookcraft-blue/20 dark:text-bookcraft-blue/80' :
   saveStatus === 'saved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
 }`}>
   {saveStatus === 'pending' && <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('pendingChanges')}</>}
   {saveStatus === 'saving' && <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('saving')}</>}
   {saveStatus === 'saved' && <><Check className="h-3.5 w-3.5" /> {t('savedConfirm')}</>}
   {saveStatus === 'error' && <>{t('errorSaving')}</>}
 </div>
 )}
 </div>
 </div>

 <div className="space-y-8">

 {/* Profile Settings - iOS Style */}
 <Card className="mobile-card overflow-hidden">
 <div className="bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/10 dark:to-background p-6 border-b border-border">
 <div className="flex items-center space-x-3">
 <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
 <User className="h-5 w-5 text-primary" />
 </div>
 <div>
 <h2 className="text-xl font-bold font-display text-foreground">{t('profileSettings')}</h2>
 <p className="text-sm text-muted-foreground">{t('profileSettingsDesc')}</p>
 </div>
 </div>
 </div>
 
 <div className="p-6">

 {/* Profile Picture */}
 <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-8 pb-6 border-b border-border">
 <div className="relative flex-shrink-0">
 <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center">
 {isGeneratingAvatar ? (
 <div className="absolute inset-0 bg-gradient-to-r from-bookcraft-blue via-bookcraft-blue to-bookcraft-magenta animate-pulse rounded-full" />
 ) : profileImage ? (
 <img
 src={profileImage}
 alt={t('profilePicture')}
 className="w-full h-full object-cover"
 />
 ) : (
 <User className="w-12 h-12 text-muted-foreground" />
 )}
 {isGeneratingAvatar && (
 <div className="absolute inset-0 flex items-center justify-center">
 </div>
 )}
 </div>
 <label
 htmlFor="profile-image-upload"
 className={`absolute bottom-0 right-0 w-8 h-8 bg-bookcraft-blue rounded-full flex items-center justify-center cursor-pointer hover:brightness-110 transition-colors ${isUploadingImage || isGeneratingAvatar ? 'opacity-50 cursor-not-allowed' : ''}`}
 >
 {isUploadingImage ? (
 <Loader2 className="w-4 h-4 text-white animate-spin" />
 ) : (
 <Camera className="w-4 h-4 text-white" />
 )}
 </label>
 <input
 id="profile-image-upload"
 type="file"
 accept="image/*"
 onChange={handleImageUpload}
 disabled={isUploadingImage || isGeneratingAvatar}
 className="hidden"
 />
 </div>
 <div className="flex-1">
 <h3 className="font-medium text-foreground">{t('profilePicture')}</h3>
 <p className="text-sm text-muted-foreground mb-3">{t('profilePictureDesc')}</p>
 <Button
 onClick={handleGenerateAvatar}
 disabled={isGeneratingAvatar || isUploadingImage}
 variant="outline"
 className="flex items-center gap-2 bg-gradient-to-r from-bookcraft-blue/5 to-bookcraft-blue/5 dark:from-bookcraft-blue/10 dark:to-bookcraft-blue/10 border-bookcraft-blue/20 dark:border-bookcraft-blue/30 hover:from-bookcraft-blue/10 hover:to-bookcraft-blue/10 dark:hover:from-bookcraft-blue/20 dark:hover:to-bookcraft-blue/20 text-bookcraft-blue dark:text-bookcraft-blue/80"
 >
 {isGeneratingAvatar ? (
 <>
 <Loader2 className="w-4 h-4 animate-spin" />
 <span>{t('generatingAvatar')}</span>
 </>
 ) : (
 <>
 <span>{t('generateAIAvatar')}</span>
 </>
 )}
 </Button>
 <p className="text-xs text-muted-foreground mt-2">{t('aiAvatarHint')}</p>
 </div>
 </div>

 {isLoading ? (
 <div className="animate-pulse space-y-4">
 <div className="h-4 bg-muted rounded w-1/4"></div>
 <div className="h-10 bg-muted rounded"></div>
 <div className="h-4 bg-muted rounded w-1/4"></div>
 <div className="h-10 bg-muted rounded"></div>
 </div>
 ) : (
 <div className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <Label htmlFor="name" className="text-sm font-semibold text-foreground mb-2 block">
 {t('name')}
 </Label>
 <Input
 id="name"
 type="text"
 value={profile.name}
 onChange={(e) => setProfile({ ...profile, name: e.target.value })}
 placeholder={t('fullName')}
 className="h-14 text-base touch-target"
 autoComplete="name"
 />
 </div>

 <div>
 <Label htmlFor="email" className="text-sm font-semibold text-foreground mb-2 block">
 {t('email')}
 </Label>
 <Input
 id="email"
 type="email"
 value={profile.email}
 onChange={(e) => setProfile({ ...profile, email: e.target.value })}
 placeholder={t('emailAddress')}
 className="h-14 text-base touch-target"
 autoComplete="email"
 inputMode="email"
 />
 </div>
 </div>

 <div>
 <Label htmlFor="bio" className="text-sm font-semibold text-foreground mb-2 block">
 {t('biography')}
 </Label>
 <Textarea
 id="bio"
 value={profile.bio}
 onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
 placeholder={t('tellAboutYourself')}
 rows={4}
 className="text-base touch-target min-h-[120px] rounded-2xl border-2"
 />
 </div>
 
 {/* Language Selection */}
 <div className="pt-4 border-t border-border">
 <div className="flex items-center gap-2 mb-4">
 <Globe className="h-5 w-5 text-primary" />
 <Label className="text-base font-medium text-foreground">
 {t('language')}
 </Label>
 </div>
 <Select
 value={profile.language}
 onValueChange={(value) => {
 setProfile({ ...profile, language: value as Language })
 setAppLanguage(value as Language)
 }}
 >
 <SelectTrigger className="h-14 rounded-2xl border-2 bg-muted/30 text-base">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
 <SelectItem value="en">🇬🇧 English</SelectItem>
 <SelectItem value="es">🇪🇸 Español</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="pt-6 border-t border-border">
 <Label className="text-sm font-semibold text-foreground mb-4 block">
 {t('design')}
 </Label>
 {mounted ? (
 <Select value={currentTheme || 'system'} onValueChange={(value) => handleThemeChange(value as 'light' | 'dark' | 'system')}>
 <SelectTrigger className="h-14 rounded-2xl border-2 bg-muted/30 text-base">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="light">{t('light')}</SelectItem>
 <SelectItem value="dark">{t('dark')}</SelectItem>
 <SelectItem value="system">{t('system')}</SelectItem>
 </SelectContent>
 </Select>
 ) : (
 <div className="rounded-2xl bg-muted h-14 w-full animate-pulse" />
 )}
 <p className="text-xs text-muted-foreground mt-2">
 {t('themeDescription') || 'The theme will be applied and saved immediately.'}
 </p>
 </div>
 

 </div>
 )}
 </div>
 </Card>

 {/* Orders */}
 <Card className="mobile-card overflow-hidden">
 <Link
 href="/dashboard/orders"
 className="flex items-center justify-between p-6 hover:bg-muted/30 active:bg-muted/50 transition-all duration-150 touch-target"
 >
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
 <Package className="h-5 w-5 text-primary" />
 </div>
 <div>
 <span className="font-semibold text-foreground block">{t('ordersTitle')}</span>
 <span className="text-sm text-muted-foreground">{t('ordersSubtitle')}</span>
 </div>
 </div>
 <ChevronRight className="h-5 w-5 text-muted-foreground" />
 </Link>
 </Card>

 {/* Subscription / Plan Card */}
 <Card className="mobile-card overflow-hidden">
 <div className="bg-gradient-to-br from-amber-50/50 to-background dark:from-amber-950/10 dark:to-background p-6 border-b border-border">
 <div className="flex items-center space-x-3">
 <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
 <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
 </div>
 <div>
 <h2 className="text-xl font-bold font-display text-foreground">{t('yourPlan')}</h2>
 <p className="text-sm text-muted-foreground">
 {isNativePlatform
 ? (nativePlatform === 'ios' ? t('subscriptionViaAppStore') : t('subscriptionViaGooglePlay'))
 : t('currentSubscriptionAndUpgrades')}
 </p>
 </div>
 </div>
 </div>
 <div className="p-6 space-y-4">
 {isLoadingSubscription ? (
 <div className="animate-pulse space-y-2">
 <div className="h-4 bg-muted rounded w-1/3"></div>
 <div className="h-4 bg-muted rounded w-1/4"></div>
 </div>
 ) : (
 <>
 <div className="flex items-center justify-between">
 <div>
 <div className="font-semibold text-foreground text-base">
 {subscription?.plan && subscription.plan !== 'free'
 ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1) + ' Plan'
 : t('freePlan')}
 </div>
 <div className="text-sm text-muted-foreground mt-1">
 {subscription?.status === 'active' ? t('subscriptionActive') : t('noActiveSubscription')}
 </div>
 {/* Native platform indicator */}
 {isNativePlatform && (
 <div className="flex items-center gap-1 mt-1 text-xs text-primary">
 <Smartphone className="h-3 w-3" />
 <span>{nativePlatform === 'ios' ? 'App Store' : 'Google Play'}</span>
 </div>
 )}
 </div>
 <Button
 variant="outline"
 className="flex items-center gap-2 border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30"
 onClick={() => openProSheet('create-limit')}
 >
 <CreditCard className="h-4 w-4" />
 {subscription?.status === 'active' ? t('manage') : t('upgrade')}
 <ArrowUpRight className="h-3 w-3" />
 </Button>
 </div>

 {/* Restore Purchases — only shown on native platforms (App Store requirement) */}
 {isNativePlatform && subscription?.status !== 'active' && (
 <div className="pt-2 border-t border-border">
 {restoreMessage && (
 <p className="text-sm text-bookcraft-blue dark:text-bookcraft-blue/80 mb-2">{restoreMessage}</p>
 )}
 <Button
 variant="ghost"
 size="sm"
 disabled={isIAPLoading}
 className="w-full text-muted-foreground hover:text-foreground"
 onClick={async () => {
 setRestoreMessage(null)
 const result = await restorePurchases()
 if (result.success && result.plan) {
 // Reload subscription from API
 try {
 const token = await getIdToken()
 const res = await fetch('/api/user/subscription', {
 headers: { Authorization: `Bearer ${token}` },
 })
 if (res.ok) {
 const data = await res.json()
 setSubscription(data.subscription)
 }
 } catch { /* ignore */ }
 setRestoreMessage(t('subscriptionRestored'))
 } else {
 setRestoreMessage(result.error ?? t('noActiveSubscriptionFound'))
 }
 }}
 >
 <RotateCcw className="h-4 w-4 mr-2" />
 {isIAPLoading ? t('restoringPurchases') : t('restorePurchases')}
 </Button>
 </div>
 )}
 </>
 )}
 </div>
 </Card>

 {/* Notification Settings - iOS Style */}
 <Card className="mobile-card overflow-hidden">
 <div className="bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/10 dark:to-background p-6 border-b border-border">
 <div className="flex items-center space-x-3">
 <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
 <Bell className="h-5 w-5 text-primary" />
 </div>
 <div>
 <h2 className="text-xl font-bold font-display text-foreground">{t('notifications')}</h2>
 <p className="text-sm text-muted-foreground">{t('notificationPreferencesDesc')}</p>
 </div>
 </div>
 </div>

 <div className="divide-y divide-border">
 <div className="flex items-center justify-between gap-4 px-6 py-5 hover:bg-muted/30 active:bg-muted/50 transition-colors">
 <div className="flex-1 min-w-0">
 <div className="font-semibold text-foreground text-base">{t('emailNotifications')}</div>
 <div className="text-sm text-muted-foreground mt-1 leading-relaxed">
 {t('emailNotificationsFullDesc')}
 </div>
 </div>
 <label className="relative inline-flex items-center cursor-pointer touch-target flex-shrink-0">
 <input
 type="checkbox"
 checked={preferences.emailNotifications}
 onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
 className="sr-only peer"
 />
 <div className="relative w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bookcraft-blue/30 dark:peer-focus:ring-bookcraft-blue/30 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-sm peer-checked:bg-bookcraft-blue dark:peer-checked:bg-bookcraft-blue peer-checked:after:shadow-md"></div>
 </label>
 </div>

 <div className="flex items-center justify-between gap-4 px-6 py-5 hover:bg-muted/30 active:bg-muted/50 transition-colors">
 <div className="flex-1 min-w-0">
 <div className="font-semibold text-foreground text-base">{t('pushNotifications')}</div>
 <div className="text-sm text-muted-foreground mt-1 leading-relaxed">
 {!isNativePlatform
 ? t('pushOnlyInApp')
 : !pushSupported
 ? t('noPushSupport')
 : pushPermissionDenied
 ? t('pushDeniedDevice')
 : t('pushOnDevice')}
 </div>
 {!isNativePlatform && (
 <div className="mt-1.5 inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
 <Smartphone className="h-3 w-3" />
 <span>{t('pushOnlyInApp').split('.')[0]}</span>
 </div>
 )}
 </div>
 <label className={`relative inline-flex items-center touch-target flex-shrink-0 ${!isNativePlatform || !pushSupported || isPushRequesting ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
 <input
 type="checkbox"
 checked={isNativePlatform ? preferences.pushNotifications : false}
 onChange={(e) => {
   console.log('[Settings] Push toggle onChange — checked:', e.target.checked, '| isNative:', isNativePlatform)
   handlePushToggle(e.target.checked)
 }}
 disabled={!isNativePlatform || !pushSupported || isPushRequesting}
 className="sr-only peer"
 />
 <div className="relative w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bookcraft-blue/30 dark:peer-focus:ring-bookcraft-blue/30 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-sm peer-checked:bg-bookcraft-blue dark:peer-checked:bg-bookcraft-blue peer-checked:after:shadow-md"></div>
 </label>
 </div>

 <div className="flex items-center justify-between gap-4 px-6 py-5 hover:bg-muted/30 active:bg-muted/50 transition-colors">
 <div className="flex-1 min-w-0">
 <div className="font-semibold text-foreground text-base">{t('weeklyReport')}</div>
 <div className="text-sm text-muted-foreground mt-1 leading-relaxed">
 {t('weeklyReportFullDesc')}
 </div>
 </div>
 <label className="relative inline-flex items-center cursor-pointer touch-target flex-shrink-0">
 <input
 type="checkbox"
 checked={preferences.weeklyReport}
 onChange={(e) => setPreferences({ ...preferences, weeklyReport: e.target.checked })}
 className="sr-only peer"
 />
 <div className="relative w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bookcraft-blue/30 dark:peer-focus:ring-bookcraft-blue/30 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-sm peer-checked:bg-bookcraft-blue dark:peer-checked:bg-bookcraft-blue peer-checked:after:shadow-md"></div>
 </label>
 </div>

 <div className="flex items-center justify-between gap-4 px-6 py-5 hover:bg-muted/30 active:bg-muted/50 transition-colors">
 <div className="flex-1 min-w-0">
 <div className="font-semibold text-foreground text-base">{t('bookCompletionTitle')}</div>
 <div className="text-sm text-muted-foreground mt-1 leading-relaxed">
 {t('bookCompletionFullDesc')}
 </div>
 </div>
 <label className="relative inline-flex items-center cursor-pointer touch-target flex-shrink-0">
 <input
 type="checkbox"
 checked={preferences.bookCompletionAlert}
 onChange={(e) => setPreferences({ ...preferences, bookCompletionAlert: e.target.checked })}
 className="sr-only peer"
 />
 <div className="relative w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bookcraft-blue/30 dark:peer-focus:ring-bookcraft-blue/30 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-sm peer-checked:bg-bookcraft-blue dark:peer-checked:bg-bookcraft-blue peer-checked:after:shadow-md"></div>
 </label>
 </div>

 </div>
 

 </Card>

 {/* Password Change Card — only for email users */}
 {isEmailUser && (
 <Card className="mobile-card overflow-hidden">
 <div className="bg-gradient-to-br from-green-50/50 to-background dark:from-green-950/10 dark:to-background p-6 border-b border-border">
 <div className="flex items-center space-x-3">
 <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
 <Lock className="h-5 w-5 text-green-600 dark:text-green-400" />
 </div>
 <div>
 <h2 className="text-xl font-bold font-display text-foreground">{t('changePasswordTitle')}</h2>
 <p className="text-sm text-muted-foreground">{t('changePasswordSubtitle')}</p>
 </div>
 </div>
 </div>
 <div className="p-6 space-y-4">
 <div>
 <Label htmlFor="new-password" className="text-sm font-semibold text-foreground mb-2 block">
 {t('newPasswordLabel')}
 </Label>
 <Input
 id="new-password"
 type="password"
 value={passwordForm.newPassword}
 onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
 placeholder={t('minSixChars')}
 className="h-14 text-base touch-target"
 autoComplete="new-password"
 />
 </div>
 <div>
 <Label htmlFor="confirm-password" className="text-sm font-semibold text-foreground mb-2 block">
 {t('confirmPasswordLabel')}
 </Label>
 <Input
 id="confirm-password"
 type="password"
 value={passwordForm.confirmPassword}
 onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
 placeholder={t('repeatPassword')}
 className="h-14 text-base touch-target"
 autoComplete="new-password"
 />
 </div>
 {passwordError && (
 <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>
 )}
 <Button
 onClick={handlePasswordChange}
 disabled={isChangingPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
 className="w-full h-12 text-base font-semibold rounded-2xl"
 >
 {isChangingPassword ? (
 <>
 <Loader2 className="h-5 w-5 mr-2 animate-spin" />
 {t('changingPassword')}
 </>
 ) : (
 <>
 <Lock className="h-5 w-5 mr-2" />
 {t('changePasswordTitle')}
 </>
 )}
 </Button>
 </div>
 </Card>
 )}

 {/* Session Management - iOS Style */}
 <Card className="mobile-card overflow-hidden">
 <div className="bg-gradient-to-br from-red-50/50 to-background dark:from-red-950/10 dark:to-background p-6 border-b border-border">
 <div className="flex items-center space-x-3">
 <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
 <LogOut className="h-5 w-5 text-red-600 dark:text-red-400" />
 </div>
 <div>
 <h2 className="text-xl font-bold font-display text-foreground">{t('session')}</h2>
 <p className="text-sm text-muted-foreground">{t('signOutDesc')}</p>
 </div>
 </div>
 </div>

 <div className="p-6">
 <div className="flex items-center justify-between">
 <div className="flex-1 pr-4">
 <div className="font-semibold text-foreground text-base">{t('logout')}</div>
 <div className="text-sm text-muted-foreground mt-1">
 {t('logoutDesc')}
 </div>
 </div>
 <Button
 onClick={handleLogout}
 variant="outline"
 disabled={isLoggingOut}
 className="flex items-center space-x-2 h-12 px-6 rounded-2xl border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30 touch-target"
 >
 {isLoggingOut ? (
 <>
 <Loader2 className="h-5 w-5 animate-spin" />
 <span>{t('loggingOut')}</span>
 </>
 ) : (
 <>
 <LogOut className="h-5 w-5" />
 <span>{t('logout')}</span>
 </>
 )}
 </Button>
 </div>
 </div>
 </Card>

 {/* Data & Privacy */}
 <Card className="p-6">
 <div className="flex items-center space-x-2 mb-6">
 <Download className="h-5 w-5 text-primary" />
 <h2 className="text-xl font-semibold text-foreground">{t('dataPrivacy')}</h2>
 </div>

 <div className="space-y-4">
 {/* Data export button */}
 <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30">
 <div>
 <div className="font-medium text-foreground">{t('exportData')}</div>
 <div className="text-sm text-muted-foreground">{t('exportDataDescription')}</div>
 </div>
 <Button
 variant="outline"
 onClick={handleExportData}
 disabled={isExporting}
 className="flex items-center gap-2"
 >
 {isExporting ? (
 <Loader2 className="h-4 w-4 animate-spin" />
 ) : (
 <Download className="h-4 w-4" />
 )}
 {isExporting ? t('exportingData') : t('exportData')}
 </Button>
 </div>

 <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-950">
 <div>
 <div className="font-medium text-red-900 dark:text-red-200">{t('deleteAccount')}</div>
 <div className="text-sm text-red-600 dark:text-red-400">{t('deleteAccountPermanentDesc')}</div>
 </div>
 <Button variant="outline" onClick={handleDeleteAccount} className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950">
 <Trash2 className="h-4 w-4 mr-2" />
 {t('delete')}
 </Button>
 </div>
 </div>
 </Card>


 {/* Legal & Privacy - iOS Style */}
 <Card className="mobile-card overflow-hidden">
 <div className="bg-gradient-to-br from-gray-50/50 to-background dark:from-gray-950/10 dark:to-background p-6 border-b border-border">
 <div className="flex items-center space-x-3">
 <div className="w-10 h-10 bg-gray-100 dark:bg-gray-900/30 rounded-xl flex items-center justify-center">
 <Scale className="h-5 w-5 text-gray-600 dark:text-gray-400" />
 </div>
 <div>
 <h2 className="text-xl font-bold font-display text-foreground">{t('legalPrivacy')}</h2>
 <p className="text-sm text-muted-foreground">{t('legalPrivacyDesc')}</p>
 </div>
 </div>
 </div>

 <div className="divide-y divide-border">
 <Link
 href="/impressum"
 className="flex items-center justify-between p-6 hover:bg-muted/30 active:bg-muted/50 transition-all duration-150 touch-target"
 >
 <div className="flex items-center gap-4">
 <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
 <FileText className="h-4 w-4 text-primary" />
 </div>
 <span className="font-semibold text-foreground">{t('imprint')}</span>
 </div>
 <ChevronRight className="h-5 w-5 text-muted-foreground" />
 </Link>

 <Link
 href="/agb"
 className="flex items-center justify-between p-6 hover:bg-muted/30 active:bg-muted/50 transition-all duration-150 touch-target"
 >
 <div className="flex items-center gap-4">
 <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
 <FileText className="h-4 w-4 text-primary" />
 </div>
 <span className="font-semibold text-foreground">{t('termsConditions')}</span>
 </div>
 <ChevronRight className="h-5 w-5 text-muted-foreground" />
 </Link>

 <Link
 href="/datenschutz"
 className="flex items-center justify-between p-6 hover:bg-muted/30 active:bg-muted/50 transition-all duration-150 touch-target"
 >
 <div className="flex items-center gap-4">
 <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
 <FileText className="h-4 w-4 text-primary" />
 </div>
 <span className="font-semibold text-foreground">{t('privacyPolicy')}</span>
 </div>
 <ChevronRight className="h-5 w-5 text-muted-foreground" />
 </Link>

 <Link
 href="/widerruf"
 className="flex items-center justify-between p-6 hover:bg-muted/30 active:bg-muted/50 transition-all duration-150 touch-target"
 >
 <div className="flex items-center gap-4">
 <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
 <FileText className="h-4 w-4 text-primary" />
 </div>
 <span className="font-semibold text-foreground">{t('rightOfWithdrawal')}</span>
 </div>
 <ChevronRight className="h-5 w-5 text-muted-foreground" />
 </Link>
 </div>
 </Card>
 </div>
 </div>
 </PullToRefreshContainer>
 </div>
 )
}
