'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { notifyBookReady } from '@/lib/push-notification-service'

// Types
export interface JobRealtimeData {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'preview_completed' | 'failed' | 'cancelled'
  progress: number
  currentStep: string | null
  errorMessage: string | null
  metadata: Record<string, unknown> | null
  createdAt: string | null
  startedAt: string | null
  completedAt: string | null
  lastHeartbeatAt: string | null
  retryCount: number
  staleSeconds: number
  isStale: boolean
  elapsedSeconds: number
}

export interface BookRealtimeData {
  id: string
  title: string
  images?: string[]
  chapters?: Array<{
    title: string
    content: string
  }>
  [key: string]: unknown
}

export interface ETAData {
  estimatedSecondsRemaining: number | null
  displayText: string
}

interface UseJobRealtimeOptions {
  enabled?: boolean
  onComplete?: () => void
  onError?: (error: string) => void
  fallbackToSSE?: boolean
}

interface UseJobRealtimeReturn {
  job: JobRealtimeData | null
  book: BookRealtimeData | null
  eta: ETAData | null
  isConnected: boolean
  connectionType: 'realtime' | 'sse' | 'polling' | 'disconnected'
  error: string | null
  isStuck: boolean
  reconnect: () => void
}

// Terminal states - stop listening when reached
const TERMINAL_STATES = ['completed', 'preview_completed', 'failed', 'cancelled']

// Max SSE reconnect attempts before falling back to polling permanently
const MAX_SSE_RECONNECTS = 20
const SSE_FALLBACK_THRESHOLD = 3 // after this many SSE failures, use polling

// Polling backoff sequence (ms)
const POLLING_BACKOFF_STEPS = [3000, 5000, 8000, 12000, 15000]

// Stuck detection: if progress doesn't change for this long (ms), flag as stuck
const STUCK_THRESHOLD_MS = 3 * 60 * 1000

// Calculate ETA based on progress and chapter count
function calculateETA(job: JobRealtimeData): ETAData {
  const totalChapters = (job.metadata?.totalChapters as number) || null

  // Pre-defined estimates for early stage (< 25% progress)
  if (job.progress < 25) {
    if (totalChapters) {
      let estimatedMinutes: number
      if (totalChapters <= 3) estimatedMinutes = 3
      else if (totalChapters <= 5) estimatedMinutes = 6
      else if (totalChapters <= 8) estimatedMinutes = 10
      else estimatedMinutes = 15

      return {
        estimatedSecondsRemaining: estimatedMinutes * 60,
        displayText: `~${estimatedMinutes} min remaining`
      }
    }
    return { estimatedSecondsRemaining: null, displayText: 'Calculating...' }
  }

  if (!job.startedAt || job.progress <= 0 || job.progress >= 100) {
    return { estimatedSecondsRemaining: null, displayText: 'Calculating...' }
  }

  const elapsed = job.elapsedSeconds || 0
  const progressPerSecond = job.progress / elapsed

  if (progressPerSecond <= 0) {
    return { estimatedSecondsRemaining: null, displayText: 'Calculating...' }
  }

  const remainingProgress = 100 - job.progress
  const estimatedSeconds = Math.ceil(remainingProgress / progressPerSecond)

  let displayText: string
  if (estimatedSeconds < 60) {
    displayText = `${estimatedSeconds}s remaining`
  } else if (estimatedSeconds < 3600) {
    const mins = Math.ceil(estimatedSeconds / 60)
    displayText = `~${mins} min remaining`
  } else {
    const hours = Math.floor(estimatedSeconds / 3600)
    const mins = Math.ceil((estimatedSeconds % 3600) / 60)
    displayText = `${hours}h ${mins}m remaining`
  }

  return { estimatedSecondsRemaining: estimatedSeconds, displayText }
}

