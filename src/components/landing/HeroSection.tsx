'use client'

import { useRef, useEffect, useState, Suspense, useCallback } from 'react'
import {
  motion, useScroll, useTransform, useMotionValue,
  useSpring, AnimatePresence, useAnimation
} from 'framer-motion'
import { useLanguage } from '@/context/LanguageContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useAuthModal } from '@/context/AuthModalContext'
import { Sparkles } from 'lucide-react'
import dynamic from 'next/dynamic'

const BookScene3D = dynamic(() => import('./BookScene3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-40 h-56 rounded-xl animate-pulse"
        style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.15),rgba(139,92,246,0.15))' }} />
    </div>
  ),
})

const STORIES: Record<string, string[]> = {
  mystery: [
    'The morning the body was found in the library, no one noticed that all the clocks had stopped at 3:17 a.m.',
    'Detective Clara Morrow had seen a hundred crime scenes — never one with a locked room and an impossible footprint.',
  ],
  romance: [
    "She had promised herself she would never speak to him again. That was before he walked into her bookshop carrying her journal.",
    "He left without a word. Ten years later, his letter arrived the same day as his wedding invitation.",
  ],
  fantasy: [
    "The dragon who burned down the village left one house standing. Inside sat a girl with no memory and a crown of ash.",
    "The map ended at the edge of the known world. Someone had written in the margin: here be answers.",
  ],
  scifi: [
    "When the colony ship finally arrived, Earth had been dark for two hundred years — but someone was still broadcasting.",
    "She volunteered to be the last human with memories. Someone had to remember what was worth saving.",
  ],
  thriller: [
    "The file didn't exist in any database. The man who'd handed it to her didn't exist either — and now he was dead.",
    "Forty-eight hours to prove her innocence. Twenty-four had already passed while she slept.",
  ],
  kids: [
    "Pip the fox had never seen rain before. When the first drop landed on her nose, she decided it tasted like magic.",
    "Every night, the boy left a cookie out for the moon. One evening, the moon left something back.",
  ],
}

const GENRES = [
  { key: 'mystery', label: 'Mystery' },
  { key: 'romance', label: 'Romance' },
  { key: 'fantasy', label: 'Fantasy' },
  { key: 'scifi', label: 'Sci-Fi' },
  { key: 'thriller', label: 'Thriller' },
  { key: 'kids', label: "Children's" },
]

// Floating bento card
function FloatingCard({
  children, style, delay = 0,
}: { children: React.ReactNode; style?: React.CSSProperties; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'absolute',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        backdropFilter: 'blur(12px)',
        padding: '0.75rem 1rem',
        ...style,
      }}
    >
      {children}
    </motion.div>
  )
}

// Word-by-word animated headline
function AnimatedWord({ word, delay }: { word: string; delay: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 40, filter: 'blur(12px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.75, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'inline-block', marginRight: '0.28em' }}
    >
      {word}
    </motion.span>
  )
}

// Typewriter
function Typewriter() {
  const [display, setDisplay] = useState('')
  const [activeGenre, setActiveGenre] = useState('mystery')
  const s = useRef({ genre: 'mystery', idx: 0, char: 0, del: false, t: 0 as any, pt: 0 as any })

  function step() {
    const r = s.current
    const texts = STORIES[r.genre]
    const full = texts[r.idx]
    if (!r.del) {
      r.char++
      setDisplay(full.substring(0, r.char))
      if (r.char >= full.length) {
        r.pt = setTimeout(() => { r.del = true; r.t = setTimeout(step, 40) }, 3200)
        return
      }
      r.t = setTimeout(step, 28 + Math.random() * 20)
    } else {
      r.char--
      setDisplay(full.substring(0, r.char))
      if (r.char <= 0) {
        r.del = false
        r.idx = (r.idx + 1) % texts.length
        r.t = setTimeout(step, 400)
        return
      }
      r.t = setTimeout(step, 12)
    }
  }

  const switchGenre = (g: string) => {
    const r = s.current
    clearTimeout(r.t); clearTimeout(r.pt)
    r.genre = g; r.del = true; r.idx = 0
    setActiveGenre(g)
    step()
  }

  useEffect(() => {
    const t = setTimeout(step, 700)
    return () => { clearTimeout(t); clearTimeout(s.current.pt) }
  }, [])

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-4">
        {GENRES.map((g, i) => (
          <motion.button
            key={g.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 + i * 0.06 }}
            onClick={() => switchGenre(g.key)}
            style={{
              padding: '0.3rem 0.85rem', borderRadius: 50, fontSize: '0.72rem',
              fontWeight: 500, transition: 'all 0.25s', border: '1px solid',
              borderColor: activeGenre === g.key ? 'rgba(200,151,62,0.65)' : 'rgba(255,255,255,0.1)',
              color: activeGenre === g.key ? 'rgb(200,151,62)' : 'rgba(255,255,255,0.32)',
              background: activeGenre === g.key ? 'rgba(200,151,62,0.1)' : 'transparent',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {g.label}
          </motion.button>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.48, duration: 0.6 }}
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '1.1rem 1.4rem', position: 'relative', overflow: 'hidden' }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(200,151,62,0.3),transparent)' }} />
        <div style={{ fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} style={{ color: 'rgb(200,151,62)', fontSize: '0.5rem' }}>✦</motion.span>
          Currently reading aloud…
        </div>
        <div style={{ fontFamily: "'Georgia',serif", fontSize: '0.95rem', fontStyle: 'italic', color: 'rgba(255,255,255,0.78)', lineHeight: 1.7, minHeight: '3.6rem' }}>
          {display}
          <span style={{ display: 'inline-block', width: 2, height: '1em', background: 'rgb(200,151,62)', verticalAlign: 'text-bottom', marginLeft: 2, animation: 'bc-blink 1s step-end infinite' }} />
        </div>
      </motion.div>
    </div>
  )
}

