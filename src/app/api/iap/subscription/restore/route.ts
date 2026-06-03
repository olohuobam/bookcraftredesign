import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken, supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/iap/subscription/restore
 *
 * Restores previously purchased IAP subscriptions.
 * Looks up the user's active subscription by originalTransactionId or iap_provider.
 * 
 * Called when user taps "Restore Purchases" in the app.
 */
export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    let userData
    try {
      userData = await verifySupabaseToken(token)
      if (!userData?.userId) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { platform, originalTransactionId } = body as { platform?: string; originalTransactionId?: string }

    if (!supabaseAdmin) {
      // Dev mode
      return NextResponse.json({ success: true, restored: false, message: 'Dev mode — no DB' })
    }

    // Look up existing IAP subscription for this user
    let query = supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userData.userId)

    if (originalTransactionId) {
      query = query.eq('iap_original_transaction_id', originalTransactionId)
    } else if (platform) {
      query = query.eq('iap_provider', platform)
    }

    const { data: subscription, error } = await query.maybeSingle()

    if (error) {
      console.error('IAP Restore: DB error', error)
      return NextResponse.json({ error: 'Failed to look up subscription' }, { status: 500 })
    }

    if (!subscription) {
      return NextResponse.json({
        success: true,
        restored: false,
        message: 'No active IAP subscription found to restore',
      })
    }

    // Check if still active (not expired)
    const isActive =
      subscription.status === 'active' &&
      subscription.current_period_end &&
      new Date(subscription.current_period_end) > new Date()

    if (!isActive) {
      return NextResponse.json({
        success: true,
        restored: false,
        message: 'Previous subscription has expired',
      })
    }

    // Log restore event
    await supabaseAdmin.from('iap_subscription_events').insert({
      user_id: userData.userId,
      subscription_id: subscription.id,
      product_id: subscription.iap_product_id ?? 'bookcraft_pro_monthly',
      transaction_id: subscription.iap_transaction_id ?? 'restore',
      original_transaction_id: subscription.iap_original_transaction_id ?? originalTransactionId,
      provider: subscription.iap_provider ?? platform ?? 'unknown',
      event_type: 'restore',
      expires_at: subscription.current_period_end,
    })

    console.error('IAP Restore: Subscription restored', {
      userId: userData.userId,
      plan: subscription.plan,
      expiresAt: subscription.current_period_end,
    })

    return NextResponse.json({
      success: true,
      restored: true,
      plan: subscription.plan,
      expiresAt: subscription.current_period_end,
      message: 'Subscription restored successfully',
    })
  } catch (error) {
    console.error('IAP Restore: Error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
