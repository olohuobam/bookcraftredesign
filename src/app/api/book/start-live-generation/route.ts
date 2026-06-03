import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { ensureUserProfile } from '@/lib/user-profile'
import { SupabaseDB } from '@/lib/supabase-db'
import { generateLiveBook } from '@/lib/generation'
import { checkRateLimit } from '@/lib/rate-limit'
import { checkIsPro } from '@/lib/subscription-utils'
import type { BookLanguage } from '@/lib/translations'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes — book generation can take a while

interface BookConfig {
  title: string
  author?: string
  genre: string
  targetAudience: string
  description: string
  totalChapters: number
  writingStyle: string
  tone: string
  themes: string[]
  mainCharacters: string
  setting: string
  plotOutline: string
  pov: 'first' | 'third' | 'mixed'
  tenseStyle: 'past' | 'present' | 'mixed'
  language?: BookLanguage
  previewMode?: boolean
  startFromChapter?: number
}

/**
 * POST /api/book/start-live-generation
 * Starts live book generation using native generation engine
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
    const config: BookConfig = body.config

    // Validate required fields
    if (!config.title || !config.genre || !config.description) {
      return NextResponse.json({
        error: 'Missing required fields: title, genre, and description are required'
      }, { status: 400 })
    }

    // Default to preview mode (only first chapter) unless explicitly disabled
    const previewMode = config.previewMode !== false

    // ── Fix 3: isPro enforcement ─────────────────────────────────────────────
    // Free users may always generate a preview (first chapter).
    // Full book generation requires Pro.
    if (!previewMode) {
      const isPro = await checkIsPro(user.userId)
      if (!isPro) {
        return NextResponse.json({
          error: 'Pro subscription required',
          message: 'Full book generation requires a Pro subscription. Please upgrade to continue.',
          upgradeRequired: true,
        }, { status: 403 })
      }
    }

    // ── Fix 2: Rate limiting ─────────────────────────────────────────────────
    // Free users: 5 preview generations/hour. Pro users: 5 full books/hour.
    const rateLimitResult = checkRateLimit(user.userId, 'start-live-generation', {
      limit: 5,
      windowSeconds: 3600,
    })
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      )
    }

    // Create book placeholder in database
    const book = await SupabaseDB.createBook({
      title: config.title,
      author: config.author || undefined,
      genre: config.genre,
      description: config.description,
      content: '',
      style: config.writingStyle,
      target_audience: config.targetAudience,
      chapters: config.totalChapters,
      user_id: user.userId,
      status: 'generating',
      book_type: 'text',
      ai_generated: true,
      chapters_json: JSON.stringify([])
    })

    // Create generation job in database
    const job = await SupabaseDB.createBookGenerationJob({
      user_id: user.userId,
      book_id: book.id,
      status: 'pending',
      progress: 0,
      current_step: 'Initializing live book generation...',
      config: config
    })

    const jobId = job.id!

    // Update book with active job ID
    await SupabaseDB.updateBook(book.id!, {
      active_job_id: jobId
    })

    console.error('🚀 Starting live book generation:', {
      jobId,
      bookId: book.id,
      title: config.title,
      chapters: config.totalChapters,
      previewMode: previewMode
    })

    // Use waitUntil to keep the Vercel function alive after response
    // This ensures generation continues for up to maxDuration (300s) even after HTTP response is sent
    waitUntil(
      generateLiveBook(jobId, book.id!, user.userId, config).catch(async (err) => {
        console.error('❌ Background live generation error:', err)
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
    )

    return NextResponse.json({
      success: true,
      jobId,
      bookId: book.id,
      previewMode: previewMode,
      message: previewMode
        ? 'Preview generation started (Chapter 1)'
        : 'Complete book generation started'
    })

  } catch (error) {
    console.error('❌ Error starting live book generation:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
