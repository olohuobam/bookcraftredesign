import { NextRequest } from 'next/server'
import { SupabaseDB } from '@/lib/supabase-db'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { downloadAndSaveImage, attachPathFragment } from '@/lib/image-storage'
import { notifyBookReady } from '@/lib/notifications'
import OpenAI from 'openai'

// Configure runtime for longer execution (picture book generation with images)
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for complete picture book generation

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

// ─── Style Description Mapping ───────────────────────────────────

const STYLE_DESCRIPTIONS: Record<string, string> = {
  watercolor:
    "soft watercolor children's book illustration with gentle brushstrokes, warm pastel color palette, subtle paper texture, and expressive storybook characters",
  cartoon:
    "vibrant cartoon children's book illustration with bold clean outlines, flat bright colors, exaggerated expressive features, and playful storybook style",
  '3d':
    "Pixar/Disney-style 3D animated children's book illustration with soft subsurface lighting, rounded appealing shapes, rich saturated colors, and cinematic quality",
  realistic:
    "detailed realistic children's book illustration with natural lighting, fine textures, accurate proportions, and warm inviting color palette",
  sketch:
    "hand-drawn pencil sketch children's book illustration with expressive linework, light crosshatching, minimal color washes, and charming storybook character designs",
  anime:
    "Japanese anime/manga-style children's book illustration with clean cel shading, large expressive eyes, vibrant saturated colors, and dynamic character poses",
}

function getStyleDescription(style: string): string {
  return STYLE_DESCRIPTIONS[style] || `${style} children's book illustration with consistent style and warm colors`
}

// ─── Interfaces ───────────────────────────────────────────────────

interface ProgressData {
  progress?: number;
  status?: string;
  error?: string;
  imageUrl?: string;
  image?: object;
  complete?: boolean;
  bookId?: string;
}

interface Panel {
  index: number;
  description: string;
}

interface PageItem {
  page: number;
  panels: Panel[];
}

interface PlanData {
  characterDescription: string;
  pages: PageItem[];
}

interface StoredImage {
  path: string;
  type: string;
}

// ─── Character Description Generation ────────────────────────────

/**
 * Generate a detailed character description / visual style bible using GPT-4o.
 * This is copied word-for-word into EVERY image prompt for visual consistency.
 */
async function generateCharacterDescription(
  openai: OpenAI,
  title: string,
  outline: string,
  style: string,
  providedStyleBible?: string
): Promise<string> {
  // Use provided style bible if it's detailed enough (>100 chars)
  if (providedStyleBible && providedStyleBible.trim().length > 100) {
    return providedStyleBible.trim()
  }

  const styleDesc = getStyleDescription(style)

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a character design artist for children\'s picture books. Return ONLY the character sheet description as plain text — no JSON, no markdown, no headers.'
      },
      {
        role: 'user',
        content: `Create a VISUAL CHARACTER SHEET for a children's picture book.

Book title: "${title}"
Story outline: ${outline}
Art style: ${styleDesc}

The character sheet MUST include ALL of the following:
1. EXACT appearance of each main character:
   - Species/race/type (human, animal, fantasy creature, etc.)
   - Age and body shape/proportions
   - Skin/fur/scale color (use specific color names like "warm golden-brown", "pale ivory")
   - Eye color and shape
   - Hair color, length, and style (or fur pattern if animal)
2. EXACT clothing for each character: specific colors, patterns, accessories
3. Size relationships between characters (who is taller/smaller)
4. Color palette: 4-6 specific main colors that dominate the whole book
5. Art style details: exact rendering technique matching "${styleDesc}"

Be EXTREMELY specific — these descriptions will be copy-pasted into every image generation prompt.
Keep under 220 words. Plain descriptive text only.`
      }
    ],
    temperature: 0.5,
    max_tokens: 450
  })

  return completion.choices[0]?.message?.content?.trim() || providedStyleBible || `Characters in a ${style} children's book illustration style.`
}

// ─── Image Prompt Builder ─────────────────────────────────────────

