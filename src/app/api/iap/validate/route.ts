import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'
import {
  generateAppleJWT,
  verifyAppleJWSTransaction,
  getGoogleAccessToken,
  JWSTransactionPayload,
} from '@/lib/iap-validation'

const GOOGLE_PLAY_API = 'https://androidpublisher.googleapis.com/androidpublisher/v3'

// Apple App Store Server API endpoints
const APPLE_PRODUCTION_URL = 'https://api.storekit.itunes.apple.com'
const APPLE_SANDBOX_URL = 'https://api.storekit-sandbox.itunes.apple.com'

interface ValidateRequest {
  productId: string
  transactionId: string
  receipt: string
  platform: 'android' | 'ios'
  bookId: string
  userId: string
  /** StoreKit 2: signed transaction info (JWS) from client */
  signedTransactionInfo?: string
}

// Allowed book purchase product IDs — must match App Store Connect / Play Console.
// Format: com.bookcraft.app.book_<price_in_cents>
// Legacy IDs (without .app.) kept for backward compat.
const BOOK_PRODUCT_IDS = new Set([
  // Current product IDs
  'com.bookcraft.app.book_499',
  'com.bookcraft.app.book_999',
  'com.bookcraft.app.book_1499',
  'com.bookcraft.app.book_1999',
  // Legacy IDs — remove once all clients update
  'com.bookcraft.book.499',
  'com.bookcraft.book.999',
  'com.bookcraft.book.1499',
  'com.bookcraft.book.1999',
])

/**
 * Validate In-App Purchase Receipt
 *
 * POST /api/iap/validate
 *
 * Validates purchase with Google Play / Apple and marks book as purchased.
 * 
 * Apple: Supports both StoreKit 2 (App Store Server API v2) and legacy verifyReceipt
 * for backward compatibility during transition.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify user authentication
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    let userData
    try {
      userData = await verifySupabaseToken(token)
      if (!userData || !userData.userId) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // 2. Parse request body
    const body: ValidateRequest = await request.json()
    const { productId, transactionId, receipt, platform, bookId, userId, signedTransactionInfo } = body

    if (!productId || !transactionId || !platform || !bookId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!BOOK_PRODUCT_IDS.has(productId)) {
      console.error('IAP: Unknown book product ID', { productId })
      return NextResponse.json({ error: `Unknown product: ${productId}` }, { status: 400 })
    }

    if (userId !== userData.userId) {
      return NextResponse.json({ error: 'User ID mismatch' }, { status: 403 })
    }

    // 3. Check if transaction already processed (idempotency)
    const existingPurchase = await SupabaseDB.getIAPPurchaseByTransactionId(transactionId)
    if (existingPurchase) {
      return NextResponse.json({
        success: true,
        message: 'Purchase already processed',
        purchaseId: existingPurchase.id,
      })
    }

    // 4. Validate receipt with platform
    let isValid = false
    let validationDetails: Record<string, unknown> = {}

    if (platform === 'android') {
      const validation = await validateGooglePlayPurchase(productId, receipt)
      isValid = validation.isValid
      validationDetails = validation.details || {}
    } else if (platform === 'ios') {
      const validation = await validateApplePurchase(transactionId, productId, receipt, signedTransactionInfo)
      isValid = validation.isValid
      validationDetails = validation.details || {}
    } else {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
    }

    if (!isValid) {
      console.error('IAP: Receipt validation failed', { productId, transactionId, platform })
      return NextResponse.json({ error: 'Receipt validation failed' }, { status: 400 })
    }

    // 5. Store IAP purchase in database
    const iapPurchase = await SupabaseDB.createIAPPurchase({
      user_id: userData.userId,
      book_id: bookId,
      product_id: productId,
      transaction_id: transactionId,
      provider: platform,
      receipt_data: receipt,
      validation_response: validationDetails,
      credits_granted: 1,
      status: 'completed',
    })

    // 6. Mark book as purchased (IAP uses transaction ID as reference)
    await SupabaseDB.markBookAsPurchased(bookId, userData.userId, transactionId)

    console.error('IAP: Purchase validated successfully', {
      userId: userData.userId,
      bookId,
      productId,
      transactionId,
    })

    return NextResponse.json({
      success: true,
      purchaseId: iapPurchase.id,
      message: 'Purchase validated successfully',
    })

  } catch (error) {
    console.error('IAP: Validation error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── Apple StoreKit 2 (App Store Server API v2) ─────────────────────────────

/**
 * Validate Apple purchase using StoreKit 2 (App Store Server API v2).
 * 
 * Strategy:
 * 1. If signedTransactionInfo is provided by client, verify it directly using Apple JWKS
 * 2. Otherwise, use App Store Server API to look up the transaction by ID
 * 3. Falls back to legacy verifyReceipt for old clients that only send receipt data
 */
