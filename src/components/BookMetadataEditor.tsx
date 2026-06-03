'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
 BookOpen,
 FileImage,
 List,
 Save,
 Upload,
 Eye,
 RefreshCw,
 Wand2,
 Package
} from 'lucide-react'
import ImagePreview from './ImagePreview'
import BookOrderButton from './BookOrderButton'

interface Chapter {
 id: string
 title: string
 content: string
 wordCount: number
 imageSize?: 'full' | 'half' | 'quarter' | 'inline' | 'double'
}

interface Book {
 id: string
 title: string
 description: string
 content: string
 status: string
 genre: string
 targetAudience: string
 style: string
 bookType?: string
 createdAt: string
 updatedAt: string
 coverImage?: string | null
 backCoverImage?: string | null
 backCoverText?: string | null
 isbn?: string | null
 author?: string | null
 publisher?: string | null
 publicationDate?: string | null
 images?: string[] | null
 chaptersJson?: string | null
}

interface BookMetadataEditorProps {
 book: Book
 chapters: Chapter[]
 onSave: (updates: Partial<Book>) => Promise<void>
}

export default function BookMetadataEditor({ book, chapters, onSave }: BookMetadataEditorProps) {
 const { getIdToken } = useAuth()
 const { t } = useLanguage()
 const { showToast } = useToast()
 const [activeTab, setActiveTab] = useState<'cover' | 'back' | 'toc'>('cover')
 const [saving, setSaving] = useState(false)
 const [uploading, setUploading] = useState<'cover' | 'back' | null>(null)
 const [generating, setGenerating] = useState<'cover' | 'back' | 'toc' | null>(null)
 const [isGeneratingBackCoverText, setIsGeneratingBackCoverText] = useState(false)
 const [isGeneratingCoverImage, setIsGeneratingCoverImage] = useState(false)
 const [isGeneratingBackCoverImage, setIsGeneratingBackCoverImage] = useState(false)
 
  // Form data
 const [formData, setFormData] = useState({
 coverImage: book.coverImage || '',
 backCoverImage: book.backCoverImage || '',
 backCoverText: book.backCoverText || '',
 author: book.author || '',
 publisher: book.publisher || 'Bookcraft Publishing',
 isbn: book.isbn || '',
 publicationDate: book.publicationDate || new Date().getFullYear().toString()
 })

  // Auto-generated table of contents
 const [tableOfContents, setTableOfContents] = useState<string>('')

  // Generate table of contents automatically
 const generateTableOfContents = () => {
 if (book.bookType === 'picture') {
      // For picture books - use page-by-page structure
 if (book.chaptersJson) {
 try {
 let chaptersData: any = {}
 if (typeof book.chaptersJson === 'string') {
 chaptersData = JSON.parse(book.chaptersJson)
 } else {
 chaptersData = book.chaptersJson
 }
 
 const pages = chaptersData.pages || []
 let toc = 'TABLE OF CONTENTS\n\n'

 pages.forEach((page: any, index: number) => {
 const pageNum = index + 1
 if (page.panels && page.panels.length > 0) {
              // Use first panel description as page title
 const pageTitle = page.panels[0].description?.substring(0, 50) + '...' || `Page ${pageNum}`
 toc += `Page ${pageNum}: ${pageTitle}\n`
 } else {
 toc += `Page ${pageNum}\n`
 }
 })
 
 setTableOfContents(toc)
 } catch (error) {
          console.error('Error generating picture book TOC:', error)
 setTableOfContents('Table of contents could not be generated.')
 }
 }
 } else {
      // For regular books - use chapter structure
 let toc = 'TABLE OF CONTENTS\n\n'

 chapters.forEach((chapter, index) => {
 const chapterNum = index + 1
 const title = chapter.title || `Chapter ${chapterNum}`
 const wordCount = chapter.wordCount || 0
 const estimatedPages = Math.ceil(wordCount / 250) // ~250 words per page

 toc += `Chapter ${chapterNum}: ${title}\n`
 })
 
 const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0)
 const totalPages = Math.ceil(totalWords / 250)
 toc += `\nTotal: ${totalWords} words (~${totalPages} pages)\n`

 setTableOfContents(toc)
 }
 }

  // Handle image upload
 const handleImageUpload = async (type: 'cover' | 'back', event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0]
 if (!file) return

 if (!file.type.startsWith('image/')) {
 showToast('Please select an image file.', 'warning')
 return
 }

 if (file.size > 10 * 1024 * 1024) {
 showToast('File is too large. Maximum 10MB allowed.', 'warning')
 return
 }

 setUploading(type)

 try {
 const token = await getIdToken()
 const formData = new FormData()
 formData.append('image', file)

 const response = await fetch('/api/upload-image', {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${token}`
 },
 body: formData,
 })

 if (!response.ok) {
 throw new Error('Upload failed')
 }

 const data = await response.json()
 
 if (data.imagePath) {
 setFormData(prev => ({
 ...prev,
 [type === 'cover' ? 'coverImage' : 'backCoverImage']: data.imagePath
 }))
 }
 } catch (error) {
      console.error('Upload error:', error)
 showToast('Error uploading image', 'error')
 } finally {
 setUploading(null)
 event.target.value = ''
 }
 }

  // Generate cover image with AI
 const generateCoverImage = async () => {
 setIsGeneratingCoverImage(true)
 
 try {
 const token = await getIdToken()
 const response = await fetch('/api/generate-cover', {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${token}`,
 'Content-Type': 'application/json'
 },
 body: JSON.stringify({
 title: book.title,
 genre: book.genre,
 description: book.description,
 author: formData.author,
 bookType: book.bookType
 })
 })
 
 if (!response.ok) {
 throw new Error('Failed to generate cover')
 }
 
      // The response is now a binary image, not JSON
 const blob = await response.blob()
 const file = new File([blob], 'generated-cover.png', { type: 'image/png' })
 
      // Upload the generated image
 const uploadFormData = new FormData()
 uploadFormData.append('image', file)
 
 const uploadResponse = await fetch('/api/upload-image', {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${token}`
 },
 body: uploadFormData
 })
 
 if (uploadResponse.ok) {
 const uploadData = await uploadResponse.json()
 setFormData(prev => ({ ...prev, coverImage: uploadData.filename }))
 }
 
 } catch (error) {
      console.error('Error generating cover:', error)
 showToast('Error generating cover. Please try again.', 'error')
 } finally {
 setIsGeneratingCoverImage(false)
 }
 }

  // Generate back cover image with AI
 const generateBackCoverImage = async () => {
 setIsGeneratingBackCoverImage(true)
 
 try {
 const token = await getIdToken()
 const response = await fetch('/api/generate-back-cover-image', {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${token}`,
 'Content-Type': 'application/json'
 },
 body: JSON.stringify({
 title: book.title,
 genre: book.genre,
 description: book.description,
 author: formData.author,
 publisher: formData.publisher,
 bookType: book.bookType
 })
 })
 
 if (!response.ok) {
 throw new Error('Failed to generate back cover')
 }
 
      // The response is now a binary image, not JSON
 const blob = await response.blob()
 const file = new File([blob], 'generated-back-cover.png', { type: 'image/png' })
 
      // Upload the generated image
 const uploadFormData = new FormData()
 uploadFormData.append('image', file)
 
 const uploadResponse = await fetch('/api/upload-image', {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${token}`
 },
 body: uploadFormData
 })
 
 if (uploadResponse.ok) {
 const uploadData = await uploadResponse.json()
 setFormData(prev => ({ ...prev, backCoverImage: uploadData.filename }))
 }
 
 } catch (error) {
      console.error('Error generating back cover:', error)
 showToast('Error generating back cover. Please try again.', 'error')
 } finally {
 setIsGeneratingBackCoverImage(false)
 }
 }

  // Generate back cover text with AI (existing function - rename state variable)
 const generateBackCoverTextHandler = async () => {
 setIsGeneratingBackCoverText(true)
 
 try {
 const token = await getIdToken()
 const response = await fetch('/api/generate-back-cover', {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${token}`,
 'Content-Type': 'application/json'
 },
 body: JSON.stringify({
 title: book.title,
 genre: book.genre,
 content: book.content,
 description: book.description
 })
 })
 
 if (!response.ok) {
 throw new Error('Failed to generate back cover text')
 }
 
 const data = await response.json()
 setFormData(prev => ({ ...prev, backCoverText: data.backCoverText }))
 
 } catch (error) {
      console.error('Error generating back cover text:', error)
 showToast('Error generating back cover text. Please try again.', 'error')
 } finally {
 setIsGeneratingBackCoverText(false)
 }
 }

  // Save all metadata
 const handleSave = async () => {
 setSaving(true)
 
 try {
 await onSave({
 coverImage: formData.coverImage || null,
 backCoverImage: formData.backCoverImage || null,
 backCoverText: formData.backCoverText || null,
 author: formData.author || null,
 publisher: formData.publisher || null,
 isbn: formData.isbn || null,
 publicationDate: formData.publicationDate || null
 })

 showToast('Metadata saved successfully!', 'success')
 } catch (error) {
      console.error('Save error:', error)
 showToast('Error saving', 'error')
 } finally {
 setSaving(false)
 }
 }

  // Auto-generate TOC on component mount and when chapters change
 useEffect(() => {
 generateTableOfContents()
 }, [chapters, book.chaptersJson])

 return (
 <div className="space-y-6">
 <div className="flex items-center space-x-4">
 <BookOpen className="w-6 h-6 text-bookcraft-blue" />
 <h2 className="text-2xl font-bold font-display">{t('bookMetadata')}</h2>
 <Badge variant="outline">{book.bookType === 'picture' ? 'Picture Book' : 'Text Book'}</Badge>
 </div>

 {/* Tab Navigation */}
 <div className="flex space-x-2 border-b">
 <button
 onClick={() => setActiveTab('cover')}
 className={`px-4 py-2 font-medium ${
 activeTab === 'cover' 
 ? 'text-bookcraft-blue border-b-2 border-bookcraft-blue' 
 : 'text-gray-500 hover:text-gray-700'
 }`}
 >
 <FileImage className="w-4 h-4 inline mr-2" />
 Cover
 </button>
 <button
 onClick={() => setActiveTab('back')}
 className={`px-4 py-2 font-medium ${
 activeTab === 'back' 
 ? 'text-bookcraft-blue border-b-2 border-bookcraft-blue' 
 : 'text-gray-500 hover:text-gray-700'
 }`}
 >
 <FileImage className="w-4 h-4 inline mr-2" />
 Back Cover
 </button>
 <button
 onClick={() => setActiveTab('toc')}
 className={`px-4 py-2 font-medium ${
 activeTab === 'toc' 
 ? 'text-bookcraft-blue border-b-2 border-bookcraft-blue' 
 : 'text-gray-500 hover:text-gray-700'
 }`}
 >
 <List className="w-4 h-4 inline mr-2" />
 Inhaltsverzeichnis
 </button>
 </div>

 {/* Cover Tab */}
 {activeTab === 'cover' && (
 <Card>
 <CardHeader>
 <CardTitle>{t('bookCover')}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 {/* Cover Image Upload */}
 <div>
 <label className="block text-sm font-medium mb-2">{t('coverImage')}</label>
 
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Image Preview */}
 <div>
 <ImagePreview
 imageUrl={formData.coverImage}
 title={t('bookCover')}
 isGenerating={isGeneratingCoverImage}
 placeholder={t('noCoverCreatedYet')}
 onRemove={() => setFormData(prev => ({ ...prev, coverImage: '' }))}
 onReplace={() => {
                      // Trigger file input
 const fileInput = document.querySelector('#cover-file-input') as HTMLInputElement
 if (fileInput) fileInput.click()
 }}
 />
 </div>

 {/* Upload & Generate Controls */}
 <div className="space-y-4">
 <div className="space-y-3">
 <div className="relative">
 <input
 id="cover-file-input"
 type="file"
 accept="image/*"
 onChange={(e) => handleImageUpload('cover', e)}
 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
 disabled={uploading === 'cover'}
 />
 <Button
 variant="outline"
 disabled={uploading === 'cover'}
 className="w-full"
 >
 <Upload className="w-4 h-4 mr-2" />
 {uploading === 'cover' ? 'Uploading...' : 'Upload your own image'}
 </Button>
 </div>

 <Button
 onClick={generateCoverImage}
 disabled={isGeneratingCoverImage}
 variant="outline"
 className="w-full bg-gradient-to-r from-blue-500 to-pink-500 text-white border-none hover:from-blue-600 hover:to-pink-600"
 >
 <Wand2 className="w-4 h-4 mr-2" />
 {isGeneratingCoverImage ? 'AI generating...' : 'Generate with AI'}
 </Button>
 </div>

 {/* AI Generation Info */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
 <p className="text-sm text-bookcraft-blue">
 <strong>Tip:</strong> AI automatically creates a professional book cover based on your book title and content.
 </p>
 </div>
 </div>
 </div>
 </div>

 {/* Book Metadata */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium mb-2">{t('author')}</label>
 <Input
 value={formData.author}
 onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
 placeholder={t('yourName')}
 />
 </div>
 <div>
 <label className="block text-sm font-medium mb-2">{t('publisher')}</label>
 <Input
 value={formData.publisher}
 onChange={(e) => setFormData(prev => ({ ...prev, publisher: e.target.value }))}
 placeholder={t('publisherPlaceholder')}
 />
 </div>
 <div>
 <label className="block text-sm font-medium mb-2">ISBN (optional)</label>
 <Input
 value={formData.isbn}
 onChange={(e) => setFormData(prev => ({ ...prev, isbn: e.target.value }))}
 placeholder="978-..."
 />
 </div>
 <div>
 <label className="block text-sm font-medium mb-2">{t('publicationYear')}</label>
 <Input
 value={formData.publicationDate}
 onChange={(e) => setFormData(prev => ({ ...prev, publicationDate: e.target.value }))}
 placeholder="2025"
 />
 </div>
 </div>
 </CardContent>
 </Card>
 )}

 {/* Back Cover Tab */}
 {activeTab === 'back' && (
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center justify-between">
 {t('backCover')}
 <Button
 variant="outline"
 size="sm"
 onClick={generateBackCoverTextHandler}
 disabled={isGeneratingBackCoverText}
 >
 {isGeneratingBackCoverText ? (
 <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
 ) : (
 <Wand2 className="w-4 h-4 mr-2" />
 )}
 {isGeneratingBackCoverText ? 'Generating...' : 'Generate AI text'}
 </Button>
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 {/* Back Cover Image */}
 <div>
 <label className="block text-sm font-medium mb-2">Back Cover Image (optional)</label>
 
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Image Preview */}
 <div>
 <ImagePreview
 imageUrl={formData.backCoverImage}
 title={t('backCover')}
 isGenerating={isGeneratingBackCoverImage}
 placeholder={t('noBackCoverCreatedYet')}
 onRemove={() => setFormData(prev => ({ ...prev, backCoverImage: '' }))}
 onReplace={() => {
                      // Trigger file input
 const fileInput = document.querySelector('#back-file-input') as HTMLInputElement
 if (fileInput) fileInput.click()
 }}
 />
 </div>

 {/* Upload & Generate Controls */}
 <div className="space-y-4">
 <div className="space-y-3">
 <div className="relative">
 <input
 id="back-file-input"
 type="file"
 accept="image/*"
 onChange={(e) => handleImageUpload('back', e)}
 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
 disabled={uploading === 'back'}
 />
 <Button
 variant="outline"
 disabled={uploading === 'back'}
 className="w-full"
 >
 <Upload className="w-4 h-4 mr-2" />
 {uploading === 'back' ? 'Uploading...' : 'Upload your own image'}
 </Button>
 </div>

 <Button
 onClick={generateBackCoverImage}
 disabled={isGeneratingBackCoverImage}
 variant="outline"
 className="w-full bg-gradient-to-r from-blue-500 to-pink-500 text-white border-none hover:from-blue-600 hover:to-pink-600"
 >
 <Wand2 className="w-4 h-4 mr-2" />
 {isGeneratingBackCoverImage ? 'AI generating...' : 'Generate with AI'}
 </Button>
 </div>

 {/* AI Generation Info */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
 <p className="text-sm text-bookcraft-blue">
 <strong>Optional:</strong> An additional image for the back cover - ideal for author photo or thematic graphics.
 </p>
 </div>
 </div>
 </div>
 </div>

 {/* Back Cover Text */}
 <div>
 <label className="block text-sm font-medium mb-2">{t('backCoverText')}</label>
 <Textarea
 value={formData.backCoverText}
 onChange={(e) => setFormData(prev => ({ ...prev, backCoverText: e.target.value }))}
 placeholder={t('bookDescriptionLongPlaceholder')}
 rows={8}
 className="resize-none"
 />
 <p className="text-xs text-gray-500 mt-1">
 Tip: Use the AI generator for a professional back cover text.
 </p>
 </div>
 </CardContent>
 </Card>
 )}

 {/* Table of Contents Tab */}
 {activeTab === 'toc' && (
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center justify-between">
 Table of Contents
 <Button
 variant="outline"
 size="sm"
 onClick={generateTableOfContents}
 >
 <RefreshCw className="w-4 h-4 mr-2" />
 Refresh
 </Button>
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="bg-gray-50 p-4 rounded-lg">
 <pre className="whitespace-pre-wrap text-sm font-mono">
 {tableOfContents}
 </pre>
 </div>
 <p className="text-xs text-gray-500 mt-2">
 The table of contents is automatically generated based on your chapters.
 </p>
 </CardContent>
 </Card>
 )}

 {/* Action Buttons */}
 <div className="flex justify-between">
 <div>
 {book.status === 'completed' && (
 <BookOrderButton book={book} />
 )}
 </div>
 <div>
 <Button
 onClick={handleSave}
 disabled={saving}
 className="bg-bookcraft-blue hover:brightness-110"
 >
 {saving ? (
 <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
 ) : (
 <Save className="w-4 h-4 mr-2" />
 )}
 {saving ? 'Saving...' : 'Save Metadata'}
 </Button>
 </div>
 </div>
 </div>
 )
}
