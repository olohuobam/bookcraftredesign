import { NextRequest, NextResponse } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'
import { SupabaseDB } from '@/lib/supabase-db'
import { downloadAndSaveImage, deleteStoredImage, attachPathFragment } from '@/lib/image-storage'
import type { ImageAssetInput } from '@/types/images'
import OpenAI from 'openai'

// Configure runtime for image generation
export const runtime = 'nodejs'
export const maxDuration = 120 // 2 minutes for picture image generation (gpt-image-1.5 quality:high can be slow)

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

// ─── Image Prompt Builder ─────────────────────────────────────────

const ANTI_TEXT = 'ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO WORDS, NO SYMBOLS, NO WRITING, NO SIGNS, NO LABELS, NO CAPTIONS anywhere in the image. DO NOT include speech bubbles or any written marks.'
const NO_COLLAGE = 'Create EXACTLY ONE single illustration (no multi-panel collage, no grid, no split frames). One cohesive scene only.'

function buildImagePrompt(
  characterDescription: string,
  sceneDescription: string,
  styleDesc: string
): string {
  const charSection = characterDescription
    ? `CHARACTER SHEET (MANDATORY — copy these descriptions EXACTLY for every character appearance):\n${characterDescription}\n\n`
    : ''

  return `You are illustrating a page of a children's picture book. Every page MUST show the SAME characters with IDENTICAL appearance.

ART STYLE (MANDATORY — use this EXACT style):
${styleDesc}

${charSection}SCENE TO ILLUSTRATE:
${sceneDescription}

STRICT RULES:
${ANTI_TEXT}
${NO_COLLAGE}
- Every character MUST match the CHARACTER SHEET above EXACTLY — same species, same skin/fur color, same hair color, same clothing colors and style, same proportions
- Use the SAME art style described above with IDENTICAL rendering technique, line weight, color palette, and texture
- DO NOT change character designs
- Maintain consistent lighting direction, color temperature, and overall visual mood`
}

// ─── Route Handler ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.split('Bearer ')[1]
    const user = await verifySupabaseToken(token)
    if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const {
      bookId,
      pageIndex = 0,
      panelIndex = 0,
      style = 'watercolor',
      styleBible = '',
      characterDescription = '',
      sceneDescription = ''
    } = await req.json()

    if (!bookId || !sceneDescription) {
      return NextResponse.json({ error: 'Missing fields: bookId, sceneDescription' }, { status: 400 })
    }

    const styleDesc = getStyleDescription(style)
    // Use characterDescription first (new field), fall back to styleBible (legacy)
    const charDesc = characterDescription || styleBible

    const finalPrompt = buildImagePrompt(charDesc, sceneDescription, styleDesc)

    const openai = getOpenAI()

    // gpt-image-1.5 (primary model), dall-e-3 (fallback)
    let base64: string | null = null
    let provider = 'gpt-image-1.5'

    try {
      const response = await openai.images.generate({
        model: 'gpt-image-1.5',
        prompt: finalPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'high',
        response_format: 'b64_json'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b64 = (response as any).data?.[0]?.b64_json as string | undefined
      if (b64) { base64 = b64 }
      console.error('✅ gpt-image-1.5 succeeded for picture image')
    } catch (err) {
      console.error('❌ gpt-image-1.5 failed for picture image, trying dall-e-3 fallback:', err)
      try {
        provider = 'dall-e-3'
        const fallbackResponse = await openai.images.generate({
          model: 'dall-e-3',
          prompt: finalPrompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
          response_format: 'url'
        })
        const url = fallbackResponse.data?.[0]?.url
        if (url) {
          // Download the image and convert to base64
          const imgResponse = await fetch(url)
          const arrayBuffer = await imgResponse.arrayBuffer()
          base64 = Buffer.from(arrayBuffer).toString('base64')
          console.error('✅ dall-e-3 fallback succeeded for picture image')
        }
      } catch (fallbackErr) {
        console.error('❌ dall-e-3 fallback also failed for picture image:', fallbackErr)
      }
    }

    if (!base64) {
      console.error('❌ All image generation attempts failed for picture image (gpt-image-1.5 and dall-e-3)')
      return NextResponse.json({ error: 'Image generation failed' }, { status: 500 })
    }

    console.error(`🎨 Image generated via ${provider}`)

    // Convert base64 to data URL and store
    const url = `data:image/png;base64,${base64}`

    const storedImage = await downloadAndSaveImage(url, {
      userId: user.userId,
      bookId,
      filenamePrefix: `page-${pageIndex + 1}-panel-${panelIndex + 1}`
    })

    // Update the book's images array in-place
    const book = await SupabaseDB.getBookById(bookId, user.userId)
    if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

    const images = Array.isArray(book.images) ? (book.images as Array<{ path: string; type: string }>) : []
    const imagesPerPage = typeof book.chaptersJson === 'object' && (book.chaptersJson as { imagesPerPage?: number })?.imagesPerPage
      ? (book.chaptersJson as { imagesPerPage: number }).imagesPerPage
      : 1
    const idx = pageIndex * imagesPerPage + panelIndex

    // Pre-fill any gap with nulls so Postgres jsonb serialises holes
    // predictably instead of producing a sparse array with undefined slots.
    while (images.length < idx) {
      images.push(null as unknown as { path: string; type: string })
    }

    // Delete the previous image if present
    if (images[idx]) {
      await deleteStoredImage(images[idx] as ImageAssetInput)
    }

    images[idx] = { path: storedImage.path, type: storedImage.type }
    await SupabaseDB.updateBook(bookId, { images: images as Array<{ path: string; type: string }> })

    const imageUrl = attachPathFragment(storedImage.signedUrl, storedImage.path)
    return NextResponse.json({
      success: true,
      imageUrl,
      provider,
      image: { ...storedImage, signedUrl: imageUrl }
    })
  } catch (e: unknown) {
    const error = e as Error
    console.error('❌ Unexpected error in generate-picture-image:', error)
    console.error('❌ Stack:', error?.stack)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
