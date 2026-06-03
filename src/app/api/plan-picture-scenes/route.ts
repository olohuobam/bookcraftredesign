import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import OpenAI from 'openai'

// Configure runtime for text generation
export const runtime = 'nodejs'
export const maxDuration = 60 // 1 minute for scene planning

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = auth.split('Bearer ')[1]
    const user = await verifySupabaseToken(token)
    if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const {
      title,
      outline,
      totalPages,
      imagesPerPage = 1,
      style = 'watercolor',
      mainCharacters = '',
      setting = ''
    } = await req.json()

    if (!title || !totalPages || !imagesPerPage) {
      return NextResponse.json({ error: 'Missing fields: title, totalPages, imagesPerPage' }, { status: 400 })
    }

    const characterInfo = [
      mainCharacters ? `Main characters: ${mainCharacters}` : '',
      setting ? `Setting: ${setting}` : '',
    ].filter(Boolean).join('\n')

    const prompt = `You are a storyboard planner and character designer for children's picture books.

Book title: "${title}"
Story outline: ${outline || 'n/a'}
Visual style: ${style}
${characterInfo}

Your tasks:
1) Create a detailed CHARACTER SHEET describing ALL main characters consistently:
   - Exact species/race, age, body shape
   - Specific skin/fur color, eye color, hair color/style
   - Exact clothing: colors, patterns, accessories
   - Size relationships between characters
   - Color palette of the book (4-6 specific colors)
   This characterDescription will be copy-pasted into EVERY image generation prompt — be very specific.

2) Split the story into exactly ${totalPages} pages, each with exactly ${imagesPerPage} panel description(s).
   Each panel is ONE short sentence describing a single cohesive scene to illustrate.
   Constraints:
   - No text in images, no speech bubbles, no letters/numbers/signs
   - Avoid collages/multi-panels within a single image
   - Keep characters visually consistent with the characterDescription

Return ONLY strict JSON:
{
  "characterDescription": "detailed visual character sheet here",
  "pages": [
    { "page": 1, "panels": [{ "index": 1, "description": "..." }] }
  ]
}
No additional explanations, no markdown.`

    const openai = getOpenAI()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Return only valid JSON. No explanations.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    })

    const raw = completion.choices?.[0]?.message?.content || '{}'
    let data: {
      characterDescription?: string
      pages?: Array<{ panels?: Array<{ description?: string }> }>
    }
    try {
      data = JSON.parse(raw)
    } catch {
      const m = raw.match(/\{[\s\S]*\}$/)
      data = m ? JSON.parse(m[0]) : { pages: [] }
    }

    // Normalize shape and enforce counts
    const pages = Array.from({ length: totalPages }, (_, p) => {
      const src = data.pages?.[p]
      const panels = Array.from({ length: imagesPerPage }, (_, i) => ({
        index: i + 1,
        description: String(src?.panels?.[i]?.description || '')
      }))
      return { page: p + 1, panels }
    })

    return NextResponse.json({
      characterDescription: data.characterDescription || '',
      pages
    })
  } catch (e: unknown) {
    console.error('plan-picture-scenes error', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Internal server error' }, { status: 500 })
  }
}
