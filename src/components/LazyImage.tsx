'use client'

import { useState, useEffect, useRef, ImgHTMLAttributes, startTransition } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** Image source URL */
 src: string | undefined | null
  /** Fallback content while loading */
 fallback?: React.ReactNode
  /** Root margin for intersection observer (default: 100px) */
 rootMargin?: string
  /** Threshold for intersection observer (default: 0.1) */
 threshold?: number
  /** Whether to show loading spinner */
 showSpinner?: boolean
  /** Callback when image loads */
 onImageLoad?: () => void
  /** Callback when image fails to load */
 onImageError?: () => void
  /** Blur placeholder (low-res version or blur hash) */
 blurPlaceholder?: string
  /** Whether to skip lazy loading (for above-the-fold images) */
 eager?: boolean
}

export function LazyImage({
 src,
 alt = '',
 className,
 fallback,
 rootMargin = '100px',
 threshold = 0.1,
 showSpinner = true,
 onImageLoad,
 onImageError,
 blurPlaceholder,
 eager = false,
 ...props
}: LazyImageProps) {
 const { t } = useLanguage()
 const [isLoaded, setIsLoaded] = useState(false)
 const [isInView, setIsInView] = useState(eager)
 const [hasError, setHasError] = useState(false)
 const imgRef = useRef<HTMLImageElement>(null)
 const containerRef = useRef<HTMLDivElement>(null)

  // Set up intersection observer
 useEffect(() => {
 if (eager || !containerRef.current) return

 const observer = new IntersectionObserver(
 (entries) => {
 entries.forEach((entry) => {
 if (entry.isIntersecting) {
 setIsInView(true)
 observer.disconnect()
 }
 })
 },
 { rootMargin, threshold }
 )

 observer.observe(containerRef.current)

 return () => observer.disconnect()
 }, [rootMargin, threshold, eager])

  // Handle image load
 const handleLoad = () => {
 setIsLoaded(true)
 onImageLoad?.()
 }

  // Handle image error
 const handleError = () => {
 setHasError(true)
 onImageError?.()
 }

  // Reset state when src changes
 useEffect(() => {
 startTransition(() => {
 setIsLoaded(false)
 setHasError(false)
 })
 }, [src])

  // If no src, show fallback
 if (!src) {
 return (
 <div ref={containerRef} className={cn('relative', className)}>
 {fallback || (
 <div className="w-full h-full bg-muted/20 flex items-center justify-center">
 {showSpinner && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
 </div>
 )}
 </div>
 )
 }

 return (
 <div ref={containerRef} className={cn('relative overflow-hidden', className)}>
 {/* Blur placeholder */}
 {blurPlaceholder && !isLoaded && (
 <img
 src={blurPlaceholder}
 alt=""
 className="absolute inset-0 w-full h-full object-cover blur-lg scale-110"
 aria-hidden="true"
 />
 )}

 {/* Loading state */}
 {!isLoaded && !hasError && isInView && showSpinner && (
 <div className="absolute inset-0 flex items-center justify-center bg-muted/10">
 <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
 </div>
 )}

 {/* Error state */}
 {hasError && (
 <div className="absolute inset-0 flex items-center justify-center bg-red-500/10">
 <span className="text-xs text-red-400">{t('failedToLoad')}</span>
 </div>
 )}

 {/* Actual image */}
 {isInView && !hasError && (
 <img
 ref={imgRef}
 src={src}
 alt={alt}
 loading={eager ? 'eager' : 'lazy'}
 onLoad={handleLoad}
 onError={handleError}
 className={cn(
 'transition-opacity duration-300',
 isLoaded ? 'opacity-100' : 'opacity-0',
 props.style?.objectFit ? '' : 'object-cover w-full h-full'
 )}
 {...props}
 />
 )}

 {/* Placeholder when not in view */}
 {!isInView && (
 <div className="w-full h-full bg-muted/20" />
 )}
 </div>
 )
}

/**
 * Hook to preload an image
 */
export function useImagePreload(src: string | undefined | null): {
 isLoaded: boolean
 isLoading: boolean
 error: boolean
} {
 const [state, setState] = useState({
 isLoaded: false,
 isLoading: false,
 error: false
 })

 useEffect(() => {
 if (!src) {
 startTransition(() => { setState({ isLoaded: false, isLoading: false, error: false }) })
 return
 }

 startTransition(() => { setState({ isLoaded: false, isLoading: true, error: false }) })

 const img = new Image()
 img.src = src

 img.onload = () => {
 setState({ isLoaded: true, isLoading: false, error: false })
 }

 img.onerror = () => {
 setState({ isLoaded: false, isLoading: false, error: true })
 }
 }, [src])

 return state
}
