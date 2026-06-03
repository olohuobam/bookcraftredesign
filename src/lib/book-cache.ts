'use client'

/**
 * LocalStorage cache for completed books
 * Improves load times for returning users viewing their finished books
 */

interface CachedBook {
 id: string
 title: string
 images?: string[]
 chapters?: Array<{
 title: string
 content: string
 }>
 status: string
 cachedAt: number
 version: number
}

interface CachedJob {
 id: string
 status: string
 progress: number
 currentStep: string | null
 cachedAt: number
}

const CACHE_PREFIX = 'bookcraft_'
const BOOK_CACHE_KEY = `${CACHE_PREFIX}books`
const JOB_CACHE_KEY = `${CACHE_PREFIX}jobs`
const CACHE_VERSION = 1
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const MAX_CACHED_BOOKS = 20

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
 try {
 const test = '__storage_test__'
 localStorage.setItem(test, test)
 localStorage.removeItem(test)
 return true
 } catch {
 return false
 }
}

/**
 * Get all cached books
 */
function getCachedBooks(): Map<string, CachedBook> {
 if (!isLocalStorageAvailable()) return new Map()

 try {
 const data = localStorage.getItem(BOOK_CACHE_KEY)
 if (!data) return new Map()

 const parsed = JSON.parse(data)
 return new Map(Object.entries(parsed))
 } catch {
 return new Map()
 }
}

/**
 * Save cached books to localStorage
 */
function saveCachedBooks(books: Map<string, CachedBook>): void {
 if (!isLocalStorageAvailable()) return

 try {
 const obj = Object.fromEntries(books)
 localStorage.setItem(BOOK_CACHE_KEY, JSON.stringify(obj))
 } catch (e) {
    // localStorage might be full, try to clear old entries
    console.warn('Failed to save book cache:', e)
 cleanupOldCache()
 }
}

/**
 * Cache a completed book
 */
export function cacheBook(book: {
 id: string
 title: string
 images?: string[]
 chapters?: Array<{ title: string; content: string }>
 status: string
}): void {
 if (!isLocalStorageAvailable()) return

  // Only cache completed books
 if (book.status !== 'completed' && book.status !== 'preview_completed') {
 return
 }

 const books = getCachedBooks()

  // Enforce max cache size
 if (books.size >= MAX_CACHED_BOOKS && !books.has(book.id)) {
    // Remove oldest entry
 let oldestKey: string | null = null
 let oldestTime = Infinity

 books.forEach((cached, key) => {
 if (cached.cachedAt < oldestTime) {
 oldestTime = cached.cachedAt
 oldestKey = key
 }
 })

 if (oldestKey) {
 books.delete(oldestKey)
 }
 }

 books.set(book.id, {
 id: book.id,
 title: book.title,
 images: book.images,
 chapters: book.chapters,
 status: book.status,
 cachedAt: Date.now(),
 version: CACHE_VERSION
 })

 saveCachedBooks(books)
}

/**
 * Get a cached book by ID
 */
export function getCachedBook(bookId: string): CachedBook | null {
 if (!isLocalStorageAvailable()) return null

 const books = getCachedBooks()
 const cached = books.get(bookId)

 if (!cached) return null

  // Check if cache is still valid
 if (Date.now() - cached.cachedAt > MAX_CACHE_AGE_MS) {
 books.delete(bookId)
 saveCachedBooks(books)
 return null
 }

  // Check cache version
 if (cached.version !== CACHE_VERSION) {
 books.delete(bookId)
 saveCachedBooks(books)
 return null
 }

 return cached
}

/**
 * Invalidate a cached book (e.g., when it's updated)
 */
export function invalidateBookCache(bookId: string): void {
 if (!isLocalStorageAvailable()) return

 const books = getCachedBooks()
 if (books.has(bookId)) {
 books.delete(bookId)
 saveCachedBooks(books)
 }
}

/**
 * Cache job status for quick loading
 */
export function cacheJobStatus(job: {
 id: string
 status: string
 progress: number
 currentStep: string | null
}): void {
 if (!isLocalStorageAvailable()) return

  // Only cache terminal states
 if (!['completed', 'preview_completed', 'failed', 'cancelled'].includes(job.status)) {
 return
 }

 try {
 const jobs = getJobCache()
 jobs.set(job.id, {
 id: job.id,
 status: job.status,
 progress: job.progress,
 currentStep: job.currentStep,
 cachedAt: Date.now()
 })

    // Keep only last 50 jobs
 if (jobs.size > 50) {
 const entries = Array.from(jobs.entries())
 .sort((a, b) => b[1].cachedAt - a[1].cachedAt)
 .slice(0, 50)
 jobs.clear()
 entries.forEach(([k, v]) => jobs.set(k, v))
 }

 localStorage.setItem(JOB_CACHE_KEY, JSON.stringify(Object.fromEntries(jobs)))
 } catch {
    // Ignore cache errors
 }
}

/**
 * Get cached job status
 */
export function getCachedJobStatus(jobId: string): CachedJob | null {
 if (!isLocalStorageAvailable()) return null

 const jobs = getJobCache()
 const cached = jobs.get(jobId)

 if (!cached) return null

  // Job cache expires after 1 hour
 if (Date.now() - cached.cachedAt > 60 * 60 * 1000) {
 jobs.delete(jobId)
 try {
 localStorage.setItem(JOB_CACHE_KEY, JSON.stringify(Object.fromEntries(jobs)))
 } catch {
      // Ignore
 }
 return null
 }

 return cached
}

function getJobCache(): Map<string, CachedJob> {
 try {
 const data = localStorage.getItem(JOB_CACHE_KEY)
 if (!data) return new Map()
 return new Map(Object.entries(JSON.parse(data)))
 } catch {
 return new Map()
 }
}

/**
 * Clean up old cache entries
 */
export function cleanupOldCache(): void {
 if (!isLocalStorageAvailable()) return

 const now = Date.now()

  // Clean books
 const books = getCachedBooks()
 let booksChanged = false
 books.forEach((book, key) => {
 if (now - book.cachedAt > MAX_CACHE_AGE_MS || book.version !== CACHE_VERSION) {
 books.delete(key)
 booksChanged = true
 }
 })
 if (booksChanged) {
 saveCachedBooks(books)
 }

  // Clean jobs
 const jobs = getJobCache()
 let jobsChanged = false
 jobs.forEach((job, key) => {
 if (now - job.cachedAt > 60 * 60 * 1000) {
 jobs.delete(key)
 jobsChanged = true
 }
 })
 if (jobsChanged) {
 try {
 localStorage.setItem(JOB_CACHE_KEY, JSON.stringify(Object.fromEntries(jobs)))
 } catch {
      // Ignore
 }
 }
}

/**
 * Clear all book cache
 */
export function clearAllCache(): void {
 if (!isLocalStorageAvailable()) return

 try {
 localStorage.removeItem(BOOK_CACHE_KEY)
 localStorage.removeItem(JOB_CACHE_KEY)
 } catch {
    // Ignore
 }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
 bookCount: number
 jobCount: number
 totalSizeKB: number
} {
 if (!isLocalStorageAvailable()) {
 return { bookCount: 0, jobCount: 0, totalSizeKB: 0 }
 }

 const bookData = localStorage.getItem(BOOK_CACHE_KEY) || ''
 const jobData = localStorage.getItem(JOB_CACHE_KEY) || ''

 return {
 bookCount: getCachedBooks().size,
 jobCount: getJobCache().size,
 totalSizeKB: Math.round((bookData.length + jobData.length) / 1024)
 }
}