const ANTI_TEXT = 'ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO WORDS, NO SYMBOLS, NO WRITING, NO SIGNS, NO LABELS, NO CAPTIONS anywhere in the image. DO NOT include speech bubbles or any written marks.'
const NO_COLLAGE = 'Create EXACTLY ONE single illustration (no multi-panel collage, no grid, no split frames). One cohesive scene only.'

function buildImagePrompt(
  characterDescription: string,
  sceneDescription: string,
  styleDesc: string
): string {
  return `You are illustrating a page of a children's picture book. Every page MUST show the SAME characters with IDENTICAL appearance.

ART STYLE (MANDATORY — use this EXACT style for every image):
${styleDesc}

CHARACTER SHEET (MANDATORY — copy these descriptions EXACTLY for every character appearance):
${characterDescription}

SCENE TO ILLUSTRATE:
${sceneDescription}

STRICT RULES:
${ANTI_TEXT}
${NO_COLLAGE}
- Every character MUST match the CHARACTER SHEET above EXACTLY — same species, same skin/fur color, same hair color, same clothing colors and style, same proportions
- Use the SAME art style described above with IDENTICAL rendering technique, line weight, color palette, and texture
- DO NOT change character designs between pages
- Maintain consistent lighting direction, color temperature, and overall visual mood`
}

// ─── Image Generation (gpt-image-1.5) ───────────────────────────

