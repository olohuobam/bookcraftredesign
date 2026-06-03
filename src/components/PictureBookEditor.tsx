'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { RefreshCw, Save, Upload, Book, Grid, ChevronLeft, ChevronRight, Maximize2, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { PageLayout, getImageCountForLayout } from '@/types/picturebook'
import { MaxProtectedContent } from '@/components/ContentProtection'
import PictureBookCoverSelector from '@/components/PictureBookCoverSelector'
import { getImageUrl } from '@/lib/image-utils'

type Panel = {
 panelIndex: number
 imageUrl?: string
 imagePrompt?: string
}

type Page = {
 id?: string
 number: number
 layout: PageLayout
 text: string
 panels: Panel[]
}

type ChaptersData = {
 type: 'picture'
 styleBible?: string
 characterDescription?: string
 imageStyle?: string
 pages: Page[]
}

type Book = {
 id: string
 title: string
 description?: string
 bookType?: string
 style?: string
 author?: string
 images?: (string | { path?: string; url?: string; type?: string })[] | null
 chaptersJson?: any
 coverImage?: string | null
}

// Layout renderer component
function PageRenderer({
 page,
 images,
 onRegenerate,
 onUpload,
 onFullscreen,
 generating,
 uploading,
 regenErrors,
 promptHints,
 setPromptHints,
 styleBible
}: {
 page: Page
 images: string[]
 onRegenerate: (pageIdx: number, panelIdx: number, hint?: string) => void
 onUpload: (pageIdx: number, panelIdx: number) => void
 onFullscreen: (url: string) => void
 generating: Record<string, boolean>
 uploading: Record<string, boolean>
 regenErrors: Record<string, string>
 promptHints: Record<string, string>
 setPromptHints: (fn: (prev: Record<string, string>) => Record<string, string>) => void
 styleBible?: string
}) {
 const { t } = useLanguage()
 const pageIdx = page.number - 1

  // Get layout-specific grid classes
 const getGridClass = () => {
 switch (page.layout) {
 case 'full-image': return 'grid-cols-1'
 case 'image-with-text': return 'grid-cols-1'
 case 'two-horizontal': return 'grid-cols-2'
 case 'two-vertical': return 'grid-cols-1'
 case 'four-grid': return 'grid-cols-2'
 case 'text-only': return 'grid-cols-1'
 default: return 'grid-cols-1'
 }
 }

  // Get image height based on layout
 const getImageHeight = () => {
 switch (page.layout) {
 case 'full-image': return 'h-96'
 case 'image-with-text': return 'h-64'
 case 'two-horizontal': return 'h-48'
 case 'two-vertical': return 'h-40'
 case 'four-grid': return 'h-36'
 default: return 'h-64'
 }
 }

 const layoutLabels: Record<PageLayout, string> = {
 'full-image': ` ${t('layoutFullImage')}`,
 'image-with-text': ` ${t('layoutImageText')}`,
 'two-horizontal': `↔ ${t('layoutTwoHorizontal')}`,
 'two-vertical': `↕ ${t('layoutTwoVertical')}`,
 'four-grid': `⊞ ${t('layout4Images')}`,
 'text-only': ` ${t('layoutTextOnly')}`
 }

 if (page.layout === 'text-only') {
 return (
 <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-6 min-h-[300px] flex items-center justify-center">
 <div className="text-center max-w-md">
 <div className="text-4xl mb-4"></div>
 <p className="text-lg text-gray-700 italic leading-relaxed">{page.text || t('noText')}</p>
 </div>
 </div>
 )
 }

 return (
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-xs font-medium text-bookcraft-blue bg-bookcraft-blue/10 px-2 py-1 rounded">
 {layoutLabels[page.layout] || page.layout}
 </span>
 </div>

 <div className={`grid gap-3 ${getGridClass()}`}>
 {page.panels.map((panel, panelIdx) => {
 const key = `${pageIdx}-${panelIdx}`
 const rawImage = panel.imageUrl || images[pageIdx * page.panels.length + panelIdx]
 const imageUrl = getImageUrl(rawImage as any)
 const hasError = !!regenErrors[key]

 return (
 <div key={panelIdx} className="border rounded-lg bg-white overflow-hidden shadow-sm">
 <div className={`relative ${getImageHeight()} bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center`}>
 {imageUrl ? (
 /* Fix 3: tapping the image opens fullscreen */
 <button
 type="button"
 className="w-full h-full focus:outline-none group"
 onClick={() => onFullscreen(imageUrl)}
 aria-label={t('fullscreen')}
 >
 <img
 src={imageUrl}
 alt={t('pageImageNumber', { page: page.number.toString(), image: (panelIdx + 1).toString() })}
 className="w-full h-full object-contain transition-transform group-hover:scale-[1.02]"
 />
 {/* Fullscreen hint icon */}
 <span className="absolute top-2 right-2 bg-black/40 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
 <Maximize2 className="w-3 h-3" />
 </span>
 </button>
 ) : (
 <div className="flex flex-col items-center justify-center text-gray-400">
 <div className="text-4xl mb-2"></div>
 <span className="text-sm">{t('noImage')}</span>
 </div>
 )}
 {(generating[key] || uploading[key]) && (
 <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
 <div className="flex items-center gap-2 text-gray-700">
 <RefreshCw className="w-5 h-5 animate-spin" />
 <span>{uploading[key] ? t('uploading') : t('generating')}</span>
 </div>
 </div>
 )}
 {/* Fix 1: Error recovery overlay */}
 {hasError && !generating[key] && !uploading[key] && (
 <div className="absolute inset-0 bg-red-50/95 backdrop-blur-sm flex flex-col items-center justify-center gap-2 p-3">
 <AlertCircle className="w-6 h-6 text-red-500" />
 <p className="text-xs text-red-700 text-center font-medium">{regenErrors[key]}</p>
 <Button
 size="sm"
 variant="destructive"
 onClick={() => onRegenerate(pageIdx, panelIdx, promptHints[key])}
 className="text-xs h-7 px-3"
 >
 <RefreshCw className="w-3 h-3 mr-1" /> {t('retryGeneration')}
 </Button>
 </div>
 )}
 </div>
 <div className="p-3 space-y-2 bg-gray-50">
 <Input
 placeholder={t('customizationRequestsOptional')}
 value={promptHints[key] || ''}
 onChange={(e) => setPromptHints(prev => ({ ...prev, [key]: e.target.value }))}
 disabled={!!generating[key] || !!uploading[key]}
 className="h-8 text-sm"
 />
 <div className="flex gap-2">
 <Button
 size="sm"
 variant="secondary"
 onClick={() => onRegenerate(pageIdx, panelIdx, promptHints[key])}
 disabled={!!generating[key] || !!uploading[key]}
 className="flex-1 text-xs"
 >
 <RefreshCw className="w-3 h-3 mr-1" /> {t('aiImage')}
 </Button>
 <Button
 size="sm"
 variant="outline"
 onClick={() => onUpload(pageIdx, panelIdx)}
 disabled={!!generating[key] || !!uploading[key]}
 className="flex-1 text-xs"
 >
 <Upload className="w-3 h-3 mr-1" /> {t('upload')}
 </Button>
 </div>
 </div>
 </div>
 )
 })}
 </div>

 {page.layout !== 'full-image' && page.text && (
 <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
 <p className="text-gray-700 italic">{page.text}</p>
 </div>
 )}
 </div>
 )
}

