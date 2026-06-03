import { NextRequest, NextResponse } from 'next/server'
import { LuluAPI, LuluWebhookEvent } from '@/lib/lulu-api'
import { SupabaseDB } from '@/lib/supabase-db'

/**
 * POST /api/webhooks/lulu
 * Handles incoming webhook events from the Lulu Print API.
 *
 * Supported events:
 * - PRINT_JOB_STATUS_CHANGED
 *
 * Lulu sends an HMAC-SHA256 signature in the `lulu-hmac-sha256` header.
 * The signature is verified against LULU_WEBHOOK_SECRET before processing.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Read raw body for HMAC verification
    const body = await request.text()
    const signature = request.headers.get('lulu-hmac-sha256')

    if (!signature) {
      console.warn('Lulu webhook: missing signature header')
      return NextResponse.json(
        { error: 'Missing Lulu-HMAC-SHA256 header' },
        { status: 400 }
      )
    }

    // 2. Verify HMAC signature using LULU_WEBHOOK_SECRET
    const isValid = LuluAPI.validateWebhookSignature(body, signature)
    if (!isValid) {
      console.error('Lulu webhook: invalid signature')
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
    }

    // 3. Parse payload
    let event: LuluWebhookEvent
    try {
      event = JSON.parse(body)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    console.error('Lulu webhook received:', {
      topic: event.topic,
      print_job_id: event.data?.id,
      status: event.data?.status,
    })

    // 4. Route to handler
    switch (event.topic) {
      case 'PRINT_JOB_STATUS_CHANGED':
        await handlePrintJobStatusChanged(event)
        break
      default:
        console.error(`Lulu webhook: unhandled topic "${event.topic}"`)
    }

    return NextResponse.json({
      received: true,
      topic: event.topic,
      print_job_id: event.data?.id,
    })
  } catch (error) {
    console.error('Lulu webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

/**
 * GET /api/webhooks/lulu
 * Health-check — confirms the endpoint is reachable.
 */
export async function GET() {
  return NextResponse.json({
    message: 'Lulu webhook endpoint is active',
    timestamp: new Date().toISOString(),
    configured: LuluAPI.isConfigured(),
  })
}

// ---------------------------------------------------------------------------
// Internal handlers
// ---------------------------------------------------------------------------

async function handlePrintJobStatusChanged(event: LuluWebhookEvent) {
  const printJob = event.data
  const { id: luluPrintJobId, status } = printJob

  console.error(`Lulu print job ${luluPrintJobId} → ${status}`)

  // For SHIPPED events, extract tracking info from the richer webhook payload
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extraUpdates: Record<string, unknown> = {}
  if (status === 'SHIPPED') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const job = printJob as unknown as Record<string, any>
    const lineItem = job.line_items?.[0]
    if (lineItem) {
      const tracking = lineItem.tracking_urls?.[0]
      if (tracking) {
        extraUpdates.tracking_number = tracking.tracking_id ?? tracking.tracking_number
        extraUpdates.tracking_url = tracking.tracking_url
        extraUpdates.carrier = tracking.carrier
      }
      if (lineItem.estimated_delivery) {
        extraUpdates.estimated_delivery_date = lineItem.estimated_delivery
      }
    }
  }

  // Persist status + any extra fields to Supabase
  try {
    await SupabaseDB.addWebhookUpdate(luluPrintJobId, {
      status,
      event_data: printJob,
      webhook_topic: 'PRINT_JOB_STATUS_CHANGED',
      processed_at: new Date().toISOString(),
      ...extraUpdates,
    })
    console.error(`Print job ${luluPrintJobId} updated in database → ${status}`)
  } catch (dbError) {
    console.error(`Failed to update print job ${luluPrintJobId} in database:`, dbError)
    throw dbError
  }
}