export function useJobRealtime(
  jobId: string,
  options: UseJobRealtimeOptions = {}
): UseJobRealtimeReturn {
  const {
    enabled = true,
    onComplete,
    onError: _onError,
    fallbackToSSE: _fallbackToSSE = true
  } = options

  const { getIdToken } = useAuth()

  const [job, setJob] = useState<JobRealtimeData | null>(null)
  const [book, setBook] = useState<BookRealtimeData | null>(null)
  const [eta, setEta] = useState<ETAData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionType, setConnectionType] = useState<'realtime' | 'sse' | 'polling' | 'disconnected'>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const [isStuck, setIsStuck] = useState(false)

  const hasCalledCompleteRef = useRef(false)
  const isTerminalStateRef = useRef(false)
  const sseAbortRef = useRef<AbortController | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // SSE reconnect tracking
  const sseReconnectCountRef = useRef(0)
  const sseFailureCountRef = useRef(0)

  // Stuck detection tracking
  const lastProgressRef = useRef<number>(-1)
  const lastProgressTimeRef = useRef<number>(Date.now())
  const stuckCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Keep a ref so the handleJobUpdate callback can read the current book title
  const bookRef = useRef<BookRealtimeData | null>(null)

  // Keep bookRef in sync with book state so callbacks can read it without stale closures
  useEffect(() => {
    bookRef.current = book
  }, [book])

  // Cleanup function
  const cleanup = useCallback(() => {
    if (sseAbortRef.current) {
      sseAbortRef.current.abort()
      sseAbortRef.current = null
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (stuckCheckIntervalRef.current) {
      clearInterval(stuckCheckIntervalRef.current)
      stuckCheckIntervalRef.current = null
    }
    setIsConnected(false)
  }, [])

  // Forward declaration refs for circular dependency
  const startSSEFallbackRef = useRef<(() => void) | null>(null)
  const startPollingFallbackRef = useRef<(() => void) | null>(null)

  // Handle job update
  const handleJobUpdate = useCallback((jobData: JobRealtimeData) => {
    setJob(jobData)
    setEta(calculateETA(jobData))

    // Track progress for stuck detection
    if (jobData.progress !== lastProgressRef.current) {
      lastProgressRef.current = jobData.progress
      lastProgressTimeRef.current = Date.now()
      setIsStuck(false)
    }

    // Check for terminal states
    if (TERMINAL_STATES.includes(jobData.status)) {
      isTerminalStateRef.current = true
      cleanup()
      setConnectionType('disconnected')
      setIsStuck(false)

      if ((jobData.status === 'completed' || jobData.status === 'preview_completed') && !hasCalledCompleteRef.current) {
        hasCalledCompleteRef.current = true

        // Trigger native push notification so users know the book is ready
        const currentBook = bookRef.current
        if (currentBook?.id) {
          notifyBookReady(currentBook.title || 'Dein Buch', currentBook.id).catch(() => {
            // Non-critical — notification failure must never break the completion flow
          })
        }

        onComplete?.()
      }
    }
  }, [cleanup, onComplete])

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    if (!jobId) return null

    try {
      const token = await getIdToken()
      const response = await fetch(`/api/jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) throw new Error('Failed to fetch job')

      const data = await response.json()
      return data
    } catch (err) {
      console.error('Error fetching initial data:', err)
      return null
    }
  }, [jobId, getIdToken])

  // Polling Fallback (last resort) — with exponential backoff
  const startPollingFallback = useCallback(async () => {
    if (!enabled || !jobId || isTerminalStateRef.current) return

    setConnectionType('polling')
    setIsConnected(true)
    setError(null)

    let backoffIndex = 0
    let updatesSinceLastBackoff = 0

    const getInterval = () => POLLING_BACKOFF_STEPS[Math.min(backoffIndex, POLLING_BACKOFF_STEPS.length - 1)]

    const poll = async () => {
      if (isTerminalStateRef.current) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        return
      }

      const data = await fetchInitialData()
      if (data) {
        const prevProgress = lastProgressRef.current
        if (data.job) handleJobUpdate(data.job)
        if (data.book) setBook(data.book)

        // Reset backoff if we got new data
        if (data.job?.progress !== prevProgress) {
          backoffIndex = 0
          updatesSinceLastBackoff = 0
          // Restart interval with reset backoff
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = setInterval(poll, getInterval())
          }
        } else {
          updatesSinceLastBackoff++
          if (updatesSinceLastBackoff >= 3) {
            backoffIndex = Math.min(backoffIndex + 1, POLLING_BACKOFF_STEPS.length - 1)
            updatesSinceLastBackoff = 0
            // Restart interval with new backoff
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current)
              pollingIntervalRef.current = setInterval(poll, getInterval())
            }
          }
        }
      }
    }

    await poll()
    pollingIntervalRef.current = setInterval(poll, getInterval())
  }, [enabled, jobId, fetchInitialData, handleJobUpdate])

  // Store ref for use in SSE callback
  useEffect(() => {
    startPollingFallbackRef.current = startPollingFallback
  }, [startPollingFallback])

  // SSE Connection with auto-reconnect
  const startSSEFallback = useCallback(async () => {
    if (!enabled || !jobId || isTerminalStateRef.current) return

    // Too many reconnects → permanent polling fallback
    if (sseReconnectCountRef.current >= MAX_SSE_RECONNECTS) {
      console.warn('[SSE] Max reconnects reached, switching to polling')
      startPollingFallbackRef.current?.()
      return
    }

    // Too many consecutive failures → polling fallback
    if (sseFailureCountRef.current >= SSE_FALLBACK_THRESHOLD) {
      console.warn('[SSE] Too many failures, switching to polling')
      startPollingFallbackRef.current?.()
      return
    }

    try {
      const token = await getIdToken()
      if (!token) throw new Error('No authentication token')

      sseAbortRef.current = new AbortController()

      const response = await fetch(`/api/jobs/${jobId}/stream`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream'
        },
        signal: sseAbortRef.current.signal
      })

      if (!response.ok) throw new Error('SSE connection failed')

      // Reset failure count on successful connection
      sseFailureCountRef.current = 0
      setIsConnected(true)
      setConnectionType('sse')
      setError(null)

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      const processStream = async () => {
        let receivedCompleteEvent = false

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6))

                  if (data.type === 'complete') {
                    receivedCompleteEvent = true
                  }

                  if (data.job) {
                    handleJobUpdate(data.job)
                  }
                  if (data.book) {
                    setBook(data.book)
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }
        } catch (err) {
          if (err instanceof Error && err.name !== 'AbortError') {
            console.error('[SSE] Stream error:', err)
          }
        } finally {
          // Stream ended — check if we should reconnect
          const isManualAbort = !sseAbortRef.current || sseAbortRef.current.signal.aborted
          const isTerminal = isTerminalStateRef.current

          if (!isManualAbort && !isTerminal) {
            // Server disconnected but job is still running — reconnect
            // The `complete` event from server means 2-min timeout, NOT job done
            console.log('[SSE] Connection dropped, job still running — reconnecting in 2s')
            setIsConnected(false)
            sseReconnectCountRef.current++

            if (sseReconnectCountRef.current < MAX_SSE_RECONNECTS) {
              reconnectTimeoutRef.current = setTimeout(() => {
                if (!isTerminalStateRef.current) {
                  startSSEFallbackRef.current?.()
                }
              }, 2000)
            } else {
              startPollingFallbackRef.current?.()
            }
          } else if (receivedCompleteEvent && !isTerminal) {
            // Got complete event but not terminal — this is the 2-min server timeout
            console.log('[SSE] Server sent complete (timeout), job still running — reconnecting')
            setIsConnected(false)
            sseReconnectCountRef.current++

            reconnectTimeoutRef.current = setTimeout(() => {
              if (!isTerminalStateRef.current) {
                startSSEFallbackRef.current?.()
              }
            }, 2000)
          }
        }
      }

      processStream()
    } catch (err) {
      console.error('[SSE] Connection failed:', err)
      sseFailureCountRef.current++
      setIsConnected(false)

      if (sseFailureCountRef.current >= SSE_FALLBACK_THRESHOLD || sseReconnectCountRef.current >= MAX_SSE_RECONNECTS) {
        startPollingFallbackRef.current?.()
      } else {
        // Retry after 2s
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isTerminalStateRef.current) {
            startSSEFallbackRef.current?.()
          }
        }, 2000)
      }
    }
  }, [enabled, jobId, getIdToken, handleJobUpdate])

  // Store ref for circular dependency
  useEffect(() => {
    startSSEFallbackRef.current = startSSEFallback
  }, [startSSEFallback])

  // Stuck detector — runs while job is active
  const startStuckDetector = useCallback(() => {
    if (stuckCheckIntervalRef.current) {
      clearInterval(stuckCheckIntervalRef.current)
    }

    stuckCheckIntervalRef.current = setInterval(() => {
      if (isTerminalStateRef.current) {
        clearInterval(stuckCheckIntervalRef.current!)
        stuckCheckIntervalRef.current = null
        return
      }

      const timeSinceUpdate = Date.now() - lastProgressTimeRef.current
      if (timeSinceUpdate > STUCK_THRESHOLD_MS && lastProgressRef.current >= 0) {
        setIsStuck(true)
      }
    }, 30000) // Check every 30 seconds
  }, [])

  // Connect using SSE as primary method
  const connect = useCallback(async () => {
    if (!enabled || !jobId || isTerminalStateRef.current) return

    cleanup()
    setError(null)

    // Fetch initial data first
    const initialData = await fetchInitialData()
    if (initialData) {
      if (initialData.job) {
        handleJobUpdate(initialData.job)
        // If already terminal, don't subscribe
        if (TERMINAL_STATES.includes(initialData.job.status)) {
          return
        }
      }
      if (initialData.book) {
        setBook(initialData.book)
      }
    }

    // Start stuck detector
    startStuckDetector()

    // Use SSE as primary connection method
    console.log('[SSE] Setting up connection for job:', jobId)
    startSSEFallback()
  }, [enabled, jobId, cleanup, fetchInitialData, handleJobUpdate, startSSEFallback, startStuckDetector])

  // Manual reconnect — allows forcing reconnect from UI
  const reconnect = useCallback(() => {
    cleanup()
    hasCalledCompleteRef.current = false
    isTerminalStateRef.current = false
    sseReconnectCountRef.current = 0
    sseFailureCountRef.current = 0
    lastProgressRef.current = -1
    lastProgressTimeRef.current = Date.now()
    setIsStuck(false)
    connect()
  }, [cleanup, connect])

  // Initial connection
  useEffect(() => {
    if (enabled && jobId) {
      connect()
    }

    return () => {
      cleanup()
    }
  }, [enabled, jobId]) // Intentionally not including connect/cleanup to avoid re-runs

  // Reconnect when user returns to the tab (visibility change)
  useEffect(() => {
    if (!enabled || !jobId) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isTerminalStateRef.current) {
        console.log('[Realtime] Tab became visible, reconnecting...')
        reconnect()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [enabled, jobId, reconnect])

  return {
    job,
    book,
    eta,
    isConnected,
    connectionType,
    error,
    isStuck,
    reconnect
  }
}
