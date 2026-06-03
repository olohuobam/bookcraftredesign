/**
 * Central price configuration for Bookcraft
 * All prices in cents for Stripe compatibility
 *
 * Dynamic pricing based on book size:
 * - Text books: 5-20 chapters (€4.99 - €19.99)
 * - Picture books: 8-24 pages (€4.99 - €19.99)
 *
 * Apple IAP compatible price tiers (max €19.99)
 */

export type SupportedCurrency = 'EUR' | 'USD' | 'GBP' | 'CAD' | 'AUD'

// Price lookup tables — Apple IAP compatible price tiers (4 clean tiers)
const TEXT_BOOK_PRICES: Readonly<Record<number, number>> = {
 5: 499, // €4.99 - 5 chapters
 10: 999, // €9.99 - 10 chapters
 15: 1499, // €14.99 - 15 chapters
 20: 1999, // €19.99 - 20 chapters
}

const PICTURE_BOOK_PRICES: Readonly<Record<number, number>> = {
 8: 499, // €4.99 - 8 pages
 16: 1499, // €14.99 - 16 pages
 24: 1999, // €19.99 - 24 pages
}

/**
 * Apple/Google IAP Product ID mapping for book purchases (CONSUMABLE)
 * Keys are price in cents, values are store product IDs.
 * Format: com.bookcraft.app.book_<price_in_cents>
 * Must match exactly what is configured in App Store Connect / Google Play Console.
 */
export const IAP_PRODUCT_IDS: Record<number, string> = {
 499: 'com.bookcraft.book.499',
 999: 'com.bookcraft.book.999',
 1499: 'com.bookcraft.book.1499',
 1999: 'com.bookcraft.book.1999',
}

/**
 * IAP product ID for the Pro subscription (PAID_SUBSCRIPTION)
 * Must match App Store Connect / Google Play Console configuration.
 */
export const IAP_SUBSCRIPTION_PRO_ID = 'com.bookcraft.subscription.pro'

/**
 * Snaps a price in cents to the nearest IAP tier price.
 * Use this before calling getIAPProductId when the price may be interpolated.
 * @param priceInCents Price in cents
 * @returns Nearest IAP tier price in cents
 */
export function snapToIAPTier(priceInCents: number): number {
 const tiers = Object.keys(IAP_PRODUCT_IDS).map(Number).sort((a, b) => a - b)
 return tiers.reduce((prev, curr) => {
 const currDiff = Math.abs(curr - priceInCents)
 const prevDiff = Math.abs(prev - priceInCents)
 if (currDiff < prevDiff) return curr
 if (currDiff > prevDiff) return prev
    // Tie: prefer higher tier to avoid undercharging
 return Math.max(curr, prev)
 })
}

/**
 * Returns the IAP product ID for an exact matching price tier.
 * Throws if price does not exactly match a configured IAP tier.
 * Use snapToIAPTier() first if the price may be interpolated.
 *
 * @param priceInCents Price in cents (must exactly match a key in IAP_PRODUCT_IDS)
 * @returns IAP product ID string
 * @throws Error if the price does not match any configured IAP tier
 */
export function getIAPProductId(priceInCents: number): string {
 const productId = IAP_PRODUCT_IDS[priceInCents]
 if (!productId) {
 throw new Error(
 `No IAP product ID configured for price: ${priceInCents} cents. ` +
 "Ensure the price is snapped to a supported IAP tier before calling getIAPProductId."
 )
 }
 return productId
}

