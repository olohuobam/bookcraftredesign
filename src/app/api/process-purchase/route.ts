import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { SupabaseDB, Book } from '@/lib/supabase-db'
import { generateLiveBook } from '@/lib/generation'
import { verifySupabaseToken } from '@/lib/supabase-admin'

/**
 * Triggers continuation of book generation for preview books using native engine.
 * Returns the new job ID on success, or false if skipped/failed.
 *
 * Bug 1 fix: Language is read from the original job config and always included in
 *            the reconstructed config so live.ts never falls back to English.
 * Bug 2 fix: Deduplication check via getBookActiveJob before creating a new job.
 */
async function triggerContinueGeneration(book: Book, userId: string): Promise<string | false> {
  try {
    if (book.status !== 'preview') {
      console.error(`Book ${book.id} is not in preview status, skipping continuation`)
      return false
    }

    // Bug 2: Deduplication — abort if there is already a pending/processing job for this book
    const activeJob = await SupabaseDB.getBookActiveJob(book.id!)
    if (activeJob) {
      console.error(`⚠️ Book ${book.id} already has active job ${activeJob.id}, skipping duplicate`)
      return false
    }

    let outline: unknown = null
    let config: Record<string, unknown> | null = null
    let savedLanguage: string | undefined

    if (book.active_job_id) {
      const originalJob = await SupabaseDB.getBookGenerationJob(book.active_job_id)
      if (originalJob?.metadata) {
        try {
          const metadata = typeof originalJob.metadata === 'string'
            ? JSON.parse(originalJob.metadata)
            : originalJob.metadata
          outline = metadata.outline
          config = originalJob.config as Record<string, unknown>
          // Bug 1: Preserve language from the original job config
          savedLanguage = (config as Record<string, unknown>)?.language as string | undefined
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
      // Bug 1: Include language in fallback config; default to German (app is primarily German)
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
        tenseStyle: 'past',
        language: savedLanguage || 'de'
      }
    } else {
      // Bug 1: Ensure language is always present in existing config
      if (!config.language) {
        config = { ...config, language: savedLanguage || 'de' }
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
      title: config.title,
      language: config.language
    })

    // Fire-and-forget native generation (continue from chapter 2)
    generateLiveBook(job.id!, book.id!, userId, { ...config, previewMode: false, startFromChapter: 2 } as any, outline as any)
      .catch(err => console.error('❌ Continue-generation error:', err))

    return job.id!
  } catch (error) {
    console.error('Error in triggerContinueGeneration:', error)
    return false
  }
}

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not defined')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-08-27.basil',
  })
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: require authenticated user. Previously this endpoint trusted
    // session.metadata.userId (an email), allowing anyone with a session ID
    // to flip books to purchased and trigger paid AI generation.
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }
    const authedUser = await verifySupabaseToken(token)
    if (!authedUser?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { sessionId } = await request.json()

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'No session ID provided' }, { status: 400 })
    }

    // Retrieve the checkout session from Stripe
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }

    // Bind the session to the authenticated user. The session metadata
    // historically stored either an email (legacy) or a userId. Accept either,
    // but require it to match the caller.
    const sessionUserField = session.metadata?.userId || ''
    const callerMatchesSession =
      sessionUserField === authedUser.userId ||
      (authedUser.email && sessionUserField.toLowerCase() === authedUser.email.toLowerCase())
    if (!callerMatchesSession) {
      return NextResponse.json({ error: 'Session does not belong to user' }, { status: 403 })
    }

    const quantity = parseInt(session.metadata?.quantity || '1', 10)
    const selectedBookIds = session.metadata?.selectedBookIds
      ? (JSON.parse(session.metadata.selectedBookIds) as Array<string | number>).map(String)
      : []

    const user = { id: authedUser.userId }

    // Mark books as purchased
    let purchasedBooks: Array<{ id?: string; title?: string; purchased: boolean; generationStarted?: boolean; jobId?: string }> = []
    const booksToGenerate: Array<{ book: Book; userId: string }> = []

    if (quantity === 1) {
      // Single book purchase — prefer bookId from session metadata to avoid
      // binding to the wrong unpurchased book (security fix).
      const metaBookId = session.metadata?.bookId
      let bookToUpdate: Book | null = null
      if (metaBookId) {
        bookToUpdate = await SupabaseDB.getBookById(metaBookId, user.id) || null
      }
      if (!bookToUpdate) {
        // Fallback: first unpurchased book (legacy behaviour)
        const unpurchasedBooks = await SupabaseDB.getUserBooks(user.id, { purchased: false })
        bookToUpdate = unpurchasedBooks.length > 0 ? unpurchasedBooks[0] : null
      }
      if (bookToUpdate) {
        if (!bookToUpdate.id) {
          throw new Error('The selected book does not have a valid ID.')
        }

        await SupabaseDB.updateBook(bookToUpdate.id, {
          purchased: true,
          purchased_at: new Date().toISOString()
        })

        const fullBook = await SupabaseDB.getBookById(bookToUpdate.id, user.id)
        if (fullBook) {
          booksToGenerate.push({ book: fullBook, userId: user.id })
        }

        purchasedBooks = [{ ...bookToUpdate, purchased: true }]
      }
    } else {
      // Multi-book purchase - mark selected books (ownership enforced via getBookById)
      if (selectedBookIds.length > 0) {
        for (const bookId of selectedBookIds) {
          const book = await SupabaseDB.getBookById(bookId, user.id)
          if (book) {
            await SupabaseDB.updateBook(bookId, {
              purchased: true,
              purchased_at: new Date().toISOString()
            })

            booksToGenerate.push({ book, userId: user.id })
            purchasedBooks.push({ ...book, purchased: true })
          }
        }
      }
    }

    // Trigger continue-generation for books in preview status
    for (const { book, userId } of booksToGenerate) {
      const jobId = await triggerContinueGeneration(book, userId)
      if (jobId) {
        const idx = purchasedBooks.findIndex(pb => pb.id === book.id)
        if (idx >= 0) {
          purchasedBooks[idx].generationStarted = true
          purchasedBooks[idx].jobId = jobId
        }
        console.error(`✅ Auto-started generation for book ${book.id} after purchase (job: ${jobId})`)
      }
    }

    // Count books that started generation
    const booksWithGeneration = purchasedBooks.filter(b => b.generationStarted).length

    return NextResponse.json({
      success: true,
      message: `${purchasedBooks.length} book${purchasedBooks.length > 1 ? 's' : ''} successfully purchased!`,
      purchasedBooks: purchasedBooks.map(book => ({
        id: book.id,
        title: book.title,
        genre: (book as any).genre,
        generationStarted: book.generationStarted || false,
        jobId: book.jobId
      })),
      quantity: purchasedBooks.length,
      totalPrice: session.amount_total! / 100, // Convert from cents
      generationInfo: booksWithGeneration > 0
        ? `The remaining chapters for ${booksWithGeneration} book${booksWithGeneration > 1 ? 's' : ''} are now being generated.`
        : undefined
    })

  } catch (error) {
    console.error('Error processing purchase:', error)
    return NextResponse.json({ 
      error: 'Failed to process purchase' 
    }, { status: 500 })
  }
}
