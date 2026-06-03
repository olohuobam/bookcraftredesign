'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { X, Download, Eye, RotateCcw } from 'lucide-react'
import Image from 'next/image'

interface ImagePreviewProps {
 imageUrl?: string
 title?: string
 onRemove?: () => void
 onReplace?: () => void
 isGenerating?: boolean
 placeholder?: string
}

export default function ImagePreview({
 imageUrl,
 title = "Image",
 onRemove,
 onReplace,
 isGenerating = false,
 placeholder = "No image uploaded"
}: ImagePreviewProps) {
 const [showFullscreen, setShowFullscreen] = useState(false)
 const [imageLoaded, setImageLoaded] = useState(false)

 const resolveImageUrl = (url: string): string => {
 if (url.startsWith('/') || url.startsWith('http')) return url
 return `/images/${url}`
 }

 const downloadImage = () => {
 if (imageUrl) {
 const link = document.createElement('a')
 link.href = resolveImageUrl(imageUrl)
 link.download = `${title.toLowerCase().replace(/\s+/g, '-')}.png`
 document.body.appendChild(link)
 link.click()
 document.body.removeChild(link)
 }
 }

 return (
 <>
 <Card className="w-full max-w-sm mx-auto">
 <CardContent className="p-4">
 <div className="text-center mb-3">
 <h4 className="font-semibold text-gray-900">{title}</h4>
 </div>
 
 <div className="relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300">
 {isGenerating ? (
 <div className="absolute inset-0 flex items-center justify-center">
 <div className="text-center">
 <div className="animate-spin rounded-full h-12 w-12 border-4 border-bookcraft-blue/30 border-t-bookcraft-blue mb-3 mx-auto"></div>
 <p className="text-sm text-gray-600">AI generating...</p>
 </div>
 </div>
 ) : imageUrl ? (
 <div className="relative w-full h-full group">
 <img
 src={resolveImageUrl(imageUrl)}
 alt={title}
 className="w-full h-full object-cover"
 onLoad={() => setImageLoaded(true)}
 />
 
 {imageLoaded && (
 <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
 <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
 <Button
 size="sm"
 variant="secondary"
 onClick={() => setShowFullscreen(true)}
 className="bg-white/90 hover:bg-white text-gray-800"
 >
 <Eye className="w-4 h-4" />
 </Button>
 <Button
 size="sm"
 variant="secondary"
 onClick={downloadImage}
 className="bg-white/90 hover:bg-white text-gray-800"
 >
 <Download className="w-4 h-4" />
 </Button>
 </div>
 </div>
 )}
 
 {onRemove && (
 <Button
 size="sm"
 variant="destructive"
 onClick={onRemove}
 className="absolute top-2 right-2 h-6 w-6 p-0"
 >
 <X className="w-3 h-3" />
 </Button>
 )}
 </div>
 ) : (
 <div className="absolute inset-0 flex items-center justify-center">
 <div className="text-center text-gray-500">
 <div className="w-16 h-20 mx-auto mb-2 bg-gray-200 rounded border-2 border-dashed border-gray-400"></div>
 <p className="text-sm">{placeholder}</p>
 </div>
 </div>
 )}
 </div>
 
 <div className="mt-4 flex justify-center space-x-2">
 {onReplace && (
 <Button
 variant="outline"
 size="sm"
 onClick={onReplace}
 disabled={isGenerating}
 className="flex-1"
 >
 <RotateCcw className="w-4 h-4 mr-2" />
 {imageUrl ? 'Regenerate' : 'Upload'}
 </Button>
 )}
 </div>
 </CardContent>
 </Card>

 {/* Fullscreen Modal */}
 {showFullscreen && imageUrl && (
 <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
 <div className="relative max-w-4xl max-h-full">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setShowFullscreen(false)}
 className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
 >
 <X className="w-6 h-6" />
 </Button>
 
 <img
 src={resolveImageUrl(imageUrl)}
 alt={title}
 className="max-w-full max-h-[90vh] object-contain rounded-lg"
 />
 
 <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
 <Button
 onClick={downloadImage}
 className="bg-white/90 hover:bg-white text-gray-800"
 >
 <Download className="w-4 h-4 mr-2" />
 Download
 </Button>
 </div>
 </div>
 </div>
 )}
 </>
 )
}
