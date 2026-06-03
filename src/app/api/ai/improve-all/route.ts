import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import OpenAI from 'openai'
import { checkRateLimit } from '@/lib/rate-limit'

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

interface ImproveAllRequest {
  bookType: 'text' | 'picture' | 'photobook' | 'live-stream'
  currentValues: Record<string, any>
  language?: string
}

/**
 * POST /api/ai/improve-all
 * Auto-fills/improves ALL book creation fields using AI.
 * Takes whatever the user has filled in and generates suggestions for everything else.
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

    // Rate limiting: max 10 improve-all calls per hour per user
    const rateLimitResult = checkRateLimit(user.userId, 'ai-improve-all', {
      limit: 10,
      windowSeconds: 3600,
    })
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      )
    }

    const body: ImproveAllRequest = await request.json()
    const { bookType, currentValues, language = 'de' } = body

    const langInstruction = language === 'de'
      ? 'Antworte auf Deutsch.'
      : language === 'en'
        ? 'Answer in English.'
        : `Answer in the language with code "${language}".`

    // Collect what the user already filled in
    const filledFields: string[] = []

    const allTextFields = ['title', 'genre', 'description', 'mainCharacters', 'setting', 'plotOutline', 'targetAudience', 'writingStyle', 'tone', 'themes']
    const allPictureFields = ['title', 'genre', 'description', 'mainCharacters', 'setting', 'plotOutline', 'targetAudience', 'imageStyle', 'tone']

    const relevantFields = bookType === 'picture' ? allPictureFields : allTextFields

    for (const field of relevantFields) {
      const val = currentValues[field]
      if (val && ((typeof val === 'string' && val.trim()) || (Array.isArray(val) && val.length > 0))) {
        filledFields.push(field)
      }
    }

    const existingContext = filledFields.map(f => {
      const val = currentValues[f]
      return `- ${f}: ${Array.isArray(val) ? val.join(', ') : val}`
    }).join('\n')

    let systemPrompt = ''
    let userPrompt = ''

    if (bookType === 'picture') {
      systemPrompt = `You are a creative children's book author and illustrator. Generate compelling book details for a picture book. ${langInstruction}

Return a JSON object with these fields (generate ALL of them, even if user provided some - improve those):
{
  "title": "catchy, memorable title",
  "genre": "one of: Abenteuer, Fantasie, Freundschaft, Tiere, Natur, Lustiges, Gute-Nacht-Geschichten, Märchen, Lerngeschichten, Alltag",
  "description": "2-3 sentence engaging description (max 500 chars)",
  "mainCharacters": "main characters with brief descriptions (max 200 chars)",
  "setting": "vivid setting description (max 200 chars)",
  "plotOutline": "brief plot outline with beginning, middle, end (max 500 chars)",
  "targetAudience": "one of: Kinder 2-4 Jahre, Kinder 4-6 Jahre, Kinder 6-8 Jahre, Kinder 8-10 Jahre",
  "imageStyle": "one of: watercolor, cartoon, realistic, anime, comic, digital-painting, oil-painting, pixel-art, 3d-render, pencil-sketch, flat-design, storybook, collage, minimalist, retro",
  "tone": "one of: Fröhlich, Spannend, Nachdenklich, Mysteriös, Romantisch, Neutral, Inspirierend"
}

IMPORTANT: Return ONLY valid JSON, no markdown, no explanation.`
    } else {
      systemPrompt = `You are a professional book author. Generate compelling book details. ${langInstruction}

Return a JSON object with these fields (generate ALL of them, even if user provided some - improve those):
{
  "title": "catchy, memorable title",
  "genre": "one of: Fantasy, Science Fiction, Krimi, Romance, Drama, Abenteuer, Kinderbuch, Sachbuch, Horror, Humor, Thriller, Historisch",
  "description": "2-3 sentence engaging description (max 500 chars)",
  "mainCharacters": "main characters with brief descriptions (max 200 chars)",
  "setting": "vivid setting description (max 200 chars)",
  "plotOutline": "brief plot outline with beginning, middle, end (max 500 chars)",
  "targetAudience": "one of: Kinder 6-12, Jugendliche 13-17, Junge Erwachsene, Erwachsene, Alle Altersgruppen",
  "writingStyle": "one of: Modern, Klassisch, Poetisch, Humorvoll",
  "tone": "one of: Fröhlich, Spannend, Nachdenklich, Mysteriös, Romantisch, Neutral, Düster, Inspirierend",
  "themes": ["theme1", "theme2"] (1-3 themes)
}

IMPORTANT: Return ONLY valid JSON, no markdown, no explanation.`
    }

    if (filledFields.length > 0) {
      userPrompt = `The user has already filled in some fields. Use these as inspiration and improve/expand them. Generate the remaining fields to match:\n\n${existingContext}\n\nGenerate a complete, coherent book concept based on this.`
    } else {
      userPrompt = `Generate a completely original and creative book concept. Surprise me with something unique and engaging!`
    }

    console.error('🤖 AI Improve All:', { bookType, filledFields: filledFields.length })

    const openai = getOpenAI()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 1000
    })

    const rawResponse = completion.choices[0]?.message?.content?.trim() || '{}'

    let improvedValues: Record<string, any>
    try {
      const jsonStr = rawResponse.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '')
      improvedValues = JSON.parse(jsonStr)
    } catch {
      console.error('Failed to parse AI response:', rawResponse)
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    // Helper: coerce a value that should be a plain string to string
    // (AI sometimes returns arrays or objects despite instructions)
    const normalizeToString = (val: unknown): string => {
      if (typeof val === 'string') return val.trim()
      if (Array.isArray(val)) {
        return val
          .map((item) =>
            typeof item === 'object' && item !== null
              ? (item as Record<string, unknown>).name ?? JSON.stringify(item)
              : String(item)
          )
          .join(', ')
      }
      if (typeof val === 'object' && val !== null) {
        const obj = val as Record<string, unknown>
        return (obj.name ?? obj.description ?? JSON.stringify(val)) as string
      }
      return String(val ?? '')
    }

    // Trim string values to prevent whitespace mismatches with enum selects
    for (const key of Object.keys(improvedValues)) {
      if (typeof improvedValues[key] === 'string') {
        improvedValues[key] = improvedValues[key].trim()
      }
    }

    // Normalize free-text fields that must always be strings
    const freeTextFields = ['mainCharacters', 'setting', 'plotOutline', 'description', 'title']
    for (const field of freeTextFields) {
      if (field in improvedValues && typeof improvedValues[field] !== 'string') {
        improvedValues[field] = normalizeToString(improvedValues[field])
      }
    }

    // Enforce max 3 themes
    if (Array.isArray(improvedValues.themes)) {
      improvedValues.themes = improvedValues.themes
        .map((t: string) => typeof t === 'string' ? t.trim() : t)
        .slice(0, 3)
    }

    console.error('✅ AI Improve All complete:', {
      bookType,
      fieldsGenerated: Object.keys(improvedValues).length,
      tokensUsed: completion.usage?.total_tokens || 0
    })

    return NextResponse.json({
      success: true,
      improvedValues,
      tokensUsed: completion.usage?.total_tokens || 0
    })

  } catch (error) {
    console.error('❌ Error in AI Improve All:', error)
    // Don't leak implementation details to the client
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