export default function PictureBookEditor({ book: initialBook }: { book: Book }) {
 const { getIdToken } = useAuth()
 const { t } = useLanguage()
 const [book, setBook] = useState(initialBook)
 const [promptHints, setPromptHints] = useState<Record<string, string>>({})
 const [generating, setGenerating] = useState<Record<string, boolean>>({})
 const [uploading, setUploading] = useState<Record<string, boolean>>({})
 // Fix 1: per-panel error state
 const [regenErrors, setRegenErrors] = useState<Record<string, string>>({})
 const [saving, setSaving] = useState(false)
 const [currentPage, setCurrentPage] = useState(0)
 const [viewMode, setViewMode] = useState<'grid' | 'book'>('book')
 const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
 const [activeTab, setActiveTab] = useState<'editor' | 'cover'>('editor')
 const [savedCoverImage, setSavedCoverImage] = useState<string>(book.coverImage || '')

  // Parse chapters data
 const [chaptersData, setChaptersData] = useState<ChaptersData>({ type: 'picture', pages: [] })

 useEffect(() => {
 try {
 const raw = typeof book.chaptersJson === 'string'
 ? JSON.parse(book.chaptersJson)
 : (book.chaptersJson || {})

 if (raw.pages && Array.isArray(raw.pages)) {
 setChaptersData({
 type: 'picture',
 styleBible: raw.styleBible || '',
 characterDescription: raw.characterDescription || raw.pictureBookConfig?.characterDescription || '',
 imageStyle: raw.imageStyle || raw.pictureBookConfig?.imageStyle || '',
 pages: raw.pages.map((p: any, i: number) => ({
 id: p.id || `page-${i + 1}`,
 number: p.number || i + 1,
 layout: p.layout || 'image-with-text',
 text: p.text || '',
 panels: p.panels || [{ panelIndex: 0, imageUrl: '', imagePrompt: '' }]
 }))
 })
 } else if (Array.isArray(raw)) {
        // Legacy format
 setChaptersData({
 type: 'picture',
 pages: raw.map((p: any, i: number) => ({
 id: p.id || `page-${i + 1}`,
 number: p.number || i + 1,
 layout: 'image-with-text',
 text: p.text || '',
 panels: p.panels || p.images?.map((img: any, j: number) => ({
 panelIndex: j,
 // Fix 4: normalize image refs via getImageUrl
 imageUrl: getImageUrl(img),
 imagePrompt: typeof img === 'string' ? '' : (img.imagePrompt || '')
 })) || [{ panelIndex: 0, imageUrl: '', imagePrompt: '' }]
 }))
 })
 }
 } catch (e) {
      console.error('Error parsing chapters:', e)
 }
 }, [book.chaptersJson])

 // Fix 4: normalize the flat images array (handles both string and {path,type} objects)
 const images = ((book.images || []) as any[]).map((img) => getImageUrl(img)).filter(Boolean)
 const pages = chaptersData.pages
 const totalPages = pages.length || 1

 const regen = async (pageIndex: number, panelIndex: number, suggestion?: string) => {
 const key = `${pageIndex}-${panelIndex}`
 setGenerating(g => ({ ...g, [key]: true }))
 // Fix 1: clear previous error on retry
 setRegenErrors(e => { const next = { ...e }; delete next[key]; return next })

 try {
 const token = await getIdToken()
 const page = pages[pageIndex]
 const panel = page?.panels?.[panelIndex]
 const baseDescription = panel?.imagePrompt || `Page ${pageIndex + 1}, Panel ${panelIndex + 1}`
 const sceneDescription = suggestion?.trim()
 ? `${baseDescription}\nRefine with: ${suggestion.trim()}`
 : baseDescription

 // Prefer new characterDescription field; fall back to legacy styleBible
 const charDesc = chaptersData.characterDescription || chaptersData.styleBible || ''
 // Extract style: prefer imageStyle, then first word of styleBible
 const artStyle = chaptersData.imageStyle || chaptersData.styleBible?.split(' ')[0] || 'watercolor'

 const res = await fetch('/api/generate-picture-image', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
 body: JSON.stringify({
 bookId: book.id,
 pageIndex,
 panelIndex,
 style: artStyle,
 characterDescription: charDesc,
 styleBible: charDesc, // legacy compat
 sceneDescription
 })
 })

 const data = await res.json()
 if (res.ok && data.imageUrl) {
        // Update pages
 setChaptersData(prev => {
 const newPages = [...prev.pages]
 if (newPages[pageIndex]?.panels?.[panelIndex]) {
 newPages[pageIndex].panels[panelIndex].imageUrl = data.imageUrl
 }
 return { ...prev, pages: newPages }
 })
 } else {
 // Fix 1: surface API-level errors
 const errorMsg = data?.error || t('errorLabel')
 setRegenErrors(e => ({ ...e, [key]: errorMsg }))
 }
 } catch (err) {
 // Fix 1: surface network/unexpected errors
 const errorMsg = err instanceof Error ? err.message : t('errorLabel')
 setRegenErrors(e => ({ ...e, [key]: errorMsg }))
 } finally {
 setGenerating(g => ({ ...g, [key]: false }))
 }
 }

 const uploadImage = async (pageIndex: number, panelIndex: number, file: File) => {
 const key = `${pageIndex}-${panelIndex}`
 setUploading(u => ({ ...u, [key]: true }))

 try {
 const token = await getIdToken()
 const formData = new FormData()
 formData.append('image', file)

 const res = await fetch('/api/upload-image', {
 method: 'POST',
 headers: { Authorization: `Bearer ${token}` },
 body: formData
 })

 const data = await res.json()
 if (res.ok && data.imageUrl) {
 setChaptersData(prev => {
 const newPages = [...prev.pages]
 if (newPages[pageIndex]?.panels?.[panelIndex]) {
 newPages[pageIndex].panels[panelIndex].imageUrl = data.imageUrl
 }
 return { ...prev, pages: newPages }
 })
 }
 } finally {
 setUploading(u => ({ ...u, [key]: false }))
 }
 }

 const handleFileUpload = (pageIndex: number, panelIndex: number) => {
 const input = document.createElement('input')
 input.type = 'file'
 input.accept = 'image/*'
 input.onchange = (e) => {
 const file = (e.target as HTMLInputElement).files?.[0]
 if (file) uploadImage(pageIndex, panelIndex, file)
 }
 input.click()
 }

 const save = async () => {
 try {
 setSaving(true)
 const token = await getIdToken()

      // Build flat images array for backwards compatibility
 const allImages: string[] = []
 for (const page of chaptersData.pages) {
 for (const panel of page.panels || []) {
 if (panel.imageUrl) allImages.push(panel.imageUrl)
 }
 }

 const res = await fetch(`/api/books/${book.id}`, {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
 body: JSON.stringify({
 chaptersJson: JSON.stringify(chaptersData),
 images: allImages
 })
 })

 if (!res.ok) throw new Error('Failed to save')
 } finally {
 setSaving(false)
 }
 }

 const updatePageText = (pageIndex: number, text: string) => {
 setChaptersData(prev => {
 const newPages = [...prev.pages]
 if (newPages[pageIndex]) {
 newPages[pageIndex].text = text
 }
 return { ...prev, pages: newPages }
 })
 }

 return (
 <div className="space-y-4">
 {/* Header */}
 <div className="flex items-center justify-between bg-gradient-to-r from-bookcraft-blue to-bookcraft-blue text-white p-4 rounded-xl shadow-lg">
 <div>
 <h2 className="text-xl font-bold font-display flex items-center gap-2">
 <Book className="w-6 h-6" />
 {book.title || t('pictureBookType')}
 </h2>
 <p className="text-blue-200 text-sm">{totalPages} {t('pagesLabel')} · {t('dynamicLayout')}</p>
 </div>
 <div className="flex items-center gap-2">
 {activeTab === 'editor' && (
 <>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setViewMode(viewMode === 'grid' ? 'book' : 'grid')}
 className="text-white hover:bg-white/20"
 >
 {viewMode === 'grid' ? <Book className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
 {viewMode === 'grid' ? t('bookView') : t('gridView')}
 </Button>
 <Button variant="secondary" size="sm" onClick={save} disabled={saving}>
 {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
 {saving ? t('saving') : t('save')}
 </Button>
 </>
 )}
 </div>
 </div>

 {/* Tab Navigation */}
 <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
 <button
 type="button"
 onClick={() => setActiveTab('editor')}
 className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
 activeTab === 'editor'
 ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
 : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
 }`}
 >
 <Book className="w-4 h-4" />
 Seiten bearbeiten
 </button>
 <button
 type="button"
 onClick={() => setActiveTab('cover')}
 className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
 activeTab === 'cover'
 ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
 : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
 }`}
 >
 <ImageIcon className="w-4 h-4" />
 {t('selectCover')}
 {savedCoverImage && <span className="ml-1 w-2 h-2 rounded-full bg-green-500 inline-block" />}
 </button>
 </div>

 {/* Editor Tab — Book View */}
 {activeTab === 'editor' && viewMode === 'book' ? (
 <MaxProtectedContent className="bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 rounded-2xl p-8 shadow-inner" watermark="Bookcraft">
 {/* Book Container */}
 <div className="max-w-4xl mx-auto">
 {/* Page Navigation */}
 <div className="flex items-center justify-between mb-4">
 <Button
 variant="ghost"
 onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
 disabled={currentPage === 0}
 className="hover:bg-white/50"
 >
 <ChevronLeft className="w-5 h-5" /> {t('back')}
 </Button>
 <span className="text-gray-600 font-medium">
 {t('page')} {currentPage + 1} {t('of')} {totalPages}
 </span>
 <Button
 variant="ghost"
 onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
 disabled={currentPage >= totalPages - 1}
 className="hover:bg-white/50"
 >
 {t('next')} <ChevronRight className="w-5 h-5" />
 </Button>
 </div>

 {/* Current Page */}
 {pages[currentPage] && (
 <Card className="shadow-2xl overflow-hidden">
 <div className="bg-white p-6">
 <div className="text-center mb-4">
 <span className="text-2xl font-serif text-gray-800">{t('page')} {currentPage + 1}</span>
 </div>
 <PageRenderer
 page={pages[currentPage]}
 images={images}
 onRegenerate={regen}
 onUpload={handleFileUpload}
 onFullscreen={setFullscreenImage}
 generating={generating}
 uploading={uploading}
 regenErrors={regenErrors}
 promptHints={promptHints}
 setPromptHints={setPromptHints}
 styleBible={chaptersData.styleBible}
 />
 {/* Page Text Editor */}
 <div className="mt-4">
 <Textarea
 placeholder={t('pageTextPlaceholder')}
 value={pages[currentPage].text || ''}
 onChange={(e) => updatePageText(currentPage, e.target.value)}
 className="text-sm resize-none"
 rows={3}
 />
 </div>
 </div>
 </Card>
 )}

 {/* Page Thumbnails */}
 <div className="flex gap-2 mt-6 overflow-x-auto pb-2 justify-center">
 {pages.map((page, idx) => (
 <button
 key={idx}
 onClick={() => setCurrentPage(idx)}
 className={`flex-shrink-0 w-16 h-20 rounded-lg border-2 overflow-hidden transition-all ${
 idx === currentPage
 ? 'border-bookcraft-blue ring-2 ring-bookcraft-blue/30 scale-110'
 : 'border-gray-300 hover:border-bookcraft-blue/40'
 }`}
 >
 {page.panels?.[0]?.imageUrl ? (
 <img
 src={getImageUrl(page.panels[0].imageUrl as any)}
 alt={`${t('page')} ${idx + 1}`}
 className="w-full h-full object-cover"
 />
 ) : (
 <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">
 {idx + 1}
 </div>
 )}
 </button>
 ))}
 </div>
 </div>
 </MaxProtectedContent>
 ) : activeTab === 'editor' ? (
        /* Grid View */
 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
 {pages.map((page, idx) => (
 <Card key={idx} className="overflow-hidden">
 <div className="bg-gradient-to-r from-blue-100 to-blue-100 px-4 py-2">
 <span className="font-semibold text-blue-800">{t('page')} {idx + 1}</span>
 </div>
 <CardContent className="p-4">
 <PageRenderer
 page={page}
 images={images}
 onRegenerate={regen}
 onUpload={handleFileUpload}
 onFullscreen={setFullscreenImage}
 generating={generating}
 uploading={uploading}
 regenErrors={regenErrors}
 promptHints={promptHints}
 setPromptHints={setPromptHints}
 styleBible={chaptersData.styleBible}
 />
 <div className="mt-3">
 <Textarea
 placeholder={t('pageTextPlaceholder')}
 value={page.text || ''}
 onChange={(e) => updatePageText(idx, e.target.value)}
 className="text-sm resize-none"
 rows={2}
 />
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 ) : null}

 {/* Cover Tab */}
 {activeTab === 'cover' && (
 <Card className="overflow-hidden">
 <div className="bg-gradient-to-r from-blue-600 to-blue-600 px-5 py-3">
 <h3 className="text-white font-semibold text-base flex items-center gap-2">
 <ImageIcon className="w-5 h-5" />
 {t('selectCover')}
 </h3>
 <p className="text-blue-200 text-xs mt-0.5">
 {t('chooseCoverImage')}
 </p>
 </div>
 <CardContent className="p-5">
 <PictureBookCoverSelector
 bookId={book.id}
 bookTitle={book.title}
 bookAuthor={book.author}
 bookSubtitle={book.description}
 transformStyle={book.style || chaptersData.styleBible?.split(' ')[0] || 'default'}
 allImages={[
 ...chaptersData.pages.flatMap((p) => p.panels.map((panel) => getImageUrl(panel.imageUrl as any))),
 ...images,
 ].filter((u, i, arr) => u && arr.indexOf(u) === i)}
 currentCoverImage={savedCoverImage || undefined}
 onCoverSaved={(url) => setSavedCoverImage(url)}
 />
 </CardContent>
 </Card>
 )}

 {/* Fullscreen Image Modal */}
 {fullscreenImage && (
 <div
 className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
 onClick={() => setFullscreenImage(null)}
 >
 <img
 src={fullscreenImage}
 alt={t('fullscreen')}
 className="max-w-full max-h-full object-contain"
 />
 </div>
 )}
 </div>
 )
}
