import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken, supabaseAdmin } from '@/lib/supabase-admin'
import { ensureUserProfile } from '@/lib/user-profile'
import { SupabaseDB } from '@/lib/supabase-db'
import { generatePictureBook } from '@/lib/generation'
import { logError, createErrorResponse } from '@/lib/api-errors'
import { checkRateLimit } from '@/lib/rate-limit'
import { checkIsPro } from '@/lib/subscription-utils'
import type { PicturebookConfig } from '@/types/picturebook'

/**
 * POST /api/picturebook/generate
 * Starts a picturebook generation using native generation engine
 */
export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = await verifySupabaseToken(token)

    if (!user || !user.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Ensure user profile exists
    if (user.email) {
      await ensureUserProfile(user.userId, user.email)
    }

    const body = await request.json()

    // Extract reference image data (optional)
    const referenceImageBase64: string | undefined = body.referenceImageBase64
    const referenceImageMode: 'style' | 'edit' | undefined = body.referenceImageMode

    const config: PicturebookConfig = {
      title: body.title,
      author: body.author || undefined,
      genre: body.genre,
      targetAudience: body.targetAudience || 'Children 4-6 years',
      description: body.description || '',
      bookType: 'picture',
      totalPages: body.totalPages || 12,
      imageStyle: body.imageStyle || 'watercolor',
      tone: body.tone || 'Cheerful',
      mainCharacters: body.mainCharacters || '',
      setting: body.setting || '',
      plotOutline: body.plotOutline || '',
      themes: body.themes || [],
      customPrompt: body.customPrompt || '',
      language: body.language || 'en'
    }

    // Validate required fields
    if (!config.title || !config.genre) {
      return NextResponse.json({
        error: 'Missing required fields: title and genre are required'
      }, { status: 400 })
    }

    // Extract author (optional)
    const author: string | undefined = body.author || undefined

    // Picture book generation is open to all users. Access to the full book
    // is gated at view time: non-Pro users see the cover + first 2 pages only
    // (see /api/books/[id] FREE_PAGES gating and PictureBookViewer).

    // ── Rate limiting ────────────────────────────────────────────────────────
    const rateLimitResult = checkRateLimit(user.userId, 'picturebook-generate', {
      limit: 10,
      windowSeconds: 3600,
    })
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      )
    }

    // ── Fix 7: Concurrent generation deduplication ───────────────────────────
    // Check if user already has an active generation job to prevent runaway costs
    if (supabaseAdmin) {
      const { data: activeJobs } = await supabaseAdmin
        .from('book_generation_jobs')
        .select('id, book_id, created_at')
        .eq('user_id', user.userId)
        .in('status', ['pending', 'processing'])
        .limit(1)
        .maybeSingle()

      if (activeJobs) {
        return NextResponse.json({
          error: 'Generation already in progress',
          message: 'You already have an active book generation running. Please wait for it to complete.',
          activeJobId: activeJobs.id,
          activeBookId: activeJobs.book_id,
        }, { status: 409 })
      }
    }

    // Pro users get the full book generated up front; free users get a preview
    // (cover + first 2 pages). Remaining pages are generated after they either
    // upgrade to Pro or buy the book one-time. See FREE_PICTURE_PAGES in
    // src/lib/generation/picturebook.ts and PictureBookViewer paywall logic.
    const isPro = await checkIsPro(user.userId)
    const previewMode = !isPro

    // Create book placeholder in database
    const book = await SupabaseDB.createBook({
      title: config.title,
      author,
      genre: config.genre,
      description: config.description,
      content: '',
      style: config.imageStyle,
      target_audience: config.targetAudience,
      chapters: config.totalPages || 10,
      user_id: user.userId,
      status: 'generating',
      book_type: 'picture',
      ai_generated: true,
      chapters_json: JSON.stringify([]),

    })

    // Create generation job in database
    const job = await SupabaseDB.createBookGenerationJob({
      user_id: user.userId,
      book_id: book.id,
      status: 'pending',
      progress: 0,
      current_step: 'Initializing picture book generation...',
      config: config
    })

    const jobId = job.id!

    // Update book with active job ID
    await SupabaseDB.updateBook(book.id!, {
      active_job_id: jobId
    })

    console.error('🚀 Starting picturebook generation:', {
      jobId,
      bookId: book.id,
      title: config.title,
      pages: config.totalPages,
      style: config.imageStyle,
      hasReferenceImage: !!referenceImageBase64,
      referenceImageMode: referenceImageMode || 'none'
    })

    // Start native generation in background (non-blocking)
    generatePictureBook(
      jobId,
      book.id!,
      user.userId,
      config,
      {
        referenceImageBase64,
        referenceImageMode,
        previewMode,
      }
    ).catch(async (err) => {
      console.error('❌ Background picture book generation error:', err)
      try {
        await SupabaseDB.updateBookGenerationJob(jobId, {
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Unknown error',
          completed_at: new Date().toISOString()
        })
      } catch (dbErr) {
        console.error('❌ Failed to update job status after error:', dbErr)
      }
    })

    return NextResponse.json({
      success: true,
      jobId,
      bookId: book.id,
      message: 'Picture book generation started'
    })

  } catch (error) {
    logError('picturebook/generate', error)
    return createErrorResponse(error, 'Failed to start picturebook generation')
  }
}