// Reading progress bar
function ReadingProgress() {
  const [w, setW] = useState(0)
  useEffect(() => {
    const fn = () => setW(Math.min(100, window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100))
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, zIndex: 300, pointerEvents: 'none' }}>
      <div style={{ height: '100%', width: `${w}%`, background: 'linear-gradient(90deg,#3b82f6,#8b5cf6,#ec4899)', transition: 'width 0.1s linear' }} />
    </div>
  )
}

// Starfield
function StarfieldCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!
    let raf: number, W = 0, H = 0
    type Star = { x: number; y: number; r: number; o: number; s: number; ph: number }
    let stars: Star[] = []
    function init() {
      W = c!.width = window.innerWidth; H = c!.height = window.innerHeight
      stars = Array.from({ length: 150 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.1 + 0.15, o: Math.random() * 0.2 + 0.04, s: Math.random() * 0.4 + 0.15, ph: Math.random() * Math.PI * 2 }))
    }
    let t0 = 0
    function draw(ts: number) {
      if (!t0) t0 = ts; const t = (ts - t0) / 1000
      ctx.clearRect(0, 0, W, H)
      for (const s of stars) {
        const op = s.o + Math.sin(t * s.s + s.ph) * 0.06
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, op)})`; ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    window.addEventListener('resize', init)
    init(); raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', init) }
  }, [])
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />
}

// Cursor glow
function CursorGlow() {
  const x = useMotionValue(-300), y = useMotionValue(-300)
  const sx = useSpring(x, { stiffness: 70, damping: 20 })
  const sy = useSpring(y, { stiffness: 70, damping: 20 })
  useEffect(() => {
    const fn = (e: MouseEvent) => { x.set(e.clientX); y.set(e.clientY) }
    window.addEventListener('mousemove', fn)
    return () => window.removeEventListener('mousemove', fn)
  }, [x, y])
  return (
    <motion.div style={{ position: 'fixed', top: 0, left: 0, zIndex: 1, pointerEvents: 'none', x: sx, y: sy, translateX: '-50%', translateY: '-50%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.075) 0%,transparent 70%)' }} />
  )
}

// Magnetic button
function MagneticCTA({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  const x = useMotionValue(0), y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 200, damping: 18 })
  const sy = useSpring(y, { stiffness: 200, damping: 18 })
  return (
    <motion.button
      ref={ref}
      style={{ x: sx, y: sy, position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.9rem 2rem', borderRadius: 50, fontSize: '0.92rem', fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
      onMouseMove={e => {
        if (!ref.current) return
        const r = ref.current.getBoundingClientRect()
        x.set((e.clientX - r.left - r.width / 2) * 0.28)
        y.set((e.clientY - r.top - r.height / 2) * 0.28)
      }}
      onMouseLeave={() => { x.set(0); y.set(0) }}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
    >
      <motion.span
        style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)' }}
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
      />
      {children}
    </motion.button>
  )
}

// Scroll-triggered implosion overlay
function ImplosionOverlay({ progress }: { progress: any }) {
  const opacity = useTransform(progress, [0.6, 0.85], [0, 1])
  const scale = useTransform(progress, [0.6, 0.9], [1, 0.88])

  return (
    <motion.div
      style={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none', opacity }}
    >
      {/* Particle vortex canvas */}
      <ParticleVortex progress={progress} />
    </motion.div>
  )
}

function ParticleVortex({ progress }: { progress: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; size: number; color: string; angle: number; radius: number; speed: number }>>([])
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth; canvas.height = window.innerHeight
    const cx = canvas.width / 2, cy = canvas.height / 2
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#fcd34d', '#34d399', '#f472b6']
    particlesRef.current = Array.from({ length: 200 }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: 0, vy: 0,
      size: Math.random() * 3 + 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      angle: Math.random() * Math.PI * 2,
      radius: Math.random() * 300 + 50,
      speed: (Math.random() * 0.02 + 0.01) * (Math.random() > 0.5 ? 1 : -1),
    }))

    let lastProgress = 0
    const unsubscribe = progress.on('change', (v: number) => { lastProgress = v })

    function draw() {
      const p = Math.max(0, (lastProgress - 0.6) / 0.35)
      if (p <= 0) { animRef.current = requestAnimationFrame(draw); return }

      ctx.clearRect(0, 0, canvas.width, canvas!.height)
      ctx.fillStyle = `rgba(4,4,10,${p * 0.7})`
      ctx.fillRect(0, 0, canvas.width, canvas!.height)

      particlesRef.current.forEach(pt => {
        pt.angle += pt.speed * (1 + p * 4)
        const targetR = pt.radius * (1 - p * 0.92)
        pt.x = cx + Math.cos(pt.angle) * targetR
        pt.y = cy + Math.sin(pt.angle) * targetR * 0.45

        const size = pt.size * (1 - p * 0.5)
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, Math.max(0.5, size), 0, Math.PI * 2)
        ctx.fillStyle = pt.color + Math.floor((0.3 + p * 0.7) * 255).toString(16).padStart(2, '0')
        ctx.fill()

        // Mini book shape
        if (p > 0.3 && size > 1.5) {
          ctx.fillRect(pt.x - size * 0.8, pt.y - size * 1.1, size * 1.6, size * 2.2)
          ctx.fillStyle = 'rgba(255,255,255,0.2)'
          ctx.fillRect(pt.x - size * 0.8, pt.y - size * 1.1, size * 0.15, size * 2.2)
        }
      })

      animRef.current = requestAnimationFrame(draw)
    }
    animRef.current = requestAnimationFrame(draw)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); unsubscribe() }
  }, [progress])

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
}

export default function HeroSection() {
  const { t } = useLanguage()
  const { requestAuthModal } = useAuthModal()
  const isMobile = useIsMobile(1024)
  const ref = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0), mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 45, damping: 16 })
  const springY = useSpring(mouseY, { stiffness: 45, damping: 16 })

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const yText = useTransform(scrollYProgress, [0, 0.6], [0, isMobile ? 0 : 80])
  const opacityHero = useTransform(scrollYProgress, [0, 0.55], [1, 0])
  const scaleHero = useTransform(scrollYProgress, [0, 0.6], [1, 0.94])
  const opacity3d = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  useEffect(() => {
    if (isMobile) return
    const fn = (e: MouseEvent) => {
      mouseX.set((e.clientX / window.innerWidth - 0.5) * 24)
      mouseY.set((e.clientY / window.innerHeight - 0.5) * 14)
    }
    window.addEventListener('mousemove', fn)
    return () => window.removeEventListener('mousemove', fn)
  }, [isMobile, mouseX, mouseY])

  const h1Line1 = (t('landingHeadline1') || 'Become an author').split(' ')
  const h1Line2 = (t('landingHeadline2') || 'in minutes').split(' ')

  return (
    <>
      <ReadingProgress />
      <style>{`
        @keyframes bc-blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes bc-shimmer{0%{background-position:0% center}100%{background-position:200% center}}
      `}</style>
      {!isMobile && <CursorGlow />}

      <motion.section
        ref={ref}
        style={{ scale: scaleHero }}
        className="relative min-h-screen overflow-hidden"
        
      >
        <div style={{ position: 'absolute', inset: 0, background: '#04040a' }} />
        <StarfieldCanvas />

        {/* Implosion overlay — driven by scroll */}
        <ImplosionOverlay progress={scrollYProgress} />

        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            style={{ position: 'absolute', left: '-8%', top: '20%', width: 650, height: 650, borderRadius: '50%', background: 'rgba(59,130,246,0.06)', filter: 'blur(140px)' }} />
          <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.9, 0.5] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            style={{ position: 'absolute', right: '-5%', top: '15%', width: 550, height: 550, borderRadius: '50%', background: 'rgba(139,92,246,0.06)', filter: 'blur(120px)' }} />
        </div>

        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.028]" aria-hidden="true"
          style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)`, backgroundSize: '72px 72px' }} />

        {/* Main content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 lg:gap-6 items-center min-h-screen pt-24 pb-16">

          {/* LEFT */}
          <motion.div style={{ y: yText, opacity: opacityHero }} className="flex flex-col gap-5 relative">

            {/* Overline */}
            <motion.div initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 self-start px-4 py-2 rounded-full text-sm font-medium"
              style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(200,151,62,0.85)', backdropFilter: 'blur(10px)' }}>
              <Sparkles className="w-3.5 h-3.5" />
              {t('landingOverline')}
              <motion.span animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }} transition={{ duration: 2.2, repeat: Infinity }}
                style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
            </motion.div>

            {/* Headline */}
            <h1 style={{ fontFamily: "'Georgia',serif", fontSize: 'clamp(2.8rem,5vw,4.2rem)', lineHeight: 1.04, fontWeight: 700, margin: 0 }}>
              <div style={{ color: '#fff' }}>
                {h1Line1.map((w, i) => <AnimatedWord key={i} word={w} delay={0.08 + i * 0.08} />)}
              </div>
              <div style={{ fontStyle: 'italic', background: 'linear-gradient(135deg,rgb(200,151,62),rgb(238,192,90),rgb(200,151,62))', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'bc-shimmer 4s linear infinite' }}>
                {h1Line2.map((w, i) => <AnimatedWord key={i} word={w} delay={0.28 + i * 0.08} />)}
              </div>
            </h1>

            {/* Subline */}
            <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.52, ease: [0.16, 1, 0.3, 1] }}
              style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.78, maxWidth: 440, fontWeight: 300, margin: 0 }}>
              {t('landingSubheadline')}
            </motion.p>

            {/* Typewriter */}
            <Typewriter />

            {/* CTAs */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.62 }}
              className="flex flex-col sm:flex-row gap-3">
              <MagneticCTA onClick={requestAuthModal}>
                {t('landingStartFree')} →
              </MagneticCTA>
              <motion.a href="#book-types"
                whileHover={{ borderColor: 'rgba(255,255,255,0.28)', color: '#fff', y: -2 }}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.9rem 1.75rem', borderRadius: 50, fontSize: '0.88rem', fontWeight: 400, color: 'rgba(255,255,255,0.42)', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', textDecoration: 'none', transition: 'all 0.25s ease' }}>
                {t('seeExamples')}
              </motion.a>
            </motion.div>

            {/* Simple trust line — no fake numbers */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85, duration: 0.8 }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ height: 1, width: 28, background: 'rgba(255,255,255,0.1)' }} />
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>No credit card required</span>
            </motion.div>

            {/* Floating bento cards — code-alpha-wine style */}
            <FloatingCard style={{ top: -60, right: -20, width: 160 }} delay={1.0}>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Genre</div>
              <div style={{ fontSize: '0.82rem', color: '#c4b5fd', fontWeight: 600 }}>✦ Fantasy</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Chapter 4 of 18</div>
            </FloatingCard>

            <FloatingCard style={{ bottom: 80, right: -40, width: 180 }} delay={1.2}>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Your book</div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade8088' }} />
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Generating…</div>
              </div>
              <div style={{ marginTop: 8, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
                <motion.div animate={{ width: ['0%', '72%'] }} transition={{ duration: 2.5, delay: 1.5, ease: 'easeOut' }}
                  style={{ height: '100%', background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)', borderRadius: 10 }} />
              </div>
            </FloatingCard>
          </motion.div>

          {/* RIGHT: 3D */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.1, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={isMobile ? { position: 'relative', height: 480 } : { position: 'relative', height: 640, x: springX, y: springY, opacity: opacity3d }}
            className="flex items-center justify-center"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ position: 'absolute', width: 360, height: 360, borderRadius: '50%', background: 'rgba(59,130,246,0.07)', filter: 'blur(80px)', inset: 0, margin: 'auto', pointerEvents: 'none' }}
            />
            <div className="w-full h-full">
              <Suspense fallback={null}><BookScene3D /></Suspense>
            </div>
          </motion.div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-52 pointer-events-none" style={{ background: 'linear-gradient(to top,#04040a,transparent)' }} />

        {/* Scroll cue */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-9 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <motion.span animate={{ opacity: [0.15, 0.4, 0.15] }} transition={{ duration: 2.5, repeat: Infinity }}
            style={{ fontSize: '0.58rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>Scroll</motion.span>
          <motion.div animate={{ scaleY: [0, 1, 0], opacity: [0, 1, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 1, height: 34, background: 'linear-gradient(to bottom,rgba(255,255,255,0.22),transparent)', transformOrigin: 'top' }} />
        </motion.div>
      </motion.section>
    </>
  )
}
