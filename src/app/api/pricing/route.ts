import { NextRequest, NextResponse } from 'next/server'
import { LuluAPI, type LuluCostCalculation } from '@/lib/lulu-api'
import { getSupabaseUser } from '@/lib/auth-helpers'
import { calculatePrintRetailPrice, calculateBundlePrice, calculateDynamicPrice, type SupportedCurrency } from '@/lib/pricing'

/**
 * POST /api/pricing
 * Calculate real-time pricing for a print job using the Lulu Pricing API.
 *
 * Request body:
 *   shippingAddress  — required (name, street1, city, country_code, postcode, phone_number)
 *   shippingLevel    — optional, default "MAIL" (MAIL | PRIORITY_MAIL | GROUND | EXPEDITED | EXPRESS)
 *   podPackageId     — optional, explicit Lulu product ID (overrides derived ID)
 *   pageCount        — optional, number of pages (default 50)
 *   quantity         — optional, default 1
 *   bookFormat       — optional, default "6x9"  (used when podPackageId is not provided)
 *   paperType        — optional, default "white" (used when podPackageId is not provided)
 *   coverType        — optional, default "matte" (used when podPackageId is not provided)
 *   bookType         — optional, default "text"  (used when podPackageId is not provided)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify user authentication
    const user = await getSupabaseUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse request body
    const body = await request.json()
    const {
      shippingAddress,
      shippingLevel = 'MAIL',
      podPackageId,           // explicit Lulu product ID (optional)
      bookFormat = '6x9',
      paperType = 'white',
      coverType = 'matte',
      bookType = 'text',
      quantity = 1,
    } = body

    if (!shippingAddress) {
      return NextResponse.json(
        { error: 'Shipping address is required' },
        { status: 400 }
      )
    }

    // 3. Validate shipping address has required fields including phone_number
    const requiredFields = ['name', 'street1', 'city', 'country_code', 'postcode', 'phone_number']
    for (const field of requiredFields) {
      if (!shippingAddress[field]) {
        return NextResponse.json(
          { error: `Missing shipping address field: ${field}` },
          { status: 400 }
        )
      }
    }

    // 4. Check if Lulu API is configured
    if (!LuluAPI.isConfigured()) {
      return NextResponse.json(
        { error: 'Lulu API not configured' },
        { status: 500 }
      )
    }

    // 5. Resolve product ID: use caller-supplied podPackageId or derive from specs
    const productId = podPackageId || generateProductId(bookFormat, bookType, paperType, coverType)

    // 6. Convert shipping level to Lulu format
    const luluShippingLevel = convertShippingLevel(shippingLevel)

    // 7. Determine page count
    // Precedence: explicit pageCount → derived from chapters → default 50
    let estimatedPages = 50
    if (body.pageCount) {
      estimatedPages = Math.max(20, Math.min(500, body.pageCount))
    } else if (body.chapters && Array.isArray(body.chapters)) {
      estimatedPages = Math.max(
        20,
        Math.min(
          500,
          body.chapters.reduce(
            (total: number, chapter: { content?: string }) =>
              total + Math.ceil((chapter.content?.length || 0) / 2000),
            0
          )
        )
      )
    }

    // 8. Prepare cost calculation request
    const costCalculationData = {
      line_items: [
        {
          pod_package_id: productId,
          quantity: quantity,
          page_count: estimatedPages
        }
      ],
      shipping_address: {
        city: shippingAddress.city,
        country_code: shippingAddress.country_code,
        postcode: shippingAddress.postcode,
        state_code: shippingAddress.state_code || '',
        street1: shippingAddress.street1,
        phone_number: shippingAddress.phone_number
      },
      shipping_option: luluShippingLevel,
      currency: getPreferredCurrency(shippingAddress.country_code)
    }

    // 9. Call Lulu pricing API
    const costCalculation: LuluCostCalculation = await LuluAPI.calculatePrintJobCosts(costCalculationData)

    // 10. Calculate markup and retail pricing
    const baseCostCents = Math.round(parseFloat(costCalculation.total_cost_incl_tax) * 100)
    const retailPriceCents = calculatePrintRetailPrice(baseCostCents)
    const digitalPriceCents = calculateDynamicPrice(bookType, body.chapters?.length || 10)
    const bundlePriceCents = calculateBundlePrice(digitalPriceCents, retailPriceCents)

    // 11. Format response with descriptions
    const formattedResponse = {
      success: true,
      currency: costCalculation.currency as SupportedCurrency,
      // Top-level: Lulu base cost in cents (used by checkout)
      total_cost_incl_tax: baseCostCents,
      pricing: {
        book_cost: {
          excl_tax: costCalculation.line_item_costs[0]?.total_cost_excl_tax || '0.00',
          incl_tax: costCalculation.line_item_costs[0]?.total_cost_incl_tax || '0.00',
          tax: costCalculation.line_item_costs[0]?.total_tax || '0.00',
          description: 'Book printing costs'
        },
        shipping_cost: {
          excl_tax: costCalculation.shipping_cost.total_cost_excl_tax,
          incl_tax: costCalculation.shipping_cost.total_cost_incl_tax,
          tax: costCalculation.shipping_cost.total_tax,
          description: 'Shipping costs'
        },
        fulfillment_cost: {
          excl_tax: costCalculation.fulfillment_cost.total_cost_excl_tax,
          incl_tax: costCalculation.fulfillment_cost.total_cost_incl_tax,
          tax: costCalculation.fulfillment_cost.total_tax,
          description: 'Processing fee'
        },
        total: {
          excl_tax: costCalculation.total_cost_excl_tax,
          incl_tax: costCalculation.total_cost_incl_tax,
          tax: costCalculation.total_tax,
          discount: costCalculation.total_discount_amount,
          description: 'Total price (Lulu base cost)'
        },
        retail: {
          print_cost_cents: baseCostCents,
          print_retail_cents: retailPriceCents,
          print_retail: (retailPriceCents / 100).toFixed(2),
          digital_cents: digitalPriceCents,
          digital: (digitalPriceCents / 100).toFixed(2),
          bundle_cents: bundlePriceCents,
          bundle: (bundlePriceCents / 100).toFixed(2),
          bundle_savings_cents: (digitalPriceCents + retailPriceCents) - bundlePriceCents,
          description: 'Retail prices with markup'
        }
      },
      specifications: {
        format: bookFormat,
        paper_type: paperType,
        cover_type: coverType,
        book_type: bookType,
        product_id: productId,
        quantity: quantity
      },
      shipping: {
        level: shippingLevel,
        lulu_level: luluShippingLevel,
        description: getShippingDescription(shippingLevel)
      }
    }

    return NextResponse.json(formattedResponse)

  } catch (error) {
    console.error('Pricing calculation error:', error)

    const errorMessage = (error as Error).message || 'Unknown error'

    // Handle specific Lulu API errors with detailed feedback
    if (errorMessage.includes('401')) {
      return NextResponse.json(
        {
          error: 'Lulu API authentication failed',
          details: 'Please contact support.'
        },
        { status: 500 }
      )
    }

    if (errorMessage.includes('400')) {
      // Check for specific field errors
      if (errorMessage.includes('page_count')) {
        return NextResponse.json(
          {
            error: 'Invalid page count',
            details: 'The book requires at least 20 pages. Please ensure your book has sufficient content.'
          },
          { status: 400 }
        )
      }

      if (errorMessage.includes('phone_number')) {
        return NextResponse.json(
          {
            error: 'Phone number required',
            details: 'Please provide a valid phone number for the delivery address.'
          },
          { status: 400 }
        )
      }

      if (errorMessage.includes('address')) {
        return NextResponse.json(
          {
            error: 'Invalid delivery address',
            details: 'Please check all address fields and ensure they are complete.'
          },
          { status: 400 }
        )
      }

      return NextResponse.json(
        {
          error: 'Invalid price request',
          details: 'Please check your information. All fields must be filled in correctly.'
        },
        { status: 400 }
      )
    }

    if (errorMessage.includes('404')) {
      return NextResponse.json(
        {
          error: 'Product not found',
          details: 'The selected book configuration is not available.'
        },
        { status: 404 }
      )
    }

    if (errorMessage.includes('429')) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          details: 'Please wait a moment and try again.'
        },
        { status: 429 }
      )
    }

    // Generic error with more helpful message
    return NextResponse.json(
      {
        error: 'Price calculation failed',
        details: 'An unexpected error occurred. Please try again later or contact support.'
      },
      { status: 500 }
    )
  }
}

/**
 * Generate Lulu product ID using the verified POD_PACKAGE_MAP.
 * Falls back to LuluAPI.getPodPackageId() which throws if no match.
 *
 * Rules (verified 2026-03-13):
 * - Full Color (FC) only on white paper, always gloss cover
 * - BW works on white, cream, or premium paper
 * - Hardcover not available
 * - Picture/Photo books always Full Color
 */
