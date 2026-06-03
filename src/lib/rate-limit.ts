/**
 * In-Memory Rate Limiter (Sliding Window)
 *
 * Note: This is a server-side in-memory limiter. On Vercel Serverless,
 * each function instance has its own memory, so this provides basic protection
 * against bursts but not distributed rate limiting across instances.
 * For strict distributed limits, use Upstash/Redis.
 */

interface RateLimitEntry {
  timestamps: number[]
}

const store = new Map<string, RateLimitEntry>()

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  limit: number
  /** Window size in seconds */
  windowSeconds: number
}

interface RateLimitResult {
  allowed: boolean
  /** Seconds until the oldest request expires and a slot frees up */
  retryAfter?: number
}

/**
 * Check if a request should be allowed under the rate limit.
 * Uses a sliding window algorithm keyed by `${endpoint}:${userId}`.
 */
export function checkRateLimit(
  userId: string,
  endpoint: string,
  options: RateLimitOptions
): RateLimitResult {
  const { limit, windowSeconds } = options
  const key = `${endpoint}:${userId}`
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const cutoff = now - windowMs

  // Get or create entry
  let entry = store.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Evict expired timestamps (outside the window)
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff)

  if (entry.timestamps.length >= limit) {
    // Rate limit exceeded — compute when the oldest slot expires
    const oldest = entry.timestamps[0]
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000)
    return { allowed: false, retryAfter: Math.max(1, retryAfter) }
  }

  // Allow — record this request
  entry.timestamps.push(now)
  return { allowed: true }
}

// Periodically clean up stale keys (every 10 minutes) to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      // If no timestamps in the last hour, remove the entry
      const hasRecent = entry.timestamps.some((t) => now - t < 3600_000)
      if (!hasRecent) store.delete(key)
    }
  }, 10 * 60 * 1000)
}
