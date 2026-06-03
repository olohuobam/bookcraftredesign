import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import OpenAI from 'openai'
import type { BookLanguage } from '@/lib/translations'

export const runtime = 'nodejs'

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

interface AIConfigRequest {
  userPrompt: string
  language?: BookLanguage
}

/**
 * Get language name for prompts
 */
function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    en: 'English', de: 'German (Deutsch)', es: 'Spanish (Español)', fr: 'French (Français)',
    it: 'Italian (Italiano)', pt: 'Portuguese (Português)', nl: 'Dutch (Nederlands)',
    pl: 'Polish (Polski)', ru: 'Russian (Русский)', ja: 'Japanese (日本語)',
    ko: 'Korean (한국어)', zh: 'Chinese (中文)', ar: 'Arabic (العربية)',
    tr: 'Turkish (Türkçe)', hi: 'Hindi (हिन्दी)', sv: 'Swedish (Svenska)',
    da: 'Danish (Dansk)', no: 'Norwegian (Norsk)', fi: 'Finnish (Suomi)',
    cs: 'Czech (Čeština)', el: 'Greek (Ελληνικά)', he: 'Hebrew (עברית)',
    id: 'Indonesian (Bahasa Indonesia)', th: 'Thai (ไทย)', vi: 'Vietnamese (Tiếng Việt)'
  }
  return names[code] || 'English'
}

interface BookConfiguration {
  title: string
  genre: string
  targetAudience: string
  description: string
  totalChapters: number
  writingStyle: string
  tone: string
  themes: string[]
  mainCharacters: string
  setting: string
  plotOutline: string
  pov: 'first' | 'third' | 'mixed'
  tenseStyle: 'past' | 'present' | 'mixed'
}

