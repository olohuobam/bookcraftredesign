import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { supabaseAdmin } from '@/lib/supabase-admin'

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
      estimatedPrice = 1999 // Default €19.99
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
        digitalBookPrice: 999 // €9.99
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
      printPrice = Math.round(estimatedPrice * 1.5) // 50% more for hardcover
    }

    // Add shipping costs based on country
    let shippingCost = 0
    if (shippingAddress.country === 'DE') {
      shippingCost = 399 // €3.99 for Germany
    } else if (['AT', 'CH', 'FR', 'NL', 'BE'].includes(shippingAddress.country)) {
      shippingCost = 699 // €6.99 for neighboring countries
    } else {
      shippingCost = 1299 // €12.99 for other countries
    }

    const totalAmount = (printPrice * quantity) + shippingCost

    // Create payment intent for print order
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'eur',
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      },
      metadata: {
        type: 'print_order', // 🔥 KEY: Identifies this as print order
        userId: user.email || user.userId || '',
        bookId: bookId,
        bookTitle: book.title,
        printOption: printOption,
        quantity: quantity.toString(),
        printPrice: printPrice.toString(),
        shippingCost: shippingCost.toString(),
        shippingCountry: shippingAddress.country,
        paymentType: 'print_book'
      },
      description: `BookCraft Print Order: ${book.title} (${printOption})`,
      receipt_email: user.email || undefined,
    })

    console.error('✅ Print Order Payment Intent created:', {
      id: paymentIntent.id,
      bookId,
      title: book.title,
      printOption,
      quantity,
      printPrice,
      shippingCost,
      totalAmount,
      userId: user.userId
    })

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
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
    console.error('❌ Print Order Payment Intent error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to create print order payment intent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}