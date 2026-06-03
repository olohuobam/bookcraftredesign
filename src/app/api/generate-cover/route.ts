import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { ensureUserProfile } from '@/lib/user-profile'
import OpenAI from 'openai'
import { logError, createErrorResponse } from '@/lib/api-errors'
import { checkRateLimit } from '@/lib/rate-limit'

// Configure runtime for image generation
export const runtime = 'nodejs'
export const maxDuration = 60 // 1 minute for cover generation

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

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

    // Rate limiting: max 20 cover generations per hour per user
    const rateLimitResult = checkRateLimit(userData.userId, 'generate-cover', {
      limit: 20,
      windowSeconds: 3600,
    })
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { title, genre, description, author, bookType } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Create a detailed prompt for cover generation
    let coverPrompt = `Create a professional book cover for "${title}"`
    
    if (author) {
      coverPrompt += ` by ${author}`
    }
    
    if (genre) {
      coverPrompt += `. Genre: ${genre}`
    }
    
    if (description) {
      coverPrompt += `. Book description: ${description}`
    }

    // Adjust style based on book type
    if (bookType === 'picture') {
      coverPrompt += `. Style: Colorful, child-friendly illustration with playful typography, suitable for a picture book. Bright colors, engaging visual elements that would appeal to children and families.`
    } else {
      coverPrompt += `. Style: Professional book cover design with elegant typography, suitable for adult readers. Clean, sophisticated design with compelling visual elements that convey the book's theme.`
    }

    coverPrompt += ` CRITICAL: Generate ONLY the front cover artwork as a FLAT, 2D image. NO 3D book rendering, NO book spine, NO book edges, NO shadows suggesting a physical book. The entire image should be filled with the cover artwork edge-to-edge. This is a flat rectangular image for printing, NOT a 3D book mockup. Portrait orientation (2:3 ratio), high quality, with readable title and author name.`

    console.error('Generating cover with OpenAI GPT Image 1.5, prompt:', coverPrompt)

    // Use OpenAI GPT Image 1.5 for cover generation (better text rendering, 4x faster)
    const openai = getOpenAI()

    let imageUrl: string | null | undefined = null
    let imageB64: string | null | undefined = null

    try {
      const response = await openai.images.generate({
        model: "gpt-image-1.5",
        prompt: coverPrompt,
        n: 1,
        size: "1024x1536", // Portrait format for book covers
        quality: "high", // low, medium, or high
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      imageUrl = response.data?.[0]?.url
      imageB64 = response.data?.[0]?.b64_json
      console.error('✅ gpt-image-1.5 succeeded for cover generation')
    } catch (primaryError) {
      console.error('❌ gpt-image-1.5 failed for cover generation, trying dall-e-3 fallback:', primaryError)
      try {
        const fallbackResponse = await openai.images.generate({
          model: "dall-e-3",
          prompt: coverPrompt,
          n: 1,
          size: "1024x1792", // Closest portrait format available in dall-e-3
          quality: "standard",
          response_format: "url"
        })
        imageUrl = fallbackResponse.data?.[0]?.url
        console.error('✅ dall-e-3 fallback succeeded for cover generation')
      } catch (fallbackError) {
        console.error('❌ dall-e-3 fallback also failed for cover generation:', fallbackError)
      }
    }

    if (!imageUrl && !imageB64) {
      return NextResponse.json({ error: 'Failed to generate cover with OpenAI' }, { status: 500 })
    }

    // If we got base64 data, use it directly
    if (imageB64) {
      const imageBuffer = Buffer.from(imageB64, 'base64')
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Content-Length': imageBuffer.byteLength.toString()
        }
      })
    }

    // If we got a URL, fetch the image and return it
    const imageResponse = await fetch(imageUrl!)
    const imageArrayBuffer = await imageResponse.arrayBuffer()
    const imageBuffer = Buffer.from(imageArrayBuffer)

    // Return the image as a binary response
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': imageBuffer.byteLength.toString()
      }
    })

  } catch (error) {
    console.error('❌ Unexpected error in generate-cover route:', error)
    logError('generate-cover', error)
    return createErrorResponse(error, 'Failed to generate cover with OpenAI. Please check your OPENAI_API_KEY.')
  }
}
