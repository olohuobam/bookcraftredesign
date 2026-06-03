import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * CSP Violation Report Endpoint
 *
 * Receives Content-Security-Policy violation reports so that the
 * Report-Only policy can actually surface violations.
 *
 * Supports both report formats:
 * - Legacy `report-uri`: Content-Type `application/csp-report`
 *   -> { "csp-report": { ... } }
 * - Reporting API `report-to`: Content-Type `application/reports+json`
 *   -> [ { "type": "csp-violation", "body": { ... } }, ... ]
 *
 * POST /api/csp-report
 * Returns: 204 No Content
 */

// Reject bodies larger than this before parsing — a single CSP report is tiny.
const MAX_BODY_BYTES = 16 * 1024
// URLs are truncated to this length when logged.
const MAX_URL_LEN = 256

export async function POST(request: NextRequest) {
  // Unauthenticated endpoint — rate limit per IP to prevent log/compute abuse.
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  const { allowed } = checkRateLimit(ip, 'csp-report', { limit: 30, windowSeconds: 60 })
  if (!allowed) {
    return new NextResponse(null, { status: 429 })
  }

  try {
    const raw = await request.text()
    if (raw.length > MAX_BODY_BYTES) {
      return new NextResponse(null, { status: 413 })
    }

    const contentType = request.headers.get('content-type') || ''
    const payload = JSON.parse(raw)

    if (contentType.includes('application/reports+json') && Array.isArray(payload)) {
      for (const report of payload) {
        if (report?.type === 'csp-violation') {
          logViolation(report.body)
        }
      }
    } else if (payload && payload['csp-report']) {
      logViolation(payload['csp-report'])
    } else {
      logViolation(payload)
    }
  } catch {
    // Malformed report body — ignore, never fail the reporting request.
  }

  return new NextResponse(null, { status: 204 })
}

/** Strip query string + fragment (may contain tokens/session ids) and truncate. */
function sanitizeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined
  let cleaned = value.split('#')[0].split('?')[0]
  if (cleaned.length > MAX_URL_LEN) cleaned = cleaned.slice(0, MAX_URL_LEN) + '…'
  return cleaned
}

function logViolation(body: unknown) {
  const v = (body || {}) as Record<string, unknown>
  const directive = v['effective-directive'] ?? v['effectiveDirective'] ?? v['violated-directive']

  console.warn('[CSP] Violation', {
    directive: typeof directive === 'string' ? directive.slice(0, 64) : undefined,
    blockedUri: sanitizeUrl(v['blocked-uri'] ?? v['blockedURL']),
    documentUri: sanitizeUrl(v['document-uri'] ?? v['documentURL']),
  })
}
