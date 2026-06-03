'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'

export interface Bookmark {
 chapterIndex: number
 chapterTitle: string
 savedAt: string
}

export interface Note {
 id: string
 chapterIndex: number
 chapterTitle: string
 content: string
 savedAt: string
}

interface ReadingProgress {
 last_chapter_index: number
 bookmarks: Bookmark[]
 notes: Note[]
}

interface UseReadingProgressReturn {
 lastChapterIndex: number
 bookmarks: Bookmark[]
 notes: Note[]
 isLoading: boolean
 savePosition: (chapterIndex: number) => void
 toggleBookmark: (chapterIndex: number, chapterTitle: string) => void
 isBookmarked: (chapterIndex: number) => boolean
 saveNote: (chapterIndex: number, chapterTitle: string, content: string, noteId?: string) => void
 deleteNote: (noteId: string) => void
 getNoteForChapter: (chapterIndex: number) => Note | undefined
}

export function useReadingProgress(bookId: string): UseReadingProgressReturn {
 const { getIdToken } = useAuth()
 const [progress, setProgress] = useState<ReadingProgress>({
 last_chapter_index: 0,
 bookmarks: [],
 notes: [],
 })
 const [isLoading, setIsLoading] = useState(true)
 const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
 const latestProgressRef = useRef<ReadingProgress>(progress)

  // Keep ref in sync with state
 useEffect(() => {
 latestProgressRef.current = progress
 }, [progress])

  // Load progress on mount
 useEffect(() => {
 if (!bookId) return

 const load = async () => {
 setIsLoading(true)
 try {
 const token = await getIdToken()
 if (!token) return

 const res = await fetch(`/api/books/${bookId}/reading-progress`, {
 headers: { Authorization: `Bearer ${token}` },
 })

 if (res.ok) {
 const data: ReadingProgress = await res.json()
 setProgress({
 last_chapter_index: data.last_chapter_index ?? 0,
 bookmarks: data.bookmarks ?? [],
 notes: data.notes ?? [],
 })
 }
 } catch (err) {
        console.error('Failed to load reading progress:', err)
 } finally {
 setIsLoading(false)
 }
 }

 load()
 }, [bookId, getIdToken])

  // Persist progress to server
 const persist = useCallback(
 async (updated: ReadingProgress) => {
 try {
 const token = await getIdToken()
 if (!token) return

 await fetch(`/api/books/${bookId}/reading-progress`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 Authorization: `Bearer ${token}`,
 },
 body: JSON.stringify(updated),
 })
 } catch (err) {
        console.error('Failed to save reading progress:', err)
 }
 },
 [bookId, getIdToken]
 )

  // Debounced position save
 const savePosition = useCallback(
 (chapterIndex: number) => {
 setProgress((prev) => {
 const updated = { ...prev, last_chapter_index: chapterIndex }
        // Debounce the server save
 if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
 saveTimeoutRef.current = setTimeout(() => persist(updated), 600)
 return updated
 })
 },
 [persist]
 )

  // Toggle bookmark for a chapter
 const toggleBookmark = useCallback(
 (chapterIndex: number, chapterTitle: string) => {
 setProgress((prev) => {
 const exists = prev.bookmarks.some((b) => b.chapterIndex === chapterIndex)
 const bookmarks: Bookmark[] = exists
 ? prev.bookmarks.filter((b) => b.chapterIndex !== chapterIndex)
 : [
 ...prev.bookmarks,
 {
 chapterIndex,
 chapterTitle,
 savedAt: new Date().toISOString(),
 },
 ]
 const updated = { ...prev, bookmarks }
 persist(updated)
 return updated
 })
 },
 [persist]
 )

 const isBookmarked = useCallback(
 (chapterIndex: number) => progress.bookmarks.some((b) => b.chapterIndex === chapterIndex),
 [progress.bookmarks]
 )

  // Save (add/edit) a note for a chapter
 const saveNote = useCallback(
 (chapterIndex: number, chapterTitle: string, content: string, noteId?: string) => {
 setProgress((prev) => {
 let notes: Note[]
 if (noteId) {
          // Edit existing
 notes = prev.notes.map((n) =>
 n.id === noteId
 ? { ...n, content, savedAt: new Date().toISOString() }
 : n
 )
 } else {
          // Create new
 const newNote: Note = {
 id: `${bookId}-${chapterIndex}-${Date.now()}`,
 chapterIndex,
 chapterTitle,
 content,
 savedAt: new Date().toISOString(),
 }
          // Replace any existing note for same chapter (one note per chapter for simplicity)
 const withoutExisting = prev.notes.filter((n) => n.chapterIndex !== chapterIndex)
 notes = [...withoutExisting, newNote]
 }
 const updated = { ...prev, notes }
 persist(updated)
 return updated
 })
 },
 [bookId, persist]
 )

 const deleteNote = useCallback(
 (noteId: string) => {
 setProgress((prev) => {
 const notes = prev.notes.filter((n) => n.id !== noteId)
 const updated = { ...prev, notes }
 persist(updated)
 return updated
 })
 },
 [persist]
 )

 const getNoteForChapter = useCallback(
 (chapterIndex: number) => progress.notes.find((n) => n.chapterIndex === chapterIndex),
 [progress.notes]
 )

  // Cleanup debounce on unmount
 useEffect(() => {
 return () => {
 if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
 }
 }, [])

 return {
 lastChapterIndex: progress.last_chapter_index,
 bookmarks: progress.bookmarks,
 notes: progress.notes,
 isLoading,
 savePosition,
 toggleBookmark,
 isBookmarked,
 saveNote,
 deleteNote,
 getNoteForChapter,
 }
}
