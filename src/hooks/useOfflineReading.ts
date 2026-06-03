'use client'

import { useState, useEffect, useCallback } from 'react'

const DB_NAME = 'bookcraft-offline'
const DB_VERSION = 1
const STORE_BOOKS = 'books'
const STORE_IMAGES = 'images'

interface OfflineBook {
  bookId: string
  bookTitle: string
  bookType: string
  chapters: unknown[]
  chaptersJson?: unknown
  savedAt: number
  images?: string[]
}

// Singleton DB connection promise — avoids opening a new connection per operation
let _dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_BOOKS)) {
        db.createObjectStore(STORE_BOOKS, { keyPath: 'bookId' })
      }
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        db.createObjectStore(STORE_IMAGES, { keyPath: 'url' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      _dbPromise = null // reset so next call can retry
      reject(req.error)
    }
  })
  return _dbPromise
}

async function dbGet<T>(store: string, key: string): Promise<T | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}

async function dbPut(store: string, value: unknown): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const req = tx.objectStore(store).put(value)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

async function dbDelete(store: string, key: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const req = tx.objectStore(store).delete(key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

async function cacheImage(url: string): Promise<void> {
  if (!url) return
  try {
    const resp = await fetch(url)
    if (!resp.ok) return
    const blob = await resp.blob()
    await dbPut(STORE_IMAGES, { url, blob })
  } catch {
    // ignore individual image failures
  }
}

/**
 * Get all offline-available book IDs from IndexedDB
 */
export async function getOfflineBookIds(): Promise<string[]> {
  if (typeof indexedDB === 'undefined') return []
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BOOKS, 'readonly')
      const req = tx.objectStore(STORE_BOOKS).getAllKeys()
      req.onsuccess = () => resolve(req.result as string[])
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

export function useOfflineReading(bookId: string) {
  const [isOfflineAvailable, setIsOfflineAvailable] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)

  // Check if book is already saved offline
  useEffect(() => {
    if (typeof indexedDB === 'undefined') return
    dbGet<OfflineBook>(STORE_BOOKS, bookId).then(book => {
      setIsOfflineAvailable(!!book)
    }).catch(() => {})
  }, [bookId])

  // Try to load book from offline cache (used when offline)
  const loadOfflineBook = useCallback(async (): Promise<OfflineBook | null> => {
    if (typeof indexedDB === 'undefined') return null
    try {
      const book = await dbGet<OfflineBook>(STORE_BOOKS, bookId)
      return book ?? null
    } catch {
      return null
    }
  }, [bookId])

  // Resolve a cached image URL (returns ObjectURL if cached, original if not)
  const resolveImageUrl = useCallback(async (url: string): Promise<string> => {
    if (!url || typeof indexedDB === 'undefined') return url
    try {
      const cached = await dbGet<{ url: string; blob: Blob }>(STORE_IMAGES, url)
      if (cached?.blob) return URL.createObjectURL(cached.blob)
      return url
    } catch {
      return url
    }
  }, [])

  // Download book for offline use
  const downloadForOffline = useCallback(async (
    bookTitle: string,
    bookType: string,
    chapters: unknown[],
    chaptersJson: unknown,
    images: string[]
  ) => {
    if (typeof indexedDB === 'undefined') return
    setIsDownloading(true)
    setDownloadProgress(0)

    try {
      const imagesToCache = images.filter(Boolean)
      const total = imagesToCache.length + 1

      // Save book data
      const offlineBook: OfflineBook = {
        bookId,
        bookTitle,
        bookType,
        chapters,
        chaptersJson,
        savedAt: Date.now(),
        images: imagesToCache,
      }
      await dbPut(STORE_BOOKS, offlineBook)
      setDownloadProgress(Math.round((1 / total) * 100))

      // Cache images
      for (let i = 0; i < imagesToCache.length; i++) {
        await cacheImage(imagesToCache[i])
        setDownloadProgress(Math.round(((i + 2) / total) * 100))
      }

      setIsOfflineAvailable(true)
    } catch (err) {
      console.error('Offline download failed:', err)
    } finally {
      setIsDownloading(false)
      setDownloadProgress(0)
    }
  }, [bookId])

  // Remove offline copy (including cached images)
  const removeOffline = useCallback(async () => {
    if (typeof indexedDB === 'undefined') return
    try {
      // Load book record to get image list
      const book = await dbGet<OfflineBook>(STORE_BOOKS, bookId)
      if (book?.images) {
        for (const imageUrl of book.images) {
          if (imageUrl) {
            await dbDelete(STORE_IMAGES, imageUrl)
          }
        }
      }
      await dbDelete(STORE_BOOKS, bookId)
      setIsOfflineAvailable(false)
    } catch {
      // ignore
    }
  }, [bookId])

  return {
    isOfflineAvailable,
    isDownloading,
    downloadProgress,
    loadOfflineBook,
    resolveImageUrl,
    downloadForOffline,
    removeOffline,
  }
}
