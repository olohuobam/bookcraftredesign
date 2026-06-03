import { NextRequest, NextResponse } from 'next/server'
import { stripe, getMainAppUrl } from '@/lib/stripe'
import { getSupabaseUser } from '@/lib/auth-helpers'
import { calculatePrintRetailPrice } from '@/lib/pricing'
import { PRINT_ON_DEMAND_ENABLED, PRINT_DISABLED_RESPONSE } from '@/lib/feature-flags'

interface ShippingAddress {
  name: string
  street1: string
  street2?: string
  city: string
  state_code?: string
  country_code: string
  postcode: string
  phone_number: string
}

/**
 * Create Stripe Checkout Session for Print-on-Demand orders.
 * The client redirects to Stripe's hosted checkout page.
 * After payment, the webhook (checkout.session.completed) creates the Lulu print job.
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
      luluTotalCost, // in cents, from Lulu pricing API
      currency = 'EUR',
      shippingAddress,
      bookFormat,
      paperType,
      coverType,
      bookType,
      shippingLevel = 'MAIL',
    } = body as {
      bookId: string
      bookTitle?: string
      quantity?: number
      luluTotalCost: number
      currency?: string
      shippingAddress: ShippingAddress
      bookFormat?: string
      paperType?: string
      coverType?: string
      bookType?: string
      shippingLevel?: string
    }

    if (!bookId || !luluTotalCost || !shippingAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: bookId, luluTotalCost, shippingAddress' },
        { status: 400 },
      )
    }

    // Calculate retail price using shared pricing function (15% markup, min €2.99)
    const totalAmountCents = calculatePrintRetailPrice(luluTotalCost)
    const serviceFee = totalAmountCents - luluTotalCost

    const mainAppUrl = getMainAppUrl()
    const successUrl = `${mainAppUrl}/payment/success?type=print_order&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${mainAppUrl}/dashboard/books/${bookId}?print_canceled=true`

    // Store all print config in Stripe metadata (50 keys max, 500 chars per value)
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Buchdruck: ${bookTitle || 'Dein Buch'}`,
              description: `${quantity} Exemplar${quantity !== 1 ? 'e' : ''} • Print-on-Demand via Lulu`,
            },
            unit_amount: totalAmountCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        order_type: 'print_order',
        user_id: user.userId || '',
        user_email: user.email || '',
        book_id: bookId,
        book_title: (bookTitle || '').substring(0, 500),
        quantity: quantity.toString(),
        lulu_cost_cents: luluTotalCost.toString(),
        service_fee_cents: serviceFee.toString(),
        // Shipping address
        addr_name: shippingAddress.name.substring(0, 200),
        addr_street1: shippingAddress.street1.substring(0, 200),
        addr_street2: (shippingAddress.street2 || '').substring(0, 200),
        addr_city: shippingAddress.city.substring(0, 100),
        addr_postcode: shippingAddress.postcode.substring(0, 20),
        addr_country_code: shippingAddress.country_code.substring(0, 5),
        addr_state_code: (shippingAddress.state_code || '').substring(0, 10),
        addr_phone: shippingAddress.phone_number.substring(0, 30),
        // Print config
        book_format: bookFormat || '6x9',
        paper_type: paperType || 'white',
        cover_type: coverType || 'matte',
        book_type: bookType || 'text',
        shipping_level: shippingLevel,
      },
      customer_email: user.email || undefined,
      automatic_tax: { enabled: true },
    })

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    console.error('Print checkout session creation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
