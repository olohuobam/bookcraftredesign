import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/auth-helpers'
import { validateCoupon } from '@/lib/discounts'

export async function POST(request: NextRequest) {
  try {
    const user = await getSupabaseUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code, amount_cents, purchase_type } = await request.json()

    if (!code || !amount_cents) {
      return NextResponse.json({ error: 'Missing code or amount' }, { status: 400 })
    }

    const result = await validateCoupon(code, amount_cents, purchase_type || 'digital')

    return NextResponse.json(result)
  } catch (error) {
    console.error('Coupon validation error:', error)
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 })
  }
}
