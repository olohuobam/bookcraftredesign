'use client'

import { motion } from 'framer-motion'
import { BookOpen, Search, Home } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'

export default function NotFound() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-blue-950 via-blue-950 to-blue-950">
      {/* Subtle radial glow overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(62,134,215,0.15)_0%,_rgba(62,134,215,0.10)_50%,_transparent_100%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center text-center px-6 max-w-md w-full"
      >
        {/* Book + Search illustration */}
        <div className="relative mb-8 flex items-end justify-center">
          <div className="relative">
            <BookOpen className="w-24 h-24 text-bookcraft-blue/50" strokeWidth={1.2} />
            <div className="absolute -top-3 -right-3 bg-gradient-to-br from-[#3E86D7] to-[#3E86D7] rounded-full p-1.5 shadow-lg shadow-blue-900/50">
              <Search className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* 404 badge */}
        <span className="inline-block text-xs font-bold tracking-widest uppercase text-bookcraft-blue/50 mb-4 bg-white/5 rounded-full px-4 py-1 border border-white/10">
          404
        </span>

        {/* Text */}
        <h1 className="font-display text-4xl font-extrabold text-white mb-3 tracking-tight">
          {t('notFoundTitle')}
        </h1>
        <p className="text-blue-100/60 text-sm leading-relaxed mb-8">
          {t('notFoundDescription')}
        </p>

        {/* Button — using Next Link for proper semantics and accessibility */}
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-medium text-white transition-all duration-200 shadow-lg shadow-blue-900/40"
          style={{ background: 'linear-gradient(135deg, #3E86D7 0%, #3E86D7 100%)' }}
        >
          <Home className="h-4 w-4" />
          {t('goHome')}
        </Link>
      </motion.div>
    </div>
  )
}
