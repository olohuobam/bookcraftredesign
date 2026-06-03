'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'
import { BookOpen, Loader2, FileText, Camera } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AppBar } from '@/components/AppBar'
import PageTransition from '@/components/PageTransition'
import MultiStepWizard, { Step } from '@/components/MultiStepWizard'
import { BOOK_LANGUAGES, DEFAULT_BOOK_LANGUAGE, getLanguageDisplay } from '@/types/book-languages'

const DRAFT_KEY = 'manual_book_draft'

export default function ManualCreateBookPage() {
 const { user, getIdToken } = useAuth()
 const { t, language } = useLanguage()
 const router = useRouter()
 const [isCreating, setIsCreating] = useState(false)

 const [form, setForm] = useState({
 title: '', genre: '', description: '', chapters: '10',
 style: 'Modern', targetAudience: 'Erwachsene',
 bookType: 'text' as 'text' | 'picture',
 language: language || DEFAULT_BOOK_LANGUAGE,
 })

  // Load draft
 useEffect(() => {
 try { const s = localStorage.getItem(DRAFT_KEY); if (s) setForm(JSON.parse(s)) } catch {}
 }, [])

  // Auto-save
 useEffect(() => {
 if (!form.title && !form.description) return
 const t = setTimeout(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)) } catch {} }, 800)
 return () => clearTimeout(t)
 }, [form])

 const up = useCallback((k: string, v: string) => setForm(p => ({ ...p, [k]: v })), [])

 const handleCreate = async () => {
 if (!user) return
 setIsCreating(true)
 try {
 const token = await getIdToken()
 const res = await fetch('/api/generate-book', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
 body: JSON.stringify({ ...form, chapters: parseInt(form.chapters) }),
 })
 if (!res.ok) throw new Error('Failed')
 const data = await res.json()
 if (data.id) { localStorage.removeItem(DRAFT_KEY); router.push(`/dashboard/books/${data.id}`) }
 } catch { alert(t('errorCreatingBook') || 'Error creating book'); setIsCreating(false) }
 }

 if (isCreating) return (
 <div className="flex items-center justify-center h-full min-h-[60vh] p-6">
 <div className="w-full max-w-md bg-card shadow-xl rounded-3xl p-8 text-center space-y-4">
 {form.bookType === 'picture' ? <Camera className="w-12 h-12 mx-auto text-bookcraft-blue animate-pulse" /> : <FileText className="w-12 h-12 mx-auto text-bookcraft-blue animate-pulse" />}
 <h2 className="text-xl font-bold font-display">{t('creatingYourBook') || 'Creating Your Book...'}</h2>
 <Loader2 className="w-6 h-6 animate-spin mx-auto text-bookcraft-blue" />
 </div>
 </div>
 )

 const steps: Step[] = [
 {
 id: 'title',
 title: t('bookTitleLabel') || 'What\'s your book called?',
 validation: () => {
 if (!form.title.trim()) return t('titleRequired') || 'Title is required'
 if (form.title.length < 3) return t('titleMinLength') || 'At least 3 characters'
 return true
 },
 content: () => (
 <Input
 value={form.title}
 onChange={(e) => up('title', e.target.value)}
 placeholder={t('bookTitlePlaceholder') || 'e.g. The Secret of the Old Forest'}
 className="text-lg h-14 rounded-2xl bg-muted/30 border-0 focus:ring-2 focus:ring-bookcraft-blue/50"
 maxLength={100}
 />
 ),
 },
 {
 id: 'type',
 title: t('bookTypeLabel') || 'What kind of book?',
 validation: () => form.genre ? true : (t('genreRequired') || 'Genre is required'),
 content: () => (
 <div className="space-y-4">
 <div>
 <Label className="text-sm font-medium mb-1 block">{t('bookTypeLabel') || 'Type'}</Label>
 <Select value={form.bookType} onValueChange={(v: 'text' | 'picture') => up('bookType', v)}>
 <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-0"><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="text"><span className="flex items-center gap-2"><FileText className="w-4 h-4" />{t('textBook') || 'Text Book'}</span></SelectItem>
 <SelectItem value="picture"><span className="flex items-center gap-2"><Camera className="w-4 h-4" />{t('pictureBookType') || 'Picture Book'}</span></SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label className="text-sm font-medium mb-1 block">{t('genreLabel') || 'Genre'} *</Label>
 <Select value={form.genre} onValueChange={(v) => up('genre', v)}>
 <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-0"><SelectValue placeholder={t('selectGenre') || 'Select'} /></SelectTrigger>
 <SelectContent>
 {['Fantasy', 'Science Fiction', 'Krimi', 'Romance', 'Drama', 'Abenteuer', 'Kinderbuch', 'Sachbuch', 'Horror', 'Humor'].map(g => (
 <SelectItem key={g} value={g}>{g}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <Label className="text-sm font-medium mb-1 block">{t('chaptersLabel') || 'Chapters'}</Label>
 <Input type="number" min="1" max="50" value={form.chapters} onChange={(e) => up('chapters', e.target.value)} className="h-12 rounded-xl bg-muted/30 border-0" />
 </div>
 <div>
 <Label className="text-sm font-medium mb-1 block">{t('writingStyle') || 'Style'}</Label>
 <Select value={form.style} onValueChange={(v) => up('style', v)}>
 <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-0"><SelectValue /></SelectTrigger>
 <SelectContent>
 {['Modern', 'Klassisch', 'Poetisch', 'Direkt', 'Humorvoll'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
 </SelectContent>
 </Select>
 </div>
 </div>
 </div>
 ),
 },
 {
 id: 'language',
 title: ` ${t('bookLanguage') || 'Language'}`,
 content: () => (
 <div className="space-y-4">
 <Select value={form.language} onValueChange={(v) => up('language', v)}>
 <SelectTrigger className="h-14 rounded-2xl bg-muted/30 border-0"><SelectValue>{getLanguageDisplay(form.language)}</SelectValue></SelectTrigger>
 <SelectContent className="max-h-[300px]">{BOOK_LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}><span className="flex items-center gap-2"><span>{l.flag}</span><span>{l.nativeName}</span><span className="text-muted-foreground text-sm">({l.name})</span></span></SelectItem>)}</SelectContent>
 </Select>
 <div>
 <Label className="text-sm font-medium mb-1 block">{t('targetAudience') || 'Target Audience'}</Label>
 <Select value={form.targetAudience} onValueChange={(v) => up('targetAudience', v)}>
 <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-0"><SelectValue /></SelectTrigger>
 <SelectContent>
 {[['Kinder', t('children') || 'Children'], ['Jugendliche', t('youngAdults') || 'Young Adults'], ['Erwachsene', t('adults') || 'Adults'], ['Alle', t('all') || 'All Ages']].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label className="text-sm font-medium mb-1 block">{t('descriptionLabel') || 'Description'} *</Label>
 <Textarea value={form.description} onChange={(e) => up('description', e.target.value)} placeholder={t('descriptionPlaceholder') || 'What is your book about?'} rows={5} className="rounded-xl bg-muted/30 border-0 resize-none" maxLength={1000} />
 </div>
 </div>
 ),
 },
 {
 id: 'review',
 title: t('review') || 'Review & Create',
 content: () => (
 <div className="space-y-4">
 <div className="bg-muted/30 rounded-2xl p-5 space-y-2 text-sm">
 {[
 [t('title') || 'Title', `"${form.title}"`],
 [t('genre') || 'Genre', form.genre],
 [t('type') || 'Type', form.bookType === 'text' ? t('textBook') : t('pictureBookType')],
 [t('chapters') || 'Chapters', form.chapters],
 [t('writingStyle') || 'Style', form.style],
 [t('language') || 'Language', getLanguageDisplay(form.language)],
 ].map(([k, v]) => (
 <div key={String(k)} className="flex justify-between"><span className="text-muted-foreground">{String(k)}</span><span className="font-medium">{String(v)}</span></div>
 ))}
 </div>
 {form.description && (
 <div className="bg-muted/20 rounded-xl p-4"><p className="text-sm">{form.description}</p></div>
 )}
 <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
 <p className="text-sm text-blue-800 dark:text-blue-200">{t('redirectingToEditor') || 'Your book structure will be created and you\'ll be redirected to the editor.'}</p>
 </div>
 </div>
 ),
 },
 ]

 return (
 <PageTransition direction="up">
 <div className="min-h-[60vh] pb-32 lg:pb-8">
 <div className="lg:hidden"><AppBar title={t('manualBookCreateTitle') || 'Manual Book Creation'} showBack onBack={() => router.replace('/dashboard/create')} /></div>
 <div className="hidden lg:block bg-card border-b border-border px-6 py-6">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 bg-gradient-to-r from-bookcraft-blue to-bookcraft-blue rounded-2xl flex items-center justify-center"><BookOpen className="w-6 h-6 text-white" /></div>
 <div><h1 className="text-2xl font-bold font-display">{t('manualBookCreateTitle') || 'Manual Book Creation'}</h1><p className="text-sm text-muted-foreground mt-1">{t('manualBookCreateSubtitle') || 'Step by step'}</p></div>
 </div>
 </div>
 <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
 <MultiStepWizard
 steps={steps}
 onComplete={handleCreate}
 backButton={{ text: t('back') || 'Back', onClick: () => router.replace('/dashboard/create') }}
 nextButton={{ text: t('next') || 'Next' }}
 finishButton={{ text: t('createBook') || 'Create Book', loading: isCreating }}
 />
 </div>
 </div>
 </PageTransition>
 )
}
