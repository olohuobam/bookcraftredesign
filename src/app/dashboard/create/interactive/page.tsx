'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { AppBar } from '@/components/AppBar'
import PageTransition from '@/components/PageTransition'
import MultiStepWizard, { Step } from '@/components/MultiStepWizard'
import { BOOK_LANGUAGES, DEFAULT_BOOK_LANGUAGE, getLanguageDisplay } from '@/types/book-languages'
import type { BookLanguage } from '@/lib/translations'
import LivePricePreview from '@/components/LivePricePreview'
import { GitBranch, Users, MapPin, BookText, Pen } from 'lucide-react'
import { motion } from 'framer-motion'

interface InteractiveConfig {
 title: string; genre: string; targetAudience: string; description: string
 totalChapters: number; writingStyle: string; tone: string; themes: string[]
 mainCharacters: string; setting: string; plotOutline: string
 pov: 'first' | 'third' | 'mixed'; tenseStyle: 'past' | 'present' | 'mixed'
 language?: BookLanguage
}


// Defined at module level — stable component identity, prevents input focus loss on re-render
function Field({ label, icon: Icon, children }: { label: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </Label>
      {children}
    </div>
  )
}

export default function InteractiveCreatePage() {
 const router = useRouter()
 const { getIdToken } = useAuth()
 const { t, language, isLoading: langLoading } = useLanguage()
 const [userPrompt, setUserPrompt] = useState('')
 const [bookLang, setBookLang] = useState<string>(language || DEFAULT_BOOK_LANGUAGE)
 const [config, setConfig] = useState<InteractiveConfig | null>(null)
 const [isLoadingConfig, setIsLoadingConfig] = useState(false)
 const [isStarting, setIsStarting] = useState(false)

 if (langLoading) return (
 <div className="flex items-center justify-center h-full min-h-[60vh]">
 <div className="w-12 h-12 rounded-full animate-spin border-4 border-border border-t-bookcraft-blue mx-auto" />
 </div>
 )

 const generateConfig = async () => {
 if (!userPrompt.trim()) return false
 setIsLoadingConfig(true)
 try {
 const token = await getIdToken()
 const res = await fetch('/api/ai-config-generator', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
 body: JSON.stringify({ userPrompt: `Interactive choose-your-adventure story: ${userPrompt}`, language: bookLang }),
 })
 if (!res.ok) throw new Error('Failed')
 const data = await res.json()
 const toStr = (v: unknown): string => {
 if (typeof v === 'string') return v
 if (Array.isArray(v)) return v.map(i => typeof i === 'object' && i !== null ? characterObjToStr(i as Record<string,unknown>) : String(i)).join(', ')
 if (typeof v === 'object' && v !== null) {
 const o = v as Record<string, unknown>
 const entries = Object.values(o)
 if (entries.length > 0 && typeof entries[0] === 'object' && entries[0] !== null) {
 return entries.map(e => characterObjToStr(e as Record<string, unknown>)).filter(Boolean).join('; ')
 }
 return characterObjToStr(o)
 }
 return String(v ?? '')
 }
 const characterObjToStr = (o: Record<string, unknown>): string => {
 const name = o.name as string | undefined
 const desc = o.description as string | undefined
 if (name && desc) return `${name}: ${desc}`
 if (name) return name
 if (desc) return desc
 return JSON.stringify(o)
 }
 const raw = data.config as Record<string, unknown>
 setConfig({ ...raw, mainCharacters: toStr(raw.mainCharacters), setting: toStr(raw.setting), plotOutline: toStr(raw.plotOutline), description: toStr(raw.description) } as InteractiveConfig)
 return true
 } catch { alert(t('couldNotGenerateConfigError') || 'Could not generate configuration'); return false }
 finally { setIsLoadingConfig(false) }
 }

 const handleStart = async () => {
 if (!config) return
 setIsStarting(true)
 try {
 const token = await getIdToken()
 const res = await fetch('/api/book/start-interactive-generation', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
 body: JSON.stringify({ config: { ...config, language: bookLang, interactionMode: 'automatic' } }),
 })
 if (!res.ok) throw new Error('Failed')
 const data = await res.json()
 router.push(`/dashboard/jobs/${data.jobId}`)
 } catch { alert(t('couldNotStartGenerationError') || 'Could not start generation'); setIsStarting(false) }
 }


 const inputClass = "h-11 rounded-xl bg-muted/40 border border-border/50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
 const textareaClass = "rounded-xl bg-muted/40 border border-border/50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all resize-none"

 const configSkeleton = (
 <div className="space-y-6">
 <div className="flex flex-col items-center py-8">
 <motion.div
 className="relative w-20 h-20 mb-4"
 animate={{ rotate: 360 }}
 transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
 >
 <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-900" />
 <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 dark:border-t-blue-400" />
 </motion.div>
 <motion.p className="text-lg font-semibold" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
 {t('aiDesigningAdventure')}
 </motion.p>
 <p className="text-sm text-muted-foreground mt-1">{t('adventureBuildingDesc')}</p>
 </div>
 <div className="space-y-3 opacity-30">
 {[1, 2, 3, 4].map(i => <div key={i} className="h-11 rounded-xl bg-muted animate-pulse" />)}
 </div>
 </div>
 )

 const steps: Step[] = [
 {
 id: 'prompt',
 title: t('whatsYourAdventureAbout'),
 description: t('adventureIdeaDesc'),
 validation: () => {
 if (!userPrompt.trim()) return t('pleaseEnterStoryIdea')
 if (userPrompt.length < 10) return t('pictureBookMinChars')
 return true
 },
 content: () => (
 <div className="space-y-5">
 <Textarea
 placeholder={t('adventureIdeaPlaceholder')}
 value={userPrompt}
 onChange={(e) => setUserPrompt(e.target.value)}
 rows={5}
 className={`text-base ${textareaClass}`}
 />
 <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
 <span className="text-lg"></span>
 <Select value={bookLang} onValueChange={setBookLang}>
 <SelectTrigger className="h-10 rounded-lg border-0 bg-transparent hover:bg-muted/50 transition-colors">
 <SelectValue>{getLanguageDisplay(bookLang)}</SelectValue>
 </SelectTrigger>
 <SelectContent className="max-h-[300px]">
 {BOOK_LANGUAGES.map((l) => (
 <SelectItem key={l.code} value={l.code}>
 <span className="flex items-center gap-2"><span>{l.flag}</span><span>{l.nativeName}</span></span>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>
 ),
 },
 {
 id: 'customize',
 title: config ? t('shapeYourAdventure') : t('designingYourAdventure'),
 description: config ? t('adventureCustomizeDesc') : undefined,
 validation: () => {
 if (isLoadingConfig) return t('validatePleaseWaitAI')
 if (!config) return t('configNotReady') || 'Configuration not ready'
 if (!config.title?.trim()) return t('titleRequired')
 return true
 },
 content: () => isLoadingConfig || !config ? configSkeleton : (
 <div className="space-y-5">
 <Field label={t("fieldTitle")} icon={GitBranch}>
 <Input value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })} className={`text-lg font-semibold ${inputClass}`} />
 </Field>
 <div className="grid grid-cols-2 gap-3">
 <Field label={t("fieldGenre")}>
 <Input value={config.genre} onChange={(e) => setConfig({ ...config, genre: e.target.value })} className={inputClass} />
 </Field>
 <Field label={t("fieldAudience")}>
 <Input value={config.targetAudience} onChange={(e) => setConfig({ ...config, targetAudience: e.target.value })} className={inputClass} />
 </Field>
 </div>
 <Field label={t("fieldDescription")}>
 <Textarea value={config.description} onChange={(e) => setConfig({ ...config, description: e.target.value })} rows={2} className={textareaClass} />
 </Field>
 <div className="grid grid-cols-2 gap-3">
 <Field label={t("fieldCharacters")} icon={Users}>
 <Textarea value={config.mainCharacters} onChange={(e) => setConfig({ ...config, mainCharacters: e.target.value })} rows={3} className={`text-sm ${textareaClass}`} />
 </Field>
 <Field label={t("fieldSetting")} icon={MapPin}>
 <Textarea value={config.setting} onChange={(e) => setConfig({ ...config, setting: e.target.value })} rows={3} className={`text-sm ${textareaClass}`} />
 </Field>
 </div>
 <Field label={t("fieldPlotOutline")} icon={BookText}>
 <Textarea value={config.plotOutline} onChange={(e) => setConfig({ ...config, plotOutline: e.target.value })} rows={3} className={textareaClass} />
 </Field>
 <div className="grid grid-cols-3 gap-3">
 <Field label={t("fieldStyle")} icon={Pen}>
 <Input value={config.writingStyle} onChange={(e) => setConfig({ ...config, writingStyle: e.target.value })} className={`text-sm ${inputClass}`} />
 </Field>
 <Field label={t("fieldTone")}>
 <Input value={config.tone} onChange={(e) => setConfig({ ...config, tone: e.target.value })} className={`text-sm ${inputClass}`} />
 </Field>
 <Field label={t("fieldPOV")}>
 <Select value={config.pov} onValueChange={(v) => setConfig({ ...config, pov: v as any })}>
 <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="first">{t('fieldFirstPerson')}</SelectItem>
 <SelectItem value="third">{t('fieldThirdPerson')}</SelectItem>
 <SelectItem value="mixed">{t('fieldMixed')}</SelectItem>
 </SelectContent>
 </Select>
 </Field>
 </div>
 <div className="bg-muted/30 rounded-xl p-4">
 <div className="flex items-center justify-between mb-3">
 <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('fieldChapters')}</Label>
 <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{config.totalChapters}</span>
 </div>
 <Slider value={[config.totalChapters]} onValueChange={(v) => setConfig({ ...config, totalChapters: v[0] })} min={3} max={15} step={1} />
 <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>3</span><span>15</span></div>
 <LivePricePreview bookType="text" count={config.totalChapters} className="mt-3" />
 </div>
 {config.themes?.length > 0 && (
 <div>
 <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">{t('fieldThemes')}</Label>
 <div className="flex flex-wrap gap-2">
 {config.themes.map((theme, i) => (
 <span key={i} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">{theme}</span>
 ))}
 </div>
 </div>
 )}
 </div>
 ),
 },
 {
 id: 'review',
 title: t('readyToLaunchAdventure'),
 description: t('readersShapeStory'),
 content: () => config ? (
 <div className="space-y-4">
 <div className="bg-gradient-to-br from-blue-50 to-pink-50 dark:from-blue-950/30 dark:to-pink-950/30 rounded-2xl p-5 border border-blue-200/50 dark:border-blue-800/50">
 <h3 className="text-xl font-bold font-display text-foreground mb-1">{config.title}</h3>
 <p className="text-sm text-muted-foreground mb-3">{config.description}</p>
 <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
 {[
 [t('fieldGenre'), config.genre],
 [t('fieldChapters'), config.totalChapters],
 [t('fieldStyle'), config.writingStyle],
 [t('fieldTone'), config.tone],
 [t('type'), ' Interactive'],
 [t('language'), getLanguageDisplay(bookLang)],
 ].map(([k, v]) => (
 <div key={String(k)} className="flex justify-between py-0.5">
 <span className="text-muted-foreground">{String(k)}</span>
 <span className="font-medium">{String(v)}</span>
 </div>
 ))}
 </div>
 </div>
 <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
 <GitBranch className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
 <p className="text-sm text-blue-800 dark:text-blue-200">
 {t('interactiveChoiceNote')}
 </p>
 </div>
 </div>
 ) : null,
 },
 ]

 return (
 <PageTransition direction="up">
 <div className="min-h-[60vh] pb-32 lg:pb-8">
 <div className="lg:hidden">
 <AppBar title={t('interactiveBookTitle')} showBack onBack={() => router.replace('/dashboard/create')} />
 </div>
 <div className="hidden lg:block bg-card border-b border-border px-6 py-6">
 <div className="flex items-center gap-4 max-w-7xl mx-auto">
 <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-pink-500 rounded-2xl flex items-center justify-center"><GitBranch className="w-6 h-6 text-white" /></div>
 <div>
 <h1 className="text-2xl font-bold font-display">{t('interactiveBookTitle')}</h1>
 <p className="text-sm text-muted-foreground mt-1">{t('interactiveBookSubtitle')}</p>
 </div>
 </div>
 </div>
 <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
 <MultiStepWizard
 steps={steps}
 onComplete={handleStart}
 onStepChange={async (i) => { if (i === 1 && !config && !isLoadingConfig && userPrompt.trim()) await generateConfig() }}
 backButton={{ text: t('back') || 'Back', onClick: () => router.replace('/dashboard/create') }}
 nextButton={{ text: t('next') || 'Next' }}
 finishButton={{ text: t('startAdventureBtn'), loading: isStarting }}
 />
 </div>
 </div>
 </PageTransition>
 )
}
