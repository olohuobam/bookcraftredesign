'use client'

import { useRef, useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'

interface AppOnboardingProps {
 onComplete: (action: 'login' | 'register') => void
}

export default function AppOnboarding({ onComplete }: AppOnboardingProps) {
 const { t } = useLanguage()
 const [currentSlide, setCurrentSlide] = useState(0)
 const containerRef = useRef<HTMLDivElement>(null)

 const handleScroll = () => {
 if (!containerRef.current) return
 const scrollLeft = containerRef.current.scrollLeft
 const width = containerRef.current.offsetWidth
 const index = Math.round(scrollLeft / width)
 setCurrentSlide(index)
 }

 const scrollToSlide = (index: number) => {
 if (!containerRef.current) return
 const width = containerRef.current.offsetWidth
 containerRef.current.scrollTo({ left: index * width, behavior: 'smooth' })
 setCurrentSlide(index)
 }

 const handleSkip = () => scrollToSlide(2)

 return (
 <>
 <style>{`
 @keyframes bc-orb1 {
 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
 33% { transform: translate(20px, -30px) scale(1.08); opacity: 0.7; }
 66% { transform: translate(-15px, 20px) scale(0.94); opacity: 0.4; }
 }
 @keyframes bc-orb2 {
 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.35; }
 50% { transform: translate(-20px, 25px) scale(1.12); opacity: 0.55; }
 }
 @keyframes bc-orb3 {
 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; }
 40% { transform: translate(25px, -15px) scale(1.06); opacity: 0.4; }
 75% { transform: translate(-10px, 10px) scale(0.96); opacity: 0.2; }
 }
 @keyframes bc-float {
 0%, 100% { transform: translateY(0px) rotate(0deg); }
 50% { transform: translateY(-10px) rotate(2deg); }
 }
 @keyframes bc-fadeUp {
 from { opacity: 0; transform: translateY(24px); }
 to { opacity: 1; transform: translateY(0); }
 }
 @keyframes bc-scaleIn {
 from { opacity: 0; transform: scale(0.8); }
 to { opacity: 1; transform: scale(1); }
 }
 @keyframes bc-shimmer {
 0% { background-position: -200% center; }
 100% { background-position: 200% center; }
 }
 @keyframes bc-pulse-ring {
 0% { transform: scale(1); opacity: 0.6; }
 70% { transform: scale(1.5); opacity: 0; }
 100% { transform: scale(1.5); opacity: 0; }
 }

 .bc-logo-wrap { animation: bc-float 4s ease-in-out infinite; }
 .bc-title { animation: bc-fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.15s both; }
 .bc-tagline { animation: bc-fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.28s both; }
 .bc-sub { animation: bc-fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.4s both; }
 .bc-feat-head { animation: bc-fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
 .bc-feat-grid { animation: bc-fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.25s both; }
 .bc-cta-icon { animation: bc-scaleIn 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.1s both; }
 .bc-cta-head { animation: bc-fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.22s both; }
 .bc-cta-desc { animation: bc-fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.34s both; }
 .bc-cta-btns { animation: bc-fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.46s both; }

 .bc-shimmer-text {
 background: linear-gradient(90deg, #F59E0B 0%, #FCD34D 40%, #F59E0B 80%, #D97706 100%);
 background-size: 200% auto;
 -webkit-background-clip: text;
 background-clip: text;
 -webkit-text-fill-color: transparent;
 animation: bc-shimmer 3s linear infinite;
 }

 .bc-skip-btn {
 transition: color 0.2s ease, opacity 0.2s ease;
 }
 .bc-skip-btn:hover { opacity: 1 !important; color: #F59E0B !important; }
 .bc-skip-btn:active { transform: scale(0.96); }

 .bc-dot {
 transition: width 0.35s cubic-bezier(0.34,1.56,0.64,1),
 background 0.3s ease;
 }

 .bc-btn-primary {
 transition: transform 0.15s ease, box-shadow 0.2s ease;
 }
 .bc-btn-primary:active { transform: scale(0.96); }
 .bc-btn-primary:hover {
 box-shadow: 0 6px 32px rgba(245,158,11,0.55) !important;
 }

 .bc-btn-secondary {
 transition: transform 0.15s ease, background 0.2s ease, border-color 0.2s ease;
 }
 .bc-btn-secondary:active { transform: scale(0.96); }
 .bc-btn-secondary:hover {
 background: rgba(255,255,255,0.12) !important;
 border-color: rgba(255,255,255,0.25) !important;
 }

 .bc-feature-card {
 transition: transform 0.2s ease, box-shadow 0.2s ease;
 }
 .bc-feature-card:active {
 transform: scale(0.97);
 }

        /* hide scrollbar */
 .bc-slide-container::-webkit-scrollbar { display: none; }
 .bc-slide-container { -ms-overflow-style: none; scrollbar-width: none; }

 @media (prefers-reduced-motion: reduce) {
 .bc-logo-wrap, .bc-title, .bc-tagline, .bc-sub,
 .bc-feat-head, .bc-feat-grid, .bc-cta-icon,
 .bc-cta-head, .bc-cta-desc, .bc-cta-btns,
 .bc-shimmer-text { animation: none !important; }
 }
 `}</style>

 <div
 style={{
 position: 'fixed',
 inset: 0,
 background: 'linear-gradient(160deg, #0d0b08 0%, #150f0a 40%, #1a1020 80%, #0f0d1a 100%)',
 display: 'flex',
 flexDirection: 'column',
 overflow: 'hidden',
 fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
 }}
 >
 {/* Background orbs */}
 <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
 <div style={{
 position: 'absolute', top: '-5%', left: '-10%',
 width: 420, height: 420, borderRadius: '50%',
 background: 'radial-gradient(circle, rgba(245,158,11,0.18) 0%, transparent 68%)',
 filter: 'blur(24px)',
 animation: 'bc-orb1 9s ease-in-out infinite',
 }} />
 <div style={{
 position: 'absolute', bottom: '10%', right: '-8%',
 width: 380, height: 380, borderRadius: '50%',
 background: 'radial-gradient(circle, rgba(180,100,60,0.14) 0%, transparent 68%)',
 filter: 'blur(30px)',
 animation: 'bc-orb2 11s ease-in-out infinite',
 }} />
 <div style={{
 position: 'absolute', top: '40%', left: '30%',
 width: 300, height: 300, borderRadius: '50%',
 background: 'radial-gradient(circle, rgba(120,80,200,0.08) 0%, transparent 70%)',
 filter: 'blur(20px)',
 animation: 'bc-orb3 13s ease-in-out infinite',
 }} />
 <div style={{
 position: 'absolute', inset: 0,
 backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`,
 backgroundSize: '180px 180px',
 opacity: 0.6,
 }} />
 </div>

 {/* Skip button */}
 {currentSlide < 2 && (
 <button
 className="bc-skip-btn"
 onClick={handleSkip}
 style={{
 position: 'absolute',
 top: 'max(52px, calc(env(safe-area-inset-top) + 16px))',
 right: 24,
 zIndex: 20,
 color: 'rgba(255,255,255,0.45)',
 fontSize: 15,
 fontWeight: 500,
 background: 'none',
 border: 'none',
 cursor: 'pointer',
 padding: '8px 4px',
 letterSpacing: '0.1px',
 }}
 >
 {t('skipTour')}
 </button>
 )}

 {/* Slide container */}
 <div
 ref={containerRef}
 className="bc-slide-container"
 onScroll={handleScroll}
 style={{
 display: 'flex',
 flex: 1,
 overflowX: 'scroll',
 scrollSnapType: 'x mandatory',
 WebkitOverflowScrolling: 'touch',
 }}
 >

 {/* SLIDE 1 — Intro */}
 <div
 style={{
 minWidth: '100%',
 scrollSnapAlign: 'start',
 display: 'flex',
 flexDirection: 'column',
 alignItems: 'center',
 justifyContent: 'center',
 padding: '80px 32px 40px',
 textAlign: 'center',
 position: 'relative',
 }}
 >
 {/* Official Bookcraft Logo */}
 <div className="bc-logo-wrap" style={{ position: 'relative', marginBottom: 36 }}>
 {/* pulse ring */}
 <div style={{
 position: 'absolute', inset: -16, borderRadius: '50%',
 border: '2px solid rgba(245,158,11,0.3)',
 animation: 'bc-pulse-ring 2.8s ease-out infinite',
 }} />
 {/* glow halo */}
 <div style={{
 position: 'absolute', inset: -20, borderRadius: '50%',
 background: 'radial-gradient(circle, rgba(245,158,11,0.22) 0%, transparent 70%)',
 filter: 'blur(10px)',
 }} />
 {/* logo box */}
 <div style={{
 width: 120, height: 120,
 borderRadius: 32,
 background: 'linear-gradient(145deg, #1a1410 0%, #0d0b08 100%)',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 boxShadow: '0 0 50px rgba(245,158,11,0.35), 0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
 position: 'relative',
 overflow: 'hidden',
 border: '1px solid rgba(245,158,11,0.2)',
 }}>
 <img
 src="/Logo/Logo.svg"
 alt="Bookcraft"
 style={{ width: 88, height: 88, objectFit: 'contain' }}
 />
 </div>
 </div>

 {/* Bookcraft wordmark */}
 <h1
 className="bc-title"
 style={{
 fontSize: 40,
 fontWeight: 800,
 letterSpacing: '-1px',
 color: '#ffffff',
 marginBottom: 14,
 lineHeight: 1.1,
 }}
 >
 Bookcraft
 </h1>

 {/* Tagline */}
 <p
 className="bc-tagline bc-shimmer-text"
 style={{
 fontSize: 20,
 fontWeight: 700,
 marginBottom: 16,
 letterSpacing: '0.1px',
 }}
 >
 Dein Buch. Deine Geschichte.
 </p>

 {/* Subtitle */}
 <p
 className="bc-sub"
 style={{
 color: 'rgba(255,255,255,0.48)',
 fontSize: 16,
 lineHeight: 1.65,
 maxWidth: 290,
 }}
 >
 {t('aiCreatesYourPersonalBook')} —<br />
 {t('inMinutesNotMonths')}
 </p>
 </div>

 {/* SLIDE 2 — Features */}
 <div
 style={{
 minWidth: '100%',
 scrollSnapAlign: 'start',
 display: 'flex',
 flexDirection: 'column',
 alignItems: 'center',
 justifyContent: 'center',
 padding: '80px 24px 40px',
 textAlign: 'center',
 }}
 >
 {/* Heading */}
 <div className="bc-feat-head">
 <div style={{
 display: 'inline-block',
 background: 'rgba(245,158,11,0.12)',
 border: '1px solid rgba(245,158,11,0.25)',
 borderRadius: 100,
 padding: '5px 14px',
 marginBottom: 18,
 }}>
 <span style={{ color: '#F59E0B', fontSize: 12, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
 Alles inklusive
 </span>
 </div>

 <h2 style={{
 color: '#ffffff',
 fontSize: 30,
 fontWeight: 800,
 marginBottom: 10,
 letterSpacing: '-0.5px',
 lineHeight: 1.2,
 }}>
 Von der Idee<br />zum fertigen Buch.
 </h2>
 <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: 15, marginBottom: 40 }}>
 Alles was du brauchst — auf einen Klick.
 </p>
 </div>

 {/* Feature cards */}
 <div
 className="bc-feat-grid"
 style={{
 display: 'flex',
 flexDirection: 'column',
 gap: 14,
 width: '100%',
 maxWidth: 380,
 }}
 >
 {[
 {
 icon: (
 <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
 <path d="M12 20h9"/>
 <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
 </svg>
 ),
 gradient: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.08))',
 border: 'rgba(245,158,11,0.2)',
 title: 'KI schreibt für dich',
 desc: 'Lass die KI deine Geschichte professionell ausformulieren.',
 accent: '#F59E0B',
 },
 {
 icon: (
 <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
 <circle cx="13.5" cy="6.5" r="2.5"/>
 <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2z"/>
 <path d="m5 15 4-4 3 3 3-3 4 4"/>
 </svg>
 ),
 gradient: 'linear-gradient(135deg, rgba(62,134,215,0.12), rgba(62,134,215,0.06))',
 border: 'rgba(62,134,215,0.2)',
 title: 'KI illustriert dein Buch',
 desc: 'Einzigartige Illustrationen passend zu deiner Geschichte.',
 accent: '#3b82f6',
 },
 {
 icon: (
 <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
 <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
 <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
 </svg>
 ),
 gradient: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.06))',
 border: 'rgba(16,185,129,0.2)',
 title: 'Druck oder digital teilen',
 desc: 'Als Hardcover oder digital mit Familie & Freunden teilen.',
 accent: '#10B981',
 },
 ].map((feat) => (
 <div
 key={feat.title}
 className="bc-feature-card"
 style={{
 background: feat.gradient,
 border: `1px solid ${feat.border}`,
 borderRadius: 20,
 padding: '18px 20px',
 display: 'flex',
 alignItems: 'center',
 gap: 16,
 textAlign: 'left',
 }}
 >
 <div style={{
 width: 52, height: 52, flexShrink: 0,
 borderRadius: 16,
 background: 'rgba(255,255,255,0.07)',
 border: `1px solid ${feat.border}`,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 }}>
 {feat.icon}
 </div>
 <div>
 <p style={{
 color: '#ffffff', fontSize: 15, fontWeight: 700,
 marginBottom: 4, letterSpacing: '-0.2px',
 }}>
 {feat.title}
 </p>
 <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 1.5 }}>
 {feat.desc}
 </p>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* SLIDE 3 — CTA */}
 <div
 style={{
 minWidth: '100%',
 scrollSnapAlign: 'start',
 display: 'flex',
 flexDirection: 'column',
 alignItems: 'center',
 justifyContent: 'center',
 padding: '80px 32px 40px',
 textAlign: 'center',
 }}
 >
 {/* Hero illustration */}
 <div className="bc-cta-icon" style={{ position: 'relative', marginBottom: 36 }}>
 {/* glow disc */}
 <div style={{
 position: 'absolute', inset: -24, borderRadius: '50%',
 background: 'radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 68%)',
 filter: 'blur(12px)',
 }} />
 <div style={{
 width: 120, height: 120,
 borderRadius: 36,
 background: 'linear-gradient(145deg, rgba(245,158,11,0.15) 0%, rgba(180,83,9,0.1) 100%)',
 border: '1px solid rgba(245,158,11,0.25)',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 position: 'relative',
 backdropFilter: 'blur(10px)',
 boxShadow: '0 8px 40px rgba(245,158,11,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
 }}>
 <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
 <path d="M12 2L2 7l10 5 10-5-10-5z"/>
 <path d="M2 17l10 5 10-5"/>
 <path d="M2 12l10 5 10-5"/>
 </svg>
 </div>
 </div>

 <h2
 className="bc-cta-head"
 style={{
 color: '#ffffff',
 fontSize: 32,
 fontWeight: 800,
 marginBottom: 14,
 letterSpacing: '-0.6px',
 lineHeight: 1.2,
 }}
 >
 {t('readyForYourFirstBookLine1')}<br />{t('readyForYourFirstBookLine2')}
 </h2>

 <p
 className="bc-cta-desc"
 style={{
 color: 'rgba(255,255,255,0.48)',
 fontSize: 16,
 lineHeight: 1.65,
 maxWidth: 270,
 marginBottom: 44,
 }}
 >
 Kostenlos starten — kein Abo, kein Risiko.
 Dein Buch in wenigen Minuten.
 </p>

 {/* CTA Buttons */}
 <div
 className="bc-cta-btns"
 style={{
 display: 'flex',
 flexDirection: 'column',
 gap: 12,
 width: '100%',
 maxWidth: 340,
 }}
 >
 {/* Primary — Register */}
 <button
 className="bc-btn-primary"
 onClick={() => onComplete('register')}
 style={{
 width: '100%',
 padding: '19px 24px',
 borderRadius: 18,
 background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 55%, #B45309 100%)',
 border: 'none',
 color: '#0d0b08',
 fontSize: 17,
 fontWeight: 800,
 cursor: 'pointer',
 letterSpacing: '0.2px',
 boxShadow: '0 4px 28px rgba(245,158,11,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
 position: 'relative',
 overflow: 'hidden',
 }}
 >
 <span style={{ position: 'relative', zIndex: 1 }}>
 Kostenlos starten
 </span>
 </button>

 {/* Secondary — Login */}
 <button
 className="bc-btn-secondary"
 onClick={() => onComplete('login')}
 style={{
 width: '100%',
 padding: '19px 24px',
 borderRadius: 18,
 background: 'rgba(255,255,255,0.07)',
 border: '1px solid rgba(255,255,255,0.15)',
 color: 'rgba(255,255,255,0.85)',
 fontSize: 17,
 fontWeight: 600,
 cursor: 'pointer',
 letterSpacing: '0.1px',
 backdropFilter: 'blur(10px)',
 }}
 >
 Ich habe bereits ein Konto
 </button>

 {/* Trust line */}
 <div style={{
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 gap: 6,
 marginTop: 4,
 }}>
 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
 <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
 </svg>
 <p style={{
 color: 'rgba(255,255,255,0.28)',
 fontSize: 12,
 letterSpacing: '0.2px',
 margin: 0,
 }}>
 Sicher &amp; Datenschutzkonform
 </p>
 </div>
 </div>
 </div>
 </div>

 {/* Dot navigation */}
 <div
 style={{
 display: 'flex',
 justifyContent: 'center',
 alignItems: 'center',
 gap: 8,
 paddingBottom: 'max(36px, calc(env(safe-area-inset-bottom) + 20px))',
 paddingTop: 16,
 position: 'relative',
 zIndex: 10,
 }}
 >
 {[0, 1, 2].map((i) => (
 <button
 key={i}
 className="bc-dot"
 onClick={() => scrollToSlide(i)}
 aria-label={`Slide ${i + 1}`}
 style={{
 width: currentSlide === i ? 28 : 8,
 height: 8,
 borderRadius: 4,
 background: currentSlide === i
 ? 'linear-gradient(90deg, #F59E0B, #D97706)'
 : 'rgba(255,255,255,0.22)',
 border: 'none',
 cursor: 'pointer',
 padding: 0,
 boxShadow: currentSlide === i ? '0 0 8px rgba(245,158,11,0.5)' : 'none',
 }}
 />
 ))}
 </div>
 </div>
 </>
 )
}
