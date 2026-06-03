import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { verifySupabaseToken } from '@/lib/supabase-admin'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  return createClient(url, key)
}

async function sendDeletionEmail(to: string, confirmUrl: string): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#3E86D7 0%,#3E86D7 100%);padding:36px 40px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;">Bookcraft</h1>
            <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">AI-Powered Book Creation</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#1a1a2e;margin:0 0 16px;font-size:20px;font-weight:600;">Confirm Account Deletion</h2>
            <p style="color:#4a5568;line-height:1.65;margin:0 0 20px;">
              We received a request to permanently delete your Bookcraft account (<strong>${to}</strong>).
            </p>
            <p style="color:#4a5568;line-height:1.65;margin:0 0 8px;">The following data will be permanently removed:</p>
            <ul style="color:#4a5568;line-height:1.8;margin:0 0 24px;padding-left:20px;">
              <li>Your account and all personal data</li>
              <li>All books you have created</li>
              <li>All associated images and content</li>
              <li>Your subscription and payment history</li>
            </ul>
            <p style="color:#e53e3e;font-weight:600;margin:0 0 28px;">This action is irreversible and cannot be undone.</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding-bottom:32px;">
                <a href="${confirmUrl}" style="display:inline-block;background:linear-gradient(135deg,#e53e3e 0%,#c53030 100%);color:#fff;text-decoration:none;padding:15px 40px;border-radius:10px;font-size:16px;font-weight:600;">
                  Confirm Account Deletion
                </a>
              </td></tr>
            </table>
            <p style="color:#718096;font-size:13px;line-height:1.6;margin:0 0 8px;">
              This link expires in <strong>24 hours</strong>. If you did not request this, please ignore this email — your account will remain unchanged.
            </p>
            <p style="color:#a0aec0;font-size:12px;line-height:1.6;margin:0;word-break:break-all;">
              Direct link: ${confirmUrl}
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="color:#a0aec0;font-size:12px;margin:0;">
              Bookcraft · Burgseestraße 1, 19053 Schwerin, Germany ·
              <a href="https://bookcraft.dev" style="color:#3E86D7;text-decoration:none;">bookcraft.dev</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()

  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Bookcraft <noreply@bookcraft.dev>',
        to,
        subject: 'Confirm Account Deletion – Bookcraft',
        html,
      }),
    })
    return res.ok
  }

  // Fallback: log in development
  if (process.env.NODE_ENV === 'development') {
    // Dev: confirmation URL intentionally not logged (contains deletion token)
    return true
  }

  return false
}

export async function POST(request: NextRequest) {
  try {
    // Auth guard: require a valid JWT token
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    let jwtUser: { email?: string; userId?: string } | null = null
    try {
      jwtUser = await verifySupabaseToken(token)
    } catch {
      // fall through to null check below
    }

    if (!jwtUser || !jwtUser.userId || !jwtUser.email) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Use email from the verified JWT — do NOT trust the request body
    const email = jwtUser.email.toLowerCase().trim()

    const supabase = getSupabaseAdmin()

    // Look up user via user_profiles table (avoids paginated listUsers)
    const { data: profileData, error: lookupError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('email', email.toLowerCase())
      .single()
    if (lookupError) {
      const status = (lookupError as any).status
      const isNoUserError = lookupError.code === 'PGRST116' || (typeof status === 'number' && status === 406)
      if (!isNoUserError) {
        console.error('Error looking up user:', lookupError)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      }
    }
    const authUser = profileData ? { id: profileData.user_id } : null

    if (authUser) {
      const token = randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      // Remove existing pending requests for this email
      await supabase.from('delete_requests').delete().eq('email', email).is('used_at', null)

      // Store the new token
      const { error: insertError } = await supabase.from('delete_requests').insert({
        email,
        token,
        expires_at: expiresAt,
      })

      if (insertError) {
        console.error('Error inserting delete request:', insertError)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      }

      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://bookcraft.dev').replace(/\/$/, '')
      const confirmUrl = `${appUrl}/delete-account/confirm?token=${token}`

      // Fix 5: If email send fails, clean up the token so user can retry
      const emailSent = await sendDeletionEmail(email, confirmUrl)
      if (!emailSent) {
        console.error('Failed to send deletion email — removing token')
        await supabase.from('delete_requests').delete().eq('token', token)
      }
    }

    // Always return success to prevent user enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account with this email exists, a confirmation email has been sent.',
    })
  } catch (error) {
    console.error('Delete account request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
