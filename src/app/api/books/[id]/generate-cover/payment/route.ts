import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'
import { stripe } from '@/lib/stripe'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * POST /api/books/[id]/generate-cover/payment
 * Creates a Stripe payment intent for cover generation (0.99€)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params

    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    // Verify Supabase token
    let userData
    try {
      userData = await verifySupabaseToken(token)
      if (!userData || !userData.userId) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if book exists and belongs to user
    const book = await SupabaseDB.getBook(bookId)

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    if (book.user_id !== userData.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get user profile for email
    const userProfile = await SupabaseDB.getProfile(userData.userId)

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json({
        error: 'Payment system not configured',
        message: 'Stripe is not configured on this server'
      }, { status: 503 })
    }

    console.error('💳 Creating payment intent for cover generation:', {
      bookId,
      bookTitle: book.title,
      userId: userData.userId,
      amount: 99 // 0.99€ in cents
    })

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 99, // 0.99€ in cents
      currency: 'eur',
      metadata: {
        type: 'cover_generation',
        bookId: bookId,
        userId: userData.userId,
        bookTitle: book.title
      },
      description: `Cover-Generierung für "${book.title}"`,
      receipt_email: userProfile.email
    })

    console.error('✅ Payment intent created:', paymentIntent.id)

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: 99,
      currency: 'eur'
    })

  } catch (error: unknown) {
    console.error('Error creating payment intent:', error)
    return NextResponse.json({
      error: 'Failed to create payment intent',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

/**
 * GET /api/books/[id]/generate-cover/payment
 * Check payment status and add cover generation credit if paid
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params
    const { searchParams } = new URL(request.url)
    const paymentIntentId = searchParams.get('payment_intent')

    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Payment intent ID required' }, { status: 400 })
    }

    // Verify Supabase token
    let userData
    try {
      userData = await verifySupabaseToken(token)
      if (!userData || !userData.userId) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json({
        error: 'Payment system not configured'
      }, { status: 503 })
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    // Verify this payment belongs to this user
    if (paymentIntent.metadata.userId !== userData.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if payment was successful
    if (paymentIntent.status === 'succeeded') {
      // Get current user profile
      const userProfile = await SupabaseDB.getProfile(userData.userId)

      if (!userProfile) {
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
      }

      // Add 1 cover generation credit
      const currentCredits = userProfile.cover_generation_credits ?? 0
      const newCredits = currentCredits + 1

      await SupabaseDB.updateProfile(userData.userId, {
        cover_generation_credits: newCredits
      })

      console.error(`✅ Payment successful! Added 1 cover credit. Total: ${newCredits}`)

      return NextResponse.json({
        success: true,
        status: 'succeeded',
        creditsAdded: 1,
        totalCredits: newCredits,
        message: '1 Cover-Generierung gekauft!'
      })
    }

    return NextResponse.json({
      success: false,
      status: paymentIntent.status,
      message: 'Zahlung noch nicht abgeschlossen'
    })

  } catch (error: unknown) {
    console.error('Error checking payment status:', error)
    return NextResponse.json({
      error: 'Failed to check payment status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
