'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, Loader2, BookOpen, Sparkles, Zap, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface KeyEvent {
  chapter: number
  id: number
  title: string
  wordCount?: number
  status: 'writing' | 'completed'
  progress: string // "2/6"
}

interface ChapterProgress {
  completed: number
  total: number
  totalWords: number
}

interface ChapterComplete {
  number: number
  title: string
  wordCount: number
  scenes: Array<{
    title: string
    wordCount: number
  }>
}

interface OutlineChapter {
  number: number
  title: string
  keyEventsCount: number
}

interface JobStatus {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  currentStep: string
  errorMessage?: string
  outline?: {
    chapters: OutlineChapter[]
  }
  keyEvent?: KeyEvent
  chapterProgress?: ChapterProgress
  chapter?: ChapterComplete
}

interface ProductionBookLivePreviewProps {
  jobId: string
  bookId: string
  onComplete?: () => void
}

export default function ProductionBookLivePreview({
  jobId,
  onComplete
}: ProductionBookLivePreviewProps) {
  const { getIdToken } = useAuth()
  const [status, setStatus] = useState<JobStatus | null>(null)
  const [completedEvents, setCompletedEvents] = useState<KeyEvent[]>([])
  const [completedChapters, setCompletedChapters] = useState<ChapterComplete[]>([])
  const [currentEvent, setCurrentEvent] = useState<KeyEvent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [startTime] = useState(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)

  const fetchJobStatus = useCallback(async () => {
    try {
      const token = await getIdToken()
      if (!token) {
        console.warn('No token available, skipping fetch')
        return
      }

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
      const job = jobData.job

      // Parse metadata for additional info
      const parsedStatus: JobStatus = {
        id: job.id,
        status: job.status,
        progress: job.progress || 0,
        currentStep: job.current_step || 'Wird vorbereitet...',
        errorMessage: job.error_message
      }

      // Parse metadata if available
      if (job.metadata) {
        try {
          const metadata = typeof job.metadata === 'string'
            ? JSON.parse(job.metadata)
            : job.metadata

          // Extract outline, keyEvent, chapterProgress, chapter
          if (metadata.outline) parsedStatus.outline = metadata.outline
          if (metadata.keyEvent) parsedStatus.keyEvent = metadata.keyEvent
          if (metadata.chapterProgress) parsedStatus.chapterProgress = metadata.chapterProgress
          if (metadata.chapter) parsedStatus.chapter = metadata.chapter
        } catch (e) {
          console.error('Error parsing metadata:', e)
        }
      }

      setStatus(parsedStatus)

      // Handle current KeyEvent (writing)
      if (parsedStatus.keyEvent?.status === 'writing') {
        setCurrentEvent(parsedStatus.keyEvent)
      }

      // Handle completed KeyEvent
      if (parsedStatus.keyEvent?.status === 'completed') {
        setCompletedEvents(prev => {
          const exists = prev.find(
            e => e.chapter === parsedStatus.keyEvent!.chapter &&
                 e.id === parsedStatus.keyEvent!.id
          )
          if (!exists) {
            return [...prev, parsedStatus.keyEvent!]
          }
          return prev
        })
        setCurrentEvent(null)
      }

      // Handle completed Chapter
      if (parsedStatus.chapter) {
        setCompletedChapters(prev => {
          const exists = prev.find(c => c.number === parsedStatus.chapter!.number)
          if (!exists) {
            return [...prev, parsedStatus.chapter!]
          }
          return prev
        })
      }

      // Check if job is complete
      if (job.status === 'completed' && onComplete) {
        setTimeout(onComplete, 2000) // Small delay for dramatic effect
      }

      // Check if job failed
      if (job.status === 'failed') {
        setError(job.error_message || 'Generierung fehlgeschlagen')
      }

    } catch (err: any) {
      console.error('Error fetching job status:', err)
      setError(err.message)
    }
  }, [jobId, getIdToken, onComplete])

  // Update elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  // Poll for updates
  useEffect(() => {
    fetchJobStatus()

    const interval = setInterval(() => {
      fetchJobStatus()
    }, 2000)

    return () => clearInterval(interval)
  }, [fetchJobStatus])

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate estimated time remaining
  const estimatedTimeRemaining = () => {
    if (!status?.progress || status.progress === 0) return null
    const totalEstimated = (elapsedTime / status.progress) * 100
    const remaining = Math.max(0, Math.floor(totalEstimated - elapsedTime))
    return remaining
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-900 flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Fehler bei der Generierung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const totalChapters = status?.outline?.chapters?.length || 0
  const remaining = estimatedTimeRemaining()

  return (
    <div className="space-y-6">
      {/* Hero Status Card */}
      <Card className="border-0 shadow-2xl bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <CardHeader className="space-y-6 pb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                {status?.status !== 'completed' && (
                  <>
                    <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                    <div className="relative bg-white p-3 rounded-full shadow-lg">
                      <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                    </div>
                  </>
                )}
                {status?.status === 'completed' && (
                  <div className="bg-green-100 p-3 rounded-full shadow-lg">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {status?.status === 'completed' ? '🎉 Dein Buch ist fertig!' : '📖 Dein Buch wird geschrieben...'}
                </h2>
                <p className="text-lg text-gray-600">
                  {status?.currentStep || 'Vorbereitung läuft...'}
                </p>
              </div>
            </div>
            {status?.status !== 'completed' && (
              <div className="text-right">
                <Badge variant="secondary" className="px-4 py-2 text-lg mb-2">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Live
                </Badge>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(elapsedTime)}</span>
                  {remaining && remaining > 0 && (
                    <span className="text-xs">
                      (~{Math.ceil(remaining / 60)}m verbleibend)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Progress Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-600" />
                <span className="font-semibold text-gray-700">
                  Fortschritt
                </span>
              </div>
              <span className="text-2xl font-bold text-purple-600">
                {Math.round(status?.progress || 0)}%
              </span>
            </div>
            <Progress
              value={status?.progress || 0}
              className="h-3 bg-white/50"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Current KeyEvent (wird gerade geschrieben) */}
      {currentEvent && (
        <Card className="border-2 border-yellow-400 shadow-xl animate-pulse-slow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Loader2 className="h-8 w-8 text-yellow-600 animate-spin" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  ✍️ {currentEvent.title}
                </h3>
                <p className="text-gray-600">
                  Kapitel {currentEvent.chapter} · Szene wird geschrieben...
                </p>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2">
                {currentEvent.progress}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chapter Progress (wenn verfügbar) */}
      {status?.chapterProgress && (
        <Card className="border-2 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Aktuelles Kapitel Fortschritt
              </h3>
              <span className="text-sm text-gray-600">
                {status.chapterProgress.completed}/{status.chapterProgress.total} Szenen
              </span>
            </div>
            <div className="flex gap-2 mb-3">
              {Array.from({ length: status.chapterProgress.total }).map((_, i) => (
                <div
                  key={i}
                  className={`h-3 flex-1 rounded-full transition-all duration-500 ${
                    i < status.chapterProgress!.completed
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                      : i === status.chapterProgress!.completed
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-600 animate-pulse'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-gray-600">
              {status.chapterProgress.totalWords.toLocaleString()} Wörter geschrieben
            </p>
          </CardContent>
        </Card>
      )}

      {/* Completed KeyEvents Feed */}
      {completedEvents.length > 0 && (
        <Card className="border-2 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Fertige Szenen ({completedEvents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {completedEvents
              .sort((a, b) => {
                if (a.chapter !== b.chapter) return b.chapter - a.chapter
                return b.id - a.id
              })
              .map((event, idx) => (
                <div
                  key={`${event.chapter}-${event.id}`}
                  className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 animate-slide-in"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {event.title}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Kapitel {event.chapter}
                        </p>
                      </div>
                    </div>
                    {event.wordCount && (
                      <Badge variant="secondary" className="ml-2">
                        {event.wordCount} Wörter
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Completed Chapters */}
      {completedChapters.length > 0 && (
        <Card className="border-2 border-purple-200">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-purple-600" />
              Fertige Kapitel ({completedChapters.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {completedChapters
              .sort((a, b) => b.number - a.number)
              .map((chapter) => (
                <div
                  key={chapter.number}
                  className="p-6 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 shadow-md"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        🎉 Kapitel {chapter.number}: {chapter.title}
                      </h3>
                      <p className="text-gray-600">
                        {chapter.wordCount.toLocaleString()} Wörter in {chapter.scenes.length} Szenen
                      </p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>

                  {/* Scenes Preview */}
                  <div className="grid grid-cols-2 gap-2">
                    {chapter.scenes.map((scene, idx) => (
                      <div
                        key={idx}
                        className="text-sm p-2 bg-white/60 rounded border border-purple-200"
                      >
                        <div className="font-medium text-gray-900 truncate">
                          {scene.title}
                        </div>
                        <div className="text-xs text-gray-600">
                          {scene.wordCount} Wörter
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Outline Overview */}
      {status?.outline?.chapters && (
        <Card className="border-2 border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-gray-600" />
              Alle Kapitel ({totalChapters})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {status.outline.chapters.map((chapter) => {
                const isCompleted = completedChapters.some(c => c.number === chapter.number)
                const isCurrent = currentEvent?.chapter === chapter.number

                return (
                  <div
                    key={chapter.number}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      isCurrent
                        ? 'border-yellow-400 bg-yellow-50'
                        : isCompleted
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        isCurrent
                          ? 'bg-yellow-500 text-white'
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        {isCompleted ? '✓' : chapter.number}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">
                          {chapter.title}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {chapter.keyEventsCount} Szenen
                        </p>
                      </div>
                      {isCurrent && (
                        <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />
                      )}
                      {isCompleted && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
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
      {status?.status === 'completed' && (
        <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="mb-4">
              <div className="inline-block p-4 bg-green-100 rounded-full mb-4">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-2">
              ✨ Geschafft! Dein Buch ist fertig!
            </h3>
            <p className="text-lg text-gray-700 mb-2">
              {completedChapters.length} Kapitel mit {' '}
              {completedEvents.length} Szenen geschrieben
            </p>
            <p className="text-sm text-gray-600">
              Gesamtzeit: {formatTime(elapsedTime)}
            </p>
          </CardContent>
        </Card>
      )}

      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.95; }
        }
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s infinite;
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
