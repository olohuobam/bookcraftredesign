'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, Loader2, BookOpen, Sparkles, Image as ImageIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface PictureBookPage {
  pageIndex: number
  text?: string
  panels: Array<{
    panelIndex: number
    description: string
  }>
}

interface PictureBookConfig {
  pages?: PictureBookPage[]
}

interface JobStatus {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number
  currentStep: string
  errorMessage?: string
  bookId?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  metadata?: string
}

interface PictureBookGenerationLivePreviewProps {
  jobId: string
  bookId: string
  onComplete?: () => void
}

export default function PictureBookGenerationLivePreview({
  jobId,
  bookId,
  onComplete
}: PictureBookGenerationLivePreviewProps) {
  const { getIdToken } = useAuth()
  const [job, setJob] = useState<JobStatus | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [config, setConfig] = useState<PictureBookConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newImageIndices, setNewImageIndices] = useState<Set<number>>(new Set())
  const [pollInterval, setPollInterval] = useState<number>(2000) // Start with 2 seconds
  const [pollCount, setPollCount] = useState<number>(0)

  const fetchJobStatus = useCallback(async () => {
    try {
      const token = await getIdToken()
      if (!token) {
        console.warn('No token available, skipping fetch')
        return
      }

      // Fetch job status
      const jobRes = await fetch(`/api/jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!jobRes.ok) {
        if (jobRes.status === 401) {
          console.error('Authentication error - token may have expired')
          return
        }
        throw new Error('Failed to fetch job status')
      }

      const jobData = await jobRes.json()
      setJob(jobData.job)

      // Parse picture book config from job metadata
      if (jobData.job.metadata) {
        try {
          const metadata = typeof jobData.job.metadata === 'string'
            ? JSON.parse(jobData.job.metadata)
            : jobData.job.metadata

          if (metadata.pictureBookConfig) {
            setConfig(metadata.pictureBookConfig)
          }
        } catch (e) {
          console.error('Error parsing job metadata:', e)
        }
      }

      // Fetch book data to get images
      const bookRes = await fetch(`/api/books/${bookId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (bookRes.ok) {
        const bookData = await bookRes.json()

        if (bookData.book.images) {
          try {
            const parsedImages = Array.isArray(bookData.book.images)
              ? bookData.book.images
              : JSON.parse(bookData.book.images)

            // Detect new images by comparing with previous state
            setImages(prevImages => {
              const newIndices = new Set<number>()
              parsedImages.forEach((img: string, idx: number) => {
                if (img && (!prevImages[idx] || prevImages[idx] !== img)) {
                  newIndices.add(idx)
                }
              })

              if (newIndices.size > 0) {
                setNewImageIndices(newIndices)
                // Clear the "new" highlight after 3 seconds
                setTimeout(() => {
                  setNewImageIndices(prev => {
                    const updated = new Set(prev)
                    newIndices.forEach(idx => updated.delete(idx))
                    return updated
                  })
                }, 3000)

                // New images detected - reset to fast polling
                setPollInterval(2000)
                setPollCount(0)
              } else if (prevImages.length > 0 && pollCount > 5) {
                // No new images after multiple polls - slow down polling
                setPollInterval(prev => Math.min(prev * 1.2, 10000))
              }

              return parsedImages
            })
          } catch (e) {
            console.error('Error parsing images:', e)
          }
        }
      }

      // Check if job is complete
      if (jobData.job.status === 'completed') {
        if (onComplete) {
          onComplete()
        }
      }

      // Check if job failed
      if (jobData.job.status === 'failed') {
        setError(jobData.job.errorMessage || 'Generierung fehlgeschlagen')
      }

      // Update poll count and interval based on activity
      setPollCount(prev => prev + 1)

    } catch (err: any) {
      console.error('Error fetching job status:', err)
      setError(err.message)

      // On error, back off more aggressively
      setPollInterval(prev => Math.min(prev * 1.5, 15000))
    }
  }, [jobId, bookId, getIdToken, onComplete, images.length, pollCount])

  // Poll for updates with dynamic interval (exponential backoff)
  useEffect(() => {
    fetchJobStatus()

    const interval = setInterval(() => {
      fetchJobStatus()
    }, pollInterval)

    return () => clearInterval(interval)
  }, [fetchJobStatus, pollInterval])

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-900 flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Fehler bei der Generierung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const totalImages = config?.pages?.reduce((sum, page) => sum + page.panels.length, 0) || images.length || 1
  const completedImages = images.filter(img => img && img.length > 0).length

  return (
    <div className="space-y-6">
      {/* Hero Status Card */}
      <Card className="border-0 shadow-2xl bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <CardHeader className="space-y-6 pb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping opacity-75"></div>
                <div className="relative bg-white p-3 rounded-full shadow-lg">
                  <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {job?.status === 'completed' ? '✨ Dein Bilderbuch ist fertig!' : '🎨 Dein Bilderbuch entsteht gerade...'}
                </h2>
                <p className="text-lg text-gray-600">
                  {job?.status === 'completed'
                    ? 'Alle Seiten wurden wunderschön illustriert!'
                    : completedImages === 0
                    ? 'Unsere KI-Künstler bereiten die ersten Zeichnungen vor...'
                    : completedImages === totalImages
                    ? 'Wir fügen die letzten Details hinzu...'
                    : `Die magischen Illustrationen werden gemalt...`}
                </p>
              </div>
            </div>
            {job?.status !== 'completed' && (
              <Badge variant="secondary" className="px-4 py-2 text-lg">
                <Sparkles className="h-4 w-4 mr-2" />
                Live
              </Badge>
            )}
          </div>

          {/* Progress Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-purple-600" />
                <span className="font-semibold text-gray-700">
                  {completedImages === totalImages
                    ? '🎉 Alle Bilder fertig!'
                    : `${completedImages} von ${totalImages} Bildern fertig`}
                </span>
              </div>
              <span className="text-2xl font-bold text-purple-600">
                {Math.round((completedImages / totalImages) * 100) || 0}%
              </span>
            </div>
            <Progress
              value={job?.progress || 0}
              className="h-3 bg-white/50"
            />
            {totalImages > 0 && (
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: totalImages }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 min-w-[20px] rounded-full transition-all duration-500 ${
                      images[i]
                        ? newImageIndices.has(i)
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg scale-110 animate-pulse'
                          : 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-md'
                        : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Live Image Feed */}
      {config?.pages && config.pages.length > 0 && (
        <Card className="border-2 border-purple-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <BookOpen className="h-6 w-6 text-purple-600" />
              Deine Buchseiten
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Sieh zu, wie dein Buch Seite für Seite zum Leben erwacht ✨
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-8">
              {config.pages.map((page) => {
                const imagesPerPage = page.panels.length

                return (
                  <div key={page.pageIndex} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-700">
                        {page.pageIndex + 1}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        Seite {page.pageIndex + 1}
                      </h3>
                    </div>

                    {page.text && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-gray-800 italic">{page.text}</p>
                      </div>
                    )}

                    <div className={`grid gap-4 ${
                      imagesPerPage === 4 ? 'grid-cols-2 md:grid-cols-4' :
                      imagesPerPage === 2 ? 'grid-cols-2' :
                      'grid-cols-1 md:grid-cols-2'
                    }`}>
                      {page.panels.map((panel) => {
                        const flatIndex = page.pageIndex * imagesPerPage + panel.panelIndex
                        const imageUrl = images[flatIndex]
                        const isNew = newImageIndices.has(flatIndex)

                        return (
                          <div
                            key={panel.panelIndex}
                            className={`border-2 rounded-lg overflow-hidden transition-all duration-500 ${
                              isNew
                                ? 'border-green-400 shadow-2xl scale-105 ring-4 ring-green-200'
                                : imageUrl
                                ? 'border-green-300 shadow-lg'
                                : 'border-gray-200 shadow-sm'
                            }`}
                          >
                            <div className="relative w-full aspect-square bg-gray-50 flex items-center justify-center">
                              {imageUrl ? (
                                <>
                                  <img
                                    src={imageUrl}
                                    alt={`Seite ${page.pageIndex + 1}, Bild ${panel.panelIndex + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                  {isNew && (
                                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-bounce">
                                      NEU!
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="text-center p-4">
                                  <Loader2 className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-2" />
                                  <p className="text-sm text-gray-500">Wird generiert...</p>
                                </div>
                              )}
                            </div>
                            {/* Removed technical description - user-friendly only */}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simple Image Grid (Fallback if no config) */}
      {(!config || !config.pages || config.pages.length === 0) && images.length > 0 && (
        <Card className="border-2 border-purple-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ImageIcon className="h-6 w-6 text-purple-600" />
              📖 Generierte Bilder
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((imageUrl, index) => {
                const isNew = newImageIndices.has(index)

                return (
                  <div
                    key={index}
                    className={`border-2 rounded-lg overflow-hidden transition-all duration-500 ${
                      isNew
                        ? 'border-green-400 shadow-2xl scale-105 ring-4 ring-green-200'
                        : imageUrl
                        ? 'border-green-300 shadow-lg'
                        : 'border-gray-200 shadow-sm'
                    }`}
                  >
                    <div className="relative w-full aspect-square bg-gray-50 flex items-center justify-center">
                      {imageUrl ? (
                        <>
                          <img
                            src={imageUrl}
                            alt={`Bild ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {isNew && (
                            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-bounce">
                              NEU!
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center">
                          <Loader2 className="h-6 w-6 text-gray-400 animate-spin mx-auto mb-1" />
                          <p className="text-xs text-gray-500">Wartet...</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completion Message */}
      {job?.status === 'completed' && (
        <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="mb-4">
              <div className="inline-block p-4 bg-green-100 rounded-full mb-4">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-2">
              🎉 Geschafft! Dein Bilderbuch ist fertig!
            </h3>
            <p className="text-lg text-gray-700 mb-1">
              Alle Seiten sind wunderschön illustriert und warten auf dich
            </p>
            <p className="text-sm text-gray-600">
              Gleich kannst du dein Werk bewundern...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
