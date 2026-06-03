'use client'

import { useEffect, useRef, useCallback } from 'react'

interface PreloadOptions {
  /** Number of images to preload ahead of current position */
 preloadAhead?: number
  /** Priority for preloading (low, high, auto) */
 priority?: 'low' | 'high' | 'auto'
}

interface UseImagePreloaderReturn {
  /** Preload a single image */
 preloadImage: (url: string) => Promise<void>
  /** Preload multiple images */
 preloadImages: (urls: string[]) => Promise<void>
  /** Check if an image is already cached */
 isImageCached: (url: string) => boolean
  /** Preload images around a specific index */
 preloadAround: (urls: string[], currentIndex: number, range?: number) => void
}

// Global cache to track loaded images across component instances
const imageCache = new Set<string>()

/**
 * Hook for preloading images to improve perceived performance
 */
export function useImagePreloader(options: PreloadOptions = {}): UseImagePreloaderReturn {
 const { preloadAhead = 2, priority = 'auto' } = options
 const pendingLoads = useRef<Map<string, Promise<void>>>(new Map())

  // Preload a single image
 const preloadImage = useCallback((url: string): Promise<void> => {
 if (!url || imageCache.has(url)) {
 return Promise.resolve()
 }

    // Check if already loading
 const existing = pendingLoads.current.get(url)
 if (existing) {
 return existing
 }

 const promise = new Promise<void>((resolve) => {
 const img = new Image()

      // Use fetchpriority if supported
 if (priority !== 'auto' && 'fetchPriority' in img) {
 (img as HTMLImageElement & { fetchPriority: string }).fetchPriority = priority
 }

 img.onload = () => {
 imageCache.add(url)
 pendingLoads.current.delete(url)
 resolve()
 }

 img.onerror = () => {
 pendingLoads.current.delete(url)
 resolve() // Resolve anyway to not block
 }

 img.src = url
 })

 pendingLoads.current.set(url, promise)
 return promise
 }, [priority])

  // Preload multiple images
 const preloadImages = useCallback(async (urls: string[]): Promise<void> => {
 const validUrls = urls.filter(url => url && !imageCache.has(url))
 await Promise.all(validUrls.map(preloadImage))
 }, [preloadImage])

  // Check if image is cached
 const isImageCached = useCallback((url: string): boolean => {
 return imageCache.has(url)
 }, [])

  // Preload images around current position
 const preloadAround = useCallback((urls: string[], currentIndex: number, range?: number) => {
 const preloadRange = range ?? preloadAhead
 const toPreload: string[] = []

    // Preload next images
 for (let i = 1; i <= preloadRange; i++) {
 const nextIndex = currentIndex + i
 if (nextIndex < urls.length && urls[nextIndex]) {
 toPreload.push(urls[nextIndex])
 }
 }

    // Preload previous image (for back navigation)
 if (currentIndex > 0 && urls[currentIndex - 1]) {
 toPreload.push(urls[currentIndex - 1])
 }

    // Start preloading without waiting
 if (toPreload.length > 0) {
 preloadImages(toPreload)
 }
 }, [preloadAhead, preloadImages])

 return {
 preloadImage,
 preloadImages,
 isImageCached,
 preloadAround
 }
}

/**
 * Utility to preload images for a specific page in a picture book
 */
export function preloadPageImages(
 images: string[],
 currentPage: number,
 imagesPerPage: number,
 preloadPages: number = 1
): void {
 const startIndex = currentPage * imagesPerPage
 const preloadStartIndex = startIndex + imagesPerPage
 const preloadEndIndex = preloadStartIndex + (imagesPerPage * preloadPages)

 for (let i = preloadStartIndex; i < preloadEndIndex && i < images.length; i++) {
 if (images[i] && !imageCache.has(images[i])) {
 const img = new Image()
 img.src = images[i]
 img.onload = () => imageCache.add(images[i])
 }
 }
}

/**
 * Clear the image cache (useful for memory management)
 */
export function clearImageCache(): void {
 imageCache.clear()
}

/**
 * Get cache statistics
 */
export function getImageCacheStats(): { size: number; urls: string[] } {
 return {
 size: imageCache.size,
 urls: Array.from(imageCache)
 }
}
