'use client'

import { useState, useEffect, startTransition } from 'react'
import Image, { ImageProps } from 'next/image'
import { ImageOff, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SafeImageProps extends Omit<ImageProps, 'onError'> {
 fallbackClassName?: string
 showRetry?: boolean
 onRetry?: () => void
 fallbackText?: string
}

/**
 * SafeImage - Image component with built-in error handling and fallback
 *
 * Shows a placeholder when:
 * - Image fails to load (404, expired URL, etc.)
 * - DALL-E temporary URLs have expired
 * - Supabase signed URLs have expired
 */
export default function SafeImage({
 src,
 alt,
 className,
 fallbackClassName,
 showRetry = false,
 onRetry,
 fallbackText,
 ...props
}: SafeImageProps) {
 const [hasError, setHasError] = useState(false)
 const [isLoading, setIsLoading] = useState(true)

  // Reset error state when src changes
 useEffect(() => {
 startTransition(() => {
 setHasError(false)
 setIsLoading(true)
 })
 }, [src])

 const handleError = () => {
 setHasError(true)
 setIsLoading(false)
 }

 const handleLoad = () => {
 setIsLoading(false)
 }

 const handleRetry = () => {
 setHasError(false)
 setIsLoading(true)
 onRetry?.()
 }

  const [likelyExpired, setLikelyExpired] = useState(false)
 useEffect(() => {
 const url = src as string | undefined
 let expired = false
 if (url && typeof url === 'string') {
 if (url.includes('oaidalleapiprodscus.blob.core.windows.net')) {
 expired = true
 } else if (url.includes('supabase.co') && url.includes('token=')) {
 try {
 const tokenMatch = url.match(/token=([^&#]+)/)
 if (tokenMatch) {
 const token = tokenMatch[1]
 const payload = JSON.parse(atob(token.split('.')[1]))
 if (payload.exp && payload.exp * 1000 < Date.now()) {
 expired = true
 }
 }
 } catch {
 }
 }
 }
 startTransition(() => { setLikelyExpired(expired) })
 }, [src])

 if (hasError || !src) {
 return (
 <div
 className={cn(
 'flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg',
 fallbackClassName || className
 )}
 style={{
 width: props.width || '100%',
 height: props.height || '100%',
 minHeight: typeof props.height === 'number' ? props.height : 200
 }}
 >
 <ImageOff className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
 <p className="text-sm text-gray-500 dark:text-gray-400 text-center px-4">
 {fallbackText || 'Image not available'}
 </p>
 {likelyExpired && (
 <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
 (URL expired)
 </p>
 )}
 {showRetry && (
 <button
 onClick={handleRetry}
 className="mt-3 flex items-center gap-1 px-3 py-1.5 text-xs bg-bookcraft-blue/10 dark:bg-bookcraft-blue/20 text-bookcraft-blue dark:text-bookcraft-blue/80 rounded-full hover:bg-bookcraft-blue/20 dark:hover:bg-bookcraft-blue/30 transition-colors"
 >
 <RefreshCw className="h-3 w-3" />
 Reload
 </button>
 )}
 </div>
 )
 }

 const isFill = 'fill' in props && props.fill
 return (
 <div className={cn("relative", isFill && "absolute inset-0")} style={isFill ? undefined : { width: props.width, height: props.height }}>
 {isLoading && (
 <div
 className={cn(
 'absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse',
 className
 )}
 >
 <div className="w-8 h-8 border-2 border-bookcraft-blue/30 border-t-bookcraft-blue rounded-full animate-spin" />
 </div>
 )}
 <Image
 src={src}
 alt={alt}
 className={cn(className, isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300')}
 onError={handleError}
 onLoad={handleLoad}
 {...props}
 />
 </div>
 )
}

/**
 * SafeImageBackground - Background image with fallback
 */
export function SafeImageBackground({
 src,
 alt,
 className,
 fallbackClassName,
 children,
 style,
 ...props
}: SafeImageProps & { children?: React.ReactNode; style?: React.CSSProperties }) {
 const [hasError, setHasError] = useState(false)

 useEffect(() => {
 if (!src || typeof src !== 'string') {
 startTransition(() => { setHasError(true) })
 return
 }

 const img = document.createElement('img')
 img.onload = () => setHasError(false)
 img.onerror = () => setHasError(true)
 img.src = src
 }, [src])

 if (hasError || !src) {
 return (
 <div
 className={cn(
 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800',
 fallbackClassName || className
 )}
 style={style}
 >
 {children}
 </div>
 )
 }

 return (
 <div
 className={className}
 style={{
 ...style,
 backgroundImage: `url(${src})`,
 backgroundSize: 'cover',
 backgroundPosition: 'center'
 }}
 >
 {children}
 </div>
 )
}
