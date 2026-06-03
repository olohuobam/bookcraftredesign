import { NextRequest } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Constants
const STALE_THRESHOLD_SECONDS = 5 * 60
const HARD_TIMEOUT_SECONDS = 45 * 60
const BASE_POLL_INTERVAL_MS = 1000 // Base server-side poll interval
const MAX_POLL_INTERVAL_MS = 5000 // Max poll interval after backoff
const HEARTBEAT_INTERVAL_MS = 15000 // Send heartbeat every 15s to keep connection alive
const MAX_CONNECTION_TIME_MS = 2 * 60 * 1000 // Max 2 minutes per connection (SSE is fallback only)
const BACKOFF_MULTIPLIER = 1.5 // Increase interval when no changes detected

interface SSEData {
  type: 'job_update' | 'book_update' | 'heartbeat' | 'complete' | 'error'
  job?: {
    id: string
    status: string
    progress: number
    currentStep: string
    errorMessage?: string
    bookId?: string
    metadata?: Record<string, unknown>
    createdAt: string
    updatedAt: string
    completedAt?: string
    lastHeartbeatAt?: string
    retryCount: number
    staleSeconds: number
    isStale: boolean
    elapsedSeconds: number
  }
  book?: {
    id: string
    title: string
    genre?: string
    chapters?: unknown[]
    chapters_json?: unknown
    images?: string[]
    status: string
    book_type?: string
    cover_image?: string
    back_cover_image?: string
  }
  eta?: {
    estimatedSecondsRemaining: number | null
    displayText: string
    confidence: 'low' | 'medium' | 'high'
  }
  timestamp: string
}

/** Predefined estimates by chapter count (seconds) */
function getPredefinedETA(totalChapters: number): number {
  if (totalChapters <= 3) return 3 * 60
  if (totalChapters <= 5) return 6 * 60
  if (totalChapters <= 8) return 10 * 60
  return 15 * 60
}

function formatETAText(seconds: number): string {
  if (seconds < 60) return 'Less than 1 minute'
  const mins = Math.ceil(seconds / 60)
  if (mins === 1) return '~1 min remaining'
  return `~${mins} min remaining`
}

function calculateETA(progress: number, createdAt: string, totalChapters?: number): SSEData['eta'] {
  // Before 25%: use predefined chapter-count-based estimate
  if (progress < 25) {
    if (totalChapters && totalChapters > 0) {
      const estimated = getPredefinedETA(totalChapters)
      return {
        estimatedSecondsRemaining: estimated,
        displayText: formatETAText(estimated),
        confidence: 'low'
      }
    }
    return { estimatedSecondsRemaining: null, displayText: 'Calculating...', confidence: 'low' }
  }

  // 25%+: real extrapolation
  const now = new Date()
  const startTime = new Date(createdAt)
  const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000)
  if (elapsedSeconds <= 0 || progress <= 0) {
    return { estimatedSecondsRemaining: null, displayText: 'Calculating...', confidence: 'low' }
  }

  const estimatedTotalSeconds = (elapsedSeconds / progress) * 100
  const estimatedSecondsRemaining = Math.max(0, Math.round((estimatedTotalSeconds - elapsedSeconds) * 1.1))

  let confidence: 'low' | 'medium' | 'high' = 'medium'
  if (progress >= 50) confidence = 'high'

  return {
    estimatedSecondsRemaining,
    displayText: formatETAText(estimatedSecondsRemaining),
    confidence
  }
}

