'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { bookTemplates, BookTemplate, getTemplatesByCategory, searchTemplates } from '@/lib/book-templates'
import { Search, BookOpen, Clock, FileText, X, Edit3, ChevronDown, ChevronUp, Wand2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { BOOK_LANGUAGES, DEFAULT_BOOK_LANGUAGE, getLanguageDisplay } from '@/types/book-languages'
import type { BookLanguage } from '@/lib/translations'
import { useToast } from '@/components/ui/toast'

interface BookTemplateSelectorProps {
 onTemplateSelect?: (template: BookTemplate) => void
 showAsPage?: boolean
}

// Custom settings that can be modified before generation
interface CustomSettings {
 title: string
 description: string
 prompt: string
 chapters: number
 targetAudience: string
 style: string
 genre: string
 language: BookLanguage
}

export default function BookTemplateSelector({ onTemplateSelect, showAsPage = false }: BookTemplateSelectorProps) {
 const router = useRouter()
 const { getIdToken } = useAuth()
 const { t, language } = useLanguage()
 const { showToast } = useToast()
 const [searchQuery, setSearchQuery] = useState('')
 const [selectedCategory, setSelectedCategory] = useState<BookTemplate['category'] | 'all'>('all')
 const [selectedTemplate, setSelectedTemplate] = useState<BookTemplate | null>(null)
 const [previewOpen, setPreviewOpen] = useState(false)
 const [creating, setCreating] = useState(false)
 const [showAdvanced, setShowAdvanced] = useState(false)
 const [refining, setRefining] = useState(false)

  // Custom settings state - initialize with default to prevent hydration mismatch
 const [customSettings, setCustomSettings] = useState<CustomSettings>({
 title: '',
 description: '',
 prompt: '',
 chapters: 10,
 targetAudience: '',
 style: '',
 genre: '',
 language: DEFAULT_BOOK_LANGUAGE
 })

  // Update language from context after hydration
 useEffect(() => {
 if (language) {
 setCustomSettings(prev => ({
 ...prev,
 language: language as BookLanguage
 }))
 }
 }, [language])

  // Update custom settings when template changes
 useEffect(() => {
 if (selectedTemplate) {
 setCustomSettings(prev => ({
 title: `${selectedTemplate.name} - My Book`,
 description: selectedTemplate.description,
 prompt: selectedTemplate.samplePrompt || '',
 chapters: selectedTemplate.chapters,
 targetAudience: selectedTemplate.targetAudience,
 style: selectedTemplate.style,
 genre: selectedTemplate.genre,
 language: prev.language // Preserve selected language
 }))
 }
 }, [selectedTemplate])

 const categories = [
 { id: 'all' as const, name: 'All', icon: '' },
 { id: 'fiction' as const, name: 'Fiction', icon: '' },
 { id: 'non-fiction' as const, name: 'Non-Fiction', icon: '' },
 { id: 'children' as const, name: 'Children', icon: '' },
 { id: 'educational' as const, name: 'Educational', icon: '' }
 ]

  // Refine prompt with AI
 const handleRefinePrompt = async () => {
 if (!customSettings.prompt.trim() || customSettings.prompt.length < 10) {
 showToast('Please enter at least 10 characters for your story idea', 'warning')
 return
 }

 setRefining(true)
 try {
 const token = await getIdToken()
 if (!token) {
 throw new Error('Not authenticated')
 }

 const response = await fetch('/api/ai/refine-prompt', {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${token}`,
 'Content-Type': 'application/json'
 },
 body: JSON.stringify({
 prompt: customSettings.prompt,
 genre: customSettings.genre,
 targetAudience: customSettings.targetAudience,
 style: customSettings.style,
 bookType: selectedTemplate?.bookType
 })
 })

 if (!response.ok) {
 const errorData = await response.json().catch(() => ({}))
 throw new Error(errorData.error || 'Failed to refine prompt')
 }

 const result = await response.json()

 if (result.refinedPrompt) {
 setCustomSettings(prev => ({ ...prev, prompt: result.refinedPrompt }))
 }
 } catch (error: any) {
      console.error('Error refining prompt:', error)
 showToast(error.message || 'Failed to refine prompt', 'error')
 } finally {
 setRefining(false)
 }
 }

 const filteredTemplates = searchQuery
 ? searchTemplates(searchQuery)
 : selectedCategory === 'all'
 ? bookTemplates
 : getTemplatesByCategory(selectedCategory)

 const handleTemplateClick = (template: BookTemplate) => {
 setSelectedTemplate(template)
 setPreviewOpen(true)
 }

 const handleCreateFromTemplate = async () => {
 if (!selectedTemplate) return

 setCreating(true)
 try {
 const token = await getIdToken()
 if (!token) {
 throw new Error('Not authenticated')
 }

      // Create book from template with custom settings
 const response = await fetch('/api/books/from-template', {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${token}`,
 'Content-Type': 'application/json'
 },
 body: JSON.stringify({
 templateId: selectedTemplate.id,
 autoGenerate: true,
          // Send custom settings
 customSettings: {
 title: customSettings.title,
 description: customSettings.description,
 prompt: customSettings.prompt,
 chapters: customSettings.chapters,
 targetAudience: customSettings.targetAudience,
 style: customSettings.style,
 genre: customSettings.genre
 }
 })
 })

 if (!response.ok) {
 const errorData = await response.json().catch(() => ({}))
 throw new Error(errorData.error || 'Error creating book')
 }

 const result = await response.json()

      // If autoGenerate is enabled, navigate to job status page
      // Otherwise navigate to editor
 if (result.autoGenerate && result.jobId) {
 router.push(`/dashboard/jobs/${result.jobId}`)
 } else {
 router.push(`/dashboard/books/${result.book.id}`)
 }

 if (onTemplateSelect) {
 onTemplateSelect(selectedTemplate)
 }
 } catch (error: any) {
      console.error('Error creating book from template:', error)
 showToast(error.message || 'Error creating book', 'error')
 } finally {
 setCreating(false)
 }
 }

  // Reset advanced settings when dialog closes
 const handleDialogClose = (open: boolean) => {
 setPreviewOpen(open)
 if (!open) {
 setShowAdvanced(false)
 }
 }

 return (
 <div className="w-full">
 {/* Header */}
 <div className="mb-6">
 <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-gray-100 mb-2">{t('bookTemplates')}</h2>
 <p className="text-gray-600 dark:text-gray-400">{t('bookTemplatesSubline')}</p>
 </div>

 {/* Search & Filter */}
 <div className="mb-6 space-y-4">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-5 w-5" />
 <Input
 type="text"
 placeholder={t('searchTemplates')}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-10 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
 />
 {searchQuery && (
 <button
 onClick={() => setSearchQuery('')}
 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
 >
 <X className="h-5 w-5" />
 </button>
 )}
 </div>

 <div className="flex flex-wrap gap-2">
 {categories.map((category) => (
 <Button
 key={category.id}
 variant={selectedCategory === category.id ? 'default' : 'outline'}
 size="sm"
 onClick={() => setSelectedCategory(category.id)}
 className="flex items-center gap-2"
 >
 <span>{category.icon}</span>
 <span>{category.name}</span>
 </Button>
 ))}
 </div>
 </div>

 {/* Templates Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {filteredTemplates.map((template) => (
 <Card
 key={template.id}
 className="p-6 hover:shadow-lg transition-shadow cursor-pointer group bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
 onClick={() => handleTemplateClick(template)}
 >
 <div className="flex items-start justify-between mb-4">
 <div className="text-4xl">{template.icon}</div>
 <Badge variant={template.bookType === 'picture' ? 'default' : 'secondary'}>
 {template.bookType === 'picture' ? 'Picture Book' : 'Text Book'}
 </Badge>
 </div>

 <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-bookcraft-blue dark:group-hover:text-bookcraft-blue/80 transition-colors">
 {template.name}
 </h3>
 <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{template.description}</p>

 <div className="space-y-2 mb-4">
 <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
 <BookOpen className="h-4 w-4 mr-2" />
 <span>{template.chapters} Chapters</span>
 </div>
 <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
 <FileText className="h-4 w-4 mr-2" />
 <span>~{template.estimatedWords.toLocaleString()} Words</span>
 </div>
 <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
 <Clock className="h-4 w-4 mr-2" />
 <span>{template.targetAudience}</span>
 </div>
 </div>

 <div className="flex flex-wrap gap-1">
 {template.tags.slice(0, 3).map((tag) => (
 <Badge key={tag} variant="outline" className="text-xs border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
 {tag}
 </Badge>
 ))}
 </div>
 </Card>
 ))}
 </div>

 {filteredTemplates.length === 0 && (
 <div className="text-center py-12">
 <BookOpen className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
 <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{t('noTemplatesFound')}</h3>
 <p className="text-gray-500 dark:text-gray-400">{t('tryDifferentSearch')}</p>
 </div>
 )}

 {/* Preview & Edit Dialog */}
 <Dialog open={previewOpen} onOpenChange={handleDialogClose}>
 <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
 {/* Always render a DialogTitle for accessibility */}
 {!selectedTemplate && (
 <VisuallyHidden>
 <DialogTitle>{t('bookTemplates')}</DialogTitle>
 </VisuallyHidden>
 )}
 {selectedTemplate && (
 <>
 <DialogHeader>
 <div className="flex items-center gap-3 mb-2">
 <span className="text-4xl">{selectedTemplate.icon}</span>
 <div>
 <DialogTitle className="text-2xl flex items-center gap-2 text-gray-900 dark:text-gray-100">
 {selectedTemplate.name}
 <Badge variant={selectedTemplate.bookType === 'picture' ? 'default' : 'secondary'} className="ml-2">
 {selectedTemplate.bookType === 'picture' ? 'Picture Book' : 'Text Book'}
 </Badge>
 </DialogTitle>
 <DialogDescription className="flex items-center gap-1 mt-1 text-gray-500 dark:text-gray-400">
 <Edit3 className="h-3 w-3" />
 Customize settings before AI starts generating
 </DialogDescription>
 </div>
 </div>
 </DialogHeader>

 <div className="space-y-5">
 {/* Main Settings - Always visible */}
 <div className="space-y-4">
 {/* Title */}
 <div className="space-y-2">
 <Label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
 Book Title
 </Label>
 <Input
 id="title"
 value={customSettings.title}
 onChange={(e) => setCustomSettings(prev => ({ ...prev, title: e.target.value }))}
 placeholder={t('giveBookTitle')}
 className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
 />
 </div>

 {/* Prompt / Story Idea */}
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <Label htmlFor="prompt" className="text-sm font-medium text-gray-700 dark:text-gray-300">
 Story Idea / Prompt
 </Label>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleRefinePrompt}
 disabled={refining || customSettings.prompt.length < 10}
 className="h-7 text-xs gap-1.5 text-bookcraft-blue border-bookcraft-blue/30 hover:bg-bookcraft-blue/5 hover:text-bookcraft-blue dark:text-bookcraft-blue/80 dark:border-bookcraft-blue/30 dark:hover:bg-bookcraft-blue/10 dark:hover:text-bookcraft-blue"
 >
 {refining ? (
 <>
 <Loader2 className="h-3 w-3 animate-spin" />
 Refining...
 </>
 ) : (
 <>
 <Wand2 className="h-3 w-3" />
 Refine with AI
 </>
 )}
 </Button>
 </div>
 <Textarea
 id="prompt"
 value={customSettings.prompt}
 onChange={(e) => setCustomSettings(prev => ({ ...prev, prompt: e.target.value }))}
 placeholder={t('describeBookIdea')}
 className="min-h-[100px] resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
 />
 <p className="text-xs text-gray-500 dark:text-gray-400">
 Tell the AI what your book should be about. Use &quot;Refine with AI&quot; to enhance your idea.
 </p>
 </div>

 {/* Chapters slider */}
 <div className="space-y-2">
 <div className="flex justify-between items-center">
 <Label htmlFor="chapters" className="text-sm font-medium text-gray-700 dark:text-gray-300">
 Number of Chapters
 </Label>
 <span className="text-sm font-semibold text-bookcraft-blue dark:text-bookcraft-blue/80">{customSettings.chapters}</span>
 </div>
 <input
 type="range"
 id="chapters"
 min={selectedTemplate.bookType === 'picture' ? 4 : 5}
 max={selectedTemplate.bookType === 'picture' ? 20 : 30}
 value={customSettings.chapters}
 onChange={(e) => setCustomSettings(prev => ({ ...prev, chapters: parseInt(e.target.value) }))}
 className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-bookcraft-blue"
 />
 <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
 <span>{selectedTemplate.bookType === 'picture' ? '4' : '5'} Chapters</span>
 <span>{selectedTemplate.bookType === 'picture' ? '20' : '30'} Chapters</span>
 </div>
 </div>
 </div>

 {/* Advanced Settings - Collapsible */}
 <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
 <button
 onClick={() => setShowAdvanced(!showAdvanced)}
 className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
 >
 <span>{t('advancedSettings')}</span>
 {showAdvanced ? (
 <ChevronUp className="h-4 w-4" />
 ) : (
 <ChevronDown className="h-4 w-4" />
 )}
 </button>

 {showAdvanced && (
 <div className="p-4 space-y-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
 {/* Genre */}
 <div className="space-y-2">
 <Label htmlFor="genre" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('genre')}</Label>
 <Input
 id="genre"
 value={customSettings.genre}
 onChange={(e) => setCustomSettings(prev => ({ ...prev, genre: e.target.value }))}
 placeholder={t('genrePlaceholderEx')}
 className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
 />
 </div>

 {/* Target Audience */}
 <div className="space-y-2">
 <Label htmlFor="targetAudience" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('targetAudience')}</Label>
 <Input
 id="targetAudience"
 value={customSettings.targetAudience}
 onChange={(e) => setCustomSettings(prev => ({ ...prev, targetAudience: e.target.value }))}
 placeholder={t('audiencePlaceholderEx')}
 className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
 />
 </div>

 {/* Style */}
 <div className="space-y-2">
 <Label htmlFor="style" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('writingStyle')}</Label>
 <Input
 id="style"
 value={customSettings.style}
 onChange={(e) => setCustomSettings(prev => ({ ...prev, style: e.target.value }))}
 placeholder={t('stylePlaceholderEx')}
 className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
 />
 </div>

 {/* Description */}
 <div className="space-y-2">
 <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('description')}</Label>
 <Textarea
 id="description"
 value={customSettings.description}
 onChange={(e) => setCustomSettings(prev => ({ ...prev, description: e.target.value }))}
 placeholder={t('bookDescriptionPlaceholder')}
 className="min-h-[80px] resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
 />
 </div>

 {/* Language */}
 <div className="space-y-2">
 <Label htmlFor="language" className="text-sm font-medium text-gray-700 dark:text-gray-300"> {t('bookLanguage') || 'Book Language'}</Label>
 <Select value={customSettings.language} onValueChange={(value) => setCustomSettings(prev => ({ ...prev, language: value as BookLanguage }))}>
 <SelectTrigger id="language" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700">
 <SelectValue>
 {getLanguageDisplay(customSettings.language)}
 </SelectValue>
 </SelectTrigger>
 <SelectContent className="max-h-[300px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
 {BOOK_LANGUAGES.map((lang) => (
 <SelectItem key={lang.code} value={lang.code} className="text-gray-900 dark:text-gray-100">
 <span className="flex items-center gap-2">
 <span>{lang.flag}</span>
 <span>{lang.nativeName}</span>
 <span className="text-muted-foreground text-sm">({lang.name})</span>
 </span>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>
 )}
 </div>

 {/* Template Info - Compact */}
 <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
 <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Chapter Preview (based on template)</h4>
 <div className="space-y-2 max-h-[150px] overflow-y-auto">
 {selectedTemplate.chapterOutline.slice(0, Math.min(5, customSettings.chapters)).map((chapter, index) => (
 <div key={index} className="flex items-start gap-2 text-sm">
 <span className="text-gray-400 dark:text-gray-500 font-mono text-xs mt-0.5">{index + 1}.</span>
 <span className="text-gray-700 dark:text-gray-300">{chapter.title}</span>
 </div>
 ))}
 {customSettings.chapters > 5 && (
 <p className="text-xs text-gray-500 dark:text-gray-400 pl-5">
 ... and {customSettings.chapters - 5} more chapters
 </p>
 )}
 </div>
 </div>

 {/* Tags */}
 <div className="flex flex-wrap gap-2">
 {selectedTemplate.tags.map((tag) => (
 <Badge key={tag} variant="outline" className="text-xs border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
 {tag}
 </Badge>
 ))}
 </div>

 {/* Actions */}
 <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
 <Button
 onClick={handleCreateFromTemplate}
 disabled={creating || !customSettings.title.trim()}
 className="flex-1 bg-gradient-to-r from-bookcraft-blue to-bookcraft-blue hover:brightness-110"
 >
 {creating ? 'Starting AI Generation...' : 'Generate with AI'}
 </Button>
 <Button variant="outline" onClick={() => handleDialogClose(false)} className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
 Cancel
 </Button>
 </div>
 </div>
 </>
 )}
 </DialogContent>
 </Dialog>
 </div>
 )
}
