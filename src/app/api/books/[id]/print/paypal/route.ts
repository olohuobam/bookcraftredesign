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

    const { 
      printOption = 'paperback',
      quantity = 1,
      shippingAddress,
      estimatedPrice = 19.99 // Default €19.99
    } = await request.json()

    if (!bookId) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 })
    }

    if (!shippingAddress || !shippingAddress.country) {
      return NextResponse.json({ error: 'Shipping address is required' }, { status: 400 })
    }

    // 🔥 BUSINESS RULE: Check if user owns the digital book first
    const { data: userBook, error: userBookError } = await supabaseAdmin
      .from('user_books')
      .select('purchased')
      .eq('user_id', user.userId)
      .eq('book_id', bookId)
      .single()

    if (userBookError || !userBook || !userBook.purchased) {
      return NextResponse.json({ 
        error: 'You must purchase the digital book first before ordering a print version',
        code: 'DIGITAL_BOOK_REQUIRED',
        digitalBookPrice: 9.99 // €9.99
      }, { status: 403 })
    }

    // Get book details
    const { data: book, error: bookError } = await supabaseAdmin
      .from('books')
      .select('id, title, content, user_id, isbn, page_count')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Calculate print price based on options
    let printPrice = estimatedPrice
    if (printOption === 'hardcover') {
      printPrice = Math.round(estimatedPrice * 1.5 * 100) / 100 // 50% more for hardcover
    }

    // Add shipping costs based on country
    let shippingCost = 0
    if (shippingAddress.country === 'DE') {
      shippingCost = 3.99 // €3.99 for Germany
    } else if (['AT', 'CH', 'FR', 'NL', 'BE'].includes(shippingAddress.country)) {
      shippingCost = 6.99 // €6.99 for neighboring countries
    } else {
      shippingCost = 12.99 // €12.99 for other countries
    }

    const totalAmount = (printPrice * quantity) + shippingCost

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken()

    // Get base URL with fallback
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bookcraft.dev'

    // Create PayPal order for print order
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'EUR',
            value: totalAmount.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: 'EUR',
                value: (printPrice * quantity).toFixed(2)
              },
              shipping: {
                currency_code: 'EUR',
                value: shippingCost.toFixed(2)
              }
            }
          },
          items: [
            {
              name: `${book.title} (${printOption})`,
              description: `Print-on-Demand Book - ${printOption}`,
              unit_amount: {
                currency_code: 'EUR',
                value: printPrice.toFixed(2)
              },
              quantity: quantity.toString(),
              category: 'PHYSICAL_GOODS'
            }
          ],
          shipping: {
            address: {
              address_line_1: shippingAddress.line1,
              address_line_2: shippingAddress.line2 || '',
              admin_area_2: shippingAddress.city,
              postal_code: shippingAddress.postal_code,
              country_code: shippingAddress.country
            }
          },
          description: `BookCraft Print Order: ${book.title}`,
          custom_id: JSON.stringify({
            type: 'print_order', // 🔥 KEY: Identifies as print order
            userId: user.userId,
            bookId: bookId,
            bookTitle: book.title,
            printOption,
            quantity,
            paymentType: 'print_book'
          })
        }
      ],
      application_context: {
        return_url: `${baseUrl}/dashboard/books`,
        cancel_url: `${baseUrl}/dashboard/books`,
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
      console.error('❌ PayPal print order creation failed:', order)
      return NextResponse.json({ error: 'Failed to create PayPal print order' }, { status: 500 })
    }

    console.error('✅ PayPal Print Order created:', {
      id: order.id,
      bookId,
      title: book.title,
      printOption,
      quantity,
      totalAmount,
      userId: user.userId
    })

    return NextResponse.json({
      order_id: order.id,
      approval_url: order.links?.find((link: { rel: string; href: string }) => link.rel === 'approve')?.href,
      order_details: {
        book: {
          id: book.id,
          title: book.title
        },
        printOption,
        quantity,
        printPrice,
        shippingCost,
        totalAmount,
        shippingAddress
      }
    })

  } catch (error) {
    console.error('❌ Print Order PayPal error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to create print order PayPal order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}