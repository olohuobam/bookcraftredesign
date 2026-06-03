import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { logError, createErrorResponse } from '@/lib/api-errors'
import { SupabaseDB } from '@/lib/supabase-db'
import { getBookPrice, convertCurrency, type SupportedCurrency } from '@/lib/pricing'

// SECURITY: allow-list of currencies we accept. Anything else falls back to EUR.
// Keys must be lowercase (Stripe currency codes are lowercase).
const SUPPORTED_CURRENCIES: Record<string, SupportedCurrency> = {
  eur: 'EUR',
  usd: 'USD',
  gbp: 'GBP',
  cad: 'CAD',
  aud: 'AUD',
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

    const {
      currency: rawCurrency,
      bookData,
      selectedOption,
      selectedBookIds = [],
      metadata = {}
    } = await request.json()

    // SECURITY: validate currency against allow-list. Default to EUR if unknown.
    const currencyLower = typeof rawCurrency === 'string' ? rawCurrency.toLowerCase() : 'eur'
    const currencyCode = SUPPORTED_CURRENCIES[currencyLower]
    if (!currencyCode) {
      return NextResponse.json({ error: 'Unsupported currency' }, { status: 400 })
    }
    const currency = currencyLower

    const bookId: string | undefined = bookData?.id || selectedBookIds?.[0]
    if (!bookId) {
      return NextResponse.json({ error: 'bookId required' }, { status: 400 })
    }

    // SECURITY: derive price server-side from authoritative DB record.
    // Never trust client-supplied `amount`.
    const book = await SupabaseDB.getBook(bookId)
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }
    if (book.user_id !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (book.purchased) {
      return NextResponse.json({ error: 'Book already purchased' }, { status: 409 })
    }

    const bookType = book.book_type || 'text'
    const chapterOrPageCount = book.chapters || 5
    // Base price is calculated in EUR cents, then converted to the requested
    // currency server-side via convertCurrency (uses the authoritative rate
    // table in lib/pricing.ts).
    const priceEUR = getBookPrice(bookType, chapterOrPageCount)
    const amount = convertCurrency(priceEUR, currencyCode)

    // Sanitize client-supplied metadata: only allow primitive string values, drop reserved keys.
    const RESERVED_META_KEYS = new Set([
      'type', 'userId', 'userEmail', 'bookId', 'bookTitle', 'quantity', 'package', 'selectedBookIds', 'amount'
    ])
    const safeMetadata: Record<string, string> = {}
    if (metadata && typeof metadata === 'object') {
      for (const [k, v] of Object.entries(metadata)) {
        if (RESERVED_META_KEYS.has(k)) continue
        if (typeof v === 'string' && v.length <= 500) safeMetadata[k] = v
      }
    }

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      },
      metadata: {
        type: 'digital_purchase',
        userId: user.userId,
        userEmail: user.email || '',
        bookId,
        bookTitle: book.title || 'Unknown Book',
        quantity: selectedOption?.quantity?.toString() || '1',
        package: selectedOption?.label || 'Single Book',
        selectedBookIds: JSON.stringify([bookId]),
        ...safeMetadata
      },
      description: `BookCraft - ${selectedOption?.label || 'Book Purchase'}`,
      receipt_email: user.email || undefined,
    })

    console.error('✅ Payment Intent created:', paymentIntent.id, 'Amount:', amount, 'Currency:', currency)

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id
    })

  } catch (error) {
    logError('create-payment-intent', error)
    return createErrorResponse(error, 'Failed to create payment intent')
  }
}