/**
 * POST /api/ai-config-generator
 * Takes a simple user prompt and generates a complete book configuration
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

    const body: AIConfigRequest = await request.json()

    if (!body.userPrompt || body.userPrompt.trim().length === 0) {
      return NextResponse.json({
        error: 'User prompt is required'
      }, { status: 400 })
    }

    const openai = getOpenAI()

    // Get language from request, default to 'en'
    const language = body.language || 'en'
    const languageName = getLanguageName(language)

    // Language-specific system prompts
    const systemPrompt = language === 'de'
      ? `Du bist ein Experte für Bucherstellung und Story-Entwicklung.
Deine Aufgabe ist es, basierend auf einem kurzen User-Prompt eine vollständige, professionelle Buchkonfiguration zu erstellen.

Analysiere den User-Prompt und erstelle:
1. Einen passenden Buchtitel
2. Das richtige Genre
3. Die Zielgruppe
4. Eine detaillierte Beschreibung (2-3 Sätze)
5. Anzahl der Kapitel (8-15 je nach Komplexität)
6. Schreibstil (z.B. "Episch", "Modern", "Poetisch", "Humorvoll")
7. Ton (z.B. "Dramatisch", "Fröhlich", "Dunkel", "Inspirierend")
8. Hauptthemen (3-5 Themen)
9. Hauptcharaktere (Namen und kurze Beschreibungen)
10. Setting/Schauplatz
11. Detaillierte Handlung (3-5 Sätze)
12. Erzählperspektive (first/third/mixed)
13. Zeitform (past/present/mixed)

Antworte IMMER mit validem JSON in diesem exakten Format (keine zusätzlichen Erklärungen):
{
  "title": "Buchtitel",
  "genre": "Genre",
  "targetAudience": "Zielgruppe",
  "description": "Kurze Beschreibung",
  "totalChapters": 12,
  "writingStyle": "Schreibstil",
  "tone": "Ton",
  "themes": ["Thema1", "Thema2", "Thema3"],
  "mainCharacters": "Charakterbeschreibungen",
  "setting": "Setting",
  "plotOutline": "Detaillierte Handlung",
  "pov": "third",
  "tenseStyle": "past"
}`
      : `You are an expert in book creation and story development.
Your task is to create a complete, professional book configuration based on a short user prompt.

**IMPORTANT: All text content must be written in ${languageName}.**

Analyze the user prompt and create:
1. An appropriate book title - in ${languageName}
2. The right genre
3. The target audience
4. A detailed description (2-3 sentences) - in ${languageName}
5. Number of chapters (8-15 depending on complexity)
6. Writing style (e.g. "Epic", "Modern", "Poetic", "Humorous")
7. Tone (e.g. "Dramatic", "Cheerful", "Dark", "Inspiring")
8. Main themes (3-5 themes)
9. Main characters (names and brief descriptions) - in ${languageName}
10. Setting/location - in ${languageName}
11. Detailed plot outline (3-5 sentences) - in ${languageName}
12. Narrative perspective (first/third/mixed)
13. Tense (past/present/mixed)

ALWAYS respond with valid JSON in this exact format (no additional explanations):
{
  "title": "Book title",
  "genre": "Genre",
  "targetAudience": "Target audience",
  "description": "Brief description",
  "totalChapters": 12,
  "writingStyle": "Writing style",
  "tone": "Tone",
  "themes": ["Theme1", "Theme2", "Theme3"],
  "mainCharacters": "Character descriptions",
  "setting": "Setting",
  "plotOutline": "Detailed plot",
  "pov": "third",
  "tenseStyle": "past"
}`

    const userPrompt = language === 'de'
      ? `Erstelle eine vollständige Buchkonfiguration für folgende Idee:

"${body.userPrompt}"

WICHTIG:
- Sei kreativ aber bleibe nah am User-Prompt
- Achte auf stimmige Story-Elemente
- Wähle passendes Genre und Zielgruppe
- Erstelle eine fesselnde Handlung
- Denke an Charakterentwicklung und Themen
- ALLE Texte müssen auf DEUTSCH sein
- Antworte NUR mit dem JSON-Objekt, keine zusätzlichen Erklärungen`
      : `Create a complete book configuration for the following idea:

"${body.userPrompt}"

IMPORTANT:
- Be creative but stay close to the user prompt
- Ensure coherent story elements
- Choose appropriate genre and target audience
- Create an engaging plot
- Think about character development and themes
- **ALL text content must be written in ${languageName}**
- Respond ONLY with the JSON object, no additional explanations`

    console.error('🤖 Generating AI book configuration:', {
      prompt: body.userPrompt,
      language
    })

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 2000,
    })

    const rawResponse = completion.choices[0]?.message?.content || '{}'

    let config: BookConfiguration

    try {
      config = JSON.parse(rawResponse)

      // Helper: coerce a value that should be a plain string to string
      const normalizeToString = (val: unknown): string => {
        if (typeof val === 'string') return val.trim()
        if (Array.isArray(val)) {
          return val
            .map((item) =>
              typeof item === 'object' && item !== null
                ? ((item as Record<string, unknown>).name ?? JSON.stringify(item))
                : String(item)
            )
            .join(', ')
        }
        if (typeof val === 'object' && val !== null) {
          const obj = val as Record<string, unknown>
          return String(obj.name ?? obj.description ?? JSON.stringify(val))
        }
        return String(val ?? '')
      }

      // Validate and set defaults
      config.totalChapters = Math.max(5, Math.min(20, config.totalChapters || 12))
      config.themes = Array.isArray(config.themes) ? config.themes : []
      config.pov = ['first', 'third', 'mixed'].includes(config.pov) ? config.pov : 'third'
      config.tenseStyle = ['past', 'present', 'mixed'].includes(config.tenseStyle) ? config.tenseStyle : 'past'

      // Ensure free-text fields are always strings (AI can return arrays/objects)
      if (typeof config.mainCharacters !== 'string') config.mainCharacters = normalizeToString(config.mainCharacters)
      if (typeof config.setting !== 'string') config.setting = normalizeToString(config.setting)
      if (typeof config.plotOutline !== 'string') config.plotOutline = normalizeToString(config.plotOutline)
      if (typeof config.description !== 'string') config.description = normalizeToString(config.description)

      console.error('✅ Generated book configuration:', {
        title: config.title,
        genre: config.genre,
        chapters: config.totalChapters
      })

      return NextResponse.json({
        success: true,
        config
      })

    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', parseError)
      console.error('Raw response:', rawResponse)

      return NextResponse.json({
        error: 'Failed to parse AI response',
        details: 'AI returned invalid JSON format'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Error in AI config generator:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
