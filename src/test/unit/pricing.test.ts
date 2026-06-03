import { describe, it, expect } from 'vitest'
import {
 formatPrice,
 convertCurrency,
 calculateDynamicPrice,
 getBookPrice,
 getPricingTiers,
 hasUnlimitedAccess,
 calculatePrintRetailPrice,
 calculateBundlePrice,
 PRICING,
 EXCHANGE_RATES,
} from '@/lib/pricing'

describe('formatPrice', () => {
 it('formats EUR price correctly', () => {
 const result = formatPrice(999, 'EUR')
 expect(result).toContain('9')
 expect(result).toContain('99')
 })

 it('formats USD price correctly', () => {
 const result = formatPrice(999, 'USD')
 expect(result).toContain('$')
 })

 it('defaults to EUR when no currency specified', () => {
 const result = formatPrice(1000)
 expect(result).toContain('10')
 })

 it('handles zero price', () => {
 const result = formatPrice(0, 'EUR')
 expect(result).toContain('0')
 })
})

describe('convertCurrency', () => {
 it('returns same amount for EUR→EUR', () => {
 expect(convertCurrency(999, 'EUR')).toBe(999)
 })

 it('converts EUR to USD using exchange rate', () => {
 const result = convertCurrency(1000, 'USD')
 expect(result).toBe(Math.round(1000 * EXCHANGE_RATES.USD))
 })

 it('converts EUR to GBP using exchange rate', () => {
 const result = convertCurrency(1000, 'GBP')
 expect(result).toBe(Math.round(1000 * EXCHANGE_RATES.GBP))
 })

 it('handles 0 input', () => {
 expect(convertCurrency(0, 'USD')).toBe(0)
 })
})

describe('calculateDynamicPrice', () => {
 describe('text books', () => {
 it('returns minimum price for 5 chapters', () => {
 expect(calculateDynamicPrice('text', 5)).toBe(PRICING.TEXT_BOOK_PRICES[5])
 })

 it('returns max price for 20 chapters', () => {
 expect(calculateDynamicPrice('text', 20)).toBe(PRICING.TEXT_BOOK_PRICES[20])
 })

 it('returns minimum for below-minimum chapters', () => {
 expect(calculateDynamicPrice('text', 1)).toBe(PRICING.TEXT_BOOK_PRICES[5])
 })

 it('returns maximum for above-maximum chapters', () => {
 expect(calculateDynamicPrice('text', 99)).toBe(PRICING.TEXT_BOOK_PRICES[20])
 })

 it('interpolates price for 10 chapters', () => {
 const price = calculateDynamicPrice('text', 10)
 expect(price).toBe(PRICING.TEXT_BOOK_PRICES[10])
 })

 it('interpolates price between tiers (7 chapters)', () => {
 const price = calculateDynamicPrice('text', 7)
 expect(price).toBeGreaterThan(PRICING.TEXT_BOOK_PRICES[5])
 expect(price).toBeLessThan(PRICING.TEXT_BOOK_PRICES[10])
 })
 })

 describe('picture books', () => {
 it('returns minimum price for 8 pages', () => {
 expect(calculateDynamicPrice('picture', 8)).toBe(PRICING.PICTURE_BOOK_PRICES[8])
 })

 it('returns max price for 24 pages', () => {
 expect(calculateDynamicPrice('picture', 24)).toBe(PRICING.PICTURE_BOOK_PRICES[24])
 })

 it('clamps below minimum', () => {
 expect(calculateDynamicPrice('picture', 2)).toBe(PRICING.PICTURE_BOOK_PRICES[8])
 })

 it('clamps above maximum', () => {
 expect(calculateDynamicPrice('picture', 50)).toBe(PRICING.PICTURE_BOOK_PRICES[24])
 })

 it('interpolates between 8 and 16 pages', () => {
 const price = calculateDynamicPrice('picture', 12)
 expect(price).toBeGreaterThan(PRICING.PICTURE_BOOK_PRICES[8])
 expect(price).toBeLessThan(PRICING.PICTURE_BOOK_PRICES[16])
 })
 })
})

describe('getBookPrice', () => {
 it('falls back to legacy price when no count given', () => {
 expect(getBookPrice('text')).toBe(PRICING.DIGITAL_BOOK)
 })

 it('uses dynamic pricing when count provided', () => {
 expect(getBookPrice('text', 5)).toBe(PRICING.TEXT_BOOK_PRICES[5])
 })

 it('defaults to text book type', () => {
 expect(getBookPrice()).toBe(PRICING.DIGITAL_BOOK)
 })
})

describe('getPricingTiers', () => {
 it('returns text book tiers', () => {
 const tiers = getPricingTiers()
 expect(tiers.textBook).toHaveLength(4)
 expect(tiers.textBook[0].chapters).toBe(5)
 expect(tiers.textBook[3].chapters).toBe(20)
 })

 it('returns picture book tiers', () => {
 const tiers = getPricingTiers()
 expect(tiers.pictureBook).toHaveLength(3)
 expect(tiers.pictureBook[0].pages).toBe(8)
 expect(tiers.pictureBook[2].pages).toBe(24)
 })

 it('returns subscription pricing', () => {
 const tiers = getPricingTiers()
 expect(tiers.subscription.pro).toBe(PRICING.SUBSCRIPTION.PRO)
 })
})

describe('hasUnlimitedAccess', () => {
 it('returns true for active pro plan', () => {
 expect(hasUnlimitedAccess({ plan: 'pro', status: 'active' })).toBe(true)
 })

 it('returns false for inactive pro plan', () => {
 expect(hasUnlimitedAccess({ plan: 'pro', status: 'canceled' })).toBe(false)
 })

 it('returns false for free plan', () => {
 expect(hasUnlimitedAccess({ plan: 'free', status: 'active' })).toBe(false)
 })

 it('returns false for undefined subscription', () => {
 expect(hasUnlimitedAccess(undefined)).toBe(false)
 })

 it('returns false for empty object', () => {
 expect(hasUnlimitedAccess({})).toBe(false)
 })
})

describe('calculatePrintRetailPrice', () => {
 it('applies 15% markup with minimum fee', () => {
 const baseCost = 1000
 // 15% of 1000 = 150, below minimum of 299 → service fee = 299
 expect(calculatePrintRetailPrice(baseCost)).toBe(1299)
 })

 it('handles zero cost', () => {
 // 15% of 0 = 0, below minimum of 299 → service fee = 299
 expect(calculatePrintRetailPrice(0)).toBe(299)
 })

 it('handles large cost', () => {
 const baseCost = 10000
 const result = calculatePrintRetailPrice(baseCost)
 expect(result).toBeGreaterThan(baseCost)
 })
})

describe('calculateBundlePrice', () => {
 it('applies 15% bundle discount', () => {
 const digital = 999
 const print = 1500
 const expected = Math.round((digital + print) * 0.85)
 expect(calculateBundlePrice(digital, print)).toBe(expected)
 })

 it('bundle is less than sum of parts', () => {
 const digital = 999
 const print = 1500
 expect(calculateBundlePrice(digital, print)).toBeLessThan(digital + print)
 })
})