function generateProductId(format: string, bookType: string, paperType: string, _coverType: string): string {
  const isColor = bookType === 'picture'
  const binding = 'paperback'

  // Full color only works on white paper — force it
  const paper = isColor ? 'white' : paperType

  // Build the lookup key matching POD_PACKAGE_MAP
  const key = `${format}_${binding}_${paper}_${isColor ? 'color' : 'bw'}`

  try {
    return LuluAPI.getPodPackageId(format, binding, paper, isColor)
  } catch {
    // Fallback: try without exact match
    console.warn(`No POD package for key: ${key}, trying default`)
    const defaultFormat = isColor ? '8.5x8.5' : '6x9'
    return LuluAPI.getPodPackageId(defaultFormat, binding, 'white', isColor)
  }
}

/**
 * Convert internal shipping level to Lulu format
 */
function convertShippingLevel(level: string): 'MAIL' | 'PRIORITY_MAIL' | 'GROUND' | 'EXPEDITED' | 'EXPRESS' {
  const levelMap: Record<string, 'MAIL' | 'PRIORITY_MAIL' | 'GROUND' | 'EXPEDITED' | 'EXPRESS'> = {
    'MAIL': 'MAIL',
    'PRIORITY_MAIL': 'PRIORITY_MAIL',
    'GROUND': 'GROUND',
    'EXPEDITED': 'EXPEDITED',
    'EXPRESS': 'EXPRESS'
  }
  return levelMap[level] || 'MAIL'
}

/**
 * Get preferred currency based on country
 */
function getPreferredCurrency(countryCode: string): 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' {
  const currencyMap: Record<string, 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD'> = {
    'DE': 'EUR',
    'FR': 'EUR',
    'ES': 'EUR',
    'IT': 'EUR',
    'AT': 'EUR',
    'NL': 'EUR',
    'BE': 'EUR',
    'PT': 'EUR',
    'GB': 'GBP',
    'CA': 'CAD',
    'AU': 'AUD',
    'US': 'USD'
  }
  return currencyMap[countryCode] || 'USD'
}

/**
 * Get shipping description
 */
function getShippingDescription(level: string): string {
  const descriptions: Record<string, string> = {
    'MAIL': 'Standard (7-10 business days)',
    'PRIORITY_MAIL': 'Priority (5-7 business days)',
    'GROUND': 'Ground (5-8 business days)',
    'EXPEDITED': 'Express (3-5 business days)',
    'EXPRESS': 'Overnight (1-2 business days)'
  }
  return descriptions[level] || 'Standard shipping'
}