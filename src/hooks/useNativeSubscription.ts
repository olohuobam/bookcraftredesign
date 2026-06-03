'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '@/context/AuthContext'
import { IAP_PRODUCT_IDS } from '@/lib/pricing'

// Subscription product IDs — must match EXACTLY what is configured in
// App Store Connect (iOS) and Google Play Console (Android).
// Bundle ID: com.bookcraft.app
export const SUBSCRIPTION_PRODUCTS = {
  pro_monthly: 'com.bookcraft.subscription.pro',
  pro_yearly: 'com.bookcraft.subscription.pro',
}

// Google Play Base Plan IDs (within com.bookcraft.subscription.pro)
export const SUBSCRIPTION_BASE_PLANS: Record<keyof typeof SUBSCRIPTION_PRODUCTS, string> = {
  pro_monthly: 'montly', // typo in Play Console — intentional
  pro_yearly: 'yearly',
} as const

export type SubscriptionProductKey = keyof typeof SUBSCRIPTION_PRODUCTS

interface SubscriptionProduct {
  id: string
  title: string
  description: string
  price: string
  priceMicros: number
  currency: string
}

interface SubscriptionResult {
  success: boolean
  plan?: string
  expiresAt?: string
  error?: string
}

// Note: Window.CdvPurchase is declared in useInAppPurchase.ts.
// We reference the store via the existing global type.
// restorePurchases is optional — cast where needed.

/**
 * useNativeSubscription
 *
 * Manages native IAP subscriptions for iOS (StoreKit) and Android (Play Billing).
 * 
 * IMPORTANT:
 * - Only active on native platforms (Capacitor.isNativePlatform())
 * - Web uses Stripe — never use this hook's purchase/restore on web
 * - Platform detection: Capacitor.isNativePlatform() && Capacitor.getPlatform()
 */
export function useNativeSubscription() {
  const { user, getIdToken } = useAuth()
  const [isReady, setIsReady] = useState(false)
  const [products, setProducts] = useState<Record<string, SubscriptionProduct>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isNative = Capacitor.isNativePlatform()
  const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web'

  const purchaseResolverRef = useRef<{
    resolve: (tx: { fullTransaction: unknown; transactionId?: string; receipt?: string; signedTransactionInfo?: string }) => void
    reject: (err: Error) => void
  } | null>(null)

  // Initialize CdvPurchase store with subscription products
  useEffect(() => {
    if (!isNative) return

    const initStore = async () => {
      try {
        // Wait for CdvPurchase to become available (injected by Cordova runtime)
        await new Promise<void>((resolve) => {
          const check = () => {
            if (window.CdvPurchase?.store) resolve()
            else setTimeout(check, 100)
          }
          check()
          setTimeout(resolve, 6000)
        })

        if (!window.CdvPurchase?.store) {
          // Surface this prominently — without CdvPurchase no subscription
          // popup can ever appear. Common causes: Cordova bridge JS injection
          // failed (Capacitor server.url mismatch with allowed origin), or the
          // app wasn't rebuilt after installing cordova-plugin-purchase.
          console.error('useNativeSubscription: CdvPurchase store not available after 6s — Cordova bridge missing. Check capacitor.config.ts server.url matches runtime origin and that npx cap sync android ran successfully.')
          setError('In-App-Käufe nicht verfügbar (Bridge fehlt). App neu installieren.')
          return
        }

        const { store, Platform, ProductType } = window.CdvPurchase

        const storePlatform = platform === 'ios' ? Platform.APPLE_APPSTORE : Platform.GOOGLE_PLAY

        // Register subscription products (deduplicated — monthly/yearly share same product ID).
        // IMPORTANT: also register the one-time book products here, even though this hook
        // doesn't use them. The cordova-plugin-purchase store is a singleton, but whichever
        // hook calls store.initialize() first locks in which products get fetched from the
        // store. If this hook (mounted by DashboardLayout everywhere) wins the race and only
        // registered the subscription, useInAppPurchase's later book registrations are
        // ignored by the platform fetch → store.get() returns undefined for books → the
        // book purchase button hangs in "Loading…" forever.
        const uniqueSubscriptionIds = [...new Set(Object.values(SUBSCRIPTION_PRODUCTS))]
        const bookProductIds = Object.values(IAP_PRODUCT_IDS)
        store.register([
          ...uniqueSubscriptionIds.map((id) => ({
            id,
            type: ProductType.PAID_SUBSCRIPTION,
            platform: storePlatform,
          })),
          ...bookProductIds.map((id) => ({
            id,
            type: ProductType.CONSUMABLE,
            platform: storePlatform,
          })),
        ])

        // Single approved handler — resolves the current purchase Promise
        const storeEvents = store.when() as {
          approved: (cb: (t: unknown) => void) => typeof storeEvents
          verified?: (cb: (t: unknown) => void) => typeof storeEvents
          finished?: (cb: (t: unknown) => void) => typeof storeEvents
        }

        storeEvents.approved(async (transaction: unknown) => {
          console.log('useNativeSubscription: Transaction approved', transaction)
          if (purchaseResolverRef.current) {
            const tx = transaction as Record<string, unknown>
            purchaseResolverRef.current.resolve({
              fullTransaction: transaction,
              transactionId: tx.transactionId as string | undefined,
              receipt: tx.receipt as string | undefined,
              signedTransactionInfo: tx.signedTransactionInfo as string | undefined,
            })
            purchaseResolverRef.current = null
          }
        })

        // Register error handler to surface initialization failures
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const storeAny = store as any
        if (typeof storeAny.error === 'function') {
          storeAny.error((err: unknown) => {
            console.error('useNativeSubscription: Store error', err)
          })
        }

        // IMPORTANT: register ready() BEFORE initialize() — the event fires
        // during initialization and would be missed if registered after await.
        // Timeout fallback: if store.ready() never fires within 15s, force-ready
        // so the user gets a clear error instead of a forever-loading button.
        let readyFired = false
        const readyTimeout = setTimeout(() => {
          if (!readyFired) {
            console.warn('useNativeSubscription: store.ready() timed out after 15s — forcing isReady')
            setError('Google Play Store konnte nicht geladen werden. Bitte App neu starten.')
            setIsReady(true)
          }
        }, 15000)

        store.ready(() => {
          readyFired = true
          clearTimeout(readyTimeout)
          console.log('useNativeSubscription: Store ready')
          const loadedProducts: Record<string, SubscriptionProduct> = {}
          for (const [key, id] of Object.entries(SUBSCRIPTION_PRODUCTS)) {
            const p = store.get(id)
            if (p) {
              loadedProducts[key] = p
            } else {
              console.warn(`useNativeSubscription: Product not found after ready: ${id}`)
            }
          }
          console.log('useNativeSubscription: Loaded products', Object.keys(loadedProducts))
          setProducts(loadedProducts)
          if (Object.keys(loadedProducts).length === 0) {
            // Store ready but no subscription product loaded — Pro purchase button
            // will fail silently when tapped. Surface this so the user knows.
            console.error('useNativeSubscription: Store ready but subscription product not loaded. Verify Play Console subscription is Active, base-plan IDs match (montly/yearly), and app is installed via internal-testing track.')
            setError('Abo-Produkt nicht vom Store geladen. Play Console prüfen.')
          }
          setIsReady(true)
        })

        console.log('useNativeSubscription: Calling store.initialize...')
        await store.initialize([storePlatform])
        console.log('useNativeSubscription: store.initialize() resolved')
      } catch (err) {
        console.error('useNativeSubscription: Initialization error', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize subscription store')
      }
    }

    initStore()
  }, [isNative, platform])

  /**
   * Subscribe to a plan.
   * Returns success + plan details after server-side validation.
   */
  const subscribe = useCallback(
    async (productKey: SubscriptionProductKey = 'pro_monthly'): Promise<SubscriptionResult> => {
      if (!isNative) return { success: false, error: 'Native IAP only available in the app' }
      if (!window.CdvPurchase?.store) return { success: false, error: 'Store not initialized' }
      if (!user) return { success: false, error: 'Not authenticated' }
      if (purchaseResolverRef.current) return { success: false, error: 'A purchase is already in progress' }

      setIsLoading(true)
      setError(null)

      try {
        if (!isReady) return { success: false, error: 'Store not ready yet. Please wait a moment and try again.' }

        const productId = SUBSCRIPTION_PRODUCTS[productKey]
        const basePlanId = SUBSCRIPTION_BASE_PLANS[productKey]
        const store = window.CdvPurchase.store

        // Verify the product is loaded in the store before ordering
        const product = store.get(productId)
        if (!product) {
          console.error('useNativeSubscription: Product not found in store', { productId })
          return { success: false, error: 'Product not available. Please restart the app and try again.' }
        }

        // In CdvPurchase v13, subscriptions must be ordered via an Offer object,
        // not just the product ID string. Find the matching offer by base plan ID.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const productAny = product as any
        const offers: unknown[] = productAny.offers ?? []
        const offer =
          offers.find((o: unknown) => (o as { id?: string }).id === basePlanId) ??
          offers[0]

        if (!offer) {
          console.error('useNativeSubscription: No offer found for product', { productId, basePlanId, offers })
          return { success: false, error: 'No subscription offer available. Please try again later.' }
        }

        console.log('useNativeSubscription: Ordering offer', { productId, basePlanId, offer })

        store.applicationUsername = user.id

        // Wait for native payment sheet result via approved event
        const { fullTransaction, transactionId, receipt, signedTransactionInfo } = await new Promise<{
          fullTransaction: unknown
          transactionId?: string
          receipt?: string
          signedTransactionInfo?: string
        }>((resolve, reject) => {
          const timeout = setTimeout(() => {
            purchaseResolverRef.current = null
            reject(new Error('Purchase timed out or was cancelled'))
          }, 120_000)

          purchaseResolverRef.current = {
            resolve: (tx) => { clearTimeout(timeout); resolve(tx) },
            reject: (err) => { clearTimeout(timeout); reject(err) },
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          store.order(offer as any).then((result) => {
            // store.order() returns undefined on success (payment sheet initiated).
            // It returns an IError object on failure.
            // IMPORTANT: undefined/null here means SUCCESS — do NOT reject, wait for approved event.
            if (result != null && typeof result === 'object' && 'isError' in result) {
              clearTimeout(timeout)
              purchaseResolverRef.current = null
              const errMsg = (result as { message?: string }).message || 'Purchase failed. Please try again.'
              reject(new Error(errMsg))
            }
            // result === undefined → payment sheet opened successfully, waiting for user action
          }).catch((err) => {
            clearTimeout(timeout)
            purchaseResolverRef.current = null
            reject(err)
          })
        })

        // Validate server-side
        const idToken = await getIdToken()
        const response = await fetch('/api/iap/subscription/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({
            productId,
            transactionId,
            receipt: receipt ?? '',
            platform,
            userId: user.id,
            signedTransactionInfo,
          }),
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error ?? 'Server validation failed')
        }

        const data = await response.json()

        // Finish the transaction so it's removed from the payment queue
        store.finish(fullTransaction)

        return { success: true, plan: data.plan, expiresAt: data.expiresAt }
      } catch (err) {
        console.error('useNativeSubscription: subscribe error', err)
        const msg = err instanceof Error ? err.message : 'Subscription failed'
        setError(msg)
        return { success: false, error: msg }
      } finally {
        setIsLoading(false)
      }
    },
    [isNative, platform, user, getIdToken]
  )

  /**
   * Restore previously purchased subscriptions.
   * Called when user taps "Restore Purchases".
   */
  const restorePurchases = useCallback(async (): Promise<SubscriptionResult> => {
    if (!isNative) return { success: false, error: 'Native IAP only available in the app' }
    if (!user) return { success: false, error: 'Not authenticated' }

    setIsLoading(true)
    setError(null)

    try {
      // Trigger native restore flow (restorePurchases is optional on some versions)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const storeRef = window.CdvPurchase?.store as any
      if (typeof storeRef?.restorePurchases === 'function') {
        await storeRef.restorePurchases()
      }

      // Ask server to confirm and activate restored subscription
      const idToken = await getIdToken()
      const response = await fetch('/api/iap/subscription/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ platform, userId: user.id }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error ?? 'Restore failed')
      }

      const data = await response.json()

      if (!data.restored) {
        return { success: true, error: data.message ?? 'No active subscription found to restore' }
      }

      return { success: true, plan: data.plan, expiresAt: data.expiresAt }
    } catch (err) {
      console.error('useNativeSubscription: restorePurchases error', err)
      const msg = err instanceof Error ? err.message : 'Restore failed'
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setIsLoading(false)
    }
  }, [isNative, platform, user, getIdToken])

  return {
    isNative,
    isReady,
    isLoading,
    error,
    platform,
    products,
    subscribe,
    restorePurchases,
  }
}
