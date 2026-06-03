import React from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trash2, Wand2, RefreshCw, Image, Type, FileText, Camera } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'

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

interface MobileOptimizedChapterEditorProps {
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

const MobileOptimizedChapterEditor: React.FC<MobileOptimizedChapterEditorProps> = ({
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
}) => {
 const { t } = useLanguage()
 const currentImages = book.images ? (Array.isArray(book.images) ? book.images : []) : []
 const chapterImage = currentImages[index]
 const imageSize = chapter.imageSize || 'full'

 const setImageSize = (size: 'full' | 'half' | 'quarter' | 'inline' | 'double') => {
 onUpdate(chapter.id, 'imageSize', size)
 }

 return (
 <div className="bg-card border border-border rounded-3xl shadow-lg overflow-hidden">
 {/* Header */}
 <div className="bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-950/50 dark:to-blue-950/50 border-b border-border p-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <Badge 
 variant="outline" 
 className="border-bookcraft-blue/40 dark:border-bookcraft-blue/40 text-bookcraft-blue dark:text-bookcraft-blue/80 bg-bookcraft-blue/10 dark:bg-bookcraft-blue/20 px-3 py-1 rounded-full font-bold"
 >
 #{index + 1}
 </Badge>
 <Input
 value={chapter.title}
 onChange={e => onUpdate(chapter.id, 'title', e.target.value)}
 className="font-bold border-none p-0 h-auto bg-transparent text-lg text-foreground focus:ring-0 focus:border-0"
 placeholder={book.bookType === 'picture' ? `Page ${index + 1}` : `Chapter ${index + 1}`}
 />
 </div>
 
 <div className="flex items-center gap-2">
 <div className="flex items-center gap-1 bg-white/50 dark:bg-black/20 rounded-full px-3 py-1">
 <FileText className="h-3 w-3 text-muted-foreground" />
 <span className="text-sm font-medium text-muted-foreground">
 {chapter.wordCount}
 </span>
 </div>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => onDelete(chapter.id)}
 className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-full w-10 h-10 p-0"
 >
 <Trash2 className="h-4 w-4" />
 </Button>
 </div>
 </div>
 </div>
 
 <div className="p-6 space-y-6">
 {/* Image Section for Picture Books */}
 {book.bookType === 'picture' && (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h4 className="font-bold text-foreground flex items-center gap-2 text-lg">
 <Camera className="h-5 w-5 text-bookcraft-blue dark:text-bookcraft-blue/80" />
 {t('pageImage') || 'Seitenbild'}
 </h4>
 {chapterImage && (
 <Button
 variant="outline"
 size="sm"
 onClick={() => onGenerateImage(index)}
 disabled={generatingImage === index}
 className="rounded-full"
 >
 {generatingImage === index ? (
 <RefreshCw className="h-4 w-4 animate-spin" />
 ) : (
 <Wand2 className="h-4 w-4" />
 )}
 <span className="ml-2 hidden sm:inline">
 {generatingImage === index ? t('generating') : t('regenerate')}
 </span>
 </Button>
 )}
 </div>

 {/* Image Display */}
 {chapterImage ? (
 <div className="space-y-4">
 <div className="relative rounded-xl overflow-hidden bg-muted">
 <img
 src={chapterImage}
 alt={`Chapter ${index + 1} image`}
 className="w-full h-auto object-contain max-h-80"
 />
 </div>
 
 {/* Image Size Controls */}
 <div className="space-y-3">
 <label className="text-sm font-semibold text-foreground">
 {t('imageSize') || 'Bildgröße'}
 </label>
 <div className="grid grid-cols-2 gap-2">
 {[
 { value: 'full', label: 'Vollbild', icon: '□' },
 { value: 'half', label: 'Halbseitig', icon: '' },
 { value: 'quarter', label: 'Viertel', icon: '' },
 { value: 'double', label: 'Doppelseite', icon: '' }
 ].map(({ value, label, icon }) => (
 <button
 key={value}
 onClick={() => setImageSize(value as any)}
 className={cn(
 "p-3 rounded-xl border-2 transition-all text-left text-sm font-medium",
 imageSize === value
 ? "border-bookcraft-blue bg-bookcraft-blue/5 dark:bg-bookcraft-blue/10 text-foreground"
 : "border-border hover:border-bookcraft-blue/40 dark:hover:border-bookcraft-blue/40 text-foreground"
 )}
 >
 <div className="flex items-center gap-2">
 <span className="text-lg">{icon}</span>
 <span>{label}</span>
 </div>
 </button>
 ))}
 </div>
 </div>
 </div>
 ) : (
              /* Generate New Image */
 <div className="space-y-4">
 <div className="border-2 border-dashed border-border rounded-xl p-8 text-center bg-muted/30">
 <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
 <p className="text-muted-foreground text-base mb-4">
 {t('noImageYet') || 'Noch kein Bild generiert'}
 </p>
 <Button
 onClick={() => onGenerateImage(index)}
 disabled={generatingImage === index}
 className="bg-bookcraft-blue hover:brightness-110 text-white rounded-full px-6"
 >
 {generatingImage === index ? (
 <>
 <RefreshCw className="h-4 w-4 animate-spin mr-2" />
 {t('generating')}
 </>
 ) : (
 <>
 <Wand2 className="h-4 w-4 mr-2" />
 {t('generateImage')}
 </>
 )}
 </Button>
 </div>

 {/* Image Prompt */}
 <div className="space-y-2">
 <label className="text-sm font-semibold text-foreground">
 {t('imagePrompt') || 'Bildbeschreibung'}
 </label>
 <Textarea
 value={imagePrompt}
 onChange={(e) => setImagePrompt(e.target.value)}
 className="min-h-[80px] rounded-xl bg-muted/30 border-0 focus:bg-background focus:ring-2 focus:ring-bookcraft-blue/50 focus:ring-offset-0 resize-none"
 placeholder={t('imagePromptPlaceholder') || 'Beschreibe, was auf dem Bild zu sehen sein soll...'}
 />
 </div>
 </div>
 )}
 </div>
 )}

 {/* Text Content Section */}
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h4 className="font-bold text-foreground flex items-center gap-2 text-lg">
 <Type className="h-5 w-5 text-green-600 dark:text-green-400" />
 {book.bookType === 'picture' ? (t('pageText') || 'Seitentext') : (t('chapterContent') || 'Kapitelinhalt')}
 </h4>
 {chapter.content && (
 <Button
 variant="outline"
 size="sm"
 onClick={() => onGenerateChapter(index)}
 disabled={generatingChapter === index}
 className="rounded-full"
 >
 {generatingChapter === index ? (
 <RefreshCw className="h-4 w-4 animate-spin" />
 ) : (
 <Wand2 className="h-4 w-4" />
 )}
 <span className="ml-2 hidden sm:inline">
 {generatingChapter === index ? t('generating') : t('rewrite')}
 </span>
 </Button>
 )}
 </div>

 {chapter.content ? (
 <div className="space-y-4">
 <Textarea
 value={chapter.content}
 onChange={(e) => onUpdate(chapter.id, 'content', e.target.value)}
 className="min-h-[200px] text-base leading-relaxed rounded-xl bg-muted/30 border-0 focus:bg-background focus:ring-2 focus:ring-bookcraft-blue/50 focus:ring-offset-0 resize-none"
 placeholder={book.bookType === 'picture' 
 ? (t('pageTextPlaceholder') || 'Text für diese Seite...')
 : (t('chapterContentPlaceholder') || 'Kapitelinhalt hier eingeben...')
 }
 />
 
 {/* Text Stats */}
 <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted/30 rounded-xl p-3">
 <div className="flex items-center gap-1">
 <FileText className="h-4 w-4" />
 <span>{chapter.wordCount} {t('words') || 'Wörter'}</span>
 </div>
 <div className="flex items-center gap-1">
 <Type className="h-4 w-4" />
 <span>{chapter.content.length} {t('characters') || 'Zeichen'}</span>
 </div>
 </div>
 </div>
 ) : (
            /* Generate New Content */
 <div className="space-y-4">
 <div className="border-2 border-dashed border-border rounded-xl p-8 text-center bg-muted/30">
 <Type className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
 <p className="text-muted-foreground text-base mb-4">
 {book.bookType === 'picture' 
 ? (t('noTextYet') || 'Noch kein Text geschrieben')
 : (t('noContentYet') || 'Noch kein Inhalt geschrieben')
 }
 </p>
 <Button
 onClick={() => onGenerateChapter(index)}
 disabled={generatingChapter === index}
 className="bg-green-600 hover:bg-green-700 text-white rounded-full px-6"
 >
 {generatingChapter === index ? (
 <>
 <RefreshCw className="h-4 w-4 animate-spin mr-2" />
 {t('generating')}
 </>
 ) : (
 <>
 <Wand2 className="h-4 w-4 mr-2" />
 {book.bookType === 'picture' 
 ? (t('generateText') || 'Text generieren')
 : (t('generateChapter') || 'Kapitel generieren')
 }
 </>
 )}
 </Button>
 </div>

 {/* Chapter/Text Prompt */}
 <div className="space-y-2">
 <label className="text-sm font-semibold text-foreground">
 {book.bookType === 'picture' 
 ? (t('textPrompt') || 'Text-Vorgabe')
 : (t('chapterPrompt') || 'Kapitel-Vorgabe')
 }
 </label>
 <Textarea
 value={chapterPrompt}
 onChange={(e) => setChapterPrompt(e.target.value)}
 className="min-h-[80px] rounded-xl bg-muted/30 border-0 focus:bg-background focus:ring-2 focus:ring-bookcraft-blue/50 focus:ring-offset-0 resize-none"
 placeholder={book.bookType === 'picture'
 ? (t('textPromptPlaceholder') || 'Was soll der Text auf dieser Seite aussagen?')
 : (t('chapterPromptPlaceholder') || 'Worum soll es in diesem Kapitel gehen?')
 }
 />
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 )
}

export default MobileOptimizedChapterEditor