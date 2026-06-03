/**
 * Shared IAP validation utilities.
 * Used by both /api/iap/validate and /api/iap/subscription/validate.
 */

import { SignJWT, importPKCS8, createRemoteJWKSet, jwtVerify } from 'jose'

const APPLE_JWKS_URL = new URL('https://appleid.apple.com/auth/keys')
// Module-level JWKS fetcher — jose caches internally; creating once is more efficient
export const APPLE_JWKS = createRemoteJWKSet(APPLE_JWKS_URL)

export interface JWSTransactionPayload {
  transactionId: string
  originalTransactionId?: string
  productId: string
  bundleId: string
  quantity?: number
  type?: string
  inAppOwnershipType?: string
  purchaseDate?: number
  expiresDate?: number
  environment?: string
  [key: string]: unknown
}

/**
 * Generate a JWT for Apple App Store Server API authentication.
 * Uses ES256 (P-256) with the private key from environment.
 *
 * Required env vars:
 * - APPLE_PRIVATE_KEY: The .p8 private key contents (PEM format)
 * - APPLE_KEY_ID: Key ID from App Store Connect
 * - APPLE_ISSUER_ID: Issuer ID from App Store Connect
 * - APPLE_BUNDLE_ID: App bundle identifier
 */
export async function generateAppleJWT(): Promise<string> {
  const privateKeyPem = process.env.APPLE_PRIVATE_KEY
  const keyId = process.env.APPLE_KEY_ID
  const issuerId = process.env.APPLE_ISSUER_ID
  const bundleId = process.env.APPLE_BUNDLE_ID || 'com.bookcraft.app'

  if (!privateKeyPem || !keyId || !issuerId) {
    throw new Error('Missing Apple API credentials (APPLE_PRIVATE_KEY, APPLE_KEY_ID, APPLE_ISSUER_ID)')
  }

  // Normalize the private key: handle escaped newlines from env vars
  const normalizedKey = privateKeyPem.replace(/\\n/g, '\n')
  const privateKey = await importPKCS8(normalizedKey, 'ES256')

  return new SignJWT({ bid: bundleId })
    .setProtectedHeader({ alg: 'ES256', kid: keyId, typ: 'JWT' })
    .setIssuer(issuerId)
    .setIssuedAt()
    .setExpirationTime('20m')
    .setAudience('appstoreconnect-v1')
    .sign(privateKey)
}

/**
 * Verify a JWSTransaction signed by Apple using their public JWKS endpoint.
 * Returns the decoded transaction payload if valid.
 */
export async function verifyAppleJWSTransaction(
  signedTransaction: string
): Promise<JWSTransactionPayload> {
  const { payload } = await jwtVerify(signedTransaction, APPLE_JWKS, {
    // Apple signs with ES256
    algorithms: ['ES256'],
  })

  // Validate required fields are present in the Apple-signed payload
  if (
    typeof payload.transactionId !== 'string' ||
    typeof payload.productId !== 'string' ||
    typeof payload.bundleId !== 'string'
  ) {
    throw new Error('Apple JWS payload missing required fields (transactionId, productId, bundleId)')
  }

  return payload as unknown as JWSTransactionPayload
}

/**
 * Build a signed RS256 JWT and exchange it for a Google OAuth2 access token.
 *
 * Uses Node.js built-in `crypto` — no external dependencies required.
 *
 * Required env vars (stored in Vercel):
 *   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON — full service account JSON with
 *   `client_email` and `private_key` fields.
 */
export async function getGoogleAccessToken(credentials: {
  client_email: string
  private_key: string
}): Promise<string> {
  const { createSign } = await import('crypto')
  const { client_email, private_key } = credentials

  if (!client_email || !private_key) {
    throw new Error(
      'IAP: Google Service Account credentials incomplete. ' +
        'Set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON in Vercel env vars.'
    )
  }

  // Normalise private key: Vercel stores newlines as literal \n
  const pemKey = private_key.replace(/\\n/g, '\n')

  // --- Build JWT ---
  const now = Math.floor(Date.now() / 1000)

  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT' })
  ).toString('base64url')

  const payload = Buffer.from(
    JSON.stringify({
      iss: client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  ).toString('base64url')

  const signingInput = `${header}.${payload}`

  const signer = createSign('RSA-SHA256')
  signer.update(signingInput)
  const signature = signer.sign(pemKey, 'base64url')

  const signedJwt = `${signingInput}.${signature}`

  // --- Exchange JWT for access token ---
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signedJwt,
    }),
  })

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text()
    throw new Error(`IAP: Failed to obtain Google access token: ${err}`)
  }

  const tokenData = await tokenResponse.json()

  if (!tokenData.access_token) {
    throw new Error(
      `IAP: Google token response missing access_token: ${JSON.stringify(tokenData)}`
    )
  }

  return tokenData.access_token as string
}
