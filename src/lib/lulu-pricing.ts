/**
 * Server-only Lulu pricing helpers.
 * This file uses LuluAPI (which depends on Node.js crypto) and must
 * NEVER be imported in 'use client' components.
 */
import { LuluAPI, LuluShippingLevel, LuluCurrency } from './lulu-api'

/**
 * Fetch the live Lulu base print cost (in cents) for a given book format and destination.
 * Uses LuluAPI.calculatePrice() to get real-time pricing from Lulu.
 */
export async function getLuluPrintCost(
  podPackageId: string,
  quantity: number,
  shippingAddress: {
    city: string
    country_code: string
    postcode: string
    state_code?: string
    street1: string
    phone_number: string
  },
  shippingOption: LuluShippingLevel = 'MAIL',
  currency: LuluCurrency = 'EUR'
): Promise<number> {
  const pricing = await LuluAPI.calculatePrice({
    line_items: [{ pod_package_id: podPackageId, quantity }],
    shipping_address: shippingAddress,
    shipping_option: shippingOption,
    currency,
  })
  return Math.round(parseFloat(pricing.total_cost_incl_tax) * 100)
}
