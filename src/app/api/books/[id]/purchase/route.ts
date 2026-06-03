import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkIsPro } from '@/lib/subscription-utils'
import { z } from 'zod'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Check if Supabase is configured
    if (!supabaseAdmin) {
      console.error('❌ Supabase Admin client not available')
      return NextResponse.json({ 
        error: 'Database not configured',
        details: 'Supabase connection is not available'
      }, { status: 500 })
    }

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

    // Check if user has Pro subscription (Pro users don't need to buy books)
    const isPro = await checkIsPro(user.userId)
    if (isPro) {
      return NextResponse.json({
        error: 'Pro subscribers have full access — no purchase needed',
        isPro: true
      }, { status: 409 })
    }

    // Validate request body
    const PurchaseSchema = z.object({
      title: z.string().max(255).optional(),
      price: z.number().min(0).max(1000).optional()
    })

    let validatedData
    try {
      validatedData = PurchaseSchema.parse(await request.json())
    } catch (error) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error instanceof z.ZodError ? error.errors.map(e => `${e.path.join('.')}: ${e.message}`) : 'Invalid request'
      }, { status: 400 })
    }

    const { title, price } = validatedData

    if (!bookId) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 })
    }

    // Try to find the book in database, but don't fail if it doesn't exist
    console.error('🔍 Stripe: Looking for book with ID:', bookId)
        // Get book details (optional - can proceed without)
    const { data: book, error: bookError } = await supabaseAdmin
      .from('books')
      .select('title')
      .eq('id', bookId)
      .maybeSingle()

    if (bookError && bookError.code !== 'PGRST116') {
      // Only log real database errors, not "not found" errors
      console.error('❌ Stripe: Database error:', bookError)
    }

        // Use provided data or database data
    const bookTitle = book?.title || title || 'Digital Book'
    const bookPrice = price || 9.99  // Use provided price or default to 9.99 E
    // UR
    
    console.error('📚 Stripe: Processing purchase:', {
      bookId,
      title: bookTitle,
      priceEUR: bookPrice,
      foundInDB: !!book
    })
    
    // Convert price to cents for Stripe (9.99 EUR = 999 cents)
    const actualPriceInCents = Math.round(bookPrice * 100)
    console.error('💰 Stripe: Using price in cents:', actualPriceInCents)

    // Check if user already owns this book (optional - only if book exists in DB)
    if (book) {
      const { data: existingPurchase } = await supabaseAdmin
        .from('user_books')
        .select('id')
        .eq('user_id', user.userId)
        .eq('book_id', bookId)
        .eq('purchased', true)
        .maybeSingle()

      if (existingPurchase) {
        return NextResponse.json({ 
          error: 'You already own this book',
          alreadyPurchased: true 
        }, { status: 409 })
      }
    }

    // Create payment intent for digital book purchase
    const paymentIntent = await stripe.paymentIntents.create({
      amount: actualPriceInCents, // Price in cents (e.g., 999 = €9.99)
      currency: 'eur',
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      },
      metadata: {
        type: 'digital_purchase', // 🔥 KEY: Identifies this as digital book purchase
        userId: user.email || user.userId || '',
        bookId: bookId,
        bookTitle: bookTitle,
        originalPrice: actualPriceInCents.toString(),
        paymentType: 'digital_book'
      },
      description: `BookCraft Digital Book: ${bookTitle}`,
      receipt_email: user.email || undefined,
    })

    console.error('✅ Digital Purchase Payment Intent created:', {
      id: paymentIntent.id,
      bookId,
      title: bookTitle,
      amount: actualPriceInCents,
      userId: user.userId
    })

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      book: {
        id: bookId,
        title: bookTitle,
        price: actualPriceInCents
      }
    })

  } catch (error) {
    console.error('❌ Digital Purchase Payment Intent error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to create digital purchase payment intent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}