/**
 * Coupon/Discount system for Bookcraft
 * Integrates with Supabase for storage and Stripe for checkout
 */

import { createClient } from '@supabase/supabase-js'

export interface Coupon {
 id: string
 code: string
 discount_type: 'percentage' | 'flat'
 discount_value: number // percentage (0-100) or flat amount in cents
 currency: string
 max_uses: number | null
 current_uses: number
 expires_at: string | null
 min_purchase_cents: number | null
 applicable_to: 'digital' | 'print' | 'bundle' | 'all'
 active: boolean
 created_at: string
}

export interface DiscountResult {
 valid: boolean
 coupon?: Coupon
 discount_cents: number
 final_price_cents: number
 error?: string
}

/**
 * Validate and apply a coupon code
 */
export async function validateCoupon(
 code: string,
 originalPriceCents: number,
 purchaseType: 'digital' | 'print' | 'bundle' = 'digital'
): Promise<DiscountResult> {
 const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
 const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

 if (!supabaseUrl || !supabaseKey) {
 return { valid: false, discount_cents: 0, final_price_cents: originalPriceCents, error: 'Service unavailable' }
 }

 const supabase = createClient(supabaseUrl, supabaseKey)

  // Look up coupon
 const { data: coupon, error } = await supabase
 .from('coupons')
 .select('*')
 .eq('code', code.toUpperCase().trim())
 .eq('active', true)
 .single()

 if (error || !coupon) {
 return { valid: false, discount_cents: 0, final_price_cents: originalPriceCents, error: 'Invalid coupon code' }
 }

  // Check expiry
 if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
 return { valid: false, discount_cents: 0, final_price_cents: originalPriceCents, error: 'Coupon has expired' }
 }

  // Check usage limit
 if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
 return { valid: false, discount_cents: 0, final_price_cents: originalPriceCents, error: 'Coupon usage limit reached' }
 }

  // Check applicability
 if (coupon.applicable_to !== 'all' && coupon.applicable_to !== purchaseType) {
 return { valid: false, discount_cents: 0, final_price_cents: originalPriceCents, error: `Coupon not valid for ${purchaseType} purchases` }
 }

  // Check minimum purchase
 if (coupon.min_purchase_cents !== null && originalPriceCents < coupon.min_purchase_cents) {
 return { valid: false, discount_cents: 0, final_price_cents: originalPriceCents, error: `Minimum purchase of ${(coupon.min_purchase_cents / 100).toFixed(2)} required` }
 }

  // Calculate discount
 let discountCents: number
 if (coupon.discount_type === 'percentage') {
 discountCents = Math.round(originalPriceCents * (coupon.discount_value / 100))
 } else {
 discountCents = coupon.discount_value
 }

  // Don't discount below zero
 discountCents = Math.min(discountCents, originalPriceCents)
 const finalPrice = originalPriceCents - discountCents

 return {
 valid: true,
 coupon,
 discount_cents: discountCents,
 final_price_cents: finalPrice,
 }
}

/**
 * Increment coupon usage after successful purchase
 */
export async function incrementCouponUsage(couponId: string): Promise<void> {
 const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
 const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

 if (!supabaseUrl || !supabaseKey) return

 const supabase = createClient(supabaseUrl, supabaseKey)

 await supabase.rpc('increment_coupon_usage', { coupon_id: couponId })
}
