'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { IAP_PRODUCT_IDS, IAP_SUBSCRIPTION_PRO_ID } from '@/lib/pricing'

interface Product {
 id: string
 title: string
 description: string
 price: string
 priceMicros: number
 currency: string
}

interface PurchaseResult {
 success: boolean
 transactionId?: string
 receipt?: string
 error?: string
}

// CdvPurchase types
declare global {
 interface Window {
 CdvPurchase?: {
 store: {
 register: (products: Array<{ id: string; type: string; platform: string }>) => void
 ready: (callback: () => void) => void
 when: () => {
 approved: (callback: (transaction: unknown) => void) => { approved: (cb: (t: unknown) => void) => void }
 verified: (callback: (receipt: unknown) => void) => void
 finished: (callback: (transaction: unknown) => void) => void
 }
 initialize: (platforms?: string[]) => Promise<void>
 get: (productId: string) => Product | undefined
 order: (productId: string) => Promise<unknown>
 finish: (transaction: unknown) => void
 applicationUsername: string
 }
 Platform: {
 GOOGLE_PLAY: string
 APPLE_APPSTORE: string
 }
 ProductType: {
 CONSUMABLE: string
 NON_CONSUMABLE: string
 PAID_SUBSCRIPTION: string
 }
 }
 }
}

/**
 * useInAppPurchase Hook
 *
 * Handles In-App Purchases for native Android/iOS apps.
 * Supports multiple IAP price tiers (€4.99 – €19.99) and Pro subscription (€49.99/month).
 */
