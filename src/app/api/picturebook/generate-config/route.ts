import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import OpenAI from 'openai'
import type { PicturebookConfig } from '@/types/picturebook'
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

/**
 * Generates language-specific system prompt for picturebook configuration
 */
function getSystemPrompt(language: BookLanguage): string {
  const languageName = getLanguageName(language)

  if (language === 'de') {
    return `Du bist ein Experte für Kinderbuch- und Bilderbuch-Erstellung.
Deine Aufgabe ist es, basierend auf einem kurzen User-Prompt eine vollständige, professionelle Bilderbuch-Konfiguration zu erstellen.

Analysiere den User-Prompt und erstelle:
1. Einen passenden Buchtitel (kreativ und kindgerecht)
2. Das richtige Genre (Märchen, Abenteuer, Fantasy, Tiere, etc.)
3. Die Zielgruppe (z.B. "Kinder 4-6 Jahre")
4. Eine detaillierte Beschreibung der Handlung (2-3 Sätze)
5. Anzahl der Seiten (8-24, je nach Komplexität der Geschichte)
6. Bildstil (watercolor, cartoon, 3d, realistic, sketch, anime)
7. Ton/Stimmung (z.B. "Fröhlich", "Abenteuerlich", "Magisch", "Lehrreich")
8. Hauptcharaktere (Namen und kurze Beschreibungen)
9. Setting/Schauplatz (wo spielt die Geschichte)
10. Plot-Outline (detaillierte Handlung in 3-5 Sätzen)
11. Hauptthemen (3-5 Themen wie Freundschaft, Mut, Familie, etc.)

WICHTIGE HINWEISE:
- Für Kleinkinder (0-3): Einfache Geschichten, 8-12 Seiten, klare Bilder
- Für Vorschulkinder (4-6): Mittlere Komplexität, 12-16 Seiten
- Für Grundschulkinder (7-10): Komplexere Geschichten, 16-24 Seiten
- Wähle einen passenden Bildstil zur Geschichte
- Achte auf positive Botschaften und kindgerechte Inhalte

Antworte IMMER mit validem JSON in diesem exakten Format (keine zusätzlichen Erklärungen):
{
  "title": "Buchtitel",
  "genre": "Genre",
  "targetAudience": "Kinder 4-6 Jahre",
  "description": "Kurze Beschreibung der Geschichte",
  "totalPages": 12,
  "imageStyle": "watercolor",
  "tone": "Fröhlich",
  "mainCharacters": "Charakterbeschreibungen",
  "setting": "Schauplatz der Geschichte",
  "plotOutline": "Detaillierte Handlung",
  "themes": ["Thema1", "Thema2", "Thema3"]
}`
  }

  // Default: English (works for all languages)
  return `You are an expert in children's book and picture book creation.
Your task is to create a complete, professional picture book configuration based on a short user prompt.

**IMPORTANT: The book content should be written in ${languageName}.**

Analyze the user prompt and create:
1. An appropriate book title (creative and child-friendly) - in ${languageName}
2. The right genre (Fairy Tale, Adventure, Fantasy, Animals, etc.)
3. Target audience (e.g., "Children 4-6 years")
4. A detailed plot description (2-3 sentences) - in ${languageName}
5. Number of pages (8-24, depending on story complexity)
6. Image style (watercolor, cartoon, 3d, realistic, sketch, anime)
7. Tone/mood (e.g., "Cheerful", "Adventurous", "Magical", "Educational")
8. Main characters (names and brief descriptions) - in ${languageName}
9. Setting/location (where the story takes place) - in ${languageName}
10. Plot outline (detailed plot in 3-5 sentences) - in ${languageName}
11. Main themes (3-5 themes like friendship, courage, family, etc.)

IMPORTANT NOTES:
- For toddlers (0-3): Simple stories, 8-12 pages, clear images
- For preschoolers (4-6): Medium complexity, 12-16 pages
- For elementary school children (7-10): More complex stories, 16-24 pages
- Choose an appropriate image style for the story
- Focus on positive messages and child-appropriate content
- **ALL text content (title, description, characters, setting, plot) must be in ${languageName}**

ALWAYS respond with valid JSON in this exact format (no additional explanations):
{
  "title": "Book Title",
  "genre": "Genre",
  "targetAudience": "Children 4-6 years",
  "description": "Brief story description",
  "totalPages": 12,
  "imageStyle": "watercolor",
  "tone": "Cheerful",
  "mainCharacters": "Character descriptions",
  "setting": "Story setting",
  "plotOutline": "Detailed plot",
  "themes": ["Theme1", "Theme2", "Theme3"]
}`
}

/**
 * Generates language-specific user prompt for picturebook configuration
 */
function getUserPrompt(userInput: string, language: BookLanguage): string {
  const languageName = getLanguageName(language)

  if (language === 'de') {
    return `Erstelle eine vollständige Bilderbuch-Konfiguration für folgende Idee:

"${userInput}"

WICHTIG:
- Sei kreativ aber bleibe nah am User-Prompt
- Achte auf kindgerechte Inhalte
- Wähle passenden Bildstil und Zielgruppe
- Erstelle eine fesselnde, altersgerechte Geschichte
- Denke an positive Werte und Botschaften
- ALLE Texte müssen auf DEUTSCH sein
- Antworte NUR mit dem JSON-Objekt, keine zusätzlichen Erklärungen`
  }

  // Default: English (works for all languages)
  return `Create a complete picture book configuration for the following idea:

"${userInput}"

IMPORTANT:
- Be creative but stay close to the user prompt
- Focus on child-appropriate content
- Choose appropriate image style and target audience
- Create an engaging, age-appropriate story
- Include positive values and messages
- **ALL text content must be written in ${languageName}**
- Respond ONLY with the JSON object, no additional explanations`
}

/**
 * POST /api/picturebook/generate-config
 * Takes a simple user prompt and generates a complete picturebook configuration
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

    // Get language from request body, default to 'en'
    const language = body.language || 'en'

    // Generate language-specific prompts
    const systemPrompt = getSystemPrompt(language)
    const userPrompt = getUserPrompt(body.userPrompt, language)

    console.error('🤖 Generating AI picturebook configuration:', {
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

    let config: Partial<PicturebookConfig>

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
      config.bookType = 'picture'
      config.totalPages = Math.max(8, Math.min(24, config.totalPages || 12))
      config.themes = Array.isArray(config.themes) ? config.themes : []

      // Ensure imageStyle is valid
      const validStyles = ['watercolor', 'cartoon', '3d', 'realistic', 'sketch', 'anime']
      if (!validStyles.includes(config.imageStyle as string)) {
        config.imageStyle = 'watercolor'
      }

      // Ensure free-text fields are always strings (AI can return arrays/objects)
      if (typeof config.mainCharacters !== 'string') config.mainCharacters = normalizeToString(config.mainCharacters)
      if (typeof config.setting !== 'string') config.setting = normalizeToString(config.setting)
      if (typeof config.plotOutline !== 'string') config.plotOutline = normalizeToString(config.plotOutline as unknown)
      if (typeof config.description !== 'string') config.description = normalizeToString(config.description)

      console.error('✅ Generated picturebook configuration:', {
        title: config.title,
        genre: config.genre,
        pages: config.totalPages,
        style: config.imageStyle
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
    console.error('❌ Error in picturebook config generator:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
