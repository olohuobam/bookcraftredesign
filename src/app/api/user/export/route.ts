import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'

/**
 * GET /api/user/export
 * GDPR data export: returns user profile + all their books as JSON
 */
export async function GET(request: NextRequest) {
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

    if (!userData.userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 })
    }

    // Handle case where Supabase admin is not configured (e.g., dev/mock mode)
    const { supabaseAdmin } = await import("@/lib/supabase-admin")
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })
    }

    // Fetch profile
    const user = await SupabaseDB.getProfile(userData.userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch all books
    const books = await SupabaseDB.getUserBooks(userData.userId)

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        language: user.language,
        theme: user.theme,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      books: books.map((book) => ({
        id: book.id,
        title: book.title,
        description: book.description,
        createdAt: book.created_at,
        updatedAt: book.updated_at,
      })),
    }

    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': 'attachment; filename="bookcraft-export.json"',
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Error exporting user data:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
