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
import { useSubscription } from '@/hooks/useSubscription'
import { AppBar } from '@/components/AppBar'
import PageTransition from '@/components/PageTransition'
import MultiStepWizard, { Step } from '@/components/MultiStepWizard'
import { BOOK_LANGUAGES, DEFAULT_BOOK_LANGUAGE, getLanguageDisplay } from '@/types/book-languages'
import { Images, Upload, X, Pencil, Copy, Users, MapPin, Palette } from 'lucide-react'
import LivePricePreview from '@/components/LivePricePreview'
import {
 PICTUREBOOK_GENRES,
 PICTUREBOOK_IMAGE_STYLES,
 PICTUREBOOK_TARGET_AUDIENCES,
 type PicturebookConfig,
} from '@/types/picturebook'
import { motion } from 'framer-motion'
import { useProSheet } from '@/context/ProSheetContext'


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

export default function CreatePicturebookPage() {
 const router = useRouter()
 const { getIdToken } = useAuth()
 const { t, language, isLoading: langLoading } = useLanguage()
 const { isPro, isLoading: isSubLoading } = useSubscription()
 const { openProSheet } = useProSheet()
 const [bookLang, setBookLang] = useState<string>(language || DEFAULT_BOOK_LANGUAGE)
 const [userPrompt, setUserPrompt] = useState('')
 const [isGenerating, setIsGenerating] = useState(false)
 const [isLoadingConfig, setIsLoadingConfig] = useState(false)
 const [refImage, setRefImage] = useState<string | null>(null)
 const [refPreview, setRefPreview] = useState<string | null>(null)
 const [refMode, setRefMode] = useState<'style' | 'edit'>('style')

 const [config, setConfig] = useState<Partial<PicturebookConfig> & { author?: string; mainCharacters?: string; setting?: string; plotOutline?: string }>({
 title: '', author: '', genre: '', targetAudience: 'Kinder 4-6 Jahre', description: '',
 bookType: 'picture', totalPages: 12, imageStyle: 'watercolor', tone: t('pbToneDefault'),
 mainCharacters: '', setting: '', plotOutline: '', themes: [], customPrompt: '',
 })
 const [configGenerated, setConfigGenerated] = useState(false)

 if (langLoading) return (
 <div className="flex items-center justify-center h-full min-h-[60vh]">
 <div className="w-12 h-12 rounded-full animate-spin border-4 border-border border-t-bookcraft-blue mx-auto" />
 </div>
 )

 const up = (u: Partial<typeof config>) => setConfig(prev => ({ ...prev, ...u }))

 const generateConfig = async () => {
 if (!userPrompt.trim()) return false
 setIsLoadingConfig(true)
 try {
 const token = await getIdToken()
 const res = await fetch('/api/picturebook/generate-config', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
 body: JSON.stringify({ userPrompt, language: bookLang }),
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
 up({
 title: String(raw.title || ''),
 genre: String(raw.genre || config.genre),
 targetAudience: String(raw.targetAudience || config.targetAudience),
 description: toStr(raw.description),
 tone: String(raw.tone || config.tone),
 mainCharacters: toStr(raw.mainCharacters),
 setting: toStr(raw.setting),
 plotOutline: toStr(raw.plotOutline),
 themes: Array.isArray(raw.themes) ? raw.themes as string[] : [],
 // Also apply AI-suggested page count and style when available
 ...(raw.totalPages && typeof raw.totalPages === 'number' ? { totalPages: Math.max(8, Math.min(32, raw.totalPages)) } : {}),
 ...(raw.imageStyle && typeof raw.imageStyle === 'string' ? { imageStyle: raw.imageStyle as PicturebookConfig['imageStyle'] } : {}),
 })
 setConfigGenerated(true)
 return true
 } catch { alert(t('couldNotGenerateConfigError')); return false }
 finally { setIsLoadingConfig(false) }
 }

 const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0]
 if (!file || !file.type.startsWith('image/')) return
 if (file.size > 10 * 1024 * 1024) { alert(t('imageTooLarge')); return }
 const reader = new FileReader()
 reader.onloadend = () => { const b = reader.result as string; setRefImage(b); setRefPreview(b) }
 reader.readAsDataURL(file)
 }

 const handleComplete = async () => {
 if (isSubLoading) return
 setIsGenerating(true)
 try {
 const token = await getIdToken()
 if (!token) throw new Error('Not authenticated')
 const body = { ...config, author: config.author || '', language: bookLang, ...(refImage && { referenceImageBase64: refImage, referenceImageMode: refMode }) }
 const res = await fetch('/api/picturebook/generate', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
 const data = await res.json()
 if (!res.ok) {
 if (res.status === 403 && data.upgradeRequired) { openProSheet('create-limit'); return }
 throw new Error(data.message || data.error || 'Failed')
 }
 router.push(`/dashboard/jobs/${data.jobId}`)
    } catch (err) { alert(err instanceof Error ? err.message : t('errorOccurred')); setIsGenerating(false) }
 }


 const inputClass = "h-11 rounded-xl bg-muted/40 border border-border/50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
 const textareaClass = "rounded-xl bg-muted/40 border border-border/50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all resize-none"

 const configSkeleton = (
 <div className="space-y-6">
 <div className="flex flex-col items-center py-8">
 <motion.div className="relative w-20 h-20 mb-4" animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
 <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-900" />
 <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 dark:border-t-blue-400" />
 </motion.div>
 <motion.p className="text-lg font-semibold" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
 {t('aiIllustratingStory')}
 </motion.p>
 <p className="text-sm text-muted-foreground mt-1">{t('buildingCharactersScenes')}</p>
 </div>
 <div className="space-y-3 opacity-30">
 {[1, 2, 3, 4].map(i => <div key={i} className="h-11 rounded-xl bg-muted animate-pulse" />)}
 </div>
 </div>
 )

 const steps: Step[] = [
 {
 id: 'prompt',
 title: (t('pictureBookTitleRequired') || 'What\'s your picture book about?'),
 description: t('describeYourPictureBookIdea'),
 validation: () => {
 if (!userPrompt.trim()) return t('pleaseEnterPictureBookIdea')
 if (userPrompt.length < 10) return t('pictureBookMinChars')
 return true
 },
 content: () => (
 <div className="space-y-5">
 <Textarea
 placeholder={t('pictureBookStoryPlaceholder')}
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
 title: configGenerated ? t('customizePictureBook') : t('creatingPictureBookEllipsis'),
 description: configGenerated ? t('aiBuildStoryDesc') : undefined,
 validation: () => {
 if (isLoadingConfig) return t('validatePleaseWaitAI')
 if (!config.title?.trim()) return t('titleRequired')
 if (!config.genre) return t('genreRequired')
 return true
 },
 content: () => isLoadingConfig ? configSkeleton : (
 <div className="space-y-5">
 {/* Title */}
 <Field label={t("fieldTitle")} icon={Images}>
 <Input value={config.title} onChange={(e) => up({ title: e.target.value })} className={`text-lg font-semibold ${inputClass}`} placeholder={t('pictureBookTitlePlaceholder')} />
 </Field>

 {/* Author */}
 <Field label={t("author")}>
 <Input value={config.author || ''} onChange={(e) => up({ author: e.target.value })} className={inputClass} placeholder={t('authorNameOptional')} />
 </Field>

 {/* Genre + Audience */}
 <div className="grid grid-cols-2 gap-3">
 <Field label={t("fieldGenre")}>
 <Select value={config.genre} onValueChange={(v) => up({ genre: v })}>
 <SelectTrigger className={inputClass}><SelectValue placeholder={t('genre')} /></SelectTrigger>
 <SelectContent>{PICTUREBOOK_GENRES.map(g => <SelectItem key={g.value} value={g.value}>{t(g.labelKey)}</SelectItem>)}</SelectContent>
 </Select>
 </Field>
 <Field label={t("fieldAudience")}>
 <Select value={config.targetAudience} onValueChange={(v) => up({ targetAudience: v })}>
 <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
 <SelectContent>{PICTUREBOOK_TARGET_AUDIENCES.map(({ value, labelKey }) => <SelectItem key={value} value={value}>{t(labelKey)}</SelectItem>)}</SelectContent>
 </Select>
 </Field>
 </div>

 {/* Description */}
 <Field label={t("fieldDescription")}>
 <Textarea value={config.description} onChange={(e) => up({ description: e.target.value })} rows={2} className={textareaClass} />
 </Field>

 {/* Characters + Setting */}
 <div className="grid grid-cols-2 gap-3">
 <Field label={t("fieldCharacters")} icon={Users}>
 <Textarea value={config.mainCharacters || ''} onChange={(e) => up({ mainCharacters: e.target.value })} rows={3} className={`text-sm ${textareaClass}`} />
 </Field>
 <Field label={t("fieldSetting")} icon={MapPin}>
 <Textarea value={config.setting || ''} onChange={(e) => up({ setting: e.target.value })} rows={3} className={`text-sm ${textareaClass}`} />
 </Field>
 </div>

 {/* Plot */}
 <Field label={t("fieldPlotOutline")}>
 <Textarea value={config.plotOutline || ''} onChange={(e) => up({ plotOutline: e.target.value })} rows={2} className={textareaClass} />
 </Field>

 {/* Art Style — visual grid */}
 <Field label={t("imageStyle")} icon={Palette}>
 <div className="grid grid-cols-2 gap-2">
 {PICTUREBOOK_IMAGE_STYLES.map(({ value, labelKey, descKey }) => (
 <button key={value} type="button" onClick={() => up({ imageStyle: value as PicturebookConfig['imageStyle'] })}
 className={`p-3 rounded-xl border-2 transition-all text-left active:scale-95 ${config.imageStyle === value ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 shadow-md' : 'border-border hover:border-blue-300'}`}>
 <div className="font-semibold text-sm">{t(labelKey)}</div>
 <div className="text-xs text-muted-foreground mt-0.5">{t(descKey)}</div>
 </button>
 ))}
 </div>
 </Field>

 {/* Reference image */}
 {!refPreview ? (
 <label className="block border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 transition-colors">
 <input type="file" accept="image/*" onChange={handleRefUpload} className="hidden" />
 <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
 <p className="text-sm font-medium">{t('referenceImageOptional') || 'Reference Image (optional)'}</p>
 </label>
 ) : (
 <div className="relative rounded-xl overflow-hidden border border-border">
 <img src={refPreview} alt="" className="w-full h-32 object-contain" />
 <button onClick={() => { setRefImage(null); setRefPreview(null) }} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"><X className="h-4 w-4" /></button>
 <div className="grid grid-cols-2 gap-2 p-2">
 <button type="button" onClick={() => setRefMode('style')} className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1 ${refMode === 'style' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-border'}`}><Copy className="h-3 w-3" />{t('copyStyle')}</button>
 <button type="button" onClick={() => setRefMode('edit')} className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1 ${refMode === 'edit' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950' : 'border-border'}`}><Pencil className="h-3 w-3" />{t('edit')}</button>
 </div>
 </div>
 )}

 {/* Page count + language */}
 <div className="bg-muted/30 rounded-xl p-4">
 <div className="flex items-center justify-between mb-3">
 <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('pages')}</Label>
 <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{config.totalPages}</span>
 </div>
 <Slider value={[config.totalPages || 12]} onValueChange={(v) => up({ totalPages: v[0] })} min={8} max={32} step={2} />
 <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>8</span><span>20</span><span>32</span></div>
 <LivePricePreview bookType="picture" count={config.totalPages || 12} className="mt-3" />
 </div>

 {/* Themes */}
 {config.themes && config.themes.length > 0 && (
 <div>
 <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">{t('themes')}</Label>
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
 title: ' Ready to create your picture book',
 description: 'AI will illustrate every page — this may take 10-30 minutes',
 content: () => (
 <div className="space-y-4">
 <div className="bg-gradient-to-br from-blue-50 to-blue-50 dark:from-blue-950/30 dark:to-blue-950/30 rounded-2xl p-5 border border-blue-200/50 dark:border-blue-800/50">
 <h3 className="text-xl font-bold font-display text-foreground mb-1">{config.title}</h3>
 <p className="text-sm text-muted-foreground mb-3">{config.description}</p>
 <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
 {[
 [t('fieldGenre'), (() => { const g = PICTUREBOOK_GENRES.find(x => x.value === config.genre); return g ? t(g.labelKey) : config.genre })()],
 [t('pages'), config.totalPages],
 [t('imageStyle'), (() => { const s = PICTUREBOOK_IMAGE_STYLES.find(x => x.value === config.imageStyle); return s ? t(s.labelKey) : config.imageStyle })()],
 [t('pbTone'), config.tone],
 [t('fieldAudience'), (() => { const a = PICTUREBOOK_TARGET_AUDIENCES.find(x => x.value === config.targetAudience); return a ? t(a.labelKey) : config.targetAudience })()],
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
 <p className="text-sm text-blue-800 dark:text-blue-200">
 Each page will be individually illustrated by AI. Watch the magic happen in real-time!
 </p>
 </div>
 </div>
 ),
 },
 ]

 return (
 <PageTransition direction="up">
 <div className="min-h-[60vh] pb-32 lg:pb-8">
 <div className="lg:hidden">
 <AppBar title={t('createAIPictureBook') || 'Picture Book'} showBack onBack={() => router.replace('/dashboard/create')} />
 </div>
 <div className="hidden lg:block bg-card border-b border-border px-6 py-6">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-500 rounded-2xl flex items-center justify-center"><Images className="w-6 h-6 text-white" /></div>
 <div>
 <h1 className="text-2xl font-bold font-display">{t('createAIPictureBook') || 'Picture Book'}</h1>
 <p className="text-sm text-muted-foreground mt-1">Describe your idea — AI creates story + illustrations</p>
 </div>
 </div>
 </div>
 <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
 <MultiStepWizard
 steps={steps}
 onComplete={handleComplete}
 onStepChange={async (i) => { if (i === 1 && !configGenerated && !isLoadingConfig && userPrompt.trim()) await generateConfig() }}
 backButton={{ text: t('back') || 'Back', onClick: () => router.replace('/dashboard/create') }}
 nextButton={{ text: t('next') || 'Next' }}
 finishButton={{ text: t('createBook'), loading: isGenerating }}
 />
 </div>
 </div>
 </PageTransition>
 )
}
