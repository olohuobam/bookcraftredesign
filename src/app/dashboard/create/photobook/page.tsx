'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import {
  Camera, Upload, X, Loader2, Library, BookOpen, Palette,
  ChevronUp, ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AppBar } from '@/components/AppBar'
import PageTransition from '@/components/PageTransition'
import MultiStepWizard, { Step } from '@/components/MultiStepWizard'
import { MediaLibrarySelector } from '@/components/MediaLibrarySelector'
import {
  PHOTOBOOK_SORT_OPTIONS, PHOTOBOOK_THEMES, PHOTOBOOK_TRANSFORM_STYLES,
  PHOTOBOOK_MAX_FILE_SIZE_BYTES, PHOTOBOOK_MAX_FILE_SIZE_MB, PHOTOBOOK_MAX_PHOTOS,
  type PhotobookConfig, type PhotobookPhoto, type PhotoSortOption, type PhotoTransformStyle,
} from '@/types/photobook'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/context/LanguageContext'
import { useSubscription } from '@/hooks/useSubscription'

// Fix 5: DnD kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useProSheet } from '@/context/ProSheetContext'
import { useToast } from '@/components/ui/toast'

// Fix 6: SSE progress state
interface CreateProgress {
  progress: number
  status: string
  currentPhoto: number
  totalPhotos: number
}

