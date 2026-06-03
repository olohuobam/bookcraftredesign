import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { ensureUserProfile } from '@/lib/user-profile'
import { SupabaseDB } from '@/lib/supabase-db'
import { generateInteractiveBook } from '@/lib/generation'
import type { BookLanguage } from '@/lib/translations'

export const runtime = 'nodejs'

interface InteractiveConfig {
  title: string
  genre: string
  targetAudience?: string
  description: string
  totalChapters: number
  writingStyle?: string
  tone?: string
  themes?: string[]
  mainCharacters?: string
  setting?: string
  plotOutline?: string
  pov?: 'first' | 'third' | 'mixed'
  tenseStyle?: 'past' | 'present' | 'mixed'
  language?: BookLanguage
  interactionMode?: 'automatic' | 'manual'
  category?: string
  subcategory?: string
  categoryConfig?: Record<string, unknown>
}

/**
 * POST /api/book/start-interactive-generation
 * Starts interactive book generation using native generation engine
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
    const config: InteractiveConfig = body.config

    if (!config.title || !config.genre || !config.description) {
      return NextResponse.json({
        error: 'Missing required fields: title, genre, and description are required'
      }, { status: 400 })
    }

    // Create book placeholder
    const book = await SupabaseDB.createBook({
      title: config.title,
      genre: config.genre,
      description: config.description,
      content: '',
      style: config.writingStyle || '',
      target_audience: config.targetAudience || '',
      chapters: config.totalChapters,
      user_id: user.userId,
      status: 'generating',
      book_type: 'text',
      ai_generated: true,
      chapters_json: JSON.stringify([])
    })

    // Create generation job
    const job = await SupabaseDB.createBookGenerationJob({
      user_id: user.userId,
      book_id: book.id,
      status: 'pending',
      progress: 0,
      current_step: 'Initializing interactive book generation...',
      config: config
    })

    const jobId = job.id!

    await SupabaseDB.updateBook(book.id!, { active_job_id: jobId })

    console.error('🚀 Starting interactive book generation:', {
      jobId,
      bookId: book.id,
      title: config.title,
      chapters: config.totalChapters
    })

    // Start native generation in background (non-blocking)
    generateInteractiveBook(jobId, book.id!, user.userId, config).catch(async (err) => {
      console.error('❌ Background interactive generation error:', err)
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
      message: 'Interactive book generation started'
    })

  } catch (error) {
    console.error('❌ Error starting interactive book generation:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
