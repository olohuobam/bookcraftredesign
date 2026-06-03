import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, AuthError } from '@/lib/auth-utils'
import {
  BookConfig,
  GenerationProgress,
  ChapterData,
  generateBookOutline,
  generateChapter,
  generateAllImages,
  createBookInDatabase,
  updateBookInDatabase,
  finalizeBookInDatabase
} from '@/lib/book-generation'

// Configure runtime for longer execution
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes maximum execution time

async function runBookGenerationPipeline(
  config: BookConfig,
  userId: string,
  userEmail: string,
  sendUpdate: (data: GenerationProgress) => void
): Promise<void> {
  let bookId = ''
  const generatedChapters: ChapterData[] = []
  let bookContext = ''
  let errorAlreadySent = false

  try {
    // Step 1: Create book outline (5%)
    sendUpdate({ progress: 5, status: 'Creating book structure and outline...' })
    try {
      bookContext = await generateBookOutline(config)
    } catch (error) {
      errorAlreadySent = true
      sendUpdate({ progress: 5, status: 'Error creating outline', error: error instanceof Error ? error.message : 'Failed to create book outline' })
      throw error
    }

    // Step 2: Create database entry (10%)
    sendUpdate({ progress: 10, status: 'Saving book to database...' })
    try {
      bookId = await createBookInDatabase(config, userId, userEmail)
    } catch (error) {
      errorAlreadySent = true
      sendUpdate({ progress: 10, status: 'Error saving to database', error: error instanceof Error ? error.message : 'Failed to save book to database' })
      throw error
    }

    // Step 3: Generate all chapters (10–85%)
    sendUpdate({ progress: 12, status: 'Starting chapter generation...' })
    const progressPerChapter = 75 / config.totalChapters
    try {
      for (let i = 0; i < config.totalChapters; i++) {
        sendUpdate({
          progress: Math.round(10 + i * progressPerChapter),
          status: `Generating chapter ${i + 1} of ${config.totalChapters}...`
        })
        const chapter = await generateChapter(config, bookContext, generatedChapters.slice(-3), i)
        generatedChapters.push(chapter)
        await updateBookInDatabase(bookId, generatedChapters)
      }
    } catch (error) {
      const currentProgress = 10 + Math.round((generatedChapters.length / config.totalChapters) * 75)
      errorAlreadySent = true
      sendUpdate({ progress: currentProgress, status: 'Error generating chapters', error: error instanceof Error ? error.message : 'Chapter generation failed' })
      throw error
    }

    // Step 4: Generate images if picture book (85–95%)
    if (config.bookType === 'picture') {
      try {
        await generateAllImages(config, generatedChapters, bookContext, (current, total) => {
          sendUpdate({
            progress: Math.round(85 + (current / total) * 10),
            status: `Generating image ${current + 1} of ${total}...`
          })
        })
        await updateBookInDatabase(bookId, generatedChapters)
      } catch (error) {
        errorAlreadySent = true
        sendUpdate({ progress: 85, status: 'Error generating images', error: error instanceof Error ? error.message : 'Image generation failed' })
        throw error
      }
    }

    // Step 5: Finalize (95–100%)
    sendUpdate({ progress: 95, status: 'Performing final review...' })
    try {
      await finalizeBookInDatabase(bookId, generatedChapters)
    } catch (error) {
      errorAlreadySent = true
      sendUpdate({ progress: 95, status: 'Error finalizing book', error: error instanceof Error ? error.message : 'Finalization failed' })
      throw error
    }

    sendUpdate({ progress: 100, status: 'Book successfully generated!', bookId, complete: true })
  } catch (error) {
    console.error('Error in book generation pipeline:', error)
    if (!errorAlreadySent) {
      sendUpdate({ progress: 0, status: 'Error during generation', error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }
}

export async function POST(request: NextRequest) {
  let user

  try {
    user = await verifyAuth(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    throw error
  }

  try {
    const bookConfig: BookConfig = await request.json()

    if (!bookConfig.title || !bookConfig.description || !bookConfig.plotOutline || !bookConfig.mainCharacters) {
      return NextResponse.json({
        error: 'Missing required fields: title, description, plotOutline, mainCharacters'
      }, { status: 400 })
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        const sendUpdate = (data: GenerationProgress) => {
          const message = `data: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(message))
        }

        try {
          await runBookGenerationPipeline(bookConfig, user.id, user.email, sendUpdate)
        } catch (error) {
          sendUpdate({
            progress: 0,
            status: 'Error during generation',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('Error in generate-complete-book:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
