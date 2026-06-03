'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'

export interface JobStreamData {
 id: string
 status: 'pending' | 'processing' | 'completed' | 'preview_completed' | 'failed' | 'cancelled' | 'retrying'
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

export interface BookStreamData {
 id: string
 title: string
 genre?: string
 chapters?: unknown[]
 images?: string[]
 status: string
 book_type?: string
}

export interface ETAData {
 estimatedSecondsRemaining: number | null
 displayText: string
 confidence: 'low' | 'medium' | 'high'
}

interface SSEMessage {
 type: 'job_update' | 'book_update' | 'heartbeat' | 'complete' | 'error'
 job?: JobStreamData
 book?: BookStreamData
 eta?: ETAData
 timestamp: string
}

interface UseJobStreamOptions {
 onComplete?: () => void
 onError?: (error: string) => void
 enabled?: boolean
 fallbackToPolling?: boolean
}

interface UseJobStreamReturn {
 job: JobStreamData | null
 book: BookStreamData | null
 eta: ETAData | null
 isConnected: boolean
 isConnecting: boolean
 error: string | null
 connectionType: 'sse' | 'polling' | 'disconnected'
 reconnect: () => void
}

const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_BASE_DELAY_MS = 1000
const POLLING_INTERVAL_MS = 3000

export function useJobStream(
 jobId: string,
 options: UseJobStreamOptions = {}
): UseJobStreamReturn {
 const { getIdToken } = useAuth()
 const {
 onComplete,
 onError,
 enabled = true,
 fallbackToPolling = true
 } = options

 const [job, setJob] = useState<JobStreamData | null>(null)
 const [book, setBook] = useState<BookStreamData | null>(null)
 const [eta, setEta] = useState<ETAData | null>(null)
 const [isConnected, setIsConnected] = useState(false)
 const [isConnecting, setIsConnecting] = useState(false)
 const [error, setError] = useState<string | null>(null)
 const [connectionType, setConnectionType] = useState<'sse' | 'polling' | 'disconnected'>('disconnected')

 const eventSourceRef = useRef<EventSource | null>(null)
 const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
 const reconnectAttemptsRef = useRef(0)
 const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
 const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
 const isTerminalStateRef = useRef(false)
 const hasCalledCompleteRef = useRef(false)

  // Cleanup function
 const cleanup = useCallback(() => {
 if (eventSourceRef.current) {
 eventSourceRef.current.close()
 eventSourceRef.current = null
 }
 if (readerRef.current) {
 readerRef.current.cancel().catch(() => {})
 readerRef.current = null
 }
 if (reconnectTimeoutRef.current) {
 clearTimeout(reconnectTimeoutRef.current)
 reconnectTimeoutRef.current = null
 }
 if (pollingIntervalRef.current) {
 clearInterval(pollingIntervalRef.current)
 pollingIntervalRef.current = null
 }
 setIsConnected(false)
 setIsConnecting(false)
 }, [])

  // Polling fallback
 const startPolling = useCallback(async () => {
 if (pollingIntervalRef.current || isTerminalStateRef.current) return

 setConnectionType('polling')
 setIsConnected(true)

 const poll = async () => {
 if (isTerminalStateRef.current) {
 if (pollingIntervalRef.current) {
 clearInterval(pollingIntervalRef.current)
 pollingIntervalRef.current = null
 }
 return
 }

 try {
 const token = await getIdToken()
 if (!token) return

 const response = await fetch(`/api/jobs/${jobId}`, {
 headers: { 'Authorization': `Bearer ${token}` }
 })

 if (!response.ok) {
 throw new Error(`HTTP ${response.status}`)
 }

 const data = await response.json()

 if (data.job) {
 const jobData: JobStreamData = {
 id: data.job.id,
 status: data.job.status,
 progress: data.job.progress,
 currentStep: data.job.currentStep,
 errorMessage: data.job.errorMessage,
 bookId: data.job.bookId,
 metadata: data.job.metadata,
 createdAt: data.job.createdAt,
 updatedAt: data.job.updatedAt,
 completedAt: data.job.completedAt,
 lastHeartbeatAt: data.job.lastHeartbeatAt,
 retryCount: data.job.retryCount || 0,
 staleSeconds: data.job.staleSeconds || 0,
 isStale: data.job.isStale || false,
 elapsedSeconds: data.job.elapsedSeconds || 0
 }
 setJob(jobData)

 if (['completed', 'preview_completed', 'failed', 'cancelled'].includes(data.job.status)) {
 isTerminalStateRef.current = true
 if (pollingIntervalRef.current) {
 clearInterval(pollingIntervalRef.current)
 pollingIntervalRef.current = null
 }
 if ((data.job.status === 'completed' || data.job.status === 'preview_completed') && !hasCalledCompleteRef.current) {
 hasCalledCompleteRef.current = true
 onComplete?.()
 }
 }
 }

 if (data.book) {
 setBook(data.book)
 }

 if (data.eta) {
 setEta(data.eta)
 }
 } catch (err) {
        console.error('Polling error:', err)
 }
 }

    // Initial poll
 await poll()

    // Start interval
 pollingIntervalRef.current = setInterval(poll, POLLING_INTERVAL_MS)
 }, [jobId, getIdToken, onComplete])

  // Connect to SSE
 const connect = useCallback(async () => {
 if (!enabled || !jobId || isTerminalStateRef.current) return

 cleanup()
 setIsConnecting(true)
 setError(null)

 try {
 const token = await getIdToken()
 if (!token) {
 throw new Error('No authentication token')
 }

      // Use fetch with streaming for SSE (allows Authorization header)
 const url = `/api/jobs/${jobId}/stream`
 const response = await fetch(url, {
 headers: {
 'Authorization': `Bearer ${token}`,
 'Accept': 'text/event-stream'
 }
 })

 if (!response.ok) {
 throw new Error(`HTTP ${response.status}`)
 }

 if (!response.body) {
 throw new Error('No response body')
 }

 setIsConnected(true)
 setIsConnecting(false)
 setConnectionType('sse')
 reconnectAttemptsRef.current = 0

 const reader = response.body.getReader()
 readerRef.current = reader // Store ref for cleanup
 const decoder = new TextDecoder()
 let buffer = ''

 const processStream = async () => {
 try {
 while (readerRef.current) {
 const { done, value } = await reader.read()

 if (done) {
              // Stream ended - might need to reconnect
 if (!isTerminalStateRef.current) {
 scheduleReconnect()
 }
 break
 }

 buffer += decoder.decode(value, { stream: true })

            // Process complete SSE messages
 const lines = buffer.split('\n')
 buffer = lines.pop() || '' // Keep incomplete line in buffer

 for (const line of lines) {
 if (line.startsWith('data: ')) {
 try {
 const data: SSEMessage = JSON.parse(line.slice(6))
 handleSSEMessage(data)
 } catch (e) {
                  console.error('Failed to parse SSE data:', e)
 }
 }
 }
 }
 } catch (err) {
          console.error('Stream error:', err)
 if (!isTerminalStateRef.current) {
 scheduleReconnect()
 }
 }
 }

      // Start processing stream - catch errors to prevent unhandled rejections
 processStream().catch((err) => {
        console.error('Unhandled stream error:', err)
 if (!isTerminalStateRef.current) {
 scheduleReconnect()
 }
 })

 } catch (err) {
      console.error('SSE connection error:', err)
 setIsConnecting(false)
 setError(err instanceof Error ? err.message : 'Connection failed')

 if (fallbackToPolling) {
        console.log('Falling back to polling...')
 setError(null) // Clear error when successfully falling back to polling
 startPolling()
 } else {
 scheduleReconnect()
 }
 }
 }, [enabled, jobId, getIdToken, cleanup, fallbackToPolling, startPolling])

  // Handle SSE messages
 const handleSSEMessage = useCallback((message: SSEMessage) => {
 switch (message.type) {
 case 'job_update':
 if (message.job) {
 setJob(message.job)

          // Check for terminal states
 if (['completed', 'preview_completed', 'failed', 'cancelled'].includes(message.job.status)) {
 isTerminalStateRef.current = true
 setConnectionType('disconnected')
 if ((message.job.status === 'completed' || message.job.status === 'preview_completed') && !hasCalledCompleteRef.current) {
 hasCalledCompleteRef.current = true
 onComplete?.()
 }
 }
 }
 if (message.book) {
 setBook(message.book)
 }
 if (message.eta) {
 setEta(message.eta)
 }
 break

 case 'complete':
 isTerminalStateRef.current = true
 setConnectionType('disconnected')
 cleanup()
 break

 case 'error':
 setError('Server error')
 onError?.('Server error')
 break

 case 'heartbeat':
        // Just confirms connection is alive
 break
 }
 }, [onComplete, onError, cleanup])

  // Schedule reconnect with exponential backoff
 const scheduleReconnect = useCallback(() => {
 if (isTerminalStateRef.current) return
 if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
 if (fallbackToPolling) {
 setError(null) // Clear error when falling back to polling
 startPolling()
 } else {
 setError('Max reconnection attempts reached')
 }
 return
 }

 const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttemptsRef.current)
 reconnectAttemptsRef.current++

 setIsConnected(false)
 setConnectionType('disconnected')

 reconnectTimeoutRef.current = setTimeout(() => {
 connect()
 }, delay)
 }, [connect, fallbackToPolling, startPolling])

  // Manual reconnect with guard to prevent concurrent connections
 const reconnect = useCallback(() => {
    // Prevent reconnect if already connected or connecting
 if (isConnected || isConnecting) {
 return
 }
 cleanup()
 reconnectAttemptsRef.current = 0
 isTerminalStateRef.current = false
 hasCalledCompleteRef.current = false
 connect()
 }, [connect, cleanup, isConnected, isConnecting])

  // Initial connection
 useEffect(() => {
 if (enabled && jobId) {
 connect()
 }

 return cleanup
 }, [enabled, jobId, connect, cleanup])

 return {
 job,
 book,
 eta,
 isConnected,
 isConnecting,
 error,
 connectionType,
 reconnect
 }
}
