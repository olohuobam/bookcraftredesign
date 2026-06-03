'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { useLanguage } from '@/context/LanguageContext'

export default function AppLoginScreen({ initialMode = 'login' }: { initialMode?: 'login' | 'register' }) {
 const { login, loginWithGoogle, loginWithApple, register } = useAuth()
 const { t } = useLanguage()
 const router = useRouter()
 const [mode, setMode] = useState<'login' | 'register'>(initialMode)
 const [email, setEmail] = useState('')
 const [password, setPassword] = useState('')
 const [name, setName] = useState('')
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState<string | null>(null)
 const [focusedField, setFocusedField] = useState<string | null>(null)
 const [formKey, setFormKey] = useState(0)
 const [emailStep, setEmailStep] = useState<1 | 2>(1)
 const [keyboardHeight, setKeyboardHeight] = useState(0)
 const passwordInputRef = useRef<HTMLInputElement | null>(null)
 const scrollContainerRef = useRef<HTMLDivElement | null>(null)
 const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keyboard height tracking for mobile — prevents keyboard from covering form fields
 useEffect(() => {
 if (!Capacitor.isNativePlatform()) return
 let cancelled = false
 let showListener: { remove: () => Promise<void> | void } | null = null
 let showDidListener: { remove: () => Promise<void> | void } | null = null
 let hideListener: { remove: () => Promise<void> | void } | null = null
 let hideDidListener: { remove: () => Promise<void> | void } | null = null
 const handleShow = (info: { keyboardHeight: number }) => {
 if (cancelled) return
 setKeyboardHeight(info.keyboardHeight)
 // Clear any pending scroll timer before scheduling a new one
 if (scrollTimerRef.current !== null) clearTimeout(scrollTimerRef.current)
 scrollTimerRef.current = setTimeout(() => {
 scrollTimerRef.current = null
 if (cancelled) return
 const el = scrollContainerRef.current
 if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
 }, 100)
 }
 const handleHide = () => {
 if (cancelled) return
 setKeyboardHeight(0)
 }
 const setup = async () => {
 try {
 const { Keyboard } = await import('@capacitor/keyboard')
 if (cancelled) return
 showListener = await Keyboard.addListener('keyboardWillShow', handleShow)
 showDidListener = await Keyboard.addListener('keyboardDidShow', handleShow)
 hideListener = await Keyboard.addListener('keyboardWillHide', handleHide)
 hideDidListener = await Keyboard.addListener('keyboardDidHide', handleHide)
 // If cleanup ran while we were awaiting, remove listeners immediately
 if (cancelled) {
 void showListener?.remove()
 void showDidListener?.remove()
 void hideListener?.remove()
 void hideDidListener?.remove()
 showListener = null
 showDidListener = null
 hideListener = null
 hideDidListener = null
 }
 } catch (err) {
 console.error('Failed to set up keyboard listeners', err)
 }
 }
 void setup()
 return () => {
 cancelled = true
 if (scrollTimerRef.current !== null) {
 clearTimeout(scrollTimerRef.current)
 scrollTimerRef.current = null
 }
 void showListener?.remove()
 void showDidListener?.remove()
 void hideListener?.remove()
 void hideDidListener?.remove()
 showListener = null
 showDidListener = null
 hideListener = null
 hideDidListener = null

 }
 }, [])

  // Handle OAuth deep link callback on native platforms
 useEffect(() => {
 if (!Capacitor.isNativePlatform()) return
 let handle: { remove: () => void } | null = null
 const setup = async () => {
 const { App: CapacitorApp } = await import('@capacitor/app')
 const { Browser } = await import('@capacitor/browser')
 const sub = await CapacitorApp.addListener('appUrlOpen', async (data) => {
 if (data.url?.startsWith('com.bookcraft.app://login-callback')) {
 await Browser.close()
          // Auth state handled by Supabase session listener in AuthContext
 }
 })
 handle = sub
 }
 setup()
 return () => { handle?.remove() }
 }, [])

 const handleGoogleLogin = async () => {
 setLoading(true)
 setError(null)
 try {
 await loginWithGoogle()
 } catch (e: any) {
 setError(e.message || 'Google Login fehlgeschlagen')
 } finally {
 setLoading(false)
 }
 }

 const handleAppleLogin = async () => {
 setLoading(true)
 setError(null)
 try {
 await loginWithApple()
 } catch (e: any) {
 setError(e.message || 'Apple Login fehlgeschlagen')
 } finally {
 setLoading(false)
 }
 }

 // Focus password field when step changes to 2, with cleanup
 useEffect(() => {
 if (emailStep === 2) {
 const timer = setTimeout(() => {
 passwordInputRef.current?.focus()
 }, 350)
 return () => clearTimeout(timer)
 }
 }, [emailStep])

 const handleEmailContinue = (e: React.FormEvent<HTMLFormElement>) => {
 e.preventDefault()
 setError(null)
 if (!e.currentTarget.checkValidity()) {
 e.currentTarget.reportValidity()
 return
 }
 setEmailStep(2)
 }

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 setLoading(true)
 setError(null)
 try {
 if (mode === 'login') {
 await login(email, password)
 } else {
 await register(name, email, password)
 }
 router.replace('/dashboard')
 } catch (e: any) {
 setError(e.message || 'Ein Fehler ist aufgetreten')
 setLoading(false)
 }
 }

 const switchMode = (newMode: 'login' | 'register') => {
 setMode(newMode)
 setError(null)
 setEmailStep(1)
 setPassword('')
 setFormKey(k => k + 1)
 }

 const handleBackToEmail = () => {
 setEmailStep(1)
 setPassword('')
 setError(null)
 }

 return (
 <>
 <style>{`
 @keyframes float {
 0%, 100% { transform: translateY(0px); }
 50% { transform: translateY(-8px); }
 }
 @keyframes fadeSlideUp {
 from { opacity: 0; transform: translateY(20px); }
 to { opacity: 1; transform: translateY(0); }
 }
 @keyframes fieldIn {
 from { opacity: 0; transform: translateY(12px); }
 to { opacity: 1; transform: translateY(0); }
 }
 @keyframes stepSlideIn {
 from { opacity: 0; transform: translateX(30px); }
 to { opacity: 1; transform: translateX(0); }
 }
 @keyframes googleGlow {
 0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); }
 50% { box-shadow: 0 0 0 3px rgba(245,158,11,0.15), 0 4px 20px rgba(245,158,11,0.1); }
 }
 @keyframes shake {
 0%, 100% { transform: translateX(0); }
 15% { transform: translateX(-6px); }
 30% { transform: translateX(6px); }
 45% { transform: translateX(-4px); }
 60% { transform: translateX(4px); }
 75% { transform: translateX(-2px); }
 90% { transform: translateX(2px); }
 }
 @keyframes orb1 {
 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
 33% { transform: translate(30px, -20px) scale(1.1); opacity: 0.6; }
 66% { transform: translate(-20px, 15px) scale(0.9); opacity: 0.3; }
 }
 @keyframes orb2 {
 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
 50% { transform: translate(-25px, 20px) scale(1.15); opacity: 0.5; }
 }
 @keyframes shimmer {
 0% { background-position: -200% center; }
 100% { background-position: 200% center; }
 }
 @keyframes fadeMode {
 from { opacity: 0; transform: translateY(6px); }
 to { opacity: 1; transform: translateY(0); }
 }
 @keyframes noise {
 0% { transform: translate(0, 0); }
 10% { transform: translate(-5%, -5%); }
 20% { transform: translate(-10%, 5%); }
 30% { transform: translate(5%, -10%); }
 40% { transform: translate(-5%, 15%); }
 50% { transform: translate(-10%, 5%); }
 60% { transform: translate(15%, 0%); }
 70% { transform: translate(0%, 10%); }
 80% { transform: translate(-15%, 0%); }
 90% { transform: translate(10%, 5%); }
 100% { transform: translate(5%, 0%); }
 }
 .login-screen-enter {
 animation: fadeSlideUp 0.6s ease both;
 }
 .logo-float {
 animation: float 3s ease-in-out infinite;
 }
 .google-btn {
 animation: googleGlow 2.5s ease-in-out infinite;
 transition: transform 0.15s ease, opacity 0.15s ease;
 }
 .google-btn:hover:not(:disabled) {
 transform: translateY(-1px);
 }
 .google-btn:active:not(:disabled) {
 transform: scale(0.97);
 }
 .submit-btn {
 transition: transform 0.1s ease, opacity 0.15s ease, box-shadow 0.2s ease;
 }
 .submit-btn:hover:not(:disabled) {
 box-shadow: 0 6px 28px rgba(245,158,11,0.5) !important;
 transform: translateY(-1px);
 }
 .submit-btn:active:not(:disabled) {
 transform: scale(0.95) !important;
 }
 .error-shake {
 animation: shake 0.5s ease both;
 }
 .mode-fade {
 animation: fadeMode 0.35s ease both;
 }
 .step-slide-in {
 animation: stepSlideIn 0.3s ease both;
 }
 .app-login-screen input::placeholder {
 color: rgba(255,255,255,0.3);
 }
 .app-login-screen input:-webkit-autofill {
 -webkit-box-shadow: 0 0 0 50px #1a1014 inset !important;
 -webkit-text-fill-color: #fff !important;
 }
 @media (prefers-reduced-motion: reduce) {
 .logo-float, .google-btn, .login-screen-enter, .mode-fade, .error-shake, .step-slide-in {
 animation: none !important;
 transition: none !important;
 }
 div[style*="animation"] {
 animation: none !important;
 }
 }
 `}</style>

 <div
 ref={scrollContainerRef}
 className="app-login-screen"
 style={{
 position: 'fixed',
 inset: 0,
 background: 'linear-gradient(160deg, #0d0d0d 0%, #130f1a 50%, #0f1020 100%)',
 display: 'flex',
 flexDirection: 'column',
 alignItems: 'center',
 justifyContent: 'flex-start',
 paddingTop: 'max(32px, env(safe-area-inset-top))',
 paddingBottom: keyboardHeight > 0 ? `${keyboardHeight + 16}px` : 'max(32px, env(safe-area-inset-bottom))',
 paddingLeft: 24,
 paddingRight: 24,
 overflowY: 'auto',
 WebkitOverflowScrolling: 'touch',
 fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
 transition: 'padding-bottom 0.25s ease',
 }}
 >
 {/* Background orbs */}
 <div style={{
 position: 'fixed',
 top: '20%',
 left: '15%',
 width: 300,
 height: 300,
 borderRadius: '50%',
 background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)',
 animation: 'orb1 8s ease-in-out infinite',
 pointerEvents: 'none',
 filter: 'blur(20px)',
 }} />
 <div style={{
 position: 'fixed',
 bottom: '25%',
 right: '10%',
 width: 250,
 height: 250,
 borderRadius: '50%',
 background: 'radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 70%)',
 animation: 'orb2 10s ease-in-out infinite',
 pointerEvents: 'none',
 filter: 'blur(25px)',
 }} />
 {/* Noise texture overlay */}
 <div style={{
 position: 'fixed',
 inset: '-50%',
 backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
 backgroundSize: '150px 150px',
 opacity: 0.5,
 pointerEvents: 'none',
 animation: 'noise 8s steps(2) infinite',
 }} />

 {/* Main content — centered when keyboard closed, scrollable when open */}
 <div
 className="login-screen-enter"
 style={{
 width: '100%',
 maxWidth: 380,
 position: 'relative',
 zIndex: 1,
 marginTop: keyboardHeight > 0 ? 0 : 'auto',
 marginBottom: keyboardHeight > 0 ? 0 : 'auto',
 paddingTop: keyboardHeight > 0 ? 0 : 24,
 paddingBottom: 24,
 }}
 >
 
 {/* Logo area — hidden when keyboard is open to save space */}
 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: keyboardHeight > 0 ? 0 : 40, overflow: 'hidden', maxHeight: keyboardHeight > 0 ? 0 : 200, transition: 'max-height 0.25s ease, margin-bottom 0.25s ease' }}>
 {/* Glow behind logo */}
 <div style={{
 position: 'relative',
 marginBottom: 20,
 }}>
 <div style={{
 position: 'absolute',
 inset: -12,
 borderRadius: '50%',
 background: 'radial-gradient(circle, rgba(245,158,11,0.25) 0%, transparent 70%)',
 filter: 'blur(8px)',
 }} />
 <div
 className="logo-float"
 style={{
 width: 96,
 height: 96,
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 position: 'relative',
 }}
 >
 {/* Official Bookcraft Logo */}
 <img
 src="/Logo/Logo.svg"
 alt="Bookcraft"
 width={96}
 height={96}
 style={{ objectFit: 'contain' }}
 />
 </div>
 </div>

 <h1 style={{
 color: '#ffffff',
 fontSize: 28,
 fontWeight: 800,
 marginBottom: 8,
 letterSpacing: '-0.5px',
 textAlign: 'center',
 }}>
 Bookcraft
 </h1>
 <p style={{
 color: 'rgba(255,255,255,0.4)',
 fontSize: 14,
 textAlign: 'center',
 letterSpacing: '0.3px',
 }}>
 {t('yourBooksYourStory')}
 </p>
 </div>

 {/* Mode label */}
 <p
 key={`label-${mode}`}
 className="mode-fade"
 style={{
 color: 'rgba(255,255,255,0.6)',
 fontSize: 13,
 fontWeight: 500,
 textAlign: 'center',
 marginBottom: 20,
 textTransform: 'uppercase',
 letterSpacing: '1px',
 }}
 >
 {mode === 'login' ? t('signIn') : t('registerTitle')}
 </p>

 {/* Google button */}
 <button
 className="google-btn"
 onClick={handleGoogleLogin}
 disabled={loading}
 style={{
 width: '100%',
 padding: '14px 20px',
 borderRadius: 14,
 background: 'rgba(255,255,255,0.05)',
 border: '1px solid rgba(255,255,255,0.12)',
 color: '#ffffff',
 fontSize: 15,
 fontWeight: 600,
 cursor: loading ? 'not-allowed' : 'pointer',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 gap: 10,
 marginBottom: 20,
 opacity: loading ? 0.6 : 1,
 backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
 backdropFilter: 'blur(10px)',
 boxSizing: 'border-box',
 }}
 >
 <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
 <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
 <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
 <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
 <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
 </svg>
 Mit Google {mode === 'login' ? 'anmelden' : 'registrieren'}
 </button>

 {/* Apple button */}
 <button
 onClick={handleAppleLogin}
 disabled={loading}
 style={{
 width: '100%',
 padding: '14px 20px',
 borderRadius: 14,
 background: '#000000',
 border: '1px solid rgba(255,255,255,0.18)',
 color: '#ffffff',
 fontSize: 15,
 fontWeight: 600,
 cursor: loading ? 'not-allowed' : 'pointer',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 gap: 10,
 marginBottom: 20,
 opacity: loading ? 0.6 : 1,
 transition: 'transform 0.15s ease, opacity 0.15s ease',
 boxSizing: 'border-box',
 }}
 onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)' }}
 onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)' }}
 onMouseDown={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)' }}
 onMouseUp={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)' }}
 >
 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="white">
 <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
 </svg>
 Mit Apple {mode === 'login' ? 'anmelden' : 'registrieren'}
 </button>

 {/* Divider */}
 <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
 <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
 <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, letterSpacing: '0.5px' }}>{t('or').toUpperCase()}</span>
 <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
 </div>

 {/* Shared error display — rendered once, above both step forms */}
 {error && (
 <div
 key={error}
 className="error-shake"
 style={{
 color: '#fca5a5',
 fontSize: 13,
 textAlign: 'center',
 padding: '10px 14px',
 borderRadius: 10,
 background: 'rgba(248,113,113,0.1)',
 border: '1px solid rgba(248,113,113,0.2)',
 marginBottom: 4,
 }}
 >
 {error}
 </div>
 )}

 {/* Form — Step-by-Step */}
 {emailStep === 1 ? (
 <form
 key={`form-step1-${formKey}`}
 onSubmit={handleEmailContinue}
 className="step-slide-in"
 style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
 >
 {mode === 'register' && (
 <div style={{
 animation: 'fieldIn 0.4s ease 0.05s both',
 }}>
 <input
 type="text"
 placeholder={t('yourName')}
 value={name}
 onChange={(e) => setName(e.target.value)}
 onFocus={() => setFocusedField('name')}
 onBlur={() => setFocusedField(null)}
 required
 style={{
 width: '100%',
 padding: '15px 16px',
 borderRadius: 14,
 background: 'rgba(255,255,255,0.05)',
 border: `1px solid ${focusedField === 'name' ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.1)'}`,
 color: '#ffffff',
 fontSize: 15,
 outline: 'none',
 boxSizing: 'border-box',
 transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
 boxShadow: focusedField === 'name' ? '0 0 0 3px rgba(245,158,11,0.12), inset 0 1px 0 rgba(255,255,255,0.05)' : 'inset 0 1px 0 rgba(255,255,255,0.04)',
 }}
 />
 </div>
 )}

 <div style={{ animation: 'fieldIn 0.4s ease 0.1s both' }}>
 <input
 type="email"
 placeholder={t('emailAddress')}
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 onFocus={() => setFocusedField('email')}
 onBlur={() => setFocusedField(null)}
 required
 autoFocus
 style={{
 width: '100%',
 padding: '15px 16px',
 borderRadius: 14,
 background: 'rgba(255,255,255,0.05)',
 border: `1px solid ${focusedField === 'email' ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.1)'}`,
 color: '#ffffff',
 fontSize: 15,
 outline: 'none',
 boxSizing: 'border-box',
 transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
 boxShadow: focusedField === 'email' ? '0 0 0 3px rgba(245,158,11,0.12), inset 0 1px 0 rgba(255,255,255,0.05)' : 'inset 0 1px 0 rgba(255,255,255,0.04)',
 }}
 />
 </div>

 <div style={{ animation: 'fieldIn 0.4s ease 0.2s both', marginTop: 4 }}>
 <button
 type="submit"
 disabled={loading}
 className="submit-btn"
 style={{
 width: '100%',
 padding: '16px 20px',
 borderRadius: 14,
 background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
 border: 'none',
 color: '#0f0f0f',
 fontSize: 16,
 fontWeight: 700,
 cursor: loading ? 'not-allowed' : 'pointer',
 opacity: loading ? 0.7 : 1,
 boxShadow: '0 4px 20px rgba(245,158,11,0.35)',
 letterSpacing: '0.2px',
 boxSizing: 'border-box',
 }}
 >
 Weiter
 </button>
 </div>
 </form>
 ) : (
 <form
 key={`form-step2-${formKey}`}
 onSubmit={handleSubmit}
 className="step-slide-in"
 style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
 >
 {/* Email display with back button */}
 <button
 type="button"
 onClick={handleBackToEmail}
 aria-label={t('changeEmailAddress')}
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: 10,
 padding: '12px 16px',
 borderRadius: 14,
 background: 'rgba(255,255,255,0.03)',
 border: '1px solid rgba(255,255,255,0.08)',
 color: 'rgba(255,255,255,0.5)',
 fontSize: 14,
 cursor: 'pointer',
 textAlign: 'left',
 transition: 'background 0.15s ease, border-color 0.15s ease',
 boxSizing: 'border-box',
 }}
 onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
 onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
 >
 <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
 <path d="M10 12L6 8L10 4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
 </svg>
 <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
 </button>

 <div style={{ animation: 'fieldIn 0.3s ease both' }}>
 <input
 ref={passwordInputRef}
 type="password"
 placeholder={t('passwordLabel')}
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 onFocus={() => setFocusedField('password')}
 onBlur={() => setFocusedField(null)}
 required
 minLength={6}
 style={{
 width: '100%',
 padding: '15px 16px',
 borderRadius: 14,
 background: 'rgba(255,255,255,0.05)',
 border: `1px solid ${focusedField === 'password' ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.1)'}`,
 color: '#ffffff',
 fontSize: 15,
 outline: 'none',
 boxSizing: 'border-box',
 transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
 boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(245,158,11,0.12), inset 0 1px 0 rgba(255,255,255,0.05)' : 'inset 0 1px 0 rgba(255,255,255,0.04)',
 }}
 />
 </div>

 <div style={{ animation: 'fieldIn 0.3s ease 0.1s both', marginTop: 4 }}>
 <button
 type="submit"
 disabled={loading}
 className="submit-btn"
 style={{
 width: '100%',
 padding: '16px 20px',
 borderRadius: 14,
 background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
 border: 'none',
 color: '#0f0f0f',
 fontSize: 16,
 fontWeight: 700,
 cursor: loading ? 'not-allowed' : 'pointer',
 opacity: loading ? 0.7 : 1,
 boxShadow: '0 4px 20px rgba(245,158,11,0.35)',
 letterSpacing: '0.2px',
 boxSizing: 'border-box',
 }}
 >
 {loading ? '···' : mode === 'login' ? 'Anmelden' : 'Registrieren'}
 </button>
 </div>
 </form>
 )}

 {/* Mode switch */}
 <p
 key={`toggle-${mode}`}
 className="mode-fade"
 style={{
 color: 'rgba(255,255,255,0.4)',
 fontSize: 14,
 textAlign: 'center',
 marginTop: 28,
 }}
 >
 {mode === 'login' ? (
 <>
 Noch kein Account?{' '}
 <button
 onClick={() => switchMode('register')}
 style={{
 color: '#F59E0B',
 background: 'none',
 border: 'none',
 cursor: 'pointer',
 fontSize: 14,
 fontWeight: 700,
 padding: 0,
 transition: 'opacity 0.15s ease',
 }}
 >
 Registrieren
 </button>
 </>
 ) : (
 <>
 Bereits ein Account?{' '}
 <button
 onClick={() => switchMode('login')}
 style={{
 color: '#F59E0B',
 background: 'none',
 border: 'none',
 cursor: 'pointer',
 fontSize: 14,
 fontWeight: 700,
 padding: 0,
 transition: 'opacity 0.15s ease',
 }}
 >
 Anmelden
 </button>
 </>
 )}
 </p>

 </div>
 </div>
 </>
 )
}
