import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { SupabaseDB } from '@/lib/supabase-db'

const PAYPAL_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID

// ─── PayPal Webhook Signature Verification ───────────────────────────────────

async function getPayPalAccessToken(): Promise<string> {
  const credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    throw new Error(`Failed to get PayPal access token: ${response.status}`)
  }

  const data = await response.json()
  return data.access_token as string
}

/**
 * Verify PayPal webhook signature using the official PayPal Verify API.
 * https://developer.paypal.com/api/webhooks/v1/#verify-webhook-signature_post
 */
async function verifyPayPalWebhookSignature(
  headersList: Awaited<ReturnType<typeof headers>>,
  rawBody: string
): Promise<boolean> {
  // Skip verification in development when credentials are missing
  if (!PAYPAL_WEBHOOK_ID || !PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  PayPal webhook verification skipped — credentials not configured (dev mode)')
      return true
    }
    console.error('❌ PayPal webhook verification failed: PAYPAL_WEBHOOK_ID, PAYPAL_CLIENT_ID, or PAYPAL_CLIENT_SECRET not set')
    return false
  }

  const transmissionId = headersList.get('paypal-transmission-id')
  const transmissionTime = headersList.get('paypal-transmission-time')
  const certUrl = headersList.get('paypal-cert-url')
  const transmissionSig = headersList.get('paypal-transmission-sig')
  const authAlgo = headersList.get('paypal-auth-algo')

  if (!transmissionId || !transmissionTime || !certUrl || !transmissionSig || !authAlgo) {
    console.error('❌ PayPal webhook missing required signature headers')
    return false
  }

  try {
    const accessToken = await getPayPalAccessToken()

    const verifyResponse = await fetch(`${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: certUrl,
        auth_algo: authAlgo,
        transmission_sig: transmissionSig,
        webhook_id: PAYPAL_WEBHOOK_ID,
        webhook_event: JSON.parse(rawBody),
      }),
    })

    if (!verifyResponse.ok) {
      console.error(`❌ PayPal verify API returned ${verifyResponse.status}`)
      return false
    }

    const result = await verifyResponse.json()
    console.error(`🔐 PayPal signature verification status: ${result.verification_status}`)
    return result.verification_status === 'SUCCESS'
  } catch (error) {
    console.error('❌ PayPal webhook signature verification error:', error)
    return false
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.text()
  const headersList = await headers()

  // Verify PayPal webhook signature before processing anything
  const isValid = await verifyPayPalWebhookSignature(headersList, body)
  if (!isValid) {
    console.error('❌ PayPal webhook signature invalid — rejecting request')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Safely parse the JSON body
  let event: Record<string, unknown>
  try {
    event = JSON.parse(body)
  } catch (parseError) {
    console.error('❌ PayPal webhook: invalid JSON body', parseError)
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = event.event_type as string
  console.error(`🔔 PayPal webhook event: ${eventType}`)

  // Handle the event
  switch (eventType) {
    case 'CHECKOUT.ORDER.APPROVED':
      console.error(`✅ PayPal order approved: ${(event.resource as Record<string, unknown>)?.id}`)
      break

    case 'PAYMENT.CAPTURE.COMPLETED': {
      const capture = event.resource as Record<string, unknown>
      console.error(`💰 PayPal payment captured: ${capture.id}`)

      try {
        // Extract metadata from custom_id
        const customId = capture.custom_id as string | undefined
        const amountData = capture.amount as Record<string, string> | undefined
        const amount = amountData ? parseFloat(amountData.value) : 0

        if (customId) {
          let metadata: Record<string, unknown>
          try {
            metadata = JSON.parse(customId)
          } catch {
            // Legacy format - just user ID
            console.error(`🎉 Processing legacy PayPal payment for user ${customId}, amount: ${amount}`)
            return NextResponse.json({ received: true })
          }

          // 🔥 Handle different payment types
          if (metadata.type === 'digital_purchase' && metadata.bookId) {
            // Digital book purchase - mark single book as purchased
            try {
              await SupabaseDB.markBookAsPurchased(metadata.bookId as string, metadata.userId as string)
              console.error(`📚 Digital book ${metadata.bookId} "${metadata.bookTitle}" purchased successfully`)
              console.error(`💰 PayPal Amount: €${amount}`)
            } catch (error) {
              console.error(`❌ Failed to mark digital book ${metadata.bookId} as purchased:`, error)
            }
          } else if (metadata.type === 'print_order' && metadata.bookId) {
            // 🚀 Print order processing with database tracking
            try {
              const shippingData = capture.shipping as Record<string, unknown> | undefined
              const shippingAddress = shippingData?.address as Record<string, string> | undefined
              const printJob = await SupabaseDB.createPrintJob({
                user_id: metadata.userId as string,
                book_id: metadata.bookId as string,
                lulu_print_job_id: '', // Will be updated when submitted to Lulu
                external_id: capture.id as string, // Use PayPal Capture ID as external reference
                status: 'payment_received',
                total_cost_incl_tax: amount.toFixed(2),
                shipping_address: {
                  country: shippingAddress?.country_code || 'Unknown',
                },
                shipping_level: 'standard',
                line_items: [{
                  print_option: metadata.printOption as string | undefined,
                  quantity: parseInt(metadata.quantity as string),
                  book_title: metadata.bookTitle as string | undefined,
                }],
                print_job_data: {
                  payment_provider: 'paypal',
                  capture_id: capture.id,
                  print_option: metadata.printOption,
                  quantity: parseInt(metadata.quantity as string),
                },
              })

              console.error(`🖨️ PayPal print job created: ${printJob.id} for book ${metadata.bookId}`)
              console.error(`💰 PayPal Payment: €${amount}`)
            } catch (error) {
              console.error(`❌ Failed to create PayPal print job for book ${metadata.bookId}:`, error)
            }
          } else {
            console.error(`🎉 Processing PayPal payment, amount: ${amount}`)
          }
        }
      } catch (error) {
        console.error('❌ Error processing PayPal capture:', error)
      }
      break
    }

    case 'PAYMENT.CAPTURE.DENIED':
      console.error(`❌ PayPal payment denied: ${(event.resource as Record<string, unknown>)?.id}`)
      break

    default:
      console.error(`🤷 Unhandled PayPal event type: ${eventType}`)
  }

  return NextResponse.json({ received: true })
}
