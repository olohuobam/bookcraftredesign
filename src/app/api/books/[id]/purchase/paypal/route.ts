import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { supabaseAdmin } from '@/lib/supabase-admin'

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!
const PAYPAL_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

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
  
  if (!response.ok) {
    console.error('PayPal token request failed:', response.status)
    throw new Error(`PayPal token request failed: ${data.error_description || data.error || 'Unknown error'}`)
  }

  return data.access_token
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Extract bookId from URL params
    const resolvedParams = await params
    const bookId = resolvedParams.id
    
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

    const { title, price } = await request.json()

    if (!bookId) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 })
    }

    // Try to find the book in database, but don't fail if it doesn't exist
    const { data: book, error: bookError } = await supabaseAdmin
      .from('books')
      .select('id, title, user_id')  // ✅ Removed 'price' - column doesn't exist in schema
      .eq('id', bookId)
      .maybeSingle() // Use maybeSingle() instead of single() - won't throw error if not found

    if (bookError && bookError.code !== 'PGRST116') {
      console.error('PayPal: Database error:', bookError.code)
    }

    // Use provided data or database data (price always comes from request)
    const bookTitle = book?.title || title || 'Digital Book'
    const bookPrice = price || 9.99  // Use provided price or default to 9.99 EUR
    const actualPrice = bookPrice

    // Check if user already owns this book (only if book exists in DB)
    if (book) {
      const { data: existingPurchase, error: purchaseError } = await supabaseAdmin
        .from('user_books')
        .select('id')
        .eq('user_id', user.userId)
        .eq('book_id', bookId)
        .eq('purchased', true)
        .single()

      if (existingPurchase) {
        return NextResponse.json({ 
          error: 'You already own this book',
          alreadyPurchased: true 
        }, { status: 409 })
      }
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken()

    // Get base URL with fallback
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bookcraft.dev'

    // Create PayPal order for digital book purchase
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'EUR',
            value: (actualPrice).toFixed(2) // e.g., "9.99"
          },
          description: `BookCraft Digital Book: ${bookTitle}`,
          custom_id: JSON.stringify({
            type: 'digital_purchase', // 🔥 KEY: Identifies as digital book purchase
            userId: user.userId,
            bookId: bookId,
            bookTitle: bookTitle,
            paymentType: 'digital_book'
          })
        }
      ],
      application_context: {
        return_url: `${baseUrl}/payment/paypal/return?bookId=${bookId}`,
        cancel_url: `${baseUrl}/dashboard/books/${bookId}`,
        brand_name: 'BookCraft',
        locale: 'en-US',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW'
      }
    }

    const paypalResponse = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    })

    const order = await paypalResponse.json()

    if (!paypalResponse.ok) {
      console.error('PayPal order creation failed:', paypalResponse.status)
      return NextResponse.json({ error: 'Failed to create PayPal order' }, { status: 500 })
    }

    return NextResponse.json({
      order_id: order.id,
      approval_url: order.links?.find((link: { rel: string; href: string }) => link.rel === 'approve')?.href,
      book: {
        id: bookId,
        title: bookTitle,
        price: actualPrice
      }
    })

  } catch (error) {
    console.error('PayPal order error:', error instanceof Error ? error.message : 'Unknown')

    return NextResponse.json(
      { 
        error: 'Failed to create digital purchase PayPal order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}