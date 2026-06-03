import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { verifySupabaseToken } from '@/lib/supabase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // SECURITY: require auth — previously this endpoint leaked customer_email,
    // amount, and metadata to anyone with a session ID.
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }
    const user = await verifySupabaseToken(token)
    if (!user?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'payment_intent']
    })

    // Verify the session belongs to the authenticated caller. Sessions store
    // either userId or email in metadata; accept either.
    const sessionUserField = session.metadata?.userId || ''
    const sessionEmail = session.customer_details?.email || ''
    const callerMatches =
      sessionUserField === user.userId ||
      (user.email && sessionUserField.toLowerCase() === user.email.toLowerCase()) ||
      (user.email && sessionEmail.toLowerCase() === user.email.toLowerCase())
    if (!callerMatches) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Return relevant session data
    return NextResponse.json({
      id: session.id,
      amount_total: session.amount_total,
      currency: session.currency,
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email,
      metadata: session.metadata,
      created: session.created,
      line_items: session.line_items?.data,
    })

  } catch (error) {
    console.error('Error retrieving session:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve session' },
      { status: 500 }
    )
  }
}
