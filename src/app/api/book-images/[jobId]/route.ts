import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'

/**
 * GET /api/book-images/[jobId]
 * Fetches all images for a book generation job from the book_images table
 * Used for picture book workflows where images are stored during generation
 */
export async function GET(req: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  try {
    const params = await context.params
    const authorization = req.headers.get('authorization')
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

    // Verify the job belongs to the user
    const job = await SupabaseDB.getBookGenerationJob(params.jobId)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.user_id !== userData.userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Fetch images from book_images table
    const images = await SupabaseDB.getBookImagesByJobId(params.jobId)

    // Transform to a map for easy lookup
    const imagesMap: Record<string, {
      imageUrl: string | null
      imagePrompt: string | null
      pageText: string | null
    }> = {}

    for (const img of images) {
      const key = `${img.page_number}:${img.panel_index}`
      imagesMap[key] = {
        imageUrl: img.image_url,
        imagePrompt: img.image_prompt,
        pageText: img.page_text
      }
    }

    return NextResponse.json({
      success: true,
      jobId: params.jobId,
      images: images.map(img => ({
        pageNumber: img.page_number,
        panelIndex: img.panel_index,
        imageUrl: img.image_url,
        imagePrompt: img.image_prompt,
        pageText: img.page_text,
        createdAt: img.created_at
      })),
      imagesMap
    })
  } catch (e) {
    console.error('Error fetching book images:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