async function validateApplePurchase(
  transactionId: string,
  productId: string,
  receiptData: string,
  signedTransactionInfo?: string,
): Promise<{ isValid: boolean; details?: Record<string, unknown> }> {
  const hasStoreKit2Credentials = !!(
    process.env.APPLE_PRIVATE_KEY &&
    process.env.APPLE_KEY_ID &&
    process.env.APPLE_ISSUER_ID
  )

  // Fix 4: dev-mode bypass is only allowed in development
  if (!hasStoreKit2Credentials && !process.env.APPLE_SHARED_SECRET) {
    const isDev = process.env.NODE_ENV === 'development'
    if (isDev) {
      console.warn('IAP: No Apple credentials, skipping (dev mode)')
      return { isValid: true, details: { environment: 'development' } }
    }
    console.error('IAP: No Apple credentials configured in production, rejecting')
    return { isValid: false }
  }

  // ── Path 1: Client sent signedTransactionInfo (StoreKit 2 client) ──
  if (signedTransactionInfo) {
    try {
      const txPayload: JWSTransactionPayload = await verifyAppleJWSTransaction(signedTransactionInfo)

      // SECURITY: Validate that the JWS payload matches the claimed transaction/product.
      // Without this check, a user could reuse a valid JWS from one purchase to unlock another.
      const expectedBundleId = process.env.APPLE_BUNDLE_ID || 'com.bookcraft.app'
      if (
        txPayload.transactionId !== transactionId ||
        txPayload.productId !== productId ||
        txPayload.bundleId !== expectedBundleId
      ) {
        console.error('IAP: JWS payload mismatch', {
          expected: { transactionId, productId, bundleId: expectedBundleId },
          received: { transactionId: txPayload.transactionId, productId: txPayload.productId, bundleId: txPayload.bundleId },
        })
        return { isValid: false }
      }

      console.error('IAP: Apple JWS transaction verified', { transactionId: txPayload.transactionId })
      return {
        isValid: true,
        details: {
          ...txPayload,
          validationMethod: 'storekit2-jws-verification',
        },
      }
    } catch (error) {
      console.error('IAP: Apple JWS verification failed', error)
      return { isValid: false }
    }
  }

  // ── Path 2: Use App Store Server API v2 to look up transaction ──
  if (hasStoreKit2Credentials) {
    try {
      const result = await lookupTransactionViaServerAPI(transactionId, productId)
      if (result) return result
    } catch (error) {
      console.error('IAP: App Store Server API lookup failed, trying legacy', error)
    }
  }

  // ── Path 3: Legacy fallback — verifyReceipt (for old clients) ──
  // Only attempt if credentials exist AND receipt data was provided (StoreKit 2 clients may omit it)
  if (process.env.APPLE_SHARED_SECRET && receiptData) {
    console.warn('IAP: Using legacy verifyReceipt (deprecated) — update client to StoreKit 2')
    return await validateApplePurchaseLegacy(receiptData)
  }

  return { isValid: false }
}

/**
 * Look up a transaction via Apple's App Store Server API v2.
 * Tries production first, then sandbox.
 */
