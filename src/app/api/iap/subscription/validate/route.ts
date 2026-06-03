import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken, supabaseAdmin } from '@/lib/supabase-admin'
import {
  generateAppleJWT,
  verifyAppleJWSTransaction,
  getGoogleAccessToken,
  JWSTransactionPayload,
} from '@/lib/iap-validation'

const GOOGLE_PLAY_API = 'https://androidpublisher.googleapis.com/androidpublisher/v3'
const APPLE_PRODUCTION_URL = 'https://api.storekit.itunes.apple.com'
const APPLE_SANDBOX_URL = 'https://api.storekit-sandbox.itunes.apple.com'

// Allowed subscription product IDs — must match App Store Connect / Play Console.
// Primary IDs (current): com.bookcraft.app.pro_monthly / pro_yearly
// Legacy IDs kept for backward compatibility with old app versions.
const SUBSCRIPTION_PRODUCT_IDS = new Set([
  // Current product IDs (com.bookcraft.app bundle)
  'com.bookcraft.subscription.pro',
  'com.bookcraft.subscription.pro',
  // Legacy IDs — kept for backward compat, can be removed once all clients update
  'bookcraft_pro_monthly',
  'bookcraft_pro_yearly',
  'com.bookcraft.subscription.pro',
  'com.bookcraft.subscription.pro.monthly',
  'com.bookcraft.subscription.pro.yearly',
])

interface ValidateSubscriptionRequest {
  productId: string
  transactionId: string
  receipt: string
  platform: 'android' | 'ios'
  userId: string
  /** StoreKit 2: signed JWS transaction from client */
  signedTransactionInfo?: string
  /** Restore purchases flow */
  isRestore?: boolean
}