function formatSSE(data: SSEData): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  // Verify authentication
  const authorization = request.headers.get('authorization')
  const token = authorization?.replace('Bearer ', '')

  if (!token) {
    return new Response(JSON.stringify({ error: 'No token provided' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  let userData
  try {
    userData = await verifySupabaseToken(token)
    if (!userData || !userData.userId) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 })
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 })
  }

  const { jobId } = await params

  if (!jobId) {
    return new Response(JSON.stringify({ error: 'Job ID required' }), { status: 400 })
  }

  // Verify job exists and belongs to user
  const initialJob = await SupabaseDB.getBookGenerationJob(jobId)
  if (!initialJob) {
    return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404 })
  }
  if (initialJob.user_id !== userData.userId) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  // Create SSE stream
  const encoder = new TextEncoder()
  let isConnectionActive = true
  const connectionStartTime = Date.now()

  // Use request signal to detect client disconnect
  const abortSignal = request.signal
  abortSignal.addEventListener('abort', () => {
    isConnectionActive = false
  })

  // Track last state for change detection
  let lastJobUpdatedAt = ''
  let lastBookImages = ''
  let lastJobProgress = -1
  let lastJobStatus = ''

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial data immediately
      const sendUpdate = async (forceUpdate = false) => {
        if (!isConnectionActive) return { continue: false, hasChanges: false }

        try {
          const job = await SupabaseDB.getBookGenerationJob(jobId)
          if (!job) {
            controller.enqueue(encoder.encode(formatSSE({
              type: 'error',
              timestamp: new Date().toISOString()
            })))
            return { continue: false, hasChanges: false }
          }

          const now = new Date()
          const createdAt = job.created_at ? new Date(job.created_at) : now
          const lastHeartbeatAt = job.last_heartbeat_at ? new Date(job.last_heartbeat_at) : createdAt
          const staleSeconds = Math.floor((now.getTime() - lastHeartbeatAt.getTime()) / 1000)
          const isStale = staleSeconds > STALE_THRESHOLD_SECONDS &&
                         ['pending', 'processing', 'retrying'].includes(job.status)
          const totalElapsedSeconds = Math.floor((now.getTime() - createdAt.getTime()) / 1000)

          // Get book data
          let bookData = null
          let currentBookImages = ''
          if (job.book_id) {
            const book = await SupabaseDB.getBook(job.book_id)
            if (book) {
              currentBookImages = JSON.stringify(book.images || [])
              bookData = {
                id: book.id,
                title: book.title,
                genre: book.genre,
                chapters: book.chapters,
                chapters_json: book.chapters_json,
                images: book.images,
                status: book.status,
                book_type: book.book_type,
                cover_image: book.cover_image,
                back_cover_image: book.back_cover_image
              }
            }
          }

          // Check if anything changed
          const hasChanges = forceUpdate ||
            job.updated_at !== lastJobUpdatedAt ||
            job.progress !== lastJobProgress ||
            job.status !== lastJobStatus ||
            currentBookImages !== lastBookImages

          if (hasChanges) {
            lastJobUpdatedAt = job.updated_at || ''
            lastJobProgress = job.progress
            lastJobStatus = job.status
            lastBookImages = currentBookImages

            // Parse metadata from JSON string if needed
            let parsedMetadata: Record<string, unknown> | undefined = undefined
            if (job.metadata) {
              try {
                parsedMetadata = typeof job.metadata === 'string'
                  ? JSON.parse(job.metadata)
                  : job.metadata as Record<string, unknown>
              } catch (e) {
                console.error('Failed to parse job metadata:', e)
              }
            }

            // Get totalChapters from metadata or config for ETA calculation
            const totalChaptersForETA =
              (parsedMetadata?.totalChapters as number | undefined) ||
              (job.config && typeof job.config === 'object'
                ? ((job.config as Record<string, unknown>).totalChapters as number | undefined) ||
                  ((job.config as Record<string, unknown>).chapters as number | undefined)
                : undefined)

            const eta = ['processing', 'retrying'].includes(job.status)
              ? calculateETA(job.progress, job.created_at || now.toISOString(), totalChaptersForETA)
              : { estimatedSecondsRemaining: null, displayText: '-', confidence: 'low' as const }

            const sseData: SSEData = {
              type: 'job_update',
              job: {
                id: job.id || jobId,
                status: job.status,
                progress: job.progress,
                currentStep: job.current_step || '',
                errorMessage: job.error_message || undefined,
                bookId: job.book_id || undefined,
                metadata: parsedMetadata,
                createdAt: job.created_at || '',
                updatedAt: job.updated_at || '',
                completedAt: job.completed_at || undefined,
                lastHeartbeatAt: job.last_heartbeat_at || undefined,
                retryCount: job.retry_count || 0,
                staleSeconds,
                isStale,
                elapsedSeconds: totalElapsedSeconds
              },
              book: bookData || undefined,
              eta,
              timestamp: now.toISOString()
            }

            controller.enqueue(encoder.encode(formatSSE(sseData)))

            // Check if job is complete (including preview_completed as terminal state)
            if (['completed', 'preview_completed', 'failed', 'cancelled'].includes(job.status)) {
              controller.enqueue(encoder.encode(formatSSE({
                type: 'complete',
                timestamp: now.toISOString()
              })))
              return { continue: false, hasChanges: true } // Stop polling
            }

            return { continue: true, hasChanges: true } // Data sent, continue polling
          }

          return { continue: true, hasChanges: false } // No changes, continue polling
        } catch (error) {
          console.error('SSE polling error:', error)
          return { continue: true, hasChanges: false } // Continue despite error
        }
      }

      // Send heartbeat to keep connection alive and detect disconnects
      const sendHeartbeat = (): boolean => {
        if (!isConnectionActive) return false
        try {
          controller.enqueue(encoder.encode(formatSSE({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          })))
          return true
        } catch {
          // Connection closed - client disconnected
          isConnectionActive = false
          return false
        }
      }

      // Send initial update
      await sendUpdate(true)

      // Start polling loop with adaptive backoff
      const pollLoop = async () => {
        let currentPollInterval = BASE_POLL_INTERVAL_MS
        let consecutiveNoChanges = 0

        while (isConnectionActive && !abortSignal.aborted) {
          // Check max connection time
          if (Date.now() - connectionStartTime > MAX_CONNECTION_TIME_MS) {
            try {
              controller.enqueue(encoder.encode(formatSSE({
                type: 'complete',
                timestamp: new Date().toISOString()
              })))
            } catch {
              // Ignore - connection may be closed
            }
            controller.close()
            return
          }

          await new Promise(resolve => setTimeout(resolve, currentPollInterval))

          // Check if client is still connected before polling DB
          if (!sendHeartbeat()) {
            controller.close()
            return
          }

          const result = await sendUpdate()

          if (!result.continue) {
            controller.close()
            return
          }

          // Adaptive backoff: increase interval when no changes, reset on changes
          if (result.hasChanges) {
            currentPollInterval = BASE_POLL_INTERVAL_MS
            consecutiveNoChanges = 0
          } else {
            consecutiveNoChanges++
            if (consecutiveNoChanges > 3) {
              currentPollInterval = Math.min(
                currentPollInterval * BACKOFF_MULTIPLIER,
                MAX_POLL_INTERVAL_MS
              )
            }
          }
        }
      }

      // Start heartbeat interval for keep-alive
      const heartbeatInterval = setInterval(() => {
        if (!sendHeartbeat()) {
          clearInterval(heartbeatInterval)
        }
      }, HEARTBEAT_INTERVAL_MS)

      // Run poll loop
      pollLoop().finally(() => {
        clearInterval(heartbeatInterval)
        isConnectionActive = false
      })
    },

    cancel() {
      isConnectionActive = false
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
      'retry': '5000', // Tell browser to retry after 5s on disconnect
    },
  })
}
