'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
 Image as ImageIcon,
 Trash2,
 Check,
 Loader2,
 Library,
 Calendar,
 X,
 RefreshCw,
 ImagePlus,
 CheckCircle2
} from 'lucide-react'
import type { PhotobookPhoto, PhotoAnalysis } from '@/types/photobook'

interface MediaLibraryItem {
 id: string
 user_id: string
 original_filename: string
 url: string
 storage_path?: string
 storage_type: 'supabase' | 'base64' | 'local'
 file_size?: number
 mime_type?: string
 analysis?: PhotoAnalysis
 analysis_status: 'pending' | 'analyzing' | 'completed' | 'failed'
 analyzed_with?: string
 tags?: string[]
 folder?: string
 created_at: string
}

interface MediaLibrarySelectorProps {
 open: boolean
 onOpenChange: (open: boolean) => void
 onSelectPhotos: (photos: PhotobookPhoto[]) => void
 existingPhotoIds?: string[]
}

export function MediaLibrarySelector({
 open,
 onOpenChange,
 onSelectPhotos,
 existingPhotoIds = []
}: MediaLibrarySelectorProps) {
 const { getIdToken } = useAuth()
 const { t } = useLanguage()
 const [items, setItems] = useState<MediaLibraryItem[]>([])
 const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState<string | null>(null)
 const [totalCount, setTotalCount] = useState(0)
 const [deleting, setDeleting] = useState(false)

 const fetchMediaLibrary = useCallback(async () => {
 const token = await getIdToken()
 if (!token) return

 setLoading(true)
 setError(null)

 try {
 const response = await fetch('/api/media-library?limit=100', {
 headers: { 'Authorization': `Bearer ${token}` }
 })

 if (!response.ok) throw new Error('Failed to fetch')

 const data = await response.json()
 setItems(data.items || [])
 setTotalCount(data.total || 0)
 } catch (err) {
      console.error('Error fetching media library:', err)
      setError(t('couldNotLoadMediaLibrary'))
 } finally {
 setLoading(false)
 }
 }, [getIdToken])

 useEffect(() => {
 if (open) {
 fetchMediaLibrary()
 setSelectedIds(new Set())
 }
 }, [open, fetchMediaLibrary])

 const toggleSelection = (id: string) => {
 const newSelection = new Set(selectedIds)
 if (newSelection.has(id)) {
 newSelection.delete(id)
 } else {
 newSelection.add(id)
 }
 setSelectedIds(newSelection)
 }

 const selectAll = () => {
 const selectableIds = items
 .filter(item => !existingPhotoIds.includes(item.id))
 .map(item => item.id)
 setSelectedIds(new Set(selectableIds))
 }

 const handleAddSelected = () => {
 const selectedItems = items.filter(item => selectedIds.has(item.id))
 const photos: PhotobookPhoto[] = selectedItems.map(item => ({
 id: item.id,
 originalFilename: item.original_filename,
 url: item.url,
 uploadedAt: item.created_at,
 analysis: item.analysis,
 analysisStatus: item.analysis_status
 }))
 onSelectPhotos(photos)
 onOpenChange(false)
 }

 const handleDeleteSelected = async () => {
 if (selectedIds.size === 0) return

 const token = await getIdToken()
 if (!token) return

 if (!window.confirm(t('confirmDeletePhotos', { count: selectedIds.size }))) return

 setDeleting(true)

 try {
 const response = await fetch('/api/media-library', {
 method: 'DELETE',
 headers: {
 'Authorization': `Bearer ${token}`,
 'Content-Type': 'application/json'
 },
 body: JSON.stringify({ itemIds: Array.from(selectedIds) })
 })

 if (!response.ok) throw new Error('Delete failed')

 setItems(prev => prev.filter(item => !selectedIds.has(item.id)))
 setTotalCount(prev => prev - selectedIds.size)
 setSelectedIds(new Set())
 } catch (err) {
      console.error('Error deleting:', err)
 setError(t('deleteFailed'))
 } finally {
 setDeleting(false)
 }
 }

 if (!open) return null

 const availableItems = items.filter(item => !existingPhotoIds.includes(item.id))
 const alreadyAddedItems = items.filter(item => existingPhotoIds.includes(item.id))

 return (
 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
 <div className="absolute inset-0 sm:inset-4 md:inset-8 lg:inset-12 bg-background sm:rounded-2xl flex flex-col overflow-hidden">
 {/* Header */}
 <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background safe-area-top">
 <div className="flex items-center gap-3">
 <Library className="h-5 w-5 text-bookcraft-blue dark:text-bookcraft-blue/80" />
 <div>
 <h2 className="font-semibold text-foreground">{t('mediaLibrary')}</h2>
 <p className="text-xs text-muted-foreground">{totalCount} Photos</p>
 </div>
 </div>
 <button
 onClick={() => onOpenChange(false)}
 className="w-10 h-10 rounded-full hover:bg-muted active:bg-muted/80 flex items-center justify-center transition-colors"
 >
 <X className="h-5 w-5 text-muted-foreground" />
 </button>
 </div>

 {/* Toolbar */}
 <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50 gap-2">
 <div className="flex items-center gap-2">
 {selectedIds.size > 0 ? (
 <Badge className="bg-bookcraft-blue/10 dark:bg-bookcraft-blue/20 text-bookcraft-blue dark:text-bookcraft-blue/80 font-medium">
 {selectedIds.size} selected
 </Badge>
 ) : (
 <span className="text-sm text-muted-foreground">{t('selectPhotos')}</span>
 )}
 </div>

 <div className="flex items-center gap-1.5">
 <button
 onClick={fetchMediaLibrary}
 disabled={loading}
 className="w-9 h-9 rounded-lg hover:bg-muted active:bg-muted/80 flex items-center justify-center transition-colors"
 >
 <RefreshCw className={`h-4 w-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
 </button>

 {availableItems.length > 0 && selectedIds.size < availableItems.length && (
 <button
 onClick={selectAll}
 className="h-9 px-3 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium text-foreground transition-colors"
 >
 All
 </button>
 )}

 {selectedIds.size > 0 && (
 <>
 <button
 onClick={() => setSelectedIds(new Set())}
 className="h-9 px-3 rounded-lg bg-muted hover:bg-muted/80 text-sm text-muted-foreground transition-colors"
 >
 <X className="h-4 w-4" />
 </button>
 <button
 onClick={handleDeleteSelected}
 disabled={deleting}
 className="h-9 px-3 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-sm text-red-700 dark:text-red-300 transition-colors flex items-center gap-1.5"
 >
 {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
 </button>
 </>
 )}
 </div>
 </div>

 {/* Content */}
 <div className="flex-1 overflow-y-auto overscroll-contain">
 {loading && items.length === 0 ? (
 <div className="flex items-center justify-center py-20">
 <Loader2 className="h-10 w-10 animate-spin text-bookcraft-blue dark:text-bookcraft-blue/80" />
 </div>
 ) : error ? (
 <div className="text-center py-20 px-4">
 <p className="text-destructive mb-4">{error}</p>
 <Button onClick={fetchMediaLibrary} variant="outline">
 Try again
 </Button>
 </div>
 ) : items.length === 0 ? (
 <div className="text-center py-20 px-4">
 <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
 <h3 className="text-lg font-medium text-foreground mb-2">{t('noPhotos')}</h3>
 <p className="text-muted-foreground text-sm">Upload photos to save them here.</p>
 </div>
 ) : (
 <div className="p-3 space-y-6">
 {/* Available */}
 {availableItems.length > 0 && (
 <div>
 <h4 className="text-sm font-medium text-foreground mb-3 px-1">
 Available ({availableItems.length})
 </h4>
 <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-1.5 sm:gap-2">
 {availableItems.map(item => (
 <button
 key={item.id}
 onClick={() => toggleSelection(item.id)}
 className={`relative aspect-square rounded-lg overflow-hidden transition-all active:scale-95 touch-manipulation ${
 selectedIds.has(item.id)
 ? 'ring-3 ring-bookcraft-blue ring-offset-1 ring-offset-background'
 : 'ring-1 ring-border'
 }`}
 >
 <img
 src={item.url}
 alt={item.original_filename}
 className="w-full h-full object-cover"
 loading="lazy"
 />

 {/* Selection indicator */}
 <div className={`absolute inset-0 transition-colors ${
 selectedIds.has(item.id) ? 'bg-bookcraft-blue/20' : 'bg-transparent'
 }`} />

 {/* Checkmark */}
 <div className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
 selectedIds.has(item.id)
 ? 'bg-bookcraft-blue scale-100'
 : 'bg-black/30 scale-90'
 }`}>
 <Check className={`h-4 w-4 ${selectedIds.has(item.id) ? 'text-white' : 'text-white/70'}`} />
 </div>

 {/* Era badge */}
 {item.analysis?.estimatedEra && item.analysis.estimatedEra !== 'unknown' && (
 <div className="absolute bottom-1 left-1">
 <span className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
 {item.analysis.estimatedEra}
 </span>
 </div>
 )}
 </button>
 ))}
 </div>
 </div>
 )}

 {/* Already added */}
 {alreadyAddedItems.length > 0 && (
 <div className="opacity-50">
 <h4 className="text-sm font-medium text-muted-foreground mb-3 px-1">
 Already added ({alreadyAddedItems.length})
 </h4>
 <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-1.5 sm:gap-2">
 {alreadyAddedItems.map(item => (
 <div
 key={item.id}
 className="relative aspect-square rounded-lg overflow-hidden ring-1 ring-border"
 >
 <img
 src={item.url}
 alt={item.original_filename}
 className="w-full h-full object-cover"
 loading="lazy"
 />
 <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
 <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}
 </div>

 {/* Footer */}
 <div className="flex gap-3 p-4 border-t border-border bg-background safe-area-bottom">
 <Button
 variant="outline"
 onClick={() => onOpenChange(false)}
 className="h-12 text-base px-5"
 >
 {t('mediaLibraryCancel') || 'Cancel'}
 </Button>
 <Button
 onClick={handleAddSelected}
 disabled={selectedIds.size === 0}
 className="flex-1 h-12 text-base font-semibold bg-bookcraft-blue hover:brightness-110 active:brightness-90 shadow-md"
 >
 <ImagePlus className="h-5 w-5 mr-2" />
 {selectedIds.size > 0
 ? (t(selectedIds.size === 1 ? 'mediaLibraryAddPhoto' as never : 'mediaLibraryAddPhotos' as never) || '{count} Photos').replace('{count}', String(selectedIds.size))
 : (t('mediaLibrarySelectPhotos') || 'Select Photos')}
 </Button>
 </div>
 </div>
 </div>
 )
}
