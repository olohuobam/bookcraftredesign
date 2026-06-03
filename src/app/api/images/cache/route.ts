import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'

// POST: upsert a generated image record for caching
// GET: query cached image by (bookId, chapterIndex, pageKey, style, prompt)
export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    const token = auth?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const userData = await verifySupabaseToken(token).catch(() => null)
    if (!userData?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await SupabaseDB.findUserByEmail(userData.email)
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const bookId = searchParams.get('bookId') || undefined
    const chapterIndex = searchParams.get('chapterIndex') ? Number(searchParams.get('chapterIndex')) : undefined
    const pageKey = searchParams.get('pageKey') || undefined
    const style = searchParams.get('style') || undefined
    const prompt = searchParams.get('prompt') || undefined

    // Get all images for the user and filter in memory for now
    // TODO: Add more specific query methods to SupabaseDB if needed
    const allImages = await SupabaseDB.getUserGeneratedImages(user.id)
    
    const existing = allImages.find((img: { book_id?: string; chapter_index?: number; page_key?: string; style?: string; prompt?: string }) => 
      (!bookId || img.book_id === bookId) &&
      (!chapterIndex || img.chapter_index === chapterIndex) &&
      (!pageKey || img.page_key === pageKey) &&
      (!style || img.style === style) &&
      (!prompt || img.prompt === prompt)
    )

    return NextResponse.json({ image: existing || null })
  } catch (e) {
    console.error('GET /api/images/cache error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    const token = auth?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const userData = await verifySupabaseToken(token).catch(() => null)
    if (!userData?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await SupabaseDB.findUserByEmail(userData.email)
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const body = await req.json()
    const { bookId, chapterIndex, pageKey, prompt, style, url, width, height } = body
    if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

    const created = await SupabaseDB.createGeneratedImage({
      user_id: user.id,
      book_id: bookId || undefined,
      chapter_index: typeof chapterIndex === 'number' ? chapterIndex : undefined,
      page_key: pageKey || undefined,
      prompt: prompt || undefined,
      style: style || undefined,
      url,
      width: typeof width === 'number' ? width : undefined,
      height: typeof height === 'number' ? height : undefined,
    })

    return NextResponse.json({ image: created })
  } catch (e) {
    console.error('POST /api/images/cache error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
