import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken, supabaseAdmin } from '@/lib/supabase-admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15
    const { id: bookId } = await params

    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = await verifySupabaseToken(token)
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = payload.userId

    // Get current favorite status
    const { data: book, error: fetchError } = await supabaseAdmin
      .from('books')
      .select('is_favorite, user_id')
      .eq('id', bookId)
      .single()

    if (fetchError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Verify ownership
    if (book.user_id !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Toggle favorite status
    const newFavoriteStatus = !book.is_favorite

    const { error: updateError } = await supabaseAdmin
      .from('books')
      .update({
        is_favorite: newFavoriteStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookId)
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error updating favorite status:', updateError)
      return NextResponse.json({ error: 'Error updating' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      is_favorite: newFavoriteStatus
    })

  } catch (error: unknown) {
    console.error('Error toggling favorite:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
