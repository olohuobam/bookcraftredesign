import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB, Book } from '@/lib/supabase-db'
import { generateLiveBook, generatePictureBook, FREE_PICTURE_PAGES } from '@/lib/generation'
import type { PicturebookConfig } from '@/types/picturebook'

/**
 * Triggers continuation of book generation for preview books after purchase
 * Uses native generation engine (no n8n)
 */
async function triggerContinueGeneration(book: Book, userId: string): Promise<boolean> {
  try {
    if (book.status !== 'preview') {
      console.error(`Book ${book.id} is not in preview status, skipping continuation`)
      return false
    }

    let outline: unknown = null
    let config: Record<string, unknown> | null = null

    if (book.active_job_id) {
      const originalJob = await SupabaseDB.getBookGenerationJob(book.active_job_id)
      if (originalJob?.metadata) {
        try {
          const metadata = typeof originalJob.metadata === 'string'
            ? JSON.parse(originalJob.metadata)
            : originalJob.metadata
          outline = metadata.outline
          config = originalJob.config as Record<string, unknown> | null
        } catch (e) {
          console.error('Error parsing job metadata:', e)
        }
      }
    }

    if (!outline) {
      console.error(`No outline found for book ${book.id}, cannot continue generation`)
      return false
    }

    if (!config) {
      config = {
        title: book.title,
        genre: book.genre,
        description: book.description || '',
        totalChapters: book.chapters || 5,
        writingStyle: book.style || 'descriptive',
        targetAudience: book.target_audience || 'general',
        tone: 'engaging',
        themes: [],
        mainCharacters: '',
        setting: '',
        plotOutline: '',
        pov: 'third',
        tenseStyle: 'past'
      }
    }

    const job = await SupabaseDB.createBookGenerationJob({
      user_id: userId,
      book_id: book.id!,
      status: 'pending',
      progress: 0,
      current_step: 'Generating remaining chapters after purchase...',
      config: config,
      metadata: JSON.stringify({ outline, isContinuation: true, triggeredByPurchase: true })
    })

    await SupabaseDB.updateBook(book.id!, {
      active_job_id: job.id,
      status: 'generating'
    })

    console.error('🚀 Auto-continuing book generation after purchase (native):', {
      jobId: job.id,
      bookId: book.id,
      title: config.title
    })

    // Start native generation in background (non-blocking)
    generateLiveBook(
      job.id!,
      book.id!,
      userId,
      {
        title: (config as any).title || book.title,
        genre: (config as any).genre || book.genre || '',
        targetAudience: (config as any).targetAudience || book.target_audience || 'general',
        description: (config as any).description || book.description || '',
        totalChapters: (config as any).totalChapters || book.chapters || 5,
        writingStyle: (config as any).writingStyle || book.style || 'descriptive',
        tone: (config as any).tone || 'engaging',
        themes: (config as any).themes || [],
        mainCharacters: (config as any).mainCharacters || '',
        setting: (config as any).setting || '',
        plotOutline: (config as any).plotOutline || '',
        pov: (config as any).pov || 'third',
        tenseStyle: (config as any).tenseStyle || 'past',
        previewMode: false,
        startFromChapter: 2
      },
      outline as import('@/lib/generation/engine').BookOutline
    ).catch(err => {
      console.error('Error in continue-generation:', err)
    })

    return true
  } catch (error) {
    console.error('Error in triggerContinueGeneration:', error)
    return false
  }
}

/**
 * Continues a picture-book preview by generating the remaining pages
 * (everything from page index FREE_PICTURE_PAGES onwards). Reuses the
 * outline + config that were saved on the initial preview run so we
 * keep the same characters, style and page texts.
 */
