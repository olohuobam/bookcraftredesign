import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const maxDuration = 30

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

/**
 * POST /api/books/[id]/select-cover
 * Let AI pick the best cover image from the book's images.
 * Body: { images: string[] }  — flat array of image URLs
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params

    // Explicit API key check
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 503 })
    }

    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 401 })

    let userData
    try {
      userData = await verifySupabaseToken(token)
      if (!userData?.userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const book = await SupabaseDB.getBook(bookId)
    if (!book || book.user_id !== userData.userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const { images } = (body ?? {}) as { images?: unknown }

    // Validate that images is an array of strings
    if (!Array.isArray(images) || images.some((url) => typeof url !== 'string')) {
      return NextResponse.json(
        { error: 'Invalid images payload; "images" must be an array of strings' },
        { status: 400 }
      )
    }

    const validImages = images.filter((url: string) => url && url.length > 0)
    if (validImages.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 })
    }

    // Security: Only allow images that actually belong to this book
    const bookAny = book as any
    const allowedBookImageUrls: string[] = []
    if (Array.isArray(bookAny?.images)) {
      for (const url of bookAny.images) {
        if (typeof url === 'string' && url.length > 0) allowedBookImageUrls.push(url)
      }
    }
    if (Array.isArray(bookAny?.book_images)) {
      for (const img of bookAny.book_images) {
        if (typeof img === 'string' && img.length > 0) allowedBookImageUrls.push(img)
        else if (img && typeof img === 'object' && typeof img.url === 'string') allowedBookImageUrls.push(img.url)
      }
    }
    // If book has images registered, filter against them; otherwise allow all valid
    const allowedSet = allowedBookImageUrls.length > 0 ? new Set(allowedBookImageUrls) : null
    const safeImages = allowedSet ? validImages.filter((url) => allowedSet.has(url)) : validImages
    if (safeImages.length === 0) {
      return NextResponse.json({ error: 'No valid book images provided' }, { status: 400 })
    }

    // Slice to 8 images for Vision limits — prompt index range must match slice
    const candidateImages = safeImages.slice(0, 8)

    // Ask GPT to pick the best cover image index
    const openai = getOpenAI()

    const prompt = `You are a book cover designer. Given ${candidateImages.length} images for a picture book titled "${book.title}" (description: "${book.description || 'no description'}"), pick the single best image to use as the cover.

Consider:
- Visual appeal and composition
- How well it represents the book's theme
- Whether it would grab attention as a cover

Respond with a JSON object: {"index": 0, "reason": "short reason"}
The index is 0-based. Choose from 0 to ${candidateImages.length - 1}.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            ...candidateImages.map((url: string) => ({
              type: 'image_url' as const,
              image_url: { url, detail: 'low' as const }
            }))
          ]
        }
      ],
      max_tokens: 200,
      response_format: { type: 'json_object' },
    })

    const rawText = response.choices[0]?.message?.content
    let parsed: unknown = null
    if (rawText) {
      try { parsed = JSON.parse(rawText) } catch { parsed = null }
    }

    let index = 0
    let reason = ''
    if (parsed && typeof parsed === 'object') {
      const maybeIndex = (parsed as any).index
      const maybeReason = (parsed as any).reason
      if (typeof maybeIndex === 'number' && Number.isInteger(maybeIndex)) index = maybeIndex
      if (typeof maybeReason === 'string') reason = maybeReason
    }

    const selectedIndex = Math.max(0, Math.min(index, candidateImages.length - 1))

    return NextResponse.json({
      selectedIndex,
      selectedImageUrl: candidateImages[selectedIndex],
      reason,
    })
  } catch (e) {
    console.error('Error in AI cover selection', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
