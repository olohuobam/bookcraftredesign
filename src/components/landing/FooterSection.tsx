'use client'

import { useLanguage } from '@/context/LanguageContext'
import Link from 'next/link'
import Logo from '@/components/Logo'

export default function FooterSection() {
  const { t } = useLanguage()
  return (
    <footer className="py-12 px-4 sm:px-6 border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <p className="text-xs text-white/25">{t('landingOverline')}</p>
          </div>
          <nav aria-label="Legal links" className="flex flex-wrap justify-center gap-6 text-sm text-white/30">
            <Link href="/impressum" className="hover:text-white/60 transition-colors">{t('imprint')}</Link>
            <Link href="/datenschutz" className="hover:text-white/60 transition-colors">{t('privacy')}</Link>
            <Link href="/agb" className="hover:text-white/60 transition-colors">{t('terms')}</Link>
          </nav>
        </div>
        <div className="mt-8 pt-6 border-t border-white/[0.04] text-center">
          <p className="text-xs text-white/20">© {new Date().getFullYear()} bookcraft.dev. {t('allRightsReserved')}</p>
        </div>
      </div>
    </footer>
  )
}
