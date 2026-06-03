import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Configure runtime for image generation
export const runtime = 'nodejs'
export const maxDuration = 60 // 1 minute for back cover image generation

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization')
    const token = authorization?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    let userEmail: string | null = null
    try {
      const userData = await verifySupabaseToken(token)
      userEmail = userData?.email || null
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, genre, author, publisher, bookType } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Create a prompt for back cover design
    let backCoverPrompt = `Create a professional back cover design for the book "${title}"`
    
    if (author) {
      backCoverPrompt += ` by ${author}`
    }
    
    if (genre) {
      backCoverPrompt += `. Genre: ${genre}`
    }

    if (bookType === 'picture') {
      backCoverPrompt += `. Style: Colorful, child-friendly back cover design for a picture book. Should complement a children's book aesthetic with bright, engaging colors and playful elements. Include space for a book description, author bio, and publisher information.`
    } else {
      backCoverPrompt += `. Style: Professional book back cover design with elegant layout suitable for adult readers. Clean, sophisticated design that complements the front cover. Include designated areas for book summary, author bio, and publisher details.`
    }

    if (publisher) {
      backCoverPrompt += ` Publisher: ${publisher}.`
    }

    backCoverPrompt += ` The design should be vertical/portrait orientation (3:4 ratio), high quality, and include clearly defined sections for text placement. The background should provide good contrast for readable text overlay.`

    console.error('Generating back cover with Gemini Imagen, prompt:', backCoverPrompt)

    // Use Gemini Imagen 3 for back cover generation
    const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" })

    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{
          text: backCoverPrompt
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

    if (!imageData?.data) {
      return NextResponse.json({ error: 'Failed to generate back cover with Gemini' }, { status: 500 })
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageData.data, 'base64')

    // Return the image as a binary response
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': imageData.mimeType || 'image/png',
        'Content-Length': imageBuffer.byteLength.toString()
      }
    })

  } catch (error) {
    console.error('Error generating back cover with Gemini:', error)
    return NextResponse.json(
      { error: 'Failed to generate back cover with Gemini. Please check your GEMINI_API_KEY.' },
      { status: 500 }
    )
  }
}