async function lookupTransactionViaServerAPI(
  transactionId: string,
  productId: string,
): Promise<{ isValid: boolean; details?: Record<string, unknown> } | null> {
  // Validate transactionId format: Apple transaction IDs are numeric strings (up to 18 digits)
  if (!/^\d{1,18}$/.test(transactionId)) {
    console.error('IAP: Invalid transactionId format', { transactionId })
    return { isValid: false }
  }

  const jwt = await generateAppleJWT()
  const expectedBundleId = process.env.APPLE_BUNDLE_ID || 'com.bookcraft.app'

  // Try production first, then sandbox
  const urls = [
    `${APPLE_PRODUCTION_URL}/inApps/v1/transactions/${transactionId}`,
    `${APPLE_SANDBOX_URL}/inApps/v1/transactions/${transactionId}`,
  ]

  for (const url of urls) {
    // Add 10s timeout to avoid hanging on Apple API outages/slowdowns
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10_000)

    let response: Response
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${jwt}` },
        signal: controller.signal,
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error(`IAP: App Store Server API timed out for ${url}`)
      } else {
        console.error(`IAP: App Store Server API fetch error for ${url}`, fetchError)
      }
      continue
    } finally {
      clearTimeout(timeoutId)
    }

    if (response.status === 404) continue

    // 401/403 = credential/config error — throw to surface it distinctly from transient failures
    if (response.status === 401 || response.status === 403) {
      const errorText = await response.text()
      console.error(`IAP: Apple API credential error (${response.status}) — check APPLE_PRIVATE_KEY, APPLE_KEY_ID, APPLE_ISSUER_ID`, errorText)
      throw new Error(`Apple API authentication failed (${response.status}) — configuration error`)
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`IAP: App Store Server API error (${response.status})`, errorText)
      continue
    }

    const data = await response.json()
    const signedTransaction = data.signedTransactionInfo

    if (signedTransaction) {
      try {
        const txPayload: JWSTransactionPayload = await verifyAppleJWSTransaction(signedTransaction)

        // SECURITY: Validate productId and bundleId from the verified payload
        if (txPayload.productId !== productId || txPayload.bundleId !== expectedBundleId) {
          console.error('IAP: Server API transaction payload mismatch', {
            expected: { productId, bundleId: expectedBundleId },
            received: { productId: txPayload.productId, bundleId: txPayload.bundleId },
          })
          return { isValid: false }
        }

        return {
          isValid: true,
          details: {
            ...txPayload,
            validationMethod: 'storekit2-server-api',
            environment: url.includes('sandbox') ? 'sandbox' : 'production',
          },
        }
      } catch (error) {
        console.error('IAP: Failed to verify transaction from Server API', error)
      }
    }
  }

  return null
}

/**
 * Legacy verifyReceipt validation — DEPRECATED.
 * Kept for backward compatibility with old app versions.
 * Will be removed once all clients migrate to StoreKit 2.
 */
async function validateApplePurchaseLegacy(
  receiptData: string
): Promise<{ isValid: boolean; details?: Record<string, unknown> }> {
  try {
    const appleSharedSecret = process.env.APPLE_SHARED_SECRET

    if (!appleSharedSecret) {
      return { isValid: false }
    }

    const endpoints = [
      'https://buy.itunes.apple.com/verifyReceipt',
      'https://sandbox.itunes.apple.com/verifyReceipt',
    ]

    for (const endpoint of endpoints) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'receipt-data': receiptData,
          'password': appleSharedSecret,
          'exclude-old-transactions': true,
        }),
      })

      const result = await response.json()
      if (result.status === 0) {
        return {
          isValid: true,
          details: { ...result, validationMethod: 'legacy-verifyReceipt' },
        }
      }
      // Status 21007 = receipt is from sandbox, retry with sandbox URL
      if (result.status !== 21007) return { isValid: false }
    }

    return { isValid: false }
  } catch (error) {
    console.error('IAP: Apple legacy validation error', error)
    return { isValid: false }
  }
}

// ─── Google Play ─────────────────────────────────────────────────────────────

/**
 * Validate Google Play purchase
 */
async function validateGooglePlayPurchase(
  productId: string,
  purchaseToken: string
): Promise<{ isValid: boolean; details?: Record<string, unknown> }> {
  try {
    const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.bookcraft.app'
    const serviceAccountKey = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON

    if (!serviceAccountKey) {
      // Reject ALL purchases when no service account is configured.
      // This prevents a fraudster from deleting the env var to bypass validation.
      // To allow purchases: set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON in Vercel env vars.
      console.error('IAP: GOOGLE_PLAY_SERVICE_ACCOUNT_JSON not configured — rejecting purchase')
      return { isValid: false }
    }

    const credentials = JSON.parse(serviceAccountKey)
    const accessToken = await getGoogleAccessToken(credentials)

    // Add 10-second timeout (matching Apple API timeout)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10_000)

    let response: Response
    try {
      response = await fetch(
        `${GOOGLE_PLAY_API}/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}`,
        { headers: { Authorization: `Bearer ${accessToken}` }, signal: controller.signal }
      )
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('IAP: Google Play API timed out after 10s')
        return { isValid: false }
      }
      throw fetchError
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      console.error('IAP: Google Play API error', await response.text())
      return { isValid: false }
    }

    const purchaseData = await response.json()
    return { isValid: purchaseData.purchaseState === 0, details: purchaseData }

  } catch (error) {
    console.error('IAP: Google Play validation error', error)
    return { isValid: false }
  }
}
