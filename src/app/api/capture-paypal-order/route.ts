import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken, supabaseAdmin } from '@/lib/supabase-admin'
import { SupabaseDB, Book } from '@/lib/supabase-db'
import { generateLiveBook } from '@/lib/generation'

const PAYPAL_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET

async function getPayPalAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')
  
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  const data = await response.json()
  return data.access_token
}

/**
 * Triggers continuation of book generation for preview books after purchase.
 * Returns the new job ID on success, or false if skipped/failed.
 *
 * Bug 1 fix: Language is read from the original job config and always included in
 *            the reconstructed config so live.ts never falls back to English.
 * Bug 2 fix: Deduplication check via getBookActiveJob before creating a new job.
 */
async function triggerContinueGeneration(book: Book, userId: string): Promise<string | false> {
  try {
    if (book.status !== 'preview') {
      console.error(`Book ${book.id} is not in preview status, skipping continuation`)
      return false
    }

    // Bug 2: Deduplication — abort if there is already a pending/processing job for this book
    const activeJob = await SupabaseDB.getBookActiveJob(book.id!)
    if (activeJob) {
      console.error(`⚠️ Book ${book.id} already has active job ${activeJob.id}, skipping duplicate`)
      return false
    }

    let outline: unknown = null
    let config: Record<string, unknown> | null = null
    let savedLanguage: string | undefined

    if (book.active_job_id) {
      const originalJob = await SupabaseDB.getBookGenerationJob(book.active_job_id)
      if (originalJob?.metadata) {
        try {
          const metadata = typeof originalJob.metadata === 'string'
            ? JSON.parse(originalJob.metadata)
            : originalJob.metadata
          outline = metadata.outline
          config = originalJob.config as Record<string, unknown>
          // Bug 1: Preserve language from the original job config
          savedLanguage = (config as Record<string, unknown>)?.language as string | undefined
        } catch (e) {
          console.error('Error parsing job metadata:', e)
        }
      }
    }

    if (!outline) {
      console.error(`No outline found for book ${book.id}, cannot continue generation`)
      return false
    }

    if (!config) {
      // Bug 1: Include language in fallback config; default to German (app is primarily German)
      config = {
        title: book.title,
        genre: book.genre,
        description: book.description || '',
        totalChapters: book.chapters || 5,
        writingStyle: book.style || 'descriptive',
        targetAudience: book.target_audience || 'general',
        tone: 'engaging',
        themes: [],
        mainCharacters: '',
        setting: '',
        plotOutline: '',
        pov: 'third',
        tenseStyle: 'past',
        language: savedLanguage || 'de'
      }
    } else {
      // Bug 1: Ensure language is always present in existing config
      if (!config.language) {
        config = { ...config, language: savedLanguage || 'de' }
      }
    }

    const job = await SupabaseDB.createBookGenerationJob({
      user_id: userId,
      book_id: book.id!,
      status: 'pending',
      progress: 0,
      current_step: 'Generating remaining chapters after purchase...',
      config: config,
      metadata: JSON.stringify({ outline, isContinuation: true, triggeredByPurchase: true, paymentProvider: 'paypal' })
    })

    await SupabaseDB.updateBook(book.id!, {
      active_job_id: job.id,
      status: 'generating'
    })

    console.error('🚀 Auto-continuing book generation after PayPal purchase (native):', {
      jobId: job.id,
      bookId: book.id,
      title: config.title,
      language: config.language
    })

    // Fire-and-forget native generation (continue from chapter 2)
    generateLiveBook(job.id!, book.id!, userId, { ...config, previewMode: false, startFromChapter: 2 } as any, outline as any)
      .catch(err => console.error('❌ Continue-generation error:', err))

    return job.id!
  } catch (error) {
    console.error('Error in triggerContinueGeneration:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = await verifySupabaseToken(token)
    
    if (!user || !user.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { orderId, bookId: bodyBookId } = body

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken()

    // Capture PayPal payment
    const captureResponse = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    const captureData = await captureResponse.json()

    if (!captureResponse.ok) {
      console.error('PayPal capture failed:', captureData)
      return NextResponse.json({ error: 'Payment capture failed' }, { status: 500 })
    }

    // Check if payment was successful
    if (captureData.status !== 'COMPLETED') {
      console.error('PayPal payment not completed:', captureData.status)
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }

    console.error('✅ PayPal payment captured successfully:', orderId)

    // Extract payment details
    const purchaseUnit = captureData.purchase_units[0]
    const capture = purchaseUnit.payments.captures[0]
    const amount = parseFloat(capture.amount.value)
    const currency = capture.amount.currency_code
    const captureId = capture.id

    console.error(`💰 PayPal payment: ${amount} ${currency}`)

    // --- Resolve bookId from multiple sources ---
    // 1. Passed directly from the frontend in the request body
    // 2. Embedded in the PayPal order's custom_id field (set during order creation)
    let resolvedBookId: string | null = bodyBookId || null
    let customIdData: Record<string, string> | null = null

    if (!resolvedBookId && purchaseUnit.custom_id) {
      try {
        // custom_id may be a JSON string with { type, userId, bookId, ... }
        customIdData = JSON.parse(purchaseUnit.custom_id)
        if (customIdData?.bookId) {
          resolvedBookId = customIdData.bookId
        }
      } catch {
        // custom_id might be a plain userId string (from the general create-paypal-order endpoint)
        console.error('custom_id is not JSON, treating as plain value:', purchaseUnit.custom_id)
      }
    }

    // --- Book purchase logic ---
    if (resolvedBookId) {
      try {
        // Get the book from database
        const book = await SupabaseDB.getBook(resolvedBookId)

        if (!book) {
          console.error(`❌ Book ${resolvedBookId} not found in DB after PayPal capture`)
          // Payment was captured — do not fail the response, but log the issue
          return NextResponse.json({
            success: true,
            orderId,
            captureId,
            amount,
            currency,
            warning: 'Payment captured but book record not found. Please contact support.'
          })
        }

        // Verify this book belongs to the authenticated user
        if (book.user_id !== user.userId) {
          console.error(`❌ PayPal capture: book ${resolvedBookId} does not belong to requesting user`)
          return NextResponse.json({
            success: true,
            orderId,
            captureId,
            amount,
            currency,
            warning: 'Payment captured but ownership could not be verified. Please contact support.'
          })
        }

        // Check if already purchased (idempotency guard)
        if (book.purchased) {
          console.error(`Book ${resolvedBookId} already marked as purchased — skipping duplicate.`)
          return NextResponse.json({
            success: true,
            orderId,
            captureId,
            amount,
            currency,
            alreadyPurchased: true,
            book: {
              id: book.id,
              title: book.title,
              status: book.status
            }
          })
        }

        // Mark book as purchased (including PayPal payment details)
        // purchase_price_cents and purchase_currency are DB columns but not in the TS Book interface,
        // so we use supabaseAdmin directly to set all fields atomically.
        if (!supabaseAdmin) {
          throw new Error('Supabase Admin client not available')
        }
        const { error: updateError } = await supabaseAdmin
          .from('books')
          .update({
            purchased: true,
            purchased_at: new Date().toISOString(),
            purchase_price_cents: Math.round(amount * 100),
            purchase_currency: currency
          })
          .eq('id', resolvedBookId)
          .eq('user_id', user.userId)

        if (updateError) {
          throw updateError
        }

        // Get updated book data
        const updatedBook = await SupabaseDB.getBook(resolvedBookId)

        // Trigger continue-generation if book was in preview status
        let generationJobId: string | false = false
        if (updatedBook && updatedBook.status === 'preview') {
          generationJobId = await triggerContinueGeneration(updatedBook, user.userId)
        }

        const generationStarted = !!generationJobId

        console.error('✅ PayPal book purchase completed:', {
          bookId: resolvedBookId,
          userId: user.userId,
          orderId,
          captureId,
          amount,
          currency,
          generationStarted,
          generationJobId
        })

        return NextResponse.json({
          success: true,
          orderId,
          captureId,
          amount,
          currency,
          book: {
            id: updatedBook?.id || resolvedBookId,
            title: updatedBook?.title || book.title,
            status: updatedBook?.status || book.status,
            activeJobId: generationJobId || updatedBook?.active_job_id
          },
          generationStarted,
          generationInfo: generationStarted
            ? 'The remaining chapters are now being generated.'
            : undefined
        })

      } catch (dbError) {
        // Payment was already captured — log DB error but return success to avoid confusing the user
        console.error('❌ DB error during PayPal book purchase fulfillment:', dbError)
        return NextResponse.json({
          success: true,
          orderId,
          captureId,
          amount,
          currency,
          warning: 'Payment captured but fulfillment encountered an error. Please contact support.'
        })
      }
    }

    // No bookId found — generic payment (e.g. credit packs), return basic success
    return NextResponse.json({
      success: true,
      orderId,
      captureId,
      amount,
      currency,
    })

  } catch (error) {
    console.error('❌ PayPal capture error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to capture PayPal payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
