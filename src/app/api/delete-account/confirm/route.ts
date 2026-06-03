import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  return createClient(url, key)
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const rawToken = (body as any)?.token
  const token = typeof rawToken === 'string' ? rawToken.trim() : ''

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // Look up the token
  const { data: deleteRequest, error: lookupError } = await supabase
    .from('delete_requests')
    .select('*')
    .eq('token', token)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (lookupError || !deleteRequest) {
    return NextResponse.json(
      { error: 'Invalid or expired token. Please request a new deletion link.' },
      { status: 400 }
    )
  }

  const email = deleteRequest.email as string

  try {
    // Find the auth user via user_profiles table (email column, avoids paginated listUsers)
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .ilike('email', email)
      .single()
    if (profileError && profileError.code !== 'PGRST116') {
      console.error("Error fetching user by email:", profileError)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
    const authUser = profileData ? { id: profileData.user_id } : null

    if (!authUser) {
      // User already deleted — mark token as used and return success
      const { error: markUsedError } = await supabase
        .from('delete_requests')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token)

      if (markUsedError) {
        console.error('Error marking token as used:', markUsedError)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Account has been deleted.' })
    }

    const userId = authUser.id

    console.error(`Starting account deletion for user [redacted]`)

    // =============================================
    // Atomic deletion via Postgres function — runs all data deletes
    // in a single transaction so partial failures roll back cleanly.
    // =============================================
    const { error: rpcError } = await supabase.rpc('delete_user_account_data', {
      p_user_id: userId,
    })

    if (rpcError) {
      console.error('delete_user_account_data RPC failed:', rpcError)
      return NextResponse.json(
        { error: 'Failed to delete account data. Please contact support.' },
        { status: 500 }
      )
    }

    // Finally, delete from auth.users (this is the main auth record)
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError)
      return NextResponse.json(
        { error: 'Failed to delete authentication record. Please contact support.' },
        { status: 500 }
      )
    }

    // 17. Mark the token as used
    const { error: markUsedError } = await supabase
      .from('delete_requests')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token)

    if (markUsedError) {
      console.error('Error marking token as used:', markUsedError)
      // Don't return error here — deletion was already successful
    }

    console.error(`Successfully deleted account for user [redacted]`)

    return NextResponse.json({
      success: true,
      message: 'Your account and all associated data have been permanently deleted.',
    })
  } catch (error) {
    console.error('Account deletion error:', error)
    return NextResponse.json(
      { error: 'An error occurred during account deletion. Please contact support.' },
      { status: 500 }
    )
  }
}