async function generateImage(
  openai: OpenAI,
  prompt: string
): Promise<{ base64: string; provider: string } | null> {
  // gpt-image-1.5 (primary model)
  try {
    const response = await openai.images.generate({
      model: 'gpt-image-1.5',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'high',
      response_format: 'b64_json'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b64 = (response as any).data?.[0]?.b64_json as string | undefined
    if (b64) return { base64: b64, provider: 'gpt-image-1.5' }
  } catch (err) {
    console.warn('⚠️ gpt-image-1.5 failed:', (err as Error).message)
  }

  return null
}

// ─── Route Handler ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Server-Sent Events stream for progress updates
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  const send = async (data: ProgressData) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  ;(async () => {
    try {
      // Auth
      const authHeader = req.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        await send({ error: 'Unauthorized' })
        await writer.close()
        return
      }
      const token = authHeader.split('Bearer ')[1]
      const user = await verifySupabaseToken(token)
      if (!user) {
        await send({ error: 'Invalid token' })
        await writer.close()
        return
      }

      const body = await req.json()
      const {
        bookId,
        title,
        outline,
        totalPages,
        imagesPerPage = 1,
        style = 'watercolor',
        scenes,
        styleBible: styleBibleIn,
        characterDescription: characterDescIn
      } = body

      if (!bookId || !title || !outline || !totalPages) {
        await send({ error: 'Missing fields: bookId, title, outline, totalPages' })
        await writer.close()
        return
      }

      // Verify book ownership
      const book = await SupabaseDB.getBook(bookId)
      if (!book) {
        await send({ error: 'Book not found' })
        await writer.close()
        return
      }
      if (book.user_id !== user.userId) {
        await send({ error: 'Forbidden' })
        await writer.close()
        return
      }

      const openai = getOpenAI()
      const styleDesc = getStyleDescription(style)

      // Step 1: Generate or use provided character description (style bible)
      await send({ progress: 3, status: 'Creating character consistency sheet...' })
      const characterDescription = await generateCharacterDescription(
        openai,
        title,
        outline,
        style,
        characterDescIn || styleBibleIn
      )

      // Step 2: Plan scenes
      let pages: Array<{ page: number; panels: Array<{ index: number; description: string }> }> = []

      if (scenes && Array.isArray(scenes?.pages)) {
        await send({ progress: 8, status: 'Using custom image descriptions...' })
        pages = scenes.pages.map((p: { page?: number; panels?: { index?: number; description?: string }[] }, idx: number) => ({
          page: p.page || idx + 1,
          panels: (p.panels || []).map((pn: { index?: number; description?: string }, j: number) => ({
            index: pn.index || j + 1,
            description: String(pn.description || '')
          }))
        }))
      } else {
        // Fallback: plan scenes via model
        await send({ progress: 5, status: 'Planning scenes...' })
        const planPrompt = `You are a storyboard planner for a children's picture book.

Title: ${title}
Outline: ${outline}
Total pages: ${totalPages}
Images per page: ${imagesPerPage}

Split the story into ${totalPages} pages. For each page, create ${imagesPerPage} concise panel description(s) — one sentence each — that progress the visual narrative.

Output strict JSON: { "characterDescription": "brief reminder of main character names", "pages": [ { "page": 1, "panels": [ { "index": 1, "description": "..." } ] } ] }
No additional prose.`

        const planCompletion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'Return only JSON. No extra text.' },
            { role: 'user', content: planPrompt },
          ],
          temperature: 0.7,
        })

        const raw = planCompletion.choices[0]?.message?.content || '{}'
        let plan: PlanData
        try {
          plan = JSON.parse(raw)
        } catch {
          const match = raw.match(/\{[\s\S]*\}$/)
          plan = match ? JSON.parse(match[0]) : { characterDescription: '', pages: [] }
        }
        pages = plan.pages || []
      }

      // Ensure pages array has the right length
      while (pages.length < totalPages) {
        const idx = pages.length
        pages.push({
          page: idx + 1,
          panels: Array.from({ length: imagesPerPage }, (_, i) => ({
            index: i + 1,
            description: outline
          }))
        })
      }

      // Persist initial config in chaptersJson for the editor
      const configJson = {
        type: 'picture',
        imagesPerPage,
        totalPages,
        style,
        characterDescription,
        pages,
      }
      await SupabaseDB.updateBook(bookId, {
        book_type: 'picture',
        chapters: totalPages,
        chapters_json: configJson,
        status: 'generating'
      })

      // Step 3: Generate images sequentially with character-anchored prompts
      const totalImages = totalPages * imagesPerPage
      const images: StoredImage[] = []
      let generated = 0

      for (let p = 0; p < totalPages; p++) {
        const pageItem = pages[p] || {
          page: p + 1,
          panels: Array.from({ length: imagesPerPage }, (_, i) => ({ index: i + 1, description: outline }))
        }
        for (let i = 0; i < imagesPerPage; i++) {
          const panel = pageItem.panels[i] || { index: i + 1, description: '' }
          const progressPercent = 12 + Math.round((generated / totalImages) * 85)

          await send({ progress: progressPercent, status: `Generating image ${generated + 1}/${totalImages}...` })

          const finalPrompt = buildImagePrompt(characterDescription, panel.description, styleDesc)

          try {
            const result = await generateImage(openai, finalPrompt)
            if (!result) throw new Error('All image providers failed')

            const url = `data:image/png;base64,${result.base64}`

            const storedImage = await downloadAndSaveImage(url, {
              userId: user.userId,
              bookId,
              filenamePrefix: `page-${p + 1}-panel-${i + 1}`
            })
            const imageUrl = attachPathFragment(storedImage.signedUrl, storedImage.path)
            images.push({ path: storedImage.path, type: storedImage.type })
            generated += 1

            // Persist progress
            await SupabaseDB.updateBook(bookId, { images })
            await send({
              progress: progressPercent,
              status: `Image ${generated}/${totalImages} created (${result.provider})`,
              imageUrl,
              image: { ...storedImage, signedUrl: imageUrl }
            })
          } catch (err: unknown) {
            await send({ error: `Error generating image ${generated + 1}: ${err instanceof Error ? err.message : 'Unknown'}` })
            await writer.close()
            return
          }

          // Rate limit delay
          await new Promise((r) => setTimeout(r, 1500))
        }
      }

      await SupabaseDB.updateBook(bookId, { status: 'completed', images, chapters_json: configJson })

      // In-app + push notification
      notifyBookReady(user.userId!, title, bookId).catch((err) => {
        console.error('[generate-picture-book] notifyBookReady failed:', err)
      })

      await send({ progress: 100, status: 'Completed', complete: true, bookId })
      await writer.close()
    } catch (e: unknown) {
      try { await send({ error: e instanceof Error ? e.message : 'Server error' }) } catch {}
      try { await writer.close() } catch {}
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
