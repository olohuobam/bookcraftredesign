import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import OpenAI from 'openai'
import { checkRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// POST /api/ai/refine-prompt - Refine a book prompt using AI
export async function POST(req: NextRequest) {
  // Initialize OpenAI client inside handler to avoid build-time errors
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })
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

    // Rate limiting: max 30 prompt refinements per hour per user
    const rateLimitResult = checkRateLimit(user.userId, 'ai-refine-prompt', {
      limit: 30,
      windowSeconds: 3600,
    })
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      )
    }

    const { prompt, genre, targetAudience, style, bookType } = await req.json()

    if (!prompt || prompt.trim().length < 10) {
      return NextResponse.json({ error: 'Please provide a prompt with at least 10 characters' }, { status: 400 })
    }

    // Build context for the AI
    const contextParts = []
    if (genre) contextParts.push(`Genre: ${genre}`)
    if (targetAudience) contextParts.push(`Target Audience: ${targetAudience}`)
    if (style) contextParts.push(`Writing Style: ${style}`)
    if (bookType) contextParts.push(`Book Type: ${bookType === 'picture' ? 'Picture Book' : 'Text Book'}`)

    const context = contextParts.length > 0 ? `\n\nContext:\n${contextParts.join('\n')}` : ''

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a creative writing assistant that helps authors refine their book ideas into compelling, detailed prompts.

Your task is to take a rough book idea and transform it into a rich, engaging prompt that will help generate an amazing book.

Guidelines:
- Expand on the core concept while keeping the original vision
- Add interesting plot elements, character details, or thematic depth
- Make the prompt vivid and specific
- Keep it concise but impactful (2-4 sentences)
- Match the tone to the genre and target audience
- If it's a children's book, keep it age-appropriate and magical
- Respond ONLY with the refined prompt, no explanations or prefixes`
        },
        {
          role: 'user',
          content: `Please refine this book idea into a compelling prompt:

Original idea: ${prompt}${context}`
        }
      ],
      temperature: 0.8,
      max_tokens: 300
    })

    const refinedPrompt = completion.choices[0]?.message?.content?.trim()

    if (!refinedPrompt) {
      throw new Error('Failed to generate refined prompt')
    }

    return NextResponse.json({
      success: true,
      refinedPrompt
    })
  } catch (e) {
    console.error('Error refining prompt:', e instanceof Error ? e.message : e)
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Internal server error'
    }, { status: 500 })
  }
}