// Fix 5: Sortable photo card for DnD
function SortablePhotoCard({
  photo,
  index,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  isTouchDevice,
}: {
  photo: PhotobookPhoto
  index: number
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
  isTouchDevice: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group aspect-square rounded-xl overflow-hidden border-2 border-border bg-muted"
    >
      <img
        src={photo.url || (photo as { objectUrl?: string }).objectUrl || ''}
        alt={photo.originalFilename}
        className="w-full h-full object-cover"
      />
      {/* drag handle — hidden on touch devices */}
      <div
        {...attributes}
        {...listeners}
        className={`absolute inset-0 cursor-grab active:cursor-grabbing ${isTouchDevice ? 'hidden' : ''}`}
      />
      {/* number badge */}
      <div className="absolute top-1.5 left-1.5 w-6 h-6 bg-black/60 text-white text-xs rounded-full flex items-center justify-center font-bold">
        {index + 1}
      </div>
      {/* up/down buttons — always visible on touch, hover-only on desktop */}
      <div className={`absolute top-1 right-1 flex flex-col gap-0.5 transition-opacity ${isTouchDevice ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onMoveUp() }}
          disabled={isFirst}
          className="w-5 h-5 bg-black/60 text-white rounded flex items-center justify-center disabled:opacity-30"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onMoveDown() }}
          disabled={isLast}
          className="w-5 h-5 bg-black/60 text-white rounded flex items-center justify-center disabled:opacity-30"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// Defined at module level — stable component identity, prevents input focus loss on re-render
function Field({ label, icon: Icon, children }: { label: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </Label>
      {children}
    </div>
  )
}

export default function CreatePhotobookPage() {
  const router = useRouter()
  const { getIdToken } = useAuth()
  const { t } = useLanguage()
  const { showToast } = useToast()

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [libraryPhotos, setLibraryPhotos] = useState<PhotobookPhoto[]>([])
  const [photos, setPhotos] = useState<PhotobookPhoto[]>([])
  // Fix 5: Manually ordered photos (only used when sortBy === 'manual')
  const [manualPhotos, setManualPhotos] = useState<PhotobookPhoto[]>([])

  const [currentStep, setCurrentStep] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [showMedia, setShowMedia] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [creating, setCreating] = useState(false)
 const { isPro, isLoading: isSubLoading } = useSubscription()
 const { openProSheet } = useProSheet()
  const [analyzeProgress, setAnalyzeProgress] = useState(0)
  const [analyzeCurrentPhoto, setAnalyzeCurrentPhoto] = useState(0)
  const [analyzeTotalPhotos, setAnalyzeTotalPhotos] = useState(0)
  // Fix 6: SSE progress state
  const [createProgress, setCreateProgress] = useState<CreateProgress>({ progress: 0, status: '', currentPhoto: 0, totalPhotos: 0 })
  const eventSourceRef = useRef<EventSource | null>(null)

  // Detect touch device for mobile DnD UX
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  useEffect(() => {
    setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches)
  }, [])

  const [config, setConfig] = useState<PhotobookConfig>({
    title: '', subtitle: '', description: '', sortBy: 'age',
    photosPerPage: 2, includeAnalysisText: true, theme: 'classic',
    transformEnabled: false, transformStyle: 'original',
  })

  const up = (u: Partial<PhotobookConfig>) => setConfig(p => ({ ...p, ...u }))

  const inputClass = "h-11 rounded-xl bg-muted/40 border border-border/50 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 transition-all"
  const textareaClass = "rounded-xl bg-muted/40 border border-border/50 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 transition-all resize-none"

  const formatMessage = useCallback((key: string, replacements: Record<string, string | number> = {}) => {
    let message = t(key as never) || key
    for (const [placeholder, value] of Object.entries(replacements)) {
      message = message.replaceAll(`{${placeholder}}`, String(value))
    }
    return message
  }, [t])

  const previewUrls = useMemo(() => selectedFiles.map((file) => URL.createObjectURL(file)), [selectedFiles])

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [previewUrls])

  const addFiles = useCallback((newFiles: File[]) => {
    const validImages = newFiles.filter(f => f.type.startsWith('image/'))
    const oversized = validImages.filter(f => f.size > PHOTOBOOK_MAX_FILE_SIZE_BYTES)
    if (oversized.length > 0) {
      showToast(formatMessage('photobookFilesTooLarge', { count: oversized.length, maxSize: PHOTOBOOK_MAX_FILE_SIZE_MB }), 'warning')
    }
    const sizedOk = validImages.filter(f => f.size <= PHOTOBOOK_MAX_FILE_SIZE_BYTES)
    const existingKeys = new Set(selectedFiles.map(f => `${f.name}:${f.size}`))
    const uniqueFiles = sizedOk.filter(f => {
      const key = `${f.name}:${f.size}`
      if (existingKeys.has(key)) return false
      existingKeys.add(key)
      return true
    })
    const duplicateCount = sizedOk.length - uniqueFiles.length
    if (duplicateCount > 0) {
      showToast(formatMessage('photobookDuplicateSkipped', { count: duplicateCount }), 'warning')
    }

    setSelectedFiles(prev => {
      const combined = [...prev, ...uniqueFiles]
      const currentLibraryCount = libraryPhotos.length
      const remaining = PHOTOBOOK_MAX_PHOTOS - currentLibraryCount - prev.length
      if (remaining <= 0) {
        showToast(formatMessage('photobookMaxPhotosReached', { maxPhotos: PHOTOBOOK_MAX_PHOTOS }), 'warning')
        return prev
      }
      if (uniqueFiles.length > remaining) {
        showToast(formatMessage('photobookRemainingPhotos', { remaining, maxPhotos: PHOTOBOOK_MAX_PHOTOS }), 'warning')
        return [...prev, ...uniqueFiles.slice(0, remaining)]
      }
      return combined
    })
  }, [formatMessage, libraryPhotos.length, selectedFiles, showToast])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files))
  }
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [addFiles])
  const removeFile = (i: number) => setSelectedFiles(p => p.filter((_, idx) => idx !== i))

  const compressImage = async (file: File): Promise<File> => {
    if (file.size <= 2 * 1024 * 1024) return file
    return new Promise(resolve => {
      const img = new Image(); const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d')
      img.onload = () => {
        let { width: w, height: h } = img; const m = 1920
        if (w > h && w > m) { h = (h * m) / w; w = m } else if (h > m) { w = (w * m) / h; h = m }
        canvas.width = w; canvas.height = h; ctx?.drawImage(img, 0, 0, w, h)
        canvas.toBlob(b => resolve(b ? new File([b], file.name, { type: 'image/jpeg' }) : file), 'image/jpeg', 0.8)
      }
      img.onerror = () => resolve(file); img.src = URL.createObjectURL(file)
    })
  }

  const analyzePhotos = async () => {
    const total = selectedFiles.length + libraryPhotos.length
    if (total === 0) return false
    setAnalyzing(true); setAnalyzeProgress(0); setAnalyzeCurrentPhoto(0); setAnalyzeTotalPhotos(selectedFiles.length)
    try {
      const token = await getIdToken(); if (!token) throw new Error('Auth')
      const analyzed: PhotobookPhoto[] = [...libraryPhotos]
      let aiServiceDown = false
      for (let i = 0; i < selectedFiles.length; i++) {
        try {
          const compressed = await compressImage(selectedFiles[i])
          const fd = new FormData(); fd.append('photos', compressed)
          const res = await fetch('/api/photobook/analyze', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
          if (res.ok) { const d = await res.json(); analyzed.push(...d.photos); if (d.aiServiceUnavailable) aiServiceDown = true }
          else { if (res.status === 429 || res.status >= 500) aiServiceDown = true; analyzed.push({ id: crypto.randomUUID(), originalFilename: selectedFiles[i].name, url: URL.createObjectURL(selectedFiles[i]), uploadedAt: new Date().toISOString(), analysisStatus: 'failed' }) }
        } catch { analyzed.push({ id: crypto.randomUUID(), originalFilename: selectedFiles[i].name, url: URL.createObjectURL(selectedFiles[i]), uploadedAt: new Date().toISOString(), analysisStatus: 'failed' }) }
        setAnalyzeCurrentPhoto(i + 1)
        setAnalyzeProgress(Math.round(((i + 1) / selectedFiles.length) * 100))
      }
      if (analyzed.filter(p => p.analysisStatus === 'completed').length === 0 && selectedFiles.length > 0) {
        showToast(aiServiceDown ? (t('photobookAiServiceError') || 'We’re currently experiencing minor issues. We’ve been notified and are working to fix them as quickly as possible.') : (t('photobookNoPhotosAnalyzed') || 'No photos analyzed'), 'error'); setAnalyzing(false); return null
      }
      setPhotos(analyzed)
      // Fix 5: Initialize manual order after analysis
      setManualPhotos([...analyzed])
      setAnalyzing(false); return analyzed
    } catch { showToast(t('photobookAnalyzeError') || 'Error analyzing photos', 'error'); setAnalyzing(false); return null }
  }

  // Fix 1 + 6: SSE-based create
  const handleCreate = async (photosOverride?: PhotobookPhoto[]) => {
    if (isSubLoading) return
    setCreating(true)
    setCreateProgress({ progress: 0, status: '', currentPhoto: 0, totalPhotos: 0 })

    try {
      const token = await getIdToken()
      if (!token) throw new Error('No auth token')

      // Fix 5: Use manual order if sortBy === 'manual'
      let photosToUse = photosOverride && photosOverride.length > 0 ? photosOverride : photos
      if (config.sortBy === 'manual') {
        // Fix C: If manualPhotos is empty (user switched to "manual" before analysis finished),
        // fall back to the regular photos state to avoid creating an empty photobook.
        photosToUse = manualPhotos.length > 0 ? manualPhotos : photos
      }

      // Inline base64 (data:) / blob: URLs can be many MB each and blow past
      // the serverless request-body limit (HTTP 413). The server rehydrates
      // the authoritative URL and full analysis (incl. embeddingVector) from
      // the media library by id, so they never need to travel over the wire.
      const stripInlineUrl = (url?: string) =>
        url && (url.startsWith('data:') || url.startsWith('blob:')) ? '' : url

      const compactPhotos = photosToUse.map((photo) => ({
        id: photo.id,
        mediaLibraryId: photo.mediaLibraryId,
        originalFilename: photo.originalFilename,
        url: stripInlineUrl(photo.url),
        thumbnailUrl: stripInlineUrl(photo.thumbnailUrl),
        uploadedAt: photo.uploadedAt,
        analysisStatus: photo.analysisStatus,
        analysisError: photo.analysisError,
        manualYear: photo.manualYear,
        manualDescription: photo.manualDescription,
        manualCategories: photo.manualCategories,
        pageIndex: photo.pageIndex,
        position: photo.position,
        caption: photo.caption,
        analysis: photo.analysis ? {
          estimatedEra: photo.analysis.estimatedEra,
          estimatedYear: photo.analysis.estimatedYear,
          description: photo.analysis.description,
          categories: photo.analysis.categories,
          mood: photo.analysis.mood,
          setting: photo.analysis.setting,
          // embeddingVector intentionally omitted — rehydrated server-side
        } : undefined,
      }))

      // Fix 1: POST to create-stream endpoint with compact payload to avoid 413
      const res = await fetch('/api/photobook/create-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ config, photos: compactPhotos }),
      })

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({}))
        if (res.status === 403 && errData.upgradeRequired) { openProSheet('create-limit'); return }
        throw new Error(errData.error || errData.message || `HTTP ${res.status}`)
      }

      // Fix 6: Read SSE stream
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Process all complete SSE lines
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const chunk of lines) {
          const dataLine = chunk.split('\n').find(l => l.startsWith('data: '))
          if (!dataLine) continue
          try {
            const event = JSON.parse(dataLine.slice(6)) as Record<string, unknown>

            if (event.error) {
              if ((event as Record<string,unknown>).upgradeRequired) {
                openProSheet('create-limit')
                return
              }
              throw new Error(event.error as string)
            }

            if (typeof event.warning === 'string') {
              showToast(event.warning, 'warning')
            }

            if (typeof event.progress === 'number') {
              setCreateProgress({
                progress: event.progress as number,
                status: (event.status as string) || '',
                currentPhoto: (event.currentPhoto as number) || 0,
                totalPhotos: (event.totalPhotos as number) || 0,
              })
            }

            if (event.done && event.bookId) {
              router.push(`/dashboard/books/${event.bookId}`)
              return
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== 'Unexpected end of JSON input') {
              throw parseErr
            }
          }
        }
      }
    } catch (err) {
      console.error('Error creating photobook:', err)
      showToast(t('photobookCreateError') || 'Error creating photobook', 'error')
      setCreating(false)
    }
  }

  const totalPhotos = selectedFiles.length + libraryPhotos.length

  // Fix 5: DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setManualPhotos(items => {
        const oldIndex = items.findIndex(p => p.id === active.id)
        const newIndex = items.findIndex(p => p.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  function movePhoto(index: number, direction: -1 | 1) {
    setManualPhotos(items => {
      const newIndex = index + direction
      if (newIndex < 0 || newIndex >= items.length) return items
      return arrayMove(items, index, newIndex)
    })
  }

  // Full-screen analyzing overlay
  if (analyzing) return (
    <div className="flex items-center justify-center h-full min-h-[60vh] p-6">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md bg-card shadow-2xl rounded-3xl p-8 text-center space-y-5">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-rose-200 dark:border-rose-900" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-rose-500" />
          <Camera className="absolute inset-0 m-auto h-8 w-8 text-rose-500" />
        </motion.div>
        <h2 className="text-xl font-bold font-display">{t('photobookAnalyzingTitle') || 'Analyzing Photos...'}</h2>
        {analyzeTotalPhotos > 0 && analyzeCurrentPhoto > 0 && (
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
            {formatMessage('photobookAnalyzingPhoto', { current: analyzeCurrentPhoto, total: analyzeTotalPhotos })}
          </p>
        )}
        <p className="text-sm text-muted-foreground">{t('photobookAnalyzingSubtext') || 'AI is examining your photos for faces, scenes, and emotions'}</p>
        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-full" animate={{ width: `${analyzeProgress}%` }} transition={{ duration: 0.3 }} />
        </div>
        <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{analyzeProgress}%</p>
      </motion.div>
    </div>
  )

  // Fix 6: Dynamic progress overlay for creation
  if (creating) return (
    <div className="flex items-center justify-center h-full min-h-[60vh] p-6">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md bg-card shadow-2xl rounded-3xl p-8 text-center space-y-5">
        <h2 className="text-xl font-bold font-display">{t('creatingPhotobookEllipsis') || 'Creating your photobook...'}</h2>
        <AnimatePresence mode="wait">
          <motion.p
            key={createProgress.status}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-sm text-muted-foreground min-h-[20px]"
          >
            {createProgress.status || t('photobookStatusStarting') || 'Starting...'}
          </motion.p>
        </AnimatePresence>
        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-full"
            animate={{ width: `${createProgress.progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{createProgress.progress}%</p>
        {createProgress.totalPhotos > 0 && createProgress.currentPhoto > 0 && (
          <p className="text-xs text-muted-foreground">
            Photo {createProgress.currentPhoto} of {createProgress.totalPhotos}
          </p>
        )}
        <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
      </motion.div>
    </div>
  )

  const steps: Step[] = [
    {
      id: 'upload',
      title: t('photobookUploadTitle'),
      description: t('photobookUploadDesc'),
      validation: () => totalPhotos > 0 ? true : (t('photobookMinPhotos') || 'Select at least one photo'),
      content: () => (
        <div className="space-y-4">
          {/* Limit badge */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatMessage('photobookLimitBadge', { maxPhotos: PHOTOBOOK_MAX_PHOTOS, maxSize: PHOTOBOOK_MAX_FILE_SIZE_MB })}</span>
            <span className={totalPhotos >= PHOTOBOOK_MAX_PHOTOS ? 'text-rose-500 font-semibold' : ''}>{totalPhotos} / {PHOTOBOOK_MAX_PHOTOS}</span>
          </div>

          {/* Drop zone — disabled when limit reached */}
          {totalPhotos < PHOTOBOOK_MAX_PHOTOS ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${isDragging ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/20 scale-[1.02]' : 'border-border hover:border-rose-300'}`}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-semibold mb-1">{t('photobookDragDropPhotos') || 'Drag & Drop Photos'}</p>
              <p className="text-sm text-muted-foreground mb-4">{t('commonOr') || 'or'}</p>
              <div className="flex items-center justify-center gap-3">
                <label className="inline-block">
                  <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
                  <span className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer text-sm font-medium transition-colors inline-flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    {t('photobookBrowseFiles') || 'Browse Files'}
                  </span>
                </label>
                <label className="inline-block">
                  <input type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
                  <span className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl cursor-pointer text-sm font-medium transition-colors inline-flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    {t('photobookOpenCamera') || 'Camera'}
                  </span>
                </label>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-2xl p-6 text-center border-rose-300 bg-rose-50 dark:bg-rose-950/20">
              <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{formatMessage('photobookMaxPhotosReachedTitle', { maxPhotos: PHOTOBOOK_MAX_PHOTOS })}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('photobookRemovePhotoToAddAnother') || 'Remove a photo to add another'}</p>
            </div>
          )}

          {/* Photo thumbnails */}
          {selectedFiles.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {t('photobookPhotosSelected', { count: selectedFiles.length })}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="relative group aspect-square">
                    <img src={previewUrls[i]} alt="" className="w-full h-full object-cover rounded-lg" />
                    <button onClick={() => removeFile(i)} className="absolute top-1 right-1 w-5 h-5 bg-red-500/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Media library button */}
          {totalPhotos < PHOTOBOOK_MAX_PHOTOS && (
            <Button variant="outline" onClick={() => setShowMedia(true)} className="w-full h-11 rounded-xl border-dashed">
              <Library className="w-4 h-4 mr-2" />{t('photobookMediaLibrary') || 'Media Library'}
              {libraryPhotos.length > 0 && <span className="ml-2 px-2 py-0.5 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-full text-xs font-medium">{libraryPhotos.length}</span>}
            </Button>
          )}

          <MediaLibrarySelector
            open={showMedia}
            onOpenChange={setShowMedia}
            onSelectPhotos={(p) => {
              const ids = new Set(libraryPhotos.map(x => x.id))
              const newPhotos = p.filter(x => !ids.has(x.id))
              const remaining = PHOTOBOOK_MAX_PHOTOS - totalPhotos
              if (newPhotos.length > remaining) {
                showToast(formatMessage('photobookRemainingPhotos', { remaining, maxPhotos: PHOTOBOOK_MAX_PHOTOS }), 'warning')
              }
              setLibraryPhotos(prev => [...prev, ...newPhotos.slice(0, remaining)])
            }}
            existingPhotoIds={libraryPhotos.map(p => p.id)}
          />
        </div>
      ),
    },
    {
      id: 'customize',
      title: t('photobookCustomizeTitle'),
      description: t('photobookCustomizeDesc'),
      validation: () => {
        if (!config.title?.trim()) return 'Title is required'
        if (config.title.length < 3) return 'At least 3 characters'
        return true
      },
      content: () => (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Title */}
          <Field label={t('title')} icon={BookOpen}>
            <Input value={config.title} onChange={(e) => up({ title: e.target.value })} placeholder={t('photobookTitleExample')} className={`text-lg font-semibold ${inputClass}`} />
          </Field>

          <Field label={t('subtitle')}>
            <Input value={config.subtitle} onChange={(e) => up({ subtitle: e.target.value })} placeholder={t('optionalSubtitle')} className={inputClass} />
          </Field>

          <Field label={t('description')}>
            <Textarea value={config.description} onChange={(e) => up({ description: e.target.value })} placeholder={t('photobookDescriptionPlaceholder')} rows={2} className={textareaClass} />
          </Field>

          {/* Theme selection */}
          <Field label={t('theme')} icon={Palette}>
            <div className="grid grid-cols-2 gap-2">
              {PHOTOBOOK_THEMES.map(theme => (
                <button key={theme.value} type="button" onClick={() => up({ theme: theme.value as PhotobookConfig['theme'] })}
                  className={`p-3 rounded-xl border-2 transition-all text-left active:scale-95 ${config.theme === theme.value ? 'border-rose-500 bg-rose-50 dark:bg-rose-950 shadow-md' : 'border-border hover:border-rose-300'}`}>
                  <div className="font-semibold text-sm">{t(theme.labelKey as never)}</div>
                </button>
              ))}
            </div>
          </Field>

          {/* Sort + Layout */}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('sortPhotosBy')}>
              <Select value={config.sortBy} onValueChange={(v: PhotoSortOption) => up({ sortBy: v })}>
                <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                <SelectContent>{PHOTOBOOK_SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{t(o.labelKey as never)}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label={t('transformStyle')}>
              <Select value={config.transformEnabled ? (config.transformStyle || 'original') : 'original'} onValueChange={(v: string) => {
                if (v === 'original') up({ transformEnabled: false, transformStyle: 'original' })
                else up({ transformEnabled: true, transformStyle: v as PhotoTransformStyle })
              }}>
                <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">{t('original')}</SelectItem>
                  {PHOTOBOOK_TRANSFORM_STYLES.filter(s => s.value !== 'original').map(s => (
                    <SelectItem key={s.value} value={s.value}><span className="flex items-center gap-2"><span>{s.icon}</span><span>{t(s.labelKey as never)}</span></span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </motion.div>
      ),
    },
    // Fix 5: Manual sort step — shown only when photos are loaded and sortBy === 'manual'
    ...(photos.length > 0 && config.sortBy === 'manual' ? [{
      id: 'manual-sort',
      title: 'Arrange Photos',
      description: 'Drag and drop photos to set your preferred order',
      content: () => (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Drag to reorder, or use the arrow buttons</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={manualPhotos.map(p => p.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 gap-2">
                {manualPhotos.map((photo, i) => (
                  <SortablePhotoCard
                    key={photo.id}
                    photo={photo}
                    index={i}
                    onMoveUp={() => movePhoto(i, -1)}
                    onMoveDown={() => movePhoto(i, 1)}
                    isFirst={i === 0}
                    isLast={i === manualPhotos.length - 1}
                    isTouchDevice={isTouchDevice}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      ),
    } as Step] : []),
    {
      id: 'review',
      title: t('photobookReviewTitle'),
      description: t('photobookReviewDesc'),
      content: () => (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/30 dark:to-orange-950/30 rounded-2xl p-5 border border-rose-200/50 dark:border-rose-800/50">
            <h3 className="text-xl font-bold font-display text-foreground mb-1">{config.title || 'Untitled'}</h3>
            {config.subtitle && <p className="text-sm text-muted-foreground mb-3">{config.subtitle}</p>}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              {[
                ['Photos', totalPhotos],
                ['Theme', (() => { const k = PHOTOBOOK_THEMES.find(theme => theme.value === config.theme)?.labelKey; return k ? t(k as never) : config.theme })()],
                ['Sort', (() => { const k = PHOTOBOOK_SORT_OPTIONS.find(o => o.value === config.sortBy)?.labelKey; return k ? t(k as never) : config.sortBy })()],
                ['Transform', config.transformEnabled ? (() => { const k = PHOTOBOOK_TRANSFORM_STYLES.find(s => s.value === config.transformStyle)?.labelKey; return k ? t(k as never) : t('on') })() : t('off')],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between py-0.5">
                  <span className="text-muted-foreground">{String(k)}</span>
                  <span className="font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl p-4 flex items-start gap-3">
            <p className="text-sm text-rose-800 dark:text-rose-200">
              AI will build a beautiful layout with{config.includeAnalysisText ? ' warm, personal captions' : 'out captions'}.
            </p>
          </div>
          {/* Feature 5: Thumbnail preview grid */}
          {(() => {
            const previewPhotos = config.sortBy === 'manual' && manualPhotos.length > 0 ? manualPhotos : photos
            const allUrls = [
              ...previewPhotos.map(p => p.url || p.thumbnailUrl),
              ...selectedFiles.map((_, i) => previewUrls[i]),
            ].filter(Boolean) as string[]
            const displayUrls = allUrls.slice(0, 6)
            const remaining = allUrls.length - 6
            return displayUrls.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('photobookPreviewPhotos') || 'Selected Photos'}</p>
                <div className="grid grid-cols-3 gap-2">
                  {displayUrls.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                {remaining > 0 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {formatMessage('photobookMorePhotos', { count: remaining })}
                  </p>
                )}
              </div>
            ) : null
          })()}

          {/* Cover preview */}
          {(() => {
            const coverPhoto = (config.sortBy === 'manual' && manualPhotos.length > 0 ? manualPhotos : photos)[0]
            const coverUrl = coverPhoto?.url || (selectedFiles[0] ? previewUrls[0] : undefined)
            return coverUrl ? (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
                <img src={coverUrl} alt="Cover" className="w-12 h-12 rounded-lg object-cover" />
                <div>
                  <p className="text-sm font-medium">{t('photobookCoverPreview') || 'Cover Photo'}</p>
                  <p className="text-xs text-muted-foreground">{t('photobookCoverPreviewDesc') || 'First photo will be used as cover'}</p>
                </div>
              </div>
            ) : null
          })()}
        </div>
      ),
    },
  ]

  return (
    <PageTransition direction="up">
      <div className="min-h-[60vh] pb-32 lg:pb-8">
        <div className="lg:hidden"><AppBar title={t('photobook')} showBack={currentStep === 0} onBack={() => router.replace('/dashboard/create')} /></div>
        <div className="hidden lg:block bg-card border-b border-border px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-rose-500 to-orange-500 rounded-2xl flex items-center justify-center"><Camera className="w-6 h-6 text-white" /></div>
            <div><h1 className="text-2xl font-bold font-display">{t('photoBook')}</h1><p className="text-sm text-muted-foreground mt-1">{t('photoBookUploadSubtitle')}</p></div>
          </div>
        </div>
        <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
          <MultiStepWizard
            steps={steps}
            onComplete={async () => {
              if (photos.length === 0) {
                const analyzed = await analyzePhotos()
                if (!analyzed) return
                await handleCreate(analyzed)
              } else {
                await handleCreate()
              }
            }}
            onStepChange={async (i) => {
              setCurrentStep(i)
              if (i === 1 && photos.length === 0 && selectedFiles.length > 0 && i > currentStep) {
                const analyzed = await analyzePhotos()
                if (analyzed && config.sortBy === 'manual') {
                  setManualPhotos([...analyzed])
                }
              }
            }}
            backButton={{ text: t('back') || 'Back', onClick: () => router.replace('/dashboard/create') }}
            nextButton={{ text: t('next') || 'Next' }}
            finishButton={{ text: t('photobook'), loading: creating }}
          />
        </div>
      </div>
    </PageTransition>
  )
}
