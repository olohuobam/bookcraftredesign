import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { ensureUserProfile } from '@/lib/user-profile'
import { SupabaseDB } from '@/lib/supabase-db'
import { generatePictureBook } from '@/lib/generation'
import type { PicturebookConfig } from '@/types/picturebook'

/**
 * POST /api/picturebook/generate-with-reference
 * Starts a picturebook generation with reference image style extraction
 * Uses native generation engine (no n8n)
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

    if (user.email) {
      await ensureUserProfile(user.userId, user.email)
    }

    const body = await request.json()

    const referenceImageBase64 = body.referenceImageBase64 || body.referenceImage
    const referenceImageUrl = body.referenceImageUrl

    if (!referenceImageBase64 && !referenceImageUrl) {
      return NextResponse.json({
        error: 'No reference image provided. Please provide either referenceImageBase64 or referenceImageUrl'
      }, { status: 400 })
    }

    const config: PicturebookConfig = {
      title: body.title,
      genre: body.genre,
      targetAudience: body.targetAudience || 'Children 4-6 years',
      description: body.description || '',
      bookType: 'picture',
      totalPages: body.totalPages || 12,
      imageStyle: body.imageStyle || 'watercolor',
      tone: body.tone || 'Fröhlich',
      mainCharacters: body.mainCharacters || '',
      setting: body.setting || '',
      plotOutline: body.plotOutline || '',
      themes: body.themes || [],
      customPrompt: body.customPrompt || '',
      language: body.language || 'en'
    }

    if (!config.title || !config.genre) {
      return NextResponse.json({
        error: 'Missing required fields: title and genre are required'
      }, { status: 400 })
    }

    // Process base64 image
    let processedBase64 = referenceImageBase64
    if (processedBase64?.startsWith('data:')) {
      processedBase64 = processedBase64.split(',')[1]
    }

    // Create book placeholder
    const book = await SupabaseDB.createBook({
      title: config.title,
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
      chapters_json: JSON.stringify([])
    })

    const job = await SupabaseDB.createBookGenerationJob({
      user_id: user.userId,
      book_id: book.id,
      status: 'pending',
      progress: 0,
      current_step: 'Analyzing reference image...',
      config: {
        ...config,
        hasReferenceImage: true,
        referenceImageUrl: referenceImageUrl || undefined
      }
    })

    const jobId = job.id!

    await SupabaseDB.updateBook(book.id!, { active_job_id: jobId })

    console.error('🚀 Starting picturebook generation with reference image (native):', {
      jobId,
      bookId: book.id,
      title: config.title,
      pages: config.totalPages,
      style: config.imageStyle,
      hasReferenceImage: true
    })

    // Start native generation in background
    generatePictureBook(
      jobId,
      book.id!,
      user.userId,
      config,
      processedBase64,
      'style'
    ).catch(async (err) => {
      console.error('❌ Background picture book (ref) generation error:', err)
      try {
        await SupabaseDB.updateBookGenerationJob(jobId, {
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Unknown error',
          completed_at: new Date().toISOString()
        })
      } catch (dbErr) {
        console.error('❌ Failed to update job status:', dbErr)
      }
    })

    return NextResponse.json({
      success: true,
      jobId,
      bookId: book.id,
      message: 'Picture book generation with reference image started',
      hasReferenceImage: true
    })

  } catch (error) {
    console.error('❌ Error starting picturebook generation with reference:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