async function triggerContinuePictureBookGeneration(book: Book, userId: string): Promise<boolean> {
  try {
    if (book.status !== 'preview') {
      console.error(`Picture book ${book.id} is not in preview status, skipping continuation`)
      return false
    }

    let outline: unknown = null
    let config: Record<string, unknown> | null = null

    if (book.active_job_id) {
      const originalJob = await SupabaseDB.getBookGenerationJob(book.active_job_id)
      if (originalJob?.metadata) {
        try {
          const metadata = typeof originalJob.metadata === 'string'
            ? JSON.parse(originalJob.metadata)
            : originalJob.metadata
          outline = metadata.outline
        } catch (e) {
          console.error('Error parsing picture-book job metadata:', e)
        }
      }
      if (originalJob?.config) {
        config = originalJob.config as Record<string, unknown>
      }
    }

    if (!outline) {
      console.error(`No outline found for picture book ${book.id}, cannot continue generation`)
      return false
    }

    const picturebookConfig: PicturebookConfig = {
      title: (config?.title as string) || book.title,
      author: (config?.author as string) || undefined,
      genre: (config?.genre as string) || book.genre || '',
      targetAudience: (config?.targetAudience as string) || book.target_audience || 'Children 4-6 years',
      description: (config?.description as string) || book.description || '',
      bookType: 'picture',
      totalPages: (config?.totalPages as number) || book.chapters || 12,
      imageStyle: ((config?.imageStyle as PicturebookConfig['imageStyle']) || (book.style as PicturebookConfig['imageStyle']) || 'watercolor'),
      tone: (config?.tone as string) || 'Cheerful',
      mainCharacters: (config?.mainCharacters as string) || '',
      setting: (config?.setting as string) || '',
      plotOutline: (config?.plotOutline as string) || '',
      themes: (config?.themes as string[]) || [],
      customPrompt: (config?.customPrompt as string) || '',
      language: (config?.language as PicturebookConfig['language']) || 'en',
    }

    const job = await SupabaseDB.createBookGenerationJob({
      user_id: userId,
      book_id: book.id!,
      status: 'pending',
      progress: 0,
      current_step: 'Generating remaining picture-book pages after purchase...',
      config: picturebookConfig,
      metadata: JSON.stringify({ outline, isContinuation: true, triggeredByPurchase: true })
    })

    await SupabaseDB.updateBook(book.id!, {
      active_job_id: job.id,
      status: 'generating'
    })

    console.error('🚀 Auto-continuing picture-book generation after purchase:', {
      jobId: job.id,
      bookId: book.id,
      title: picturebookConfig.title,
      startFromPage: FREE_PICTURE_PAGES
    })

    generatePictureBook(
      job.id!,
      book.id!,
      userId,
      picturebookConfig,
      {
        previewMode: false,
        startFromPage: FREE_PICTURE_PAGES,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        existingOutline: outline as any,
      }
    ).catch(err => {
      console.error('Error in picture-book continue-generation:', err)
    })

    return true
  } catch (error) {
    console.error('Error in triggerContinuePictureBookGeneration:', error)
    return false
  }
}

/**
 * POST /api/books/[id]/complete-purchase
 * Completes a book purchase after Stripe payment confirmation
 *
 * Body: { paymentIntentId: string }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    const bookId = resolvedParams.id

    // Verify authentication
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = await verifySupabaseToken(token)

    if (!user || !user.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { paymentIntentId } = await request.json()

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Payment intent ID required' }, { status: 400 })
    }

    // Verify the payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({
        error: 'Payment not completed',
        status: paymentIntent.status
      }, { status: 400 })
    }

    // Verify the payment is for this book
    if (paymentIntent.metadata.bookId !== bookId) {
      return NextResponse.json({
        error: 'Payment intent does not match book'
      }, { status: 400 })
    }

    // Get the book
    const book = await SupabaseDB.getBook(bookId)

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Verify ownership
    if (book.user_id !== user.userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Check if already purchased
    if (book.purchased) {
      return NextResponse.json({
        success: true,
        message: 'Book already purchased',
        alreadyPurchased: true,
        book: {
          id: book.id,
          title: book.title,
          status: book.status
        }
      })
    }

    // Mark book as purchased
    await SupabaseDB.updateBook(bookId, {
      purchased: true,
      purchased_at: new Date().toISOString()
    })

    // Get updated book data
    const updatedBook = await SupabaseDB.getBook(bookId)

    // Trigger continue generation if book was in preview status
    let generationStarted = false
    if (updatedBook && updatedBook.status === 'preview') {
      generationStarted = updatedBook.book_type === 'picture'
        ? await triggerContinuePictureBookGeneration(updatedBook, user.userId)
        : await triggerContinueGeneration(updatedBook, user.userId)
    }

    console.error('✅ Book purchase completed:', {
      bookId,
      userId: user.userId,
      paymentIntentId,
      generationStarted
    })

    return NextResponse.json({
      success: true,
      message: 'Purchase successfully completed!',
      book: {
        id: updatedBook?.id || bookId,
        title: updatedBook?.title || book.title,
        status: updatedBook?.status || 'completed',
        activeJobId: updatedBook?.active_job_id
      },
      generationStarted,
      generationInfo: generationStarted
        ? 'The remaining chapters are now being generated.'
        : undefined
    })

  } catch (error) {
    console.error('❌ Error completing purchase:', error)
    return NextResponse.json({
      error: 'Failed to complete purchase',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
