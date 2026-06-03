'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface BookData {
 id: string
 title: string
 author?: string
 genre: string
 description: string
 chapters: number
 bookType?: 'text' | 'picture' | 'production'
 status?: 'draft' | 'generating' | 'processing' | 'completed' | 'error'
 coverImage?: string
 createdAt?: string
 updatedAt?: string
 chaptersJson?: { chapters?: { content?: string }[] }
 content?: string
 activeJobId?: string | null
 isPublic?: boolean
}

interface CacheEntry {
 books: BookData[]
 timestamp: number
 userId: string
}

const CACHE_KEY = 'bookcraft-books-cache'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const STALE_TTL = 30 * 60 * 1000 // 30 minutes - show stale data while revalidating

/**
 * Custom hook for cached book fetching with stale-while-revalidate strategy
 * - Instantly shows cached data on mount
 * - Revalidates in background if cache is stale
 * - Updates cache on successful fetch
 */
export function useBookCache(userId: string | undefined, getIdToken: () => Promise<string | null>) {
 const [books, setBooks] = useState<BookData[]>([])
 const [loading, setLoading] = useState(true)
 const [isRevalidating, setIsRevalidating] = useState(false)
 const [error, setError] = useState<string | null>(null)
 const fetchInProgress = useRef(false)

  // Get cached data from localStorage
 const getCachedBooks = useCallback((): CacheEntry | null => {
 if (typeof window === 'undefined') return null
 try {
 const cached = localStorage.getItem(CACHE_KEY)
 if (!cached) return null
 const entry: CacheEntry = JSON.parse(cached)
      // Only return cache if it belongs to current user
 if (entry.userId !== userId) return null
 return entry
 } catch {
 return null
 }
 }, [userId])

  // Save books to cache
 const setCachedBooks = useCallback((books: BookData[]) => {
 if (typeof window === 'undefined' || !userId) return
 try {
 const entry: CacheEntry = {
 books,
 timestamp: Date.now(),
 userId
 }
 localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
 } catch {
      // Ignore storage errors
 }
 }, [userId])

  // Check if cache is fresh (< 5 min)
 const isCacheFresh = useCallback((entry: CacheEntry): boolean => {
 return Date.now() - entry.timestamp < CACHE_TTL
 }, [])

  // Check if cache is usable (< 30 min) - can show while revalidating
 const isCacheUsable = useCallback((entry: CacheEntry): boolean => {
 return Date.now() - entry.timestamp < STALE_TTL
 }, [])

  // Fetch books from API
 const fetchFromAPI = useCallback(async (showLoadingState: boolean = true): Promise<BookData[] | null> => {
 if (!userId || fetchInProgress.current) return null

 fetchInProgress.current = true
 if (showLoadingState) setLoading(true)
 else setIsRevalidating(true)

 setError(null)

 try {
 const token = await getIdToken()
 if (!token) {
 setError('Auth token not available')
 return null
 }

 const res = await fetch('/api/books', {
 headers: {
 'Authorization': `Bearer ${token}`,
 },
 })

 if (!res.ok) throw new Error('Error loading books')

 const data = await res.json()
 const normalized: BookData[] = (data.books || []).map((b: Record<string, unknown>) => ({
 id: b.id as string,
 title: b.title as string,
 author: (b.author as string) || undefined,
 genre: b.genre as string,
 description: (b.description as string) || '',
 chapters: (b.chapters as number) || 0,
 bookType: (b.bookType as BookData['bookType']) || 'text',
 status: (b.status as BookData['status']) || 'completed',
 coverImage: (b.coverImage as string) || undefined,
 createdAt: b.createdAt as string,
 updatedAt: b.updatedAt as string,
 chaptersJson: b.chaptersJson as BookData['chaptersJson'],
 content: b.content as string,
 activeJobId: (b.activeJobId as string) || null,
 isPublic: (b.isPublic as boolean) ?? false,
 }))

      // Update state and cache
 setBooks(normalized)
 setCachedBooks(normalized)
 return normalized
 } catch (e) {
 setError(e instanceof Error ? e.message : 'Unknown error')
 return null
 } finally {
 setLoading(false)
 setIsRevalidating(false)
 fetchInProgress.current = false
 }
 }, [userId, getIdToken, setCachedBooks])

  // Initial load with cache-first strategy
 useEffect(() => {
 if (!userId) {
 setLoading(false)
 return
 }

 const cached = getCachedBooks()

 if (cached && isCacheUsable(cached)) {
      // Show cached data immediately
 setBooks(cached.books)
 setLoading(false)

      // If cache is stale but usable, revalidate in background
 if (!isCacheFresh(cached)) {
 fetchFromAPI(false) // false = don't show loading state
 }
 } else {
      // No usable cache, fetch fresh
 fetchFromAPI(true)
 }
 }, [userId, getCachedBooks, isCacheFresh, isCacheUsable, fetchFromAPI])

  // Force refresh (bypasses cache)
 const refresh = useCallback(async () => {
 return fetchFromAPI(true)
 }, [fetchFromAPI])

  // Update a single book in cache (optimistic update)
 const updateBookInCache = useCallback((bookId: string, updates: Partial<BookData>) => {
 setBooks(prev => {
 const updated = prev.map(b => b.id === bookId ? { ...b, ...updates } : b)
 setCachedBooks(updated)
 return updated
 })
 }, [setCachedBooks])

  // Remove a book from cache (optimistic delete)
 const removeBookFromCache = useCallback((bookId: string) => {
 setBooks(prev => {
 const updated = prev.filter(b => b.id !== bookId)
 setCachedBooks(updated)
 return updated
 })
 }, [setCachedBooks])

  // Add a book to cache (optimistic create)
 const addBookToCache = useCallback((book: BookData) => {
 setBooks(prev => {
 const updated = [book, ...prev]
 setCachedBooks(updated)
 return updated
 })
 }, [setCachedBooks])

  // Preload cover images into browser cache
 useEffect(() => {
 if (books.length === 0) return

    // Preload all cover images, prioritizing the first 10 visible ones
 const prioritized = [...books.slice(0, 10), ...books.slice(10)]
 prioritized.forEach((book, idx) => {
 if (book.coverImage) {
 const img = new Image()
 // Use Next.js image optimization endpoint for caching + WebP conversion
 img.src = `/_next/image?url=${encodeURIComponent(book.coverImage)}&w=384&q=75`
 // Stagger loading to not hammer the network
 if (idx >= 10) {
 setTimeout(() => { img.src = img.src }, (idx - 10) * 50)
 }
 }
 })
 }, [books])

 return {
 books,
 loading,
 isRevalidating,
 error,
 refresh,
 updateBookInCache,
 removeBookFromCache,
 addBookToCache,
 setError
 }
}

/**
 * Preload a cover image into browser cache
 */
export function preloadCoverImage(url: string): Promise<void> {
 return new Promise((resolve, reject) => {
 const img = new Image()
 img.onload = () => resolve()
 img.onerror = reject
 img.src = url
 })
}

/**
 * Preload multiple cover images
 */
export function preloadCoverImages(urls: (string | undefined)[]): void {
 urls.forEach(url => {
 if (url) {
 const img = new Image()
 img.src = url
 }
 })
}