export const PRICING = {
  // Subscription plans
 SUBSCRIPTION: {
 PRO: 4999, // €49.99/month - Bookcraft Pro unlimited books
 },

  // Legacy: Fixed price (for backwards compatibility)
 DIGITAL_BOOK: 999, // €9.99

  // Book type limits
 TEXT_BOOK: {
 MIN_CHAPTERS: 5,
 MAX_CHAPTERS: 20,
 },
 PICTURE_BOOK: {
 MIN_PAGES: 8,
 MAX_PAGES: 24,
 },

  // Price lookups
 TEXT_BOOK_PRICES,
 PICTURE_BOOK_PRICES,

  // Print margin/markup configuration
 PRINT_MARKUP: {
 PERCENTAGE: 0.15, // 15% markup on Lulu base cost
 MIN_FEE_CENTS: 299, // minimum €2.99 service fee
 },

  // Bundle discount (digital + print together)
 BUNDLE_DISCOUNT_PERCENTAGE: 0.15, // 15% off combined price

  // Default currency
 DEFAULT_CURRENCY: 'EUR' as SupportedCurrency,
} as const

/**
 * Currency configuration with symbols and locale
 */
export const CURRENCY_CONFIG: Record<SupportedCurrency, { symbol: string; locale: string }> = {
 EUR: { symbol: '€', locale: 'de-DE' },
 USD: { symbol: '$', locale: 'en-US' },
 GBP: { symbol: '£', locale: 'en-GB' },
 CAD: { symbol: 'CA$', locale: 'en-CA' },
 AUD: { symbol: 'A$', locale: 'en-AU' },
}

/**
 * Approximate exchange rates from EUR (updated periodically)
 * In production, these would come from an API
 */
export const EXCHANGE_RATES: Record<SupportedCurrency, number> = {
 EUR: 1.0,
 USD: 1.08,
 GBP: 0.86,
 CAD: 1.47,
 AUD: 1.65,
}

/**
 * Formats a price in cents as a currency string
 * @param priceInCents Price in cents (e.g. 999)
 * @param currency Currency code (default: EUR)
 * @returns Formatted string (e.g. "€9.99")
 */
export function formatPrice(priceInCents: number, currency: SupportedCurrency = 'EUR'): string {
 const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.EUR
 const amount = priceInCents / 100
 return new Intl.NumberFormat(config.locale, {
 style: 'currency',
 currency,
 }).format(amount)
}

/**
 * Convert price in cents from EUR to another currency
 */
export function convertCurrency(priceInCentsEUR: number, targetCurrency: SupportedCurrency): number {
 if (targetCurrency === 'EUR') return priceInCentsEUR
 const rate = EXCHANGE_RATES[targetCurrency] || 1
 return Math.round(priceInCentsEUR * rate)
}

/**
 * Interpolates price between two known tier points
 */
function interpolatePrice(
 count: number,
 lowerTier: number,
 upperTier: number,
 lowerPrice: number,
 upperPrice: number
): number {
 const ratio = (count - lowerTier) / (upperTier - lowerTier)
 return Math.round(lowerPrice + ratio * (upperPrice - lowerPrice))
}

/**
 * Calculates dynamic price based on chapters/pages
 * Uses tiered pricing with interpolation between tiers
 *
 * @param bookType The type of the book ('picture' or 'text')
 * @param count Number of chapters (text) or pages (picture)
 * @returns Price in cents
 */
export function calculateDynamicPrice(bookType: string, count: number): number {
 if (bookType === 'picture') {
 const { MIN_PAGES, MAX_PAGES } = PRICING.PICTURE_BOOK
 const prices = PRICING.PICTURE_BOOK_PRICES

    // Clamp to valid range
 const clampedCount = Math.max(MIN_PAGES, Math.min(MAX_PAGES, count))

    // Find the pricing tier
 if (clampedCount <= 8) return prices[8]
 if (clampedCount <= 16) {
 return interpolatePrice(clampedCount, 8, 16, prices[8], prices[16])
 }
 return interpolatePrice(clampedCount, 16, 24, prices[16], prices[24])
 }

  // Default: text book (chapters)
 const { MIN_CHAPTERS, MAX_CHAPTERS } = PRICING.TEXT_BOOK
 const prices = PRICING.TEXT_BOOK_PRICES

  // Clamp to valid range
 const clampedCount = Math.max(MIN_CHAPTERS, Math.min(MAX_CHAPTERS, count))

  // Find the pricing tier
 if (clampedCount <= 5) return prices[5]
 if (clampedCount <= 10) {
 return interpolatePrice(clampedCount, 5, 10, prices[5], prices[10])
 }
 if (clampedCount <= 15) {
 return interpolatePrice(clampedCount, 10, 15, prices[10], prices[15])
 }
 return interpolatePrice(clampedCount, 15, 20, prices[15], prices[20])
}

