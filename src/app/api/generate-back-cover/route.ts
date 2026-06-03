import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, AuthError } from '@/lib/auth-utils'
import OpenAI from 'openai'

// Configure runtime for text generation
export const runtime = 'nodejs'
export const maxDuration = 60 // 1 minute for back cover text generation

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

export async function POST(request: NextRequest) {
  try {
    await verifyAuth(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    throw error
  }
  
  try {

    const { title, description, genre, targetAudience, chapters } = await request.json()

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
    }

    // Create a compelling back cover text prompt
    const prompt = `Write a professional and compelling back cover text for a book with the following information:

Title: ${title}
Genre: ${genre || 'Novel'}
Target Audience: ${targetAudience || 'Adults'}
Description: ${description}
${chapters && chapters.length > 0 ? `First Chapters: ${chapters.join(', ')}` : ''}

The back cover text should:
- Create curiosity and encourage reading
- Be professionally and persuasively written
- Highlight the main themes of the book
- Be between 150-250 words long
- Avoid spoilers
- Follow standard book marketing conventions

Write ONLY the back cover text, without additional comments or explanations.`

    const openai = getOpenAI()
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a professional book marketing expert who writes compelling back cover texts for books.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 400,
      temperature: 0.7,
    })

    const backCoverText = response.choices[0]?.message?.content?.trim()

    if (!backCoverText) {
      return NextResponse.json({ error: 'Failed to generate back cover text' }, { status: 500 })
    }

    return NextResponse.json({
      backCoverText: backCoverText
    })

  } catch (error) {
    console.error('Error generating back cover text:', error)
    return NextResponse.json({ error: 'Failed to generate back cover text' }, { status: 500 })
  }
}
