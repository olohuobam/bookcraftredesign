'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
 Dialog,
 DialogContent,
 DialogTrigger,
 DialogTitle,
 DialogDescription
} from '@/components/ui/dialog'
import { User, LogOut, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import { useNotifications } from '@/context/NotificationContext'
import { useAuthModal } from '@/context/AuthModalContext'

// Validation schemas (messages shown in UI via t() function)
const loginSchema = z.object({
 email: z.string().email('invalidEmail'),
 password: z.string().min(1, 'passwordRequired'),
})

const registerSchema = z.object({
 name: z.string().min(2, 'nameTooShort'),
 email: z.string().email('invalidEmail'),
 password: z.string().min(6, 'passwordTooShort'),
})

type LoginFormData = z.infer<typeof loginSchema>
type RegisterFormData = z.infer<typeof registerSchema>

export default function AuthButton() {
 const { user, login, loginWithGoogle, loginWithApple, register, logout, isLoading: authLoading } = useAuth()
 const { t } = useLanguage()
 const router = useRouter()
 const { addNotification } = useNotifications()
 const { isRegisterRequested, clearAuthModalRequest } = useAuthModal()
 const [isLoginOpen, setIsLoginOpen] = useState(false)
 const [isRegisterOpen, setIsRegisterOpen] = useState(false)

  // Open login dialog when requested via context (e.g. "Get Started" buttons)
  // This ensures "Get Started" behaves exactly like the Login button in navigation
 useEffect(() => {
 if (isRegisterRequested && !user) {
 setIsLoginOpen(true)
 clearAuthModalRequest()
 } else if (isRegisterRequested && user) {
 clearAuthModalRequest()
 router.push('/dashboard')
 }
 }, [isRegisterRequested, user, clearAuthModalRequest, router])
 const [isLoading, setIsLoading] = useState(false)
 const [isLoggingOut, setIsLoggingOut] = useState(false)
 const [error, setError] = useState('')
 const [showPassword, setShowPassword] = useState(false)
 const [showRegisterPassword, setShowRegisterPassword] = useState(false)

 const loginForm = useForm<LoginFormData>({
 resolver: zodResolver(loginSchema),
 })

 const registerForm = useForm<RegisterFormData>({
 resolver: zodResolver(registerSchema),
 })

 const onLogin = async (data: LoginFormData) => {
 setIsLoading(true)
 setError('')

 try {
 const success = await login(data.email, data.password)
 if (success) {
 setIsLoginOpen(false)
 loginForm.reset()
 router.push('/dashboard')
 addNotification({ type: 'success', title: t('welcomeBack'), message: t('loggedInSuccess') })
 } else {
 setError(t('invalidCredentials'))
 }
 } catch (err: any) {
      console.error('Login error:', err)
 const errorMsg = err?.message || ''

      // Show specific Supabase error messages
 if (errorMsg.includes('Invalid login credentials')) {
 setError(t('invalidCredentials'))
 } else if (errorMsg.includes('Email not confirmed')) {
 setError(t('emailNotConfirmed'))
 } else if (errorMsg.includes('User not found')) {
 setError(t('userNotFound'))
 } else if (errorMsg.includes('too many requests') || errorMsg.includes('rate limit')) {
 setError(t('tooManyRequests'))
 } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
 setError(t('networkError'))
 } else if (errorMsg.includes('Invalid email')) {
 setError(t('invalidEmail'))
 } else if (errorMsg.includes('missing email') || errorMsg.includes('email is required')) {
 setError(t('emailRequired'))
 } else if (errorMsg.includes('missing password') || errorMsg.includes('password is required')) {
 setError(t('passwordRequired'))
 } else {
 setError(errorMsg || t('errorOccurred'))
 }
 } finally {
 setIsLoading(false)
 }
 }

 const onRegister = async (data: RegisterFormData) => {
 setIsLoading(true)
 setError('')

 try {
 const success = await register(data.name, data.email, data.password)
 if (success) {
 setIsRegisterOpen(false)
 registerForm.reset()
 router.push('/dashboard')
 addNotification({ type: 'success', title: t('welcomeNew'), message: t('accountCreated') })
 } else {
 setError(t('emailTaken'))
 }
 } catch (err: any) {
      console.error('Registration error:', err)
 const errorMsg = err?.message || ''

      // Show specific error messages
 if (errorMsg.includes('User already registered')) {
 setError(t('userAlreadyRegistered'))
 } else if (errorMsg.includes('Invalid email') || errorMsg.includes('invalid email')) {
 setError(t('invalidEmail'))
 } else if (errorMsg.includes('Password') && errorMsg.includes('6')) {
 setError(t('passwordTooShort'))
 } else if (errorMsg.includes('too many requests') || errorMsg.includes('rate limit')) {
 setError(t('tooManyRequests'))
 } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
 setError(t('networkError'))
 } else if (errorMsg.includes('weak password')) {
 setError(t('weakPassword'))
 } else if (errorMsg.includes('missing email') || errorMsg.includes('email is required')) {
 setError(t('emailRequired'))
 } else if (errorMsg.includes('missing password') || errorMsg.includes('password is required')) {
 setError(t('passwordRequired'))
 } else {
 setError(errorMsg || t('errorOccurred'))
 }
 } finally {
 setIsLoading(false)
 }
 }

 const onGoogleLogin = async () => {
 setIsLoading(true)
 try {
 await loginWithGoogle()
 } catch {
 setError(t('googleLoginFailed'))
 } finally {
 setIsLoading(false)
 }
 }

 const onAppleLogin = async () => {
 setIsLoading(true)
 try {
 await loginWithApple()
 } catch {
 setError(t('appleLoginFailed'))
 } finally {
 setIsLoading(false)
 }
 }

 const onLogout = async () => {
 setIsLoggingOut(true)
 try {
 await logout()
 router.push('/')
 } catch {
      // ignore
 } finally {
 setIsLoggingOut(false)
 }
 }

  // Only show loading placeholder if no dialog is open
 if (authLoading && !isLoginOpen && !isRegisterOpen) {
 return (
 <div className="h-9 w-20 rounded-lg bg-muted animate-pulse" />
 )
 }

 if (user) {
 return (
 <div className="flex items-center gap-2">
 <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
 <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
 <span className="text-xs font-semibold text-primary-foreground">
 {(user.name || user.email || 'U')[0].toUpperCase()}
 </span>
 </div>
 <span className="text-sm font-medium text-foreground max-w-[80px] truncate hidden sm:block">
 {user.name || user.email?.split('@')[0]}
 </span>
 </div>
 <Button
 onClick={onLogout}
 variant="ghost"
 size="icon"
 disabled={isLoggingOut}
 className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
 >
 {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
 </Button>
 </div>
 )
 }

 return (
 <div className="flex items-center gap-2">
 {/* Login Dialog */}
 <Dialog open={isLoginOpen} onOpenChange={(open) => { setIsLoginOpen(open); setError('') }}>
 <DialogTrigger asChild>
 <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
 {t('login')}
 </Button>
 </DialogTrigger>
 <DialogContent className="sm:max-w-md p-0 overflow-hidden max-h-[95vh] overflow-y-auto">
 <div className="p-4 pt-6 pb-4 sm:p-8">
 <div className="mb-6 sm:mb-8">
 <DialogTitle className="text-2xl sm:text-2xl font-bold font-display text-foreground">
 {t('loginTitle')}
 </DialogTitle>
 <DialogDescription className="text-sm text-muted-foreground mt-2">
 {t('welcomeBackAuthor')}
 </DialogDescription>
 </div>

 <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5">
 {error && (
 <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
 <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
 </div>
 )}

 <div className="space-y-2">
 <label className="text-sm font-semibold text-foreground">{t('emailLabel')}</label>
 <div className="relative">
 <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
 <Input
 type="email"
 placeholder={t('emailPlaceholderShort')}
 autoComplete="email"
 {...loginForm.register('email')}
 className="pl-12 h-14 text-base rounded-2xl touch-target"
 inputMode="email"
 enterKeyHint="next"
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-sm font-semibold text-foreground">{t('passwordLabel')}</label>
 <div className="relative">
 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
 <Input
 type={showPassword ? 'text' : 'password'}
 placeholder={t('yourPassword')}
 autoComplete="current-password"
 {...loginForm.register('password')}
 className="pl-12 pr-14 h-14 text-base rounded-2xl touch-target"
 enterKeyHint="done"
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-2 top-1/2 -translate-y-1/2 p-3 min-w-[48px] min-h-[48px] flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-transform rounded-xl touch-target"
 >
 {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
 </button>
 </div>
 </div>

 <Button
 type="submit"
 disabled={isLoading}
 className="w-full h-14 text-base font-semibold rounded-2xl mt-4 bg-bookcraft-blue hover:brightness-110 shadow-lg touch-target"
 >
 {isLoading ? (
 <Loader2 className="h-5 w-5 animate-spin" />
 ) : (
 t('signIn')
 )}
 </Button>

 <div className="relative my-6">
 <div className="absolute inset-0 flex items-center">
 <div className="w-full border-t border-border" />
 </div>
 <div className="relative flex justify-center">
 <span className="px-4 text-sm text-muted-foreground bg-background">{t('or')}</span>
 </div>
 </div>

 <Button
 type="button"
 variant="outline"
 onClick={onGoogleLogin}
 disabled={isLoading}
 className="w-full h-14 text-base font-medium rounded-2xl border-2 touch-target"
 >
 <svg className="h-5 w-5 mr-2.5" viewBox="0 0 24 24">
 <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
 <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
 <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
 <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
 </svg>
 {t('continueWithGoogle')}
 </Button>

 <Button
 type="button"
 variant="outline"
 onClick={onAppleLogin}
 disabled={isLoading}
 className="w-full h-14 text-base font-medium rounded-2xl border-2 touch-target bg-black text-white border-black hover:bg-gray-900"
 >
 <svg className="h-5 w-5 mr-2.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
 <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
 </svg>
 Mit Apple anmelden
 </Button>

 <p className="text-center text-sm text-muted-foreground pt-3 pb-1">
 {t('noAccountYet')}{' '}
 <button
 type="button"
 onClick={() => { setIsLoginOpen(false); setIsRegisterOpen(true); setError('') }}
 className="font-medium text-primary hover:underline active:opacity-70 min-h-[44px] inline-flex items-center"
 >
 {t('registerTitle')}
 </button>
 </p>
 </form>
 </div>
 </DialogContent>
 </Dialog>

 {/* Register Dialog */}
 <Dialog open={isRegisterOpen} onOpenChange={(open) => { setIsRegisterOpen(open); setError('') }}>
 <DialogTrigger asChild>
 <Button size="sm">
 {t('registerTitle')}
 </Button>
 </DialogTrigger>
 <DialogContent className="sm:max-w-md p-0 overflow-hidden max-h-[95vh] overflow-y-auto">
 <div className="p-4 pt-6 pb-4 sm:p-8">
 <div className="mb-6 sm:mb-8">
 <DialogTitle className="text-2xl sm:text-2xl font-bold font-display text-foreground">
 {t('createAccount')}
 </DialogTitle>
 <DialogDescription className="text-sm text-muted-foreground mt-2">
 {t('startYourAuthorJourney')}
 </DialogDescription>
 </div>

 <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-5">
 {error && (
 <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
 <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
 </div>
 )}

 <div className="space-y-2">
 <label className="text-sm font-semibold text-foreground">{t('nameLabel')}</label>
 <div className="relative">
 <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
 <Input
 type="text"
 placeholder={t('yourName')}
 autoComplete="name"
 {...registerForm.register('name')}
 className="pl-12 h-14 text-base rounded-2xl touch-target"
 enterKeyHint="next"
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-sm font-semibold text-foreground">{t('emailLabel')}</label>
 <div className="relative">
 <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
 <Input
 type="email"
 placeholder={t('emailPlaceholderShort')}
 autoComplete="email"
 {...registerForm.register('email')}
 className="pl-12 h-14 text-base rounded-2xl touch-target"
 inputMode="email"
 enterKeyHint="next"
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-sm font-semibold text-foreground">{t('passwordLabel')}</label>
 <div className="relative">
 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
 <Input
 type={showRegisterPassword ? 'text' : 'password'}
 placeholder={t('minCharacters')}
 autoComplete="new-password"
 {...registerForm.register('password')}
 className="pl-12 pr-14 h-14 text-base rounded-2xl touch-target"
 enterKeyHint="done"
 />
 <button
 type="button"
 onClick={() => setShowRegisterPassword(!showRegisterPassword)}
 className="absolute right-2 top-1/2 -translate-y-1/2 p-3 min-w-[48px] min-h-[48px] flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-transform rounded-xl touch-target"
 >
 {showRegisterPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
 </button>
 </div>
 </div>

 <Button
 type="submit"
 disabled={isLoading}
 className="w-full h-14 text-base font-semibold rounded-2xl mt-4 bg-bookcraft-blue hover:brightness-110 shadow-lg touch-target"
 >
 {isLoading ? (
 <Loader2 className="h-5 w-5 animate-spin" />
 ) : (
 t('registerTitle')
 )}
 </Button>

 <div className="relative my-5">
 <div className="absolute inset-0 flex items-center">
 <div className="w-full border-t border-border" />
 </div>
 <div className="relative flex justify-center">
 <span className="px-3 text-xs text-muted-foreground bg-background">{t('or')}</span>
 </div>
 </div>

 <Button
 type="button"
 variant="outline"
 onClick={onGoogleLogin}
 disabled={isLoading}
 className="w-full h-12 text-base font-medium rounded-xl"
 >
 <svg className="h-5 w-5 mr-2.5" viewBox="0 0 24 24">
 <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
 <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
 <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
 <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
 </svg>
 {t('registerWithGoogle')}
 </Button>

 <Button
 type="button"
 variant="outline"
 onClick={onAppleLogin}
 disabled={isLoading}
 className="w-full h-12 text-base font-medium rounded-xl bg-black text-white border-black hover:bg-gray-900"
 >
 <svg className="h-5 w-5 mr-2.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
 <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
 </svg>
 Mit Apple registrieren
 </Button>

 <p className="text-center text-sm text-muted-foreground pt-3 pb-1">
 {t('alreadyRegistered')}{' '}
 <button
 type="button"
 onClick={() => { setIsRegisterOpen(false); setIsLoginOpen(true); setError('') }}
 className="font-medium text-primary hover:underline active:opacity-70 min-h-[44px] inline-flex items-center"
 >
 {t('login')}
 </button>
 </p>
 </form>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 )
}
