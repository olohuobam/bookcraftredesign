import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'
import { createClient } from '@supabase/supabase-js'

// Simple in-memory rate limiting (would use Redis in production)
// Format: { userId: timestamp }
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * POST /api/user/export-data
 * GDPR Art. 20 Data Portability - export all user data as JSON
 * Rate limited: max 1x per 24h per user
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

    if (!userData.userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 })
    }

    // Check rate limit
    const lastExport = rateLimitMap.get(userData.userId)
    if (lastExport && Date.now() - lastExport < RATE_LIMIT_MS) {
      const hoursLeft = Math.ceil((RATE_LIMIT_MS - (Date.now() - lastExport)) / (1000 * 60 * 60))
      return NextResponse.json(
        { error: `Rate limit: max 1 export per 24h. Try again in ${hoursLeft} hour(s).` },
        { status: 429 }
      )
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

    // Fetch all books with content
    const books = await SupabaseDB.getUserBooks(userData.userId)

    // Fetch saved addresses
    const { data: addresses } = await supabaseAdmin
      .from('saved_addresses')
      .select('id, label, first_name, last_name, street, city, state, postal_code, country, phone, is_default, created_at, updated_at')
      .eq('user_id', userData.userId)
      .order('created_at', { ascending: false })

    // Fetch print orders
    const { data: printJobs } = await supabaseAdmin
      .from('print_jobs')
      .select('id, book_id, status, quantity, total_price, currency, shipping_method, created_at, updated_at')
      .eq('user_id', userData.userId)
      .order('created_at', { ascending: false })

    // Fetch Stripe payment intents (exclude sensitive data)
    const { data: stripePayments } = await supabaseAdmin
      .from('stripe_payment_intents')
      .select('id, amount, currency, status, payment_method_types, created_at')
      .eq('user_id', userData.userId)
      .order('created_at', { ascending: false })

    // Fetch IAP purchases (exclude receipt_data for security)
    const { data: iapPurchases } = await supabaseAdmin
      .from('iap_purchases')
      .select('id, product_id, status, amount, currency, created_at')
      .eq('user_id', userData.userId)
      .order('created_at', { ascending: false })

    // Build export data (no sensitive information)
    const exportData = {
      exportedAt: new Date().toISOString(),
      exportType: 'DSGVO Art. 20 - Data Portability',
      
      // Profile - no password hashes or sensitive internal data
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
      
      // Books - include title, content, chapters, metadata
      books: books.map((book) => ({
        id: book.id,
        title: book.title,
        genre: book.genre,
        description: book.description,
        content: book.content, // Full book content
        chapters: book.chapters,
        style: book.style,
        targetAudience: book.target_audience,
        bookType: book.book_type,
        status: book.status,
        chaptersJson: book.chapters_json,
        coverImage: book.cover_image,
        backCoverImage: book.back_cover_image,
        author: book.author,
        publisher: book.publisher,
        isbn: book.isbn,
        createdAt: book.created_at,
        updatedAt: book.updated_at,
      })),
      
      // Saved addresses (already filtered in query - no sensitive fields)
      savedAddresses: addresses || [],
      
      // Print orders (filtered to exclude internal/sensitive data)
      printOrders: printJobs || [],
      
      // Stripe payments (already filtered - no card details, no receipt_data)
      stripePayments: stripePayments || [],
      
      // IAP purchases (already filtered - no receipt_data)
      iapPurchases: iapPurchases || [],
    }

    // Update rate limit
    rateLimitMap.set(userData.userId, Date.now())

    // Clean up old rate limit entries (optional, for memory management)
    if (rateLimitMap.size > 1000) {
      const cutoff = Date.now() - RATE_LIMIT_MS
      for (const [key, value] of rateLimitMap.entries()) {
        if (value < cutoff) rateLimitMap.delete(key)
      }
    }

    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': 'attachment; filename="bookcraft-data-export.json"',
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Error exporting user data:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}