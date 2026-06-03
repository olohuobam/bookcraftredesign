import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'
import { getTemplateById } from '@/lib/book-templates'
import { notifyBookReady } from '@/lib/notifications'
import OpenAI from 'openai'

// Lazy initialization to avoid build-time errors
function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })
}

// POST /api/books/generate-from-template - Generate book content from template using AI
export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = await verifySupabaseToken(token)

    if (!user || !user.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { bookId, jobId, templateId } = await req.json()

    if (!bookId || !jobId || !templateId) {
      return NextResponse.json({
        error: 'Missing parameters'
      }, { status: 400 })
    }

    // Get template
    const template = getTemplateById(templateId)
    if (!template) {
      await SupabaseDB.updateBookGenerationJob(jobId, {
        status: 'failed',
        error_message: 'Template not found'
      })
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Get book — enforce ownership
    const book = await SupabaseDB.getBook(bookId)
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }
    if (book.user_id !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse existing chapters
    let chapters = []
    try {
      chapters = JSON.parse(book.chapters_json || '[]')
    } catch (e) {
      console.error('Error parsing chapters:', e)
      chapters = template.chapterOutline.map((chapter, index) => ({
        id: String(index + 1),
        title: chapter.title,
        content: '',
        wordCount: 0,
        description: chapter.description,
        estimatedWords: chapter.estimatedWords
      }))
    }

    console.error(`🚀 Starting AI generation for book ${bookId} from template ${template.name}`)

    // Update job to processing
    await SupabaseDB.updateBookGenerationJob(jobId, {
      status: 'processing',
      progress: 0,
      current_step: 'Starting AI generation...'
    })

    // Generate each chapter sequentially
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i]
      const chapterOutline = template.chapterOutline[i]

      try {
        // Update progress
        const progress = Math.round((i / chapters.length) * 100)
        await SupabaseDB.updateBookGenerationJob(jobId, {
          progress,
          current_step: `Generating chapter ${i + 1}/${chapters.length}: ${chapter.title}`
        })

        console.error(`  📝 Generating chapter ${i + 1}/${chapters.length}: ${chapter.title}`)

        // Generate chapter content with OpenAI
        const prompt = `You are a professional author. Write a chapter for a book with the following information:

Book Title: ${book.title}
Genre: ${book.genre}
Style: ${book.style}
Target Audience: ${book.target_audience}

Chapter ${i + 1}: ${chapter.title}
Description: ${chapter.description}
Target Word Count: ~${chapterOutline.estimatedWords} words

${template.samplePrompt ? `\nBackground Idea: ${template.samplePrompt}` : ''}

IMPORTANT: Write all content in English, regardless of the language of the input description.

Write the complete chapter. Focus on:
- Appropriate writing style for the target audience
- Coherent story development
- Appropriate length (~${chapterOutline.estimatedWords} words)
- Engaging and well-structured narrative

Write only the chapter text, no additional comments.`

        const completion = await getOpenAI().chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a professional book author with extensive experience in various genres. Always write in English.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: Math.min(chapterOutline.estimatedWords * 2, 4000)
        })

        const generatedContent = completion.choices[0]?.message?.content || ''
        const wordCount = generatedContent.split(/\s+/).length

        // Update chapter with generated content
        chapters[i] = {
          ...chapter,
          content: generatedContent,
          wordCount: wordCount
        }

        // Save progress to database
        await SupabaseDB.updateBook(bookId, {
          chapters_json: JSON.stringify(chapters)
        })

        console.error(`  ✅ Chapter ${i + 1} generated (${wordCount} words)`)

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error: unknown) {
        console.error(`Error generating chapter ${i + 1}:`, error)

        // Continue with next chapter even if one fails
        chapters[i] = {
          ...chapter,
          content: `[Generation error: ${error instanceof Error ? error.message : 'Unknown error'}]`,
          wordCount: 0
        }
      }
    }

    // Mark as completed
    await SupabaseDB.updateBookGenerationJob(jobId, {
      status: 'completed',
      progress: 100,
      current_step: 'Generation completed!',
      completed_at: new Date().toISOString()
    })

    await SupabaseDB.updateBook(bookId, {
      status: 'completed',
      active_job_id: null,
      chapters_json: JSON.stringify(chapters)
    })

    console.error(`✅ Book ${bookId} generation completed!`)

    // Send in-app + push notification that the book is ready
    notifyBookReady(user.userId, book.title || 'Dein Buch', bookId).catch((err) => {
      console.error('[generate-from-template] notifyBookReady failed:', err)
    })

    return NextResponse.json({
      success: true,
      message: 'Book successfully generated',
      chaptersGenerated: chapters.length
    })

  } catch (error: unknown) {
    console.error('Error in template generation:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Generation error'
    }, { status: 500 })
  }
}
