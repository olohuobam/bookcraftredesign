import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseUser } from '@/lib/auth-helpers'
import { SupabaseDB } from '@/lib/supabase-db'

/**
 * POST /api/device-tokens
 *
 * Saves a device push token for the authenticated user.
 * Body: { token: string, platform: "ios" | "android" }
 *
 * Auth: Authorization: Bearer <supabase-jwt>
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSupabaseUser(req)
    if (!user || !user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { token, platform } = body as { token?: string; platform?: string }

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }
    if (platform !== 'ios' && platform !== 'android') {
      return NextResponse.json(
        { error: 'platform must be "ios" or "android"' },
        { status: 400 },
      )
    }

    await SupabaseDB.saveDeviceToken(user.userId, token, platform)

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error('[POST /api/device-tokens]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/device-tokens
 *
 * Removes a device push token (e.g. on logout).
 * Body: { token: string }
 *
 * Auth: Authorization: Bearer <supabase-jwt>
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getSupabaseUser(req)
    if (!user || !user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { token?: string } = {}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid or missing JSON body' }, { status: 400 })
    }
    const { token } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    // Scope deletion to the authenticated user to prevent cross-user token removal
    await SupabaseDB.deleteDeviceTokenForUser(user.userId, token)

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error('[DELETE /api/device-tokens]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
