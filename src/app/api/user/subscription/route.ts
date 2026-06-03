import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifySupabaseToken } from '@/lib/supabase-admin'

/**
 * GET /api/user/subscription
 * Returns the current user's subscription status
 */
export async function GET(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]

    // Use shared auth helper
    const userData = await verifySupabaseToken(token)

    if (!userData || !supabaseAdmin) {
      // Mock response for development without Supabase
      if (!supabaseAdmin) {
        console.error('⚠️ Supabase not configured, returning mock subscription')
        return NextResponse.json({
          subscription: {
            plan: 'free',
            status: 'none',
          },
        })
      }
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get subscription from database
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userData.userId)
      .single()

    if (subError && subError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine (no subscription)
      // Any other error is a real DB issue — return 500 so client doesn't show wrong state
      console.error('Error fetching subscription:', subError)
      return NextResponse.json(
        { error: 'Failed to fetch subscription status' },
        { status: 500 }
      )
    }

    // If no subscription found, return free plan
    if (!subscription) {
      return NextResponse.json({
        subscription: {
          plan: 'free',
          status: 'none',
        },
      })
    }

    // Return subscription data
    return NextResponse.json({
      subscription: {
        plan: subscription.plan || 'free',
        status: subscription.status || 'none',
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    })
  } catch (error) {
    console.error('Error in subscription API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
