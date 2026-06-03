import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { ensureUserProfile } from '@/lib/user-profile'
import { SupabaseDB } from '@/lib/supabase-db'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { checkRateLimit } from '@/lib/rate-limit'

// Configure runtime for longer execution (image generation can take time)
export const runtime = 'nodejs'
export const maxDuration = 120 // 2 minutes for multiple image generation

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    // Verify Supabase token
    let userData
    try {
      userData = await verifySupabaseToken(token)
      if (!userData || !userData.userId || !userData.email) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Ensure user profile exists (now userData.userId and userData.email are guaranteed strings)
    await ensureUserProfile(userData.userId, userData.email)

    // Rate limiting: max 10 image generations per hour per user
    const rateLimitResult = checkRateLimit(userData.userId, 'generate-images', {
      limit: 10,
      windowSeconds: 3600,
    })
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      )
    }

    const { bookId, title, description, style, chapters } = await request.json()

    if (!bookId || !title || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if book exists and belongs to user
    const book = await SupabaseDB.getBook(bookId)

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }
    
    if (book.user_id !== userData.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse chapters from chapters_json if available (correct snake_case field)
    let bookChapters = []
    const chaptersJson = book.chapters_json
    if (chaptersJson && typeof chaptersJson === 'string') {
      try {
        bookChapters = JSON.parse(chaptersJson)
      } catch (e) {
        console.error('Error parsing chapters_json:', e)
      }
    }

    const images: string[] = []
    const maxImages = Math.min(bookChapters.length || chapters || 5, 8) // Limit to 8 images max
    
    // Base style prompt for consistency
    const baseStylePrompt = `Professional book illustration, ${style} art style, clean and minimal design, ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO WORDS, NO SYMBOLS, NO WRITING visible in the image at any cost, bright colors, high quality digital art`

    // Generate images for each chapter/scene
    for (let i = 0; i < maxImages; i++) {
      try {
        let sceneDescription = description
        
        // Use specific chapter content if available
        if (bookChapters[i] && bookChapters[i].content) {
          // Extract key visual elements from chapter content, avoiding text references
          const chapterContent = bookChapters[i].content
          sceneDescription = `Scene from: ${chapterContent.substring(0, 200)}...`
        }

        // Build context from previous images for consistency
        let contextPrompt = ""
        if (i > 0) {
          contextPrompt = ` Continue the visual story from previous scenes, maintaining character consistency and art style.`
        }

        const imagePrompt = `${baseStylePrompt}.

Story context: "${title}" - ${sceneDescription}

Scene ${i + 1}: Create a beautiful illustration that represents this part of the story.${contextPrompt}

CRITICAL REQUIREMENTS:
- ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO WORDS, NO SYMBOLS, NO WRITING should appear anywhere in the image AT ANY COST
- NO SIGNS, NO LABELS, NO CAPTIONS, NO TITLES visible in the image
- Focus ONLY on visual storytelling through imagery, colors, and scenes
- Clean, professional illustration without any textual elements
- Pure visual content only
- Maintain consistent art style`

        // Use Gemini Imagen 3 for image generation
        const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" })

        const result = await model.generateContent({
          contents: [{
            role: "user",
            parts: [{
              text: imagePrompt
            }]
          }],
          generationConfig: {
            temperature: 1,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
            responseMimeType: "image/png"
          }
        })

        const response = await result.response
        const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData

        if (imageData?.data) {
          // Convert base64 to data URL
          const imageDataUrl = `data:${imageData.mimeType};base64,${imageData.data}`
          images.push(imageDataUrl)
        } else {
          throw new Error('No image data returned from Gemini')
        }

        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (imageError) {
        console.error(`Error generating image ${i + 1} with Gemini:`, imageError)
        return NextResponse.json(
          { error: `Failed to generate image ${i + 1} with Gemini. Please check your GEMINI_API_KEY and try again.` },
          { status: 500 }
        )
      }
    }

    // Update book with generated images
    const updatedBook = await SupabaseDB.updateBook(bookId, {
      images: images,
      status: 'completed'
    })

    // Convert to camelCase for consistent API response
    const bookResponse = {
      id: updatedBook.id,
      title: updatedBook.title,
      images: updatedBook.images,
      status: updatedBook.status,
      createdAt: updatedBook.created_at,
      updatedAt: updatedBook.updated_at
    }

    return NextResponse.json({ 
      success: true, 
      images: images,
      book: bookResponse
    })

  } catch (error) {
    console.error('Error generating images:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
