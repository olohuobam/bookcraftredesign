'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { useLanguage } from '@/context/LanguageContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { BookOpen, Images, Camera, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

const bookTypes = [
  {
    icon: BookOpen,
    titleKey: 'landingBookTypeText' as const,
    descKey: 'landingBookTypeTextDesc' as const,
    gradient: 'from-blue-600 to-violet-600',
    glow: '#3b82f6',
    href: '/dashboard/create/live-stream',
    coverImage: '/covers/cover-textbook.webp',
    coverAlt: 'AI-generated textbook cover',
    matchBookType: 'text',
    spineColor: '#1d4ed8',
  },
  {
    icon: Images,
    titleKey: 'landingBookTypePicture' as const,
    descKey: 'landingBookTypePictureDesc' as const,
    gradient: 'from-pink-500 to-rose-600',
    glow: '#ec4899',
    href: '/dashboard/create/picture',
    coverImage: '/covers/cover-picturebook.webp',
    coverAlt: 'AI-generated picture book cover',
    matchBookType: 'picture',
    spineColor: '#be185d',
  },
  {
    icon: Camera,
    titleKey: 'landingBookTypePhoto' as const,
    descKey: 'landingBookTypePhotoDesc' as const,
    gradient: 'from-emerald-500 to-teal-600',
    glow: '#10b981',
    href: '/dashboard/create',
    coverImage: '/covers/cover-photobook.webp',
    coverAlt: 'AI-generated photo book cover',
    matchBookType: null,
    spineColor: '#059669',
  },
]

function BookCover({ type, isMobile, coverSrc }: { type: typeof bookTypes[0]; isMobile: boolean; coverSrc: string }) {
  return (
    <div className="relative w-full max-w-[160px] mx-auto">
      <div className="absolute left-4 right-0 h-8 bg-black/40 blur-2xl rounded-full -bottom-4" />
      <motion.div
        className="relative rounded-r-lg overflow-hidden"
        style={{ transformStyle: isMobile ? 'flat' : 'preserve-3d', transform: 'perspective(900px) rotateY(-8deg)', aspectRatio: '2/3' }}
        whileHover={{ rotateY: -14, scale: 1.06, y: -10 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Spine */}
        <div className="absolute top-0 left-0 h-full w-4 z-10 rounded-l-sm"
          style={{ background: `linear-gradient(to right, ${type.spineColor}cc, ${type.spineColor})`, boxShadow: 'inset -3px 0 8px rgba(0,0,0,0.4)' }} />
        {/* Cover body */}
        <div className="absolute top-0 left-4 right-0 bottom-0 overflow-hidden rounded-r-lg" style={{ boxShadow: '6px 6px 24px rgba(0,0,0,0.5)' }}>
          <Image src={coverSrc} alt={type.coverAlt} fill sizes="160px" className="object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" quality={85} />
          {/* Gloss */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 45%)' }} />
          {/* Page edge */}
          <div className="absolute top-2 bottom-2 right-0 w-[3px] rounded-r bg-gradient-to-r from-stone-300/60 to-white/80" />
        </div>
      </motion.div>
    </div>
  )
}

export default function BookTypesSection() {
  const { t } = useLanguage()
  const isMobile = useIsMobile(768)
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [realCovers, setRealCovers] = useState<Record<string, { coverImage: string; id: string }>>({})

  useEffect(() => {
    let active = true
    fetch('/api/example-books').then(r => r.json()).then(data => {
      if (!active || !Array.isArray(data?.books)) return
      const map: Record<string, { coverImage: string; id: string }> = {}
      for (const book of data.books) {
        if (book?.bookType && book?.coverImage && book?.id && !map[book.bookType]) map[book.bookType] = { coverImage: book.coverImage, id: book.id }
      }
      setRealCovers(map)
    }).catch(() => {})
    return () => { active = false }
  }, [])

  return (
    <section className="py-28 px-4 sm:px-6 relative overflow-hidden" id="book-types">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full bg-blue-600/4 blur-[150px]" />
      </div>
      <div ref={ref} className="max-w-6xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-emerald-400 text-sm font-medium mb-5">{t('landingBookTypesLabel')}</div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">{t('landingBookTypesTitle')}</h2>
          <p className="text-lg text-white/40 max-w-2xl mx-auto">{t('landingBookTypesDesc')}</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {bookTypes.map((type, index) => {
            const Icon = type.icon
            const realBook = type.matchBookType ? realCovers[type.matchBookType] : undefined
            const coverSrc = realBook?.coverImage || type.coverImage
            const href = realBook ? `/preview/${realBook.id}` : type.href
            return (
              <motion.div key={type.titleKey} initial={{ opacity: 0, y: 40 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: index * 0.15 }}>
                <Link href={href} className="block group">
                  <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 overflow-hidden hover:border-white/[0.12] hover:bg-white/[0.05] transition-all duration-500 hover:-translate-y-1">
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                      style={{ background: `radial-gradient(ellipse at 50% 0%, ${type.glow}18 0%, transparent 70%)` }} />
                    <div className="mb-8"><BookCover type={type} isMobile={isMobile} coverSrc={coverSrc} /></div>
                    <div className="text-center">
                      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${type.gradient} mb-4`}><Icon className="w-5 h-5 text-white" /></div>
                      <h3 className="text-lg font-bold text-white mb-2">{t(type.titleKey)}</h3>
                      <p className="text-white/40 text-sm mb-4 leading-relaxed">{t(type.descKey)}</p>
                      <div className="flex items-center justify-center gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0"
                        style={{ color: type.glow }}>
                        <span>{realBook ? t('readBook') : t('getStarted')}</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