export function useInAppPurchase() {
 const [isReady, setIsReady] = useState(false)
 const [product, setProduct] = useState<Product | null>(null)
 const [isLoading, setIsLoading] = useState(false)
 const [error, setError] = useState<string | null>(null)

 const isNative = Capacitor.isNativePlatform()
 const platform = Capacitor.getPlatform()

  // Ref to hold the current purchase resolver so the single approved listener
  // can resolve the correct Promise without stacking multiple handlers.
 const purchaseResolverRef = useRef<{
 resolve: (tx: { fullTransaction: unknown; transactionId?: string; receipt?: string; signedTransactionInfo?: string }) => void
 reject: (err: Error) => void
 } | null>(null)

  // Initialize the store
 useEffect(() => {
 if (!isNative) {
      console.log('IAP: Running on web, skipping initialization')
 return
 }

 const initStore = async () => {
 try {
        // Wait for CdvPurchase to be available
 const checkStore = () => {
 return new Promise<void>((resolve) => {
 const check = () => {
 if (window.CdvPurchase?.store) {
 resolve()
 } else {
 setTimeout(check, 100)
 }
 }
 check()
 setTimeout(resolve, 5000)
 })
 }

 await checkStore()

 if (!window.CdvPurchase?.store) {
          // Surface this prominently — without CdvPurchase no purchase popup
          // can ever appear. Common causes: Cordova bridge JS injection failed
          // (Capacitor server.url mismatch with allowed origin), or the app
          // wasn't rebuilt after installing cordova-plugin-purchase.
          console.error('IAP: CdvPurchase not available after 5s — Cordova bridge missing. Check capacitor.config.ts server.url matches the runtime origin, and that npx cap sync android ran successfully before building.')
          setError('In-App-Käufe nicht verfügbar (Bridge fehlt). App neu installieren.')
 return
 }

 const { store, Platform, ProductType } = window.CdvPurchase

 const storePlatform = platform === 'ios'
 ? Platform.APPLE_APPSTORE
 : Platform.GOOGLE_PLAY

        // Register all IAP price-tier products as CONSUMABLE.
        // Books MUST be consumable: a user can buy any number of books at the same
        // price tier, and each purchase is fulfilled individually. NON_CONSUMABLE
        // would entitle the user to the tier ID permanently, after which Google Play
        // refuses to show the purchase sheet for that product ID again (the user
        // "already owns" it) — manifesting as a silently non-appearing popup.
 const allBookProductIds = Object.values(IAP_PRODUCT_IDS)
 store.register([
 ...allBookProductIds.map((id) => ({ id, type: ProductType.CONSUMABLE, platform: storePlatform })),
          // Pro subscription (PAID_SUBSCRIPTION = recurring monthly)
 { id: IAP_SUBSCRIPTION_PRO_ID, type: ProductType.PAID_SUBSCRIPTION, platform: storePlatform },
 ])

        // Handle purchase flow
        // Note: The cordova-plugin-purchase store.when() API may vary by version
        // Using type assertion to handle different API versions
 const storeEvents = store.when() as {
 approved: (cb: (t: unknown) => void) => typeof storeEvents
 verified?: (cb: (t: unknown) => void) => typeof storeEvents
 finished?: (cb: (t: unknown) => void) => typeof storeEvents
 }

 storeEvents.approved(async (transaction: unknown) => {
          console.log('IAP: Transaction approved', transaction)
          // Resolve the pending purchase Promise if one exists
 if (purchaseResolverRef.current) {
            const tx = transaction as Record<string, unknown>
 purchaseResolverRef.current.resolve({
 fullTransaction: transaction,
 transactionId: tx?.transactionId as string | undefined,
              // iOS StoreKit 2 provides signedTransactionInfo (JWS); legacy provides receipt
 receipt: tx?.receipt as string | undefined,
 signedTransactionInfo: tx?.signedTransactionInfo as string | undefined,
 })
 purchaseResolverRef.current = null
 }
 })

        // These handlers may not exist in all versions
 if (storeEvents.verified) {
 storeEvents.verified((receipt: unknown) => {
            console.log('IAP: Receipt verified', receipt)
 })
 }
 if (storeEvents.finished) {
 storeEvents.finished((transaction: unknown) => {
            console.log('IAP: Transaction finished', transaction)
 })
 }

        // CRITICAL: store.ready() must be registered BEFORE store.initialize()
        // Otherwise the ready event may fire during initialization and the callback
        // is never called — leaving isReady=false and product=null forever.
 store.ready(() => {
          console.log('IAP: Store ready — all products:', allBookProductIds.map(id => {
            const p = store.get(id)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return `${id}: ${p ? `FOUND (${(p as any).pricing?.price ?? 'no price'})` : 'NULL'}`
          }).join(', '))
 let productToUse = store.get(IAP_PRODUCT_IDS[999])
 if (!productToUse && allBookProductIds.length > 0) {
 productToUse = store.get(allBookProductIds[0])
 }
 if (productToUse) {
 setProduct(productToUse)
 } else {
            console.error('IAP: No products found in store after ready. The store initialized but Google Play / App Store returned zero products. Verify: (1) product IDs match exactly between code and Play/App Console, (2) products are Active/Approved, (3) app is installed via Play Store internal-testing track (sideloaded APKs cannot load products), (4) app signing key matches the Play Console upload key.')
            setError('Keine Produkte vom Store geladen. Prüfe Play Console (Produkte aktiv? Signatur korrekt?) oder installiere die App über den Play-Store-Internal-Testing-Track.')
 }
 setIsReady(true)
 })

 await store.initialize([storePlatform])

 } catch (err) {
        console.error('IAP: Initialization error', err)
 setError(err instanceof Error ? err.message : 'Failed to initialize IAP')
 }
 }

 initStore()
 }, [isNative, platform])

  // Purchase the book
  // store.order() triggers the native payment sheet; the actual transaction
  // arrives asynchronously via the store's `approved` event handler.
 const purchase = useCallback(async (
 bookId: string,
 userId: string,
 productId: string,
 token?: string
 ): Promise<PurchaseResult> => {
 if (!isNative) {
 return { success: false, error: 'Not running in native app' }
 }

 if (!window.CdvPurchase?.store) {
 return { success: false, error: 'Store not initialized' }
 }

    // Guard against concurrent purchases — reject immediately if one is already in flight
 if (purchaseResolverRef.current != null) {
 return { success: false, error: 'A purchase is already in progress' }
 }

 setIsLoading(true)
 setError(null)

 try {
 const store = window.CdvPurchase.store
 store.applicationUsername = `${userId}:${bookId}`

      // Wait for the approved event that fires after the user completes
      // the native purchase dialog. store.order() itself does NOT return
      // the transaction — it only initiates the flow.
      // Uses a ref-based resolver so the single approved listener registered
      // during init can route the transaction to this Promise.
 const { fullTransaction, transactionId, receipt, signedTransactionInfo } = await new Promise<{ fullTransaction: unknown; transactionId?: string; receipt?: string; signedTransactionInfo?: string }>((resolve, reject) => {
 const timeout = setTimeout(() => {
 purchaseResolverRef.current = null
 reject(new Error('Purchase timed out or was cancelled'))
 }, 120_000)

        // Store resolver in ref so the init-time approved handler can use it
 purchaseResolverRef.current = {
 resolve: (tx) => { clearTimeout(timeout); resolve(tx) },
 reject: (err) => { clearTimeout(timeout); reject(err) },
 }

        // Initiate the native purchase dialog.
        // store.order() in v13 requires an Offer object, NOT a string.
        // Passing a plain string causes offer.productId = undefined → "Product not registered: null"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const product = store.get(productId) as any
        const offer = product?.getOffer?.() ?? product?.offers?.[0]
        if (!offer) {
          clearTimeout(timeout)
          purchaseResolverRef.current = null
          reject(new Error(`Product offer not found for: ${productId}. Make sure the product is loaded from the store.`))
          return
        }
        console.log(`IAP: Ordering offer for ${productId}:`, JSON.stringify(offer))
        // IMPORTANT: undefined means SUCCESS — do NOT reject; wait for approved event.
 store.order(offer).then((orderResult) => {
 if (orderResult != null && typeof orderResult === 'object' && 'isError' in orderResult) {
 clearTimeout(timeout)
 purchaseResolverRef.current = null
 const errMsg = (orderResult as { message?: string }).message || 'Purchase failed. Please try again.'
 reject(new Error(errMsg))
 }
          // orderResult === undefined → payment sheet opened, waiting for user
 }).catch((err) => {
 clearTimeout(timeout)
 purchaseResolverRef.current = null
 reject(err)
 })
 })

      // Validate receipt on our server
 const validateResponse = await fetch('/api/iap/validate', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 ...(token ? { Authorization: `Bearer ${token}` } : {}),
 },
 body: JSON.stringify({
 productId,
 transactionId,
 receipt: receipt ?? '',
 platform,
 bookId,
 userId,
            // iOS StoreKit 2: signed JWS transaction for server-side verification
 signedTransactionInfo,
 }),
 })

 if (!validateResponse.ok) {
 const errorData = await validateResponse.json()
 throw new Error(errorData.error || 'Receipt validation failed')
 }

 store.finish(fullTransaction)

 setIsLoading(false)
 return {
 success: true,
 transactionId,
 receipt,
 }

 } catch (err) {
      console.error('IAP: Purchase error', err)
 const errorMessage = err instanceof Error ? err.message : 'Purchase failed'
 setError(errorMessage)
 setIsLoading(false)
 return { success: false, error: errorMessage }
 }
 }, [isNative, platform])

 const isAvailable = isNative && isReady && product !== null

 return {
 isReady,
 isLoading,
 isNative,
 isAvailable,
 product,
 error,
 platform,
 purchase,
 }
}
