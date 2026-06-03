'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { Language } from '@/lib/translations'
import { ChevronDown, Check } from 'lucide-react'

interface LanguageOption {
 code: Language
 name: string
 nativeName: string
 flag: string
}

const languages: LanguageOption[] = [
 { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
 { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
 { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
]

interface LanguageSwitcherProps {
 className?: string
 variant?: 'compact' | 'full'
 showLabel?: boolean
 dropdownAlign?: 'left' | 'right'
}

export default function LanguageSwitcher({
 className = '',
 variant = 'compact',
 showLabel = false,
 dropdownAlign = 'right'
}: LanguageSwitcherProps) {
 const { language, setLanguage, t } = useLanguage()
 const [isOpen, setIsOpen] = useState(false)
 const dropdownRef = useRef<HTMLDivElement>(null)

  // Sort languages so current language is first
 const sortedLanguages = [...languages].sort((a, b) => {
 if (a.code === language) return -1
 if (b.code === language) return 1
 return 0
 })

 const currentLanguage = languages.find(l => l.code === language) || languages[0]

  // Close dropdown when clicking outside
 useEffect(() => {
 const handleClickOutside = (event: MouseEvent) => {
 if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
 setIsOpen(false)
 }
 }

 document.addEventListener('mousedown', handleClickOutside)
 return () => document.removeEventListener('mousedown', handleClickOutside)
 }, [])

 const handleSelect = (lang: Language) => {
 setLanguage(lang)
 setIsOpen(false)
 }

 if (variant === 'full') {
    // Full variant for settings page
 return (
 <div className={`space-y-2 ${className}`}>
 {showLabel && (
 <label className="block text-sm font-medium text-foreground">
 {t('language')}
 </label>
 )}
 <div className="grid grid-cols-2 gap-3">
 {languages.map((lang) => (
 <button
 key={lang.code}
 onClick={() => setLanguage(lang.code)}
 className={`
 flex items-center gap-3 p-4 rounded-xl border-2 transition-all
 ${language === lang.code
 ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
 : 'border-border hover:border-muted-foreground/30 hover:bg-muted'
 }
 `}
 >
 <span className="text-3xl">{lang.flag}</span>
 <div className="text-left">
 <div className={`font-medium ${language === lang.code ? 'text-primary' : 'text-foreground'}`}>
 {lang.nativeName}
 </div>
 <div className="text-sm text-muted-foreground">{lang.name}</div>
 </div>
 {language === lang.code && (
 <Check className="ml-auto h-5 w-5 text-primary" />
 )}
 </button>
 ))}
 </div>
 </div>
 )
 }

  // Compact dropdown variant for header
 return (
 <div ref={dropdownRef} className={`relative ${className}`}>
 <button
 onClick={() => setIsOpen(!isOpen)}
 className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
 aria-expanded={isOpen}
 aria-haspopup="true"
 >
 <span className="text-lg">{currentLanguage.flag}</span>
 <span className="hidden sm:inline">{currentLanguage.nativeName}</span>
 <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
 </button>

 {isOpen && (
 <div className={`absolute mt-2 w-48 bg-popover rounded-xl shadow-lg border border-border py-1 z-[9999] animate-in fade-in slide-in-from-top-2 duration-200 ${dropdownAlign === 'left' ? 'left-0' : 'right-0'}`}>
 {sortedLanguages.map((lang) => (
 <button
 key={lang.code}
 onClick={() => handleSelect(lang.code)}
 className={`
 w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
 ${language === lang.code
 ? 'bg-primary/10 text-primary'
 : 'text-foreground hover:bg-muted'
 }
 `}
 >
 <span className="text-xl">{lang.flag}</span>
 <div className="flex-1">
 <div className="font-medium">{lang.nativeName}</div>
 <div className="text-xs text-muted-foreground">{lang.name}</div>
 </div>
 {language === lang.code && (
 <Check className="h-4 w-4 text-primary" />
 )}
 </button>
 ))}
 </div>
 )}
 </div>
 )
}
