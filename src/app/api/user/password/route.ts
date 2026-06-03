import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/user/password
 * Change password for email-based users via Supabase auth.updateUser
 */
export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    let userData
    try {
      userData = await verifySupabaseToken(token)
      if (!userData) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Ensure this endpoint is only used by email-based users
    const { supabaseAdmin } = await import("@/lib/supabase-admin")
    if (supabaseAdmin) {
      const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userData.userId)
      if (authUser) {
        const providers: string[] = authUser.app_metadata?.providers ?? (authUser.app_metadata?.provider ? [authUser.app_metadata.provider] : [])
        const isEmailUser = providers.includes("email") || (!providers.length && !!authUser.email_confirmed_at)
        if (!isEmailUser) {
          return NextResponse.json({ error: "Only email-based users can change password" }, { status: 403 })
        }
      }
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    const { password } = body

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Passwort muss mindestens 6 Zeichen lang sein' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    // Create a client with the user's token to update their password
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      console.error('Password update error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error changing password:', error)
    return NextResponse.json({ error: 'Password change failed' }, { status: 500 })
  }
}
