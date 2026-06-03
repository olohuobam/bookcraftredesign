'use client'

import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from 'next-themes'
import Logo from '@/components/Logo'

export default function Footer() {
 const { t } = useLanguage()
 const { resolvedTheme } = useTheme()
 const isDark = resolvedTheme === 'dark'

 return (
 <footer className="bg-zinc-900 dark:bg-zinc-950 text-white py-12 px-4">
 <div className="max-w-6xl mx-auto">
 <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
 <div>
 <div className="mb-4">
 <Logo href="/" size="md" />
 </div>
 <p className="text-zinc-400">
 {t('footerDescription')}
 </p>
 </div>
 <div>
 <h3 className="font-semibold mb-4">{t('product')}</h3>
 <ul className="space-y-2 text-zinc-400">
 <li>
 <Link href="/faq" className="hover:text-white transition-colors">
 {t('faq')}
 </Link>
 </li>
 </ul>
 </div>
 <div>
 <h3 className="font-semibold mb-4">{t('company')}</h3>
 <ul className="space-y-2 text-zinc-400">
 <li>
 <Link href="/ueber-uns" className="hover:text-white transition-colors">
 {t('aboutUs')}
 </Link>
 </li>
 <li>
 <Link href="/kontakt" className="hover:text-white transition-colors">
 {t('contact')}
 </Link>
 </li>
 </ul>
 </div>
 <div>
 <h3 className="font-semibold mb-4">{t('legal')}</h3>
 <ul className="space-y-2 text-zinc-400">
 <li>
 <Link href="/datenschutz" className="hover:text-white transition-colors">
 {t('privacy')}
 </Link>
 </li>
 <li>
 <Link href="/agb" className="hover:text-white transition-colors">
 {t('terms')}
 </Link>
 </li>
 <li>
 <Link href="/impressum" className="hover:text-white transition-colors">
 {t('imprint')}
 </Link>
 </li>
 </ul>
 </div>
 </div>
 <div className="border-t border-zinc-800 mt-8 pt-8 text-center text-zinc-400">
 <p>&copy; 2025 bookcraft.dev. {t('allRightsReserved')}</p>
 </div>
 </div>
 </footer>
 )
}