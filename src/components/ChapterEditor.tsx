import React from 'react'
import NextImage from 'next/image'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trash2, Wand2, RefreshCw, Image, Type, Maximize, Minimize, Square } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import MobileOptimizedChapterEditor from './MobileOptimizedChapterEditor'

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
 bookType?: string
 images?: string[] | null
}

interface ChapterEditorProps {
 chapter: Chapter
 index: number
 book: Book
 onUpdate: (id: string, field: string, value: string) => void
 onDelete: (id: string) => void
 onGenerateChapter: (index: number) => void
 onGenerateImage: (index: number) => void
 generatingChapter: number | null
 generatingImage: number | null
 imagePrompt: string
 setImagePrompt: (value: string) => void
 chapterPrompt: string
 setChapterPrompt: (value: string) => void
}

const ChapterEditor: React.FC<ChapterEditorProps> = (props) => {
  // All hooks must be called before any conditional returns
 const isMobile = useIsMobile(768)
 const { t } = useLanguage()
 
  // Use mobile-optimized version on smaller screens
 if (isMobile) {
 return <MobileOptimizedChapterEditor {...props} />
 }

  // Desktop version (original)
 const {
 chapter,
 index,
 book,
 onUpdate,
 onDelete,
 onGenerateChapter,
 onGenerateImage,
 generatingChapter,
 generatingImage,
 imagePrompt,
 setImagePrompt,
 chapterPrompt,
 setChapterPrompt
 } = props
 const currentImages = book.images ? (Array.isArray(book.images) ? book.images : []) : []
 const chapterImage = currentImages[index]

 const imageSize = chapter.imageSize || 'full'

 const setImageSize = (size: 'full' | 'half' | 'quarter' | 'inline' | 'double') => {
 onUpdate(chapter.id, 'imageSize', size)
 }

 return (
 <Card className="bg-card dark:bg-gray-800 border-amber-200 shadow-lg">
 <CardHeader className="bg-amber-50 border-b border-amber-200">
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-2">
 <Badge variant="outline" className="border-amber-300 text-amber-700">
 #{index + 1}
 </Badge>
 <Input
 value={chapter.title}
 onChange={e => onUpdate(chapter.id, 'title', e.target.value)}
 className="font-semibold border-none p-0 h-auto bg-transparent text-amber-900"
 placeholder={book.bookType === 'picture' ? `Page ${index + 1}` : `Chapter ${index + 1}`}
 />
 </div>
 <div className="flex items-center space-x-2">
 <span className="text-sm text-amber-600">{chapter.wordCount} {t('words')}</span>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => onDelete(chapter.id)}
 className="text-red-600 hover:text-red-800 hover:bg-red-50"
 >
 <Trash2 className="h-4 w-4" />
 </Button>
 </div>
 </div>
 </CardHeader>
 
 <CardContent className="p-6 space-y-6">
 {/* Image Section */}
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h4 className="font-medium text-amber-900 flex items-center">
 <Image className="h-4 w-4 mr-2" />
 {t('image')}
 </h4>
 <div className="flex items-center space-x-2">
 <div className="flex border border-amber-300 rounded-md overflow-hidden">
 <button
 onClick={() => setImageSize('full')}
 className={`p-1 text-xs ${imageSize === 'full' ? 'bg-amber-600 text-white' : 'bg-card dark:bg-gray-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30'}`}
 title={t('fullPage')}
 >
 <Maximize className="h-3 w-3" />
 </button>
 <button
 onClick={() => setImageSize('double')}
 className={`p-1 text-xs ${imageSize === 'double' ? 'bg-amber-600 text-white' : 'bg-card dark:bg-gray-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30'}`}
 title={t('doublePage')}
 >
 <Square className="h-3 w-3" />
 </button>
 <button
 onClick={() => setImageSize('half')}
 className={`p-1 text-xs ${imageSize === 'half' ? 'bg-amber-600 text-white' : 'bg-card dark:bg-gray-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30'}`}
 title={t('halfPage')}
 >
 <Minimize className="h-3 w-3" />
 </button>
 <button
 onClick={() => setImageSize('quarter')}
 className={`p-1 text-xs ${imageSize === 'quarter' ? 'bg-amber-600 text-white' : 'bg-card dark:bg-gray-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30'}`}
 title={t('quarterPage')}
 >
 <Square className="h-2 w-2" />
 </button>
 <button
 onClick={() => setImageSize('inline')}
 className={`p-1 text-xs ${imageSize === 'inline' ? 'bg-amber-600 text-white' : 'bg-card dark:bg-gray-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30'}`}
 title={t('inlineImage')}
 >
 <Type className="h-3 w-3" />
 </button>
 </div>
 <Input
 value={imagePrompt}
 onChange={e => setImagePrompt(e.target.value)}
 placeholder={t('imageInstructions')}
 className="w-48 h-8 border-amber-200 focus:border-amber-500"
 />
 <Button
 size="sm"
 onClick={() => onGenerateImage(index)}
 disabled={generatingImage === index}
 className="bg-amber-600 hover:bg-amber-700"
 >
 {generatingImage === index ? (
 <RefreshCw className="h-4 w-4 animate-spin mr-1" />
 ) : (
 <Wand2 className="h-4 w-4 mr-1" />
 )}
 {t('generate')}
 </Button>
 </div>
 </div>
 
 <div className={`border-2 border-dashed border-amber-300 rounded-lg p-4 ${
 imageSize === 'full' ? 'aspect-[4/3]' : 
 imageSize === 'double' ? 'aspect-[2/1]' :
 imageSize === 'half' ? 'aspect-[3/2] max-w-md' :
 imageSize === 'quarter' ? 'aspect-square max-w-xs' :
 'aspect-video max-w-sm'
 }`}>
 {chapterImage ? (
 <div className="relative h-full">
 <NextImage
 src={chapterImage}
 alt={`Image for ${chapter.title}`}
 fill
 sizes="(max-width: 768px) 100vw, 50vw"
 className="object-cover rounded-lg shadow-md"
 priority
 />
 <div className="absolute top-2 right-2">
 <Badge variant="secondary" className="text-xs">
 {imageSize === 'full' ? t('fullPage') :
 imageSize === 'double' ? t('doublePage') :
 imageSize === 'half' ? t('halfPage') :
 imageSize === 'quarter' ? t('quarterPage') : t('inlineImage')}
 </Badge>
 </div>
 </div>
 ) : (
 <div className="h-full flex flex-col items-center justify-center text-center text-amber-600">
 <Image className="h-8 w-8 mx-auto mb-2 text-amber-400" />
 <p className="text-sm">{t('noImage')}</p>
 <p className="text-xs opacity-70">{t('size')}: {
 imageSize === 'full' ? t('fullPage') :
 imageSize === 'double' ? t('doublePage') :
 imageSize === 'half' ? t('halfPage') :
 imageSize === 'quarter' ? t('quarterPage') : t('inlineImage')
 }</p>
 </div>
 )}
 </div>
 </div>

 {/* Content Section */}
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h4 className="font-medium text-amber-900 flex items-center">
 <Type className="h-4 w-4 mr-2" />
 {t('content')}
 </h4>
 <div className="flex items-center space-x-2">
 <Input
 value={chapterPrompt}
 onChange={e => setChapterPrompt(e.target.value)}
 placeholder={t('textGenerationInstructions')}
 className="w-48 h-8 border-amber-200 focus:border-amber-500"
 />
 <Button
 size="sm"
 onClick={() => onGenerateChapter(index)}
 disabled={generatingChapter === index}
 className="bg-amber-600 hover:bg-amber-700"
 >
 {generatingChapter === index ? (
 <RefreshCw className="h-4 w-4 animate-spin mr-1" />
 ) : (
 <Wand2 className="h-4 w-4 mr-1" />
 )}
 {t('generate')}
 </Button>
 </div>
 </div>
 
 <Textarea
 value={chapter.content}
 onChange={e => onUpdate(chapter.id, 'content', e.target.value)}
 placeholder={book.bookType === 'picture' ? t('pageContent') : t('chapterContent')}
 className="min-h-[200px] border-amber-200 focus:border-amber-500 font-serif text-gray-800"
 />
 </div>
 </CardContent>
 </Card>
 )
}

export default ChapterEditor