/**
 * POST /api/iap/subscription/validate
 *
 * Validates an IAP subscription receipt from iOS (StoreKit) or Android (Play Billing),
 * then activates/renews the user's subscription in the database.
 *
 * Rules:
 * - Web: NEVER use this endpoint — Stripe handles web subscriptions
 * - iOS/Android: ALWAYS use this endpoint — never Stripe on native
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
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

    // 2. Parse body
    const body: ValidateSubscriptionRequest = await request.json()
    const { productId, transactionId, receipt, platform, userId, signedTransactionInfo, isRestore } = body

    if (!productId || !transactionId || !platform) {
      return NextResponse.json({ error: 'Missing required fields: productId, transactionId, platform' }, { status: 400 })
    }

    if (userId !== userData.userId) {
      return NextResponse.json({ error: 'User ID mismatch' }, { status: 403 })
    }

    // 3. Validate productId is a subscription product
    if (!SUBSCRIPTION_PRODUCT_IDS.has(productId)) {
      return NextResponse.json(
        { error: `Unknown subscription product: ${productId}` },
        { status: 400 }
      )
    }

    // 4. Check idempotency — already processed this transaction?
    if (!isRestore && supabaseAdmin) {
      const { data: existing } = await supabaseAdmin
        .from('iap_subscription_events')
        .select('id')
        .eq('transaction_id', transactionId)
        .eq('event_type', 'subscribe')
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ success: true, message: 'Subscription already activated', alreadyProcessed: true })
      }
    }

    // 5. Validate receipt with platform
    let isValid = false
    let validationDetails: Record<string, unknown> = {}
    let expiresAt: Date | null = null
    let originalTransactionId: string | undefined

    if (platform === 'android') {
      const result = await validateGooglePlaySubscription(productId, receipt)
      isValid = result.isValid
      validationDetails = result.details || {}
      if (result.expiresAt) expiresAt = result.expiresAt
    } else if (platform === 'ios') {
      const result = await validateAppleSubscription(transactionId, productId, receipt, signedTransactionInfo)
      isValid = result.isValid
      validationDetails = result.details || {}
      if (result.expiresAt) expiresAt = result.expiresAt
      originalTransactionId = result.originalTransactionId
    } else {
      return NextResponse.json({ error: 'Invalid platform. Must be "ios" or "android"' }, { status: 400 })
    }

    if (!isValid) {
      console.error('IAP Subscription: Receipt validation failed', { productId, transactionId, platform })
      return NextResponse.json({ error: 'Receipt validation failed' }, { status: 400 })
    }

    // 6. Upsert subscription in database
    if (supabaseAdmin) {
      // Fix 2: plan is always "pro" — billing period is stored via iap_product_id and current_period_end
      const plan = 'pro'
      const periodEnd = expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // default 30 days

      const { data: sub, error: subError } = await supabaseAdmin
        .from('subscriptions')
        .upsert(
          {
            user_id: userData.userId,
            plan,
            status: 'active',
            current_period_end: periodEnd.toISOString(),
            cancel_at_period_end: false,
            iap_provider: platform,
            iap_transaction_id: transactionId,
            iap_product_id: productId,
            iap_original_transaction_id: originalTransactionId ?? transactionId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id', ignoreDuplicates: false }
        )
        .select('id')
        .single()

      if (subError) {
        console.error('IAP Subscription: Failed to upsert subscription', subError)
        return NextResponse.json({ error: 'Failed to activate subscription' }, { status: 500 })
      }

      // 7. Log event
      await supabaseAdmin.from('iap_subscription_events').insert({
        user_id: userData.userId,
        subscription_id: sub?.id ?? null,
        product_id: productId,
        transaction_id: transactionId,
        original_transaction_id: originalTransactionId ?? transactionId,
        provider: platform,
        event_type: isRestore ? 'restore' : 'subscribe',
        receipt_data: receipt ?? null,
        validation_response: validationDetails,
        expires_at: periodEnd.toISOString(),
      })

      console.error('IAP Subscription: Activated', {
        userId: userData.userId,
        productId,
        transactionId,
        platform,
        expiresAt: periodEnd,
      })
    } else {
      console.warn('IAP Subscription: Supabase not configured — skipping DB write (dev mode)')
    }

    // Fix 3: plan is always "pro" in the response too
    return NextResponse.json({
      success: true,
      message: isRestore ? 'Subscription restored successfully' : 'Subscription activated successfully',
      plan: 'pro',
      expiresAt: expiresAt?.toISOString(),
    })
  } catch (error) {
    console.error('IAP Subscription: Validation error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── Apple StoreKit 2 ─────────────────────────────────────────────────────────

async function validateAppleSubscription(
  transactionId: string,
  productId: string,
  receiptData: string,
  signedTransactionInfo?: string,
): Promise<{ isValid: boolean; expiresAt?: Date; originalTransactionId?: string; details?: Record<string, unknown> }> {
  const hasCredentials = !!(process.env.APPLE_PRIVATE_KEY && process.env.APPLE_KEY_ID && process.env.APPLE_ISSUER_ID)

  // Fix 4: dev-mode bypass is only allowed in development
  if (!hasCredentials && !process.env.APPLE_SHARED_SECRET) {
    const isDev = process.env.NODE_ENV === 'development'
    if (isDev) {
      console.warn('IAP: No Apple credentials, skipping (dev mode)')
      return {
        isValid: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        details: { environment: 'development' },
      }
    }
    console.error('IAP: No Apple credentials configured in production, rejecting')
    return { isValid: false }
  }

  const expectedBundleId = process.env.APPLE_BUNDLE_ID || 'com.bookcraft.app'

  // Path 1: Client sent signedTransactionInfo (StoreKit 2)
  if (signedTransactionInfo) {
    try {
      const txPayload: JWSTransactionPayload = await verifyAppleJWSTransaction(signedTransactionInfo)

      if (
        txPayload.transactionId !== transactionId ||
        txPayload.productId !== productId ||
        txPayload.bundleId !== expectedBundleId
      ) {
        console.error('IAP Subscription: JWS payload mismatch', { txPayload, expected: { transactionId, productId } })
        return { isValid: false }
      }

      const expiresAt = txPayload.expiresDate ? new Date(txPayload.expiresDate) : undefined
      return {
        isValid: true,
        expiresAt,
        originalTransactionId: txPayload.originalTransactionId,
        details: { ...txPayload, validationMethod: 'storekit2-jws' },
      }
    } catch (error) {
      console.error('IAP Subscription: Apple JWS verification failed', error)
      return { isValid: false }
    }
  }

  // Path 2: App Store Server API lookup
  if (hasCredentials) {
    try {
      const jwt = await generateAppleJWT()
      const urls = [
        `${APPLE_PRODUCTION_URL}/inApps/v1/transactions/${transactionId}`,
        `${APPLE_SANDBOX_URL}/inApps/v1/transactions/${transactionId}`,
      ]

      for (const url of urls) {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10_000)

        let response: Response
        try {
          response = await fetch(url, { headers: { Authorization: `Bearer ${jwt}` }, signal: controller.signal })
        } catch {
          clearTimeout(timeoutId)
          continue
        } finally {
          clearTimeout(timeoutId)
        }

        if (!response.ok) continue

        const data = await response.json()
        if (data.signedTransactionInfo) {
          const txPayload: JWSTransactionPayload = await verifyAppleJWSTransaction(data.signedTransactionInfo)
          if (txPayload.productId !== productId || txPayload.bundleId !== expectedBundleId) {
            return { isValid: false }
          }
          const expiresAt = txPayload.expiresDate ? new Date(txPayload.expiresDate) : undefined
          return {
            isValid: true,
            expiresAt,
            originalTransactionId: txPayload.originalTransactionId,
            details: { ...txPayload, validationMethod: 'storekit2-server-api' },
          }
        }
      }
    } catch (error) {
      console.error('IAP Subscription: Apple Server API lookup failed', error)
    }
  }

  return { isValid: false }
}

// ─── Google Play Subscriptions ───────────────────────────────────────────────

async function validateGooglePlaySubscription(
  productId: string,
  purchaseToken: string,
): Promise<{ isValid: boolean; expiresAt?: Date; details?: Record<string, unknown> }> {
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.bookcraft.app'
  const serviceAccountKey = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON

  if (!serviceAccountKey) {
    console.error('IAP Subscription: GOOGLE_PLAY_SERVICE_ACCOUNT_JSON not configured — rejecting')
    return { isValid: false }
  }

  try {
    const credentials = JSON.parse(serviceAccountKey)
    const accessToken = await getGoogleAccessToken(credentials)

    // Use subscriptions API (different from products API used for one-time purchases)
    const response = await fetch(
      `${GOOGLE_PLAY_API}/applications/${packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!response.ok) {
      console.error('IAP Subscription: Google Play API error', await response.text())
      return { isValid: false }
    }

    const data = await response.json()

    // Fix 1: Full expiry + cancellation check
    // paymentState: 1 = Payment received, 2 = Free trial
    const isActivePayment = data.paymentState === 1 || data.paymentState === 2
    const expiresAt = data.expiryTimeMillis
      ? new Date(parseInt(data.expiryTimeMillis, 10))
      : undefined
    const isExpiredCheck = data.expiryTimeMillis
      ? parseInt(data.expiryTimeMillis, 10) < Date.now()
      : false
    const isCancelled =
      typeof data.cancelReason === 'number'
        ? data.cancelReason !== 0
        : false
    const isValid = !!isActivePayment && !isCancelled && !isExpiredCheck

    return { isValid, expiresAt, details: data }
  } catch (error) {
    console.error('IAP Subscription: Google Play validation error', error)
    return { isValid: false }
  }
}
