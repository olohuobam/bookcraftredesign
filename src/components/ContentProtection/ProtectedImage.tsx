'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Shield, AlertTriangle } from 'lucide-react'

interface ProtectedImageProps {
 src: string
 alt: string
 className?: string
 watermarkText?: string
 showProtectionBadge?: boolean
 blurOnInactive?: boolean
 preventSave?: boolean
  /** If true, all protection is disabled (e.g., for purchased books) */
 disabled?: boolean
}

/**
 * ProtectedImage - Protected image with multiple protection layers
 *
 * Features:
 * - Transparent overlay prevents right-click save
 * - Dynamic canvas watermark
 * - Blur on inactivity
 * - Drag & drop blocked
 * - Screenshot detection
 */
export function ProtectedImage({
 src,
 alt,
 className = '',
 watermarkText,
 showProtectionBadge = true,
 blurOnInactive = true,
 preventSave = true,
 disabled = false
}: ProtectedImageProps) {
  // All hooks must be called before any conditional returns
 const [isBlurred, setIsBlurred] = useState(false) // Blur is now always disabled
 const [showWarning, setShowWarning] = useState(false)
 const [warningMessage, setWarningMessage] = useState('')
 const containerRef = useRef<HTMLDivElement>(null)
 const canvasRef = useRef<HTMLCanvasElement>(null)
 const [imageLoaded, setImageLoaded] = useState(false)

  // Render watermark on canvas
 useEffect(() => {
 if (disabled || !watermarkText || !imageLoaded || !canvasRef.current) return

 const canvas = canvasRef.current
 const ctx = canvas.getContext('2d')
 if (!ctx) return

 const img = new Image()
 img.crossOrigin = 'anonymous'
 img.onload = () => {
      // Set canvas size to match image
 canvas.width = img.naturalWidth
 canvas.height = img.naturalHeight

      // Draw original image
 ctx.drawImage(img, 0, 0)

      // Draw watermark pattern
 ctx.save()
 ctx.globalAlpha = 0.15
 ctx.fillStyle = '#888888'
 ctx.font = `${Math.max(canvas.width / 20, 16)}px Arial`
 ctx.textAlign = 'center'
 ctx.rotate(-30 * Math.PI / 180)

      // Create watermark grid
 const stepX = canvas.width / 3
 const stepY = canvas.height / 4
 for (let x = -canvas.width; x < canvas.width * 2; x += stepX) {
 for (let y = -canvas.height; y < canvas.height * 2; y += stepY) {
 ctx.fillText(watermarkText, x, y)
 }
 }

 ctx.restore()
 }
 img.src = src
 }, [src, watermarkText, imageLoaded, disabled])

  // Visibility/Focus detection for blur - DISABLED
 useEffect(() => {
    // Blur on visibility change disabled
 }, [])

  // If disabled=true, render a normal image without any protection
 if (disabled) {
 return (
 <div className={className}>
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img
 src={src}
 alt={alt}
 className="w-full h-full object-contain"
 draggable={true}
 />
 </div>
 )
 }

  // Block context menu
 const handleContextMenu = (e: React.MouseEvent) => {
 e.preventDefault()
 triggerWarning('Right-click is disabled!')
 }

  // Block drag
 const handleDragStart = (e: React.DragEvent) => {
 e.preventDefault()
 triggerWarning('Images cannot be dragged!')
 }

  // Show warning toast
 const triggerWarning = (message: string) => {
 setWarningMessage(message)
 setShowWarning(true)
 setTimeout(() => setShowWarning(false), 2000)
 }

  // Block keyboard shortcuts on focus
 const handleKeyDown = (e: React.KeyboardEvent) => {
 const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
 const modifier = isMac ? e.metaKey : e.ctrlKey

 if (modifier && (e.key === 's' || e.key === 'c' || e.key === 'p')) {
 e.preventDefault()
 triggerWarning('This action is blocked!')
 }

    // PrintScreen blur removed
 }

 return (
 <div
 ref={containerRef}
 className={`protected-image relative overflow-hidden ${className}`}
 onContextMenu={handleContextMenu}
 onDragStart={handleDragStart}
 onKeyDown={handleKeyDown}
 tabIndex={0}
 style={{
 userSelect: 'none',
 WebkitUserSelect: 'none',
 WebkitTouchCallout: 'none',
 }}
 >
 {/* Image Layer - hidden when using canvas watermark */}
 {!watermarkText && (
        // eslint-disable-next-line @next/next/no-img-element
 <img
 src={src}
 alt={alt}
 className="w-full h-full object-contain transition-all duration-300"
 style={{
 pointerEvents: 'none',
 WebkitUserDrag: 'none',
 } as React.CSSProperties}
 onLoad={() => setImageLoaded(true)}
 draggable={false}
 />
 )}

 {/* Canvas with watermark */}
 {watermarkText && (
 <>
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img
 src={src}
 alt={alt}
 className="hidden"
 onLoad={() => setImageLoaded(true)}
 />
 <canvas
 ref={canvasRef}
 className="w-full h-full object-contain transition-all duration-300"
 style={{
 pointerEvents: 'none',
 }}
 />
 </>
 )}

 {/* Invisible overlay to prevent image save */}
 {preventSave && (
 <div
 className="absolute inset-0 z-10"
 style={{
 backgroundColor: 'transparent',
 cursor: 'default',
 }}
 onContextMenu={handleContextMenu}
 />
 )}

 {/* Protection Badge */}
 {showProtectionBadge && (
 <div className="absolute top-2 right-2 z-20">
 <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-black/30 text-white/80">
 <Shield className="h-3 w-3" />
 </div>
 </div>
 )}

 {/* Blur Overlay - REMOVED */}

 {/* Warning Toast */}
 {showWarning && (
 <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50">
 <div className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
 <Shield className="h-4 w-4" />
 <span className="text-sm font-medium">{warningMessage}</span>
 </div>
 </div>
 )}

 {/* CSS for maximum protection */}
 <style jsx>{`
 .protected-image {
 -webkit-touch-callout: none !important;
 -webkit-user-select: none !important;
 -moz-user-select: none !important;
 -ms-user-select: none !important;
 user-select: none !important;
 }

 .protected-image img,
 .protected-image canvas {
 -webkit-user-drag: none !important;
 -khtml-user-drag: none !important;
 -moz-user-drag: none !important;
 -o-user-drag: none !important;
 user-drag: none !important;
 pointer-events: none !important;
 }

 @media print {
 .protected-image {
 visibility: hidden !important;
 }

 .protected-image::after {
 content: "Image cannot be printed";
 visibility: visible;
 display: block;
 text-align: center;
 padding: 2rem;
 color: #999;
 }
 }
 `}</style>
 </div>
 )
}

export default ProtectedImage
