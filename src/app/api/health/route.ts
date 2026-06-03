import { NextResponse } from 'next/server'

/**
 * Health Check Endpoint
 *
 * Simple endpoint to verify server connectivity.
 * Used by mobile apps to check if the server is reachable.
 *
 * GET /api/health
 * Returns: { status: 'ok', timestamp: ISO8601 }
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: 'Bookcraft API',
  })
}
