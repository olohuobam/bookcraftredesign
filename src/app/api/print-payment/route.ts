import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/auth-helpers'
import { stripe } from '@/lib/stripe'
import { PRINT_ON_DEMAND_ENABLED, PRINT_DISABLED_RESPONSE } from '@/lib/feature-flags'

interface ShippingAddress {
  name?: string
  country_code?: string
}

/**
 * Create Stripe Payment Intent for Print Order
 * This creates a payment that must be completed BEFORE submitting to Lulu
 */
export async function POST(request: NextRequest) {
  try {
    if (!PRINT_ON_DEMAND_ENABLED) {
      return NextResponse.json(PRINT_DISABLED_RESPONSE, { status: 503 })
    }

    const user = await getSupabaseUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      bookId,
      bookTitle,
      quantity = 1,
      luluTotalCost, // Total cost from Lulu API in cents
      currency = 'EUR',
      shippingAddress
    } = body as {
      bookId: string
      bookTitle?: string
      quantity?: number
      luluTotalCost: number
      currency?: string
      shippingAddress?: ShippingAddress
    }

    if (!bookId || !luluTotalCost) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Calculate service fee (you can adjust this)
    // Option 1: Fixed fee
    const FIXED_FEE = 299 // 2.99 EUR in cents

    // Option 2: Percentage fee (e.g., 15% markup)
    const MARKUP_PERCENTAGE = 0.15
    const markupFee = Math.round(luluTotalCost * MARKUP_PERCENTAGE)

    // Option 3: Hybrid (fixed + percentage)
    const serviceFee = Math.max(FIXED_FEE, markupFee)

    // Total amount to charge customer
    const totalAmountCents = luluTotalCost + serviceFee

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmountCents,
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        user_id: user.userId || '',
        user_email: user.email || 'unknown',
        book_id: bookId,
        book_title: bookTitle || 'Unknown Book',
        quantity: quantity.toString(),
        lulu_cost_cents: luluTotalCost.toString(),
        service_fee_cents: serviceFee.toString(),
        order_type: 'print_order',
        shipping_name: shippingAddress?.name || '',
        shipping_country: shippingAddress?.country_code || ''
      },
      description: `Print Order: "${bookTitle}" (${quantity}x) - Lulu Print-on-Demand`,
      receipt_email: user.email || undefined,
    })

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      breakdown: {
        lulu_cost: {
          amount_cents: luluTotalCost,
          amount_formatted: (luluTotalCost / 100).toFixed(2),
          currency: currency
        },
        service_fee: {
          amount_cents: serviceFee,
          amount_formatted: (serviceFee / 100).toFixed(2),
          currency: currency
        },
        total: {
          amount_cents: totalAmountCents,
          amount_formatted: (totalAmountCents / 100).toFixed(2),
          currency: currency
        }
      }
    })

  } catch (error) {
    console.error('Payment intent creation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to create payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Confirm payment and trigger Lulu print order
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getSupabaseUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { paymentIntentId } = body as { paymentIntentId: string }

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment Intent ID required' },
        { status: 400 }
      )
    }

    // Verify payment was successful
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        {
          error: 'Payment not completed',
          status: paymentIntent.status
        },
        { status: 400 }
      )
    }

    // Payment successful - return confirmation
    // The actual Lulu order will be created in /api/print-jobs endpoint
    return NextResponse.json({
      success: true,
      paymentStatus: paymentIntent.status,
      amountPaid: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata
    })

  } catch (error) {
    console.error('Payment confirmation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to confirm payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
