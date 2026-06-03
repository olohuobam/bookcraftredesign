import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    let userData = null
    
    try {
      userData = await verifySupabaseToken(token)
      if (!userData || !userData.userId) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const allBooks = await SupabaseDB.getUserBooks(userData.userId, undefined, 5)
    
    // Convert to camelCase format
    const recentBooks = allBooks.map((book) => ({
      id: book.id,
      title: book.title,
      genre: book.genre,
      status: book.status,
      createdAt: book.created_at,
      updatedAt: book.updated_at
    }))

    return NextResponse.json({
      books: recentBooks
    })
  } catch (error) {
    console.error('Error fetching recent books:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
