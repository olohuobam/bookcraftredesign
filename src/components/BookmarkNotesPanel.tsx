'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bookmark, StickyNote, Trash2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Bookmark as BookmarkType, Note } from '@/hooks/useReadingProgress'
import { useLanguage } from '@/context/LanguageContext'

interface BookmarkNotesPanelProps {
 isOpen: boolean
 onClose: () => void
 bookmarks: BookmarkType[]
 notes: Note[]
 onNavigate: (chapterIndex: number) => void
 onDeleteBookmark: (chapterIndex: number, chapterTitle: string) => void
 onDeleteNote: (noteId: string) => void
 bookType?: string
}

type TabType = 'bookmarks' | 'notes'

export default function BookmarkNotesPanel({
 isOpen,
 onClose,
 bookmarks,
 notes,
 onNavigate,
 onDeleteBookmark,
 onDeleteNote,
 bookType = 'text',
}: BookmarkNotesPanelProps) {
 const { t } = useLanguage()
 const [activeTab, setActiveTab] = useState<TabType>('bookmarks')

 const sortedBookmarks = [...bookmarks].sort((a, b) => a.chapterIndex - b.chapterIndex)
 const sortedNotes = [...notes].sort((a, b) => a.chapterIndex - b.chapterIndex)

 const formatDate = (dateStr: string) => {
 try {
 return new Date(dateStr).toLocaleDateString(undefined, {
 day: '2-digit',
 month: 'short',
 })
 } catch {
 return ''
 }
 }

 const handleNavigate = (chapterIndex: number) => {
 onNavigate(chapterIndex)
 onClose()
 }

 return (
 <AnimatePresence>
 {isOpen && (
 <>
 {/* Backdrop */}
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 bg-black/50 z-30"
 onClick={onClose}
 />

 {/* Panel */}
 <motion.div
 initial={{ x: 320 }}
 animate={{ x: 0 }}
 exit={{ x: 320 }}
 transition={{ type: 'spring', damping: 25, stiffness: 300 }}
 className="fixed right-0 top-0 bottom-0 w-80 z-40 bg-background shadow-2xl flex flex-col"
 >
 {/* Header */}
 <div className="p-4 border-b border-border flex-shrink-0">
 <div className="flex items-center justify-between mb-3">
 <h2 className="font-bold text-lg text-foreground">{t('bookmarksAndNotes')}</h2>
 <Button variant="ghost" size="icon" onClick={onClose}>
 <X className="h-5 w-5" />
 </Button>
 </div>

 {/* Tabs */}
 <div className="flex gap-1 bg-muted rounded-lg p-1">
 <button
 onClick={() => setActiveTab('bookmarks')}
 className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
 activeTab === 'bookmarks'
 ? 'bg-background text-foreground shadow-sm'
 : 'text-muted-foreground hover:text-foreground'
 }`}
 >
 <Bookmark className="h-3.5 w-3.5" />
 <span>{t('bookmarks')}</span>
 {bookmarks.length > 0 && (
 <span className="bg-bookcraft-blue/10 text-bookcraft-blue dark:bg-bookcraft-blue/20 dark:text-bookcraft-blue/80 text-xs px-1.5 py-0.5 rounded-full">
 {bookmarks.length}
 </span>
 )}
 </button>
 <button
 onClick={() => setActiveTab('notes')}
 className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
 activeTab === 'notes'
 ? 'bg-background text-foreground shadow-sm'
 : 'text-muted-foreground hover:text-foreground'
 }`}
 >
 <FileText className="h-3.5 w-3.5" />
 <span>{t('notes')}</span>
 {notes.length > 0 && (
 <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 text-xs px-1.5 py-0.5 rounded-full">
 {notes.length}
 </span>
 )}
 </button>
 </div>
 </div>

 {/* Content */}
 <div className="flex-1 overflow-y-auto">
 {activeTab === 'bookmarks' && (
 <div>
 {sortedBookmarks.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
 <Bookmark className="h-10 w-10 text-muted-foreground/40 mb-3" />
 <p className="text-muted-foreground text-sm">
 {t('noBookmarksYet')}
 </p>
 <p className="text-muted-foreground/70 text-xs mt-1">
 {t('tapBookmarkToSave')}
 </p>
 </div>
 ) : (
 sortedBookmarks.map((bm) => (
 <div
 key={bm.chapterIndex}
 className="flex items-start gap-3 px-4 py-3 border-b border-border hover:bg-accent group"
 >
 <button
 onClick={() => handleNavigate(bm.chapterIndex)}
 className="flex-1 text-left"
 >
 <div className="flex items-center gap-2">
 <Bookmark className="h-4 w-4 text-bookcraft-blue fill-bookcraft-blue flex-shrink-0" />
 <span className="text-sm font-medium text-foreground line-clamp-2">
 {bm.chapterTitle}
 </span>
 </div>
 <p className="text-xs text-muted-foreground mt-0.5 ml-6">
 {bookType === 'text'
 ? t('chapterNumber', { number: bm.chapterIndex + 1 })
 : t('pageNumber', { number: bm.chapterIndex + 1 })}
 {' · '}
 {formatDate(bm.savedAt)}
 </p>
 </button>
 <button
 onClick={() => onDeleteBookmark(bm.chapterIndex, bm.chapterTitle)}
 className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity mt-0.5"
 title={t('removeBookmark')}
 >
 <Trash2 className="h-4 w-4" />
 </button>
 </div>
 ))
 )}
 </div>
 )}

 {activeTab === 'notes' && (
 <div>
 {sortedNotes.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
 <StickyNote className="h-10 w-10 text-muted-foreground/40 mb-3" />
 <p className="text-muted-foreground text-sm">
 {t('noNotesYet')}
 </p>
 <p className="text-muted-foreground/70 text-xs mt-1">
 {t('tapNoteToAdd')}
 </p>
 </div>
 ) : (
 sortedNotes.map((note) => (
 <div
 key={note.id}
 className="flex items-start gap-3 px-4 py-3 border-b border-border hover:bg-accent group"
 >
 <button
 onClick={() => handleNavigate(note.chapterIndex)}
 className="flex-1 text-left"
 >
 <div className="flex items-center gap-2">
 <StickyNote className="h-4 w-4 text-amber-500 flex-shrink-0" />
 <span className="text-sm font-medium text-foreground truncate">
 {note.chapterTitle}
 </span>
 </div>
 <p className="text-xs text-muted-foreground mt-0.5 ml-6 mb-1">
 {bookType === 'text'
 ? t('chapterNumber', { number: note.chapterIndex + 1 })
 : t('pageNumber', { number: note.chapterIndex + 1 })}
 {' · '}
 {formatDate(note.savedAt)}
 </p>
 <p className="text-sm text-foreground/80 ml-6 line-clamp-3 whitespace-pre-wrap">
 {note.content}
 </p>
 </button>
 <button
 onClick={() => onDeleteNote(note.id)}
 className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity mt-0.5"
 title={t('deleteNote')}
 >
 <Trash2 className="h-4 w-4" />
 </button>
 </div>
 ))
 )}
 </div>
 )}
 </div>
 </motion.div>
 </>
 )}
 </AnimatePresence>
 )
}