/**
 * Gets the price for a book based on type and chapter/page count
 * @param bookType The type of the book ('picture' or 'text')
 * @param count Number of chapters (text) or pages (picture)
 * @returns Price in cents
 */
export function getBookPrice(bookType: string = 'text', count?: number): number {
  // If count is provided, calculate dynamic price
 if (count !== undefined) {
 return calculateDynamicPrice(bookType, count)
 }
  // Fallback to legacy fixed price
 return PRICING.DIGITAL_BOOK
}

interface PricingTiers {
 textBook: Array<{ chapters: number; price: number }>
 pictureBook: Array<{ pages: number; price: number }>
 subscription: { pro: number }
}

export function getPricingTiers(): PricingTiers {
 return {
 textBook: [
 { chapters: 5, price: PRICING.TEXT_BOOK_PRICES[5] },
 { chapters: 10, price: PRICING.TEXT_BOOK_PRICES[10] },
 { chapters: 15, price: PRICING.TEXT_BOOK_PRICES[15] },
 { chapters: 20, price: PRICING.TEXT_BOOK_PRICES[20] },
 ],
 pictureBook: [
 { pages: 8, price: PRICING.PICTURE_BOOK_PRICES[8] },
 { pages: 16, price: PRICING.PICTURE_BOOK_PRICES[16] },
 { pages: 24, price: PRICING.PICTURE_BOOK_PRICES[24] },
 ],
 subscription: { pro: PRICING.SUBSCRIPTION.PRO },
 }
}

export function hasUnlimitedAccess(subscriptionStatus?: {
 plan?: string
 status?: string
}): boolean {
 return subscriptionStatus?.plan === 'pro' && subscriptionStatus?.status === 'active'
}

export function calculatePrintRetailPrice(baseCostCents: number): number {
 const { PERCENTAGE, MIN_FEE_CENTS } = PRICING.PRINT_MARKUP
 const markupFee = Math.round(baseCostCents * PERCENTAGE)
 const serviceFee = Math.max(MIN_FEE_CENTS, markupFee)
 return baseCostCents + serviceFee
}

export function calculateBundlePrice(digitalPriceCents: number, printRetailPriceCents: number): number {
 return Math.round((digitalPriceCents + printRetailPriceCents) * (1 - PRICING.BUNDLE_DISCOUNT_PERCENTAGE))
}

export interface PricingBreakdown {
 digital: number
 printCost: number | null
 printRetail: number | null
 bundle: number | null
 currency: SupportedCurrency
 savings: number | null
}

export function getPricingBreakdown(
 bookType: string,
 count: number,
 printBaseCostCents?: number,
 currency: SupportedCurrency = 'EUR'
): PricingBreakdown {
 const digital = convertCurrency(calculateDynamicPrice(bookType, count), currency)
 if (printBaseCostCents === undefined || printBaseCostCents === null) {
 return { digital, printCost: null, printRetail: null, bundle: null, currency, savings: null }
 }
 const printCost = convertCurrency(printBaseCostCents, currency)
 const printRetail = calculatePrintRetailPrice(printCost)
 const bundle = calculateBundlePrice(digital, printRetail)
 return { digital, printCost, printRetail, bundle, currency, savings: (digital + printRetail) - bundle }
}

// NOTE: getLuluPrintCost has been moved to src/lib/lulu-pricing.ts
// to keep this file free of Node.js-only imports (required for 'use client' compat).
