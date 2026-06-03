/**
 * Picture Book Generation Engine
 * 
 * Replaces n8n-workflow-1GgD7oHDSv7BRpcc.json (Picture Book).
 * 
 * Flow: Generate outline (with character description as style bible) →
 *       generate cover → generate page images sequentially →
 *       2-tier fallback: gpt-image-1.5 → Gemini Imagen 3 → skip
 * 
 * CRITICAL: Style bible (character description) is defined ONCE at start
 * and passed to EVERY image prompt. Cover MUST match interior illustrations.
 */

import OpenAI, { toFile } from 'openai'
import { SupabaseDB } from '../supabase-db'
import { sendPushNotification } from '../push-sender'
import { notifyBookReady } from '../notifications'
import { saveBase64Image, attachPathFragment } from '../image-storage'
import {
 getOpenAI, getLanguageName, isGerman, parseJSON, stringifyCharacters,
 updateProgress, failJob, completeJob
} from './engine'
import type { PicturebookConfig } from '@/types/picturebook'

// ─── Types ───────────────────────────────────────────────────────

interface PanelOutline {
 panelIndex: number
 imagePrompt: string
}

interface PageOutline {
 number: number
 text: string
 panels: PanelOutline[]
}

interface PictureBookOutline {
 bookSummary: string
 characterDescription: string
 pages: PageOutline[]
}

interface FlatPanel {
 imageIndex: number
 pageNumber: number
 pageIndex: number
 panelIndex: number
 imagePrompt: string
 pageText: string
 characterDescription: string
}

// ─── Outline Generation ──────────────────────────────────────────

async function generatePictureBookOutline(
 config: PicturebookConfig
): Promise<PictureBookOutline> {
 const openai = getOpenAI()
 const lang = config.language || 'en'
 const langName = getLanguageName(lang)
 const de = isGerman(lang)
 const chars = stringifyCharacters(config.mainCharacters)
 const totalPages = config.totalPages || 12

 const systemPrompt = de
 ? `Du bist ein preisgekrönter deutschsprachiger Kinderbuch-Autor und Illustrator — der Schöpfer von Bilderbüchern, die Generationen von Kindern begeistert haben. Deine Geschichten verbinden warmherzige Charaktere, magische Bilder und eine Sprache, die sowohl Kinder als auch Eltern berührt. Du weißt genau, wie man in wenigen Worten maximale Emotion erzeugt. Antworte NUR mit validem JSON.`
 : `You are an award-winning picture book author and illustrator — the creative mind behind beloved classics that have enchanted millions of children worldwide. You craft stories with the warmth and wonder of Dr. Seuss, the visual imagination of Maurice Sendak, and the emotional intelligence that makes both children and parents fall in love with every page. You know how to distill a world into a single perfect sentence. Write in ${langName}. Respond ONLY with valid JSON.`

 const userPrompt = de
 ? `Erstelle ein Bilderbuch-Konzept:

TITEL: "${config.title}"
GENRE: ${config.genre}
BESCHREIBUNG: ${config.description}
ZIELGRUPPE: ${config.targetAudience}
CHARAKTERE: ${chars}
SCHAUPLATZ: ${config.setting || ''}
BILDSTIL: ${config.imageStyle}
TON: ${config.tone || 'Fröhlich'}

Erstelle EXAKT ${totalPages} Seiten mit je 1 Bild-Panel.

EXTREM WICHTIG — "characterDescription" MUSS folgendes enthalten:
1. EXAKTES Aussehen jedes Charakters: Spezies/Rasse, Körperform, Hautfarbe/Fellfarbe, Augenfarbe, Haarfarbe/Frisur
2. EXAKTE Kleidung: Was trägt jeder Charakter? Farben, Muster, Accessoires
3. EXAKTE Größenverhältnisse: Wie groß ist jeder Charakter relativ zu anderen?
4. EINZIGARTIGER Art-Style: Beschreibe den EXAKTEN Zeichenstil (z.B. "Disney-Pixar 3D-Cartoon mit weichen Rundungen" oder "Aquarell mit dünnen Linien")
5. FARBPALETTE: Welche Hauptfarben dominieren das Buch?
Diese characterDescription wird WORT FÜR WORT in JEDEN Bildprompt kopiert. Sie MUSS so detailliert sein, dass jedes Bild identische Charaktere zeigt.

JSON FORMAT:
{
 "bookSummary": "Zusammenfassung",
 "characterDescription": "Detaillierte visuelle Beschreibung ALLER Charaktere für konsistente Illustration",
 "pages": [
 {
 "number": 1,
 "text": "Text für diese Seite",
 "panels": [{ "panelIndex": 0, "imagePrompt": "Detaillierte Bildbeschreibung dieser Szene" }]
 }
 ]
}`
 : `Create a picture book concept:

TITLE: "${config.title}"
GENRE: ${config.genre}
DESCRIPTION: ${config.description}
TARGET AUDIENCE: ${config.targetAudience}
CHARACTERS: ${chars}
SETTING: ${config.setting || ''}
IMAGE STYLE: ${config.imageStyle}
TONE: ${config.tone || 'Cheerful'}

Create EXACTLY ${totalPages} pages with 1 image panel each.

**ALL text in ${langName}!**

EXTREMELY IMPORTANT — "characterDescription" MUST include ALL of the following:
1. EXACT appearance of each character: species/race, body shape, skin/fur color, eye color, hair color/style
2. EXACT clothing: What does each character wear? Colors, patterns, accessories
3. EXACT size ratios: How tall is each character relative to others?
4. UNIQUE art style: Describe the EXACT drawing style (e.g. "Disney-Pixar 3D cartoon with soft rounded shapes" or "watercolor with thin outlines")
5. COLOR PALETTE: What main colors dominate the book?
This characterDescription will be copied WORD FOR WORD into EVERY image prompt. It MUST be detailed enough that every image shows identical characters.

JSON FORMAT:
{
 "bookSummary": "Summary",
 "characterDescription": "Detailed visual description of ALL characters for consistent illustration",
 "pages": [
 {
 "number": 1,
 "text": "Text for this page",
 "panels": [{ "panelIndex": 0, "imagePrompt": "Detailed image description of this scene" }]
 }
 ]
}`

 const completion = await openai.chat.completions.create({
 model: 'gpt-4o',
 messages: [
 { role: 'system', content: systemPrompt },
 { role: 'user', content: userPrompt }
 ],
 temperature: 0.8,
 max_tokens: 5000
 })

 const raw = completion.choices[0]?.message?.content || '{}'
 const outline = parseJSON<PictureBookOutline>(raw, {
 bookSummary: config.title,
 characterDescription: chars || 'A character',
 pages: []
 })

  // Normalize
 if (!outline.pages.length) {
 outline.pages = Array.from({ length: totalPages }, (_, i) => ({
 number: i + 1,
 text: `Page ${i + 1}`,
 panels: [{ panelIndex: 0, imagePrompt: 'scene illustration' }]
 }))
 }

 outline.pages = outline.pages.slice(0, totalPages).map((p, i) => ({
 number: i + 1,
 text: p.text || `Page ${i + 1}`,
 panels: (p.panels?.length ? p.panels : [{ panelIndex: 0, imagePrompt: 'scene' }])
 .map((panel, j) => ({ panelIndex: j, imagePrompt: panel.imagePrompt || 'scene' }))
 }))

 while (outline.pages.length < totalPages) {
 outline.pages.push({
 number: outline.pages.length + 1,
 text: `Page ${outline.pages.length + 1}`,
 panels: [{ panelIndex: 0, imagePrompt: 'scene illustration' }]
 })
 }

 return outline
}

// ─── Style Description Mapping ───────────────────────────────────

/**
 * Expands a bare style name into a rich descriptive phrase that
 * anchors every image prompt to a consistent visual language.
 */
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

// ─── Image Generation with 3-Tier Fallback ──────────────────────

/**
 * Generate an image with 2-tier fallback.
 * Bug 3b fix: accepts an optional `size` parameter so the cover can be portrait (1024x1536).
 */
async function generateImage(
 prompt: string,
 openai: OpenAI,
 size: '1024x1024' | '1024x1536' = '1024x1024',
 referenceImageBase64?: string
): Promise<{ base64: string; provider: string } | null> {
  // Tier 1: gpt-image-1.5 (best quality)
 try {
 // gpt-image-1.5 does NOT accept response_format — it always returns b64_json

    if (referenceImageBase64) {
      // Use images.edit with reference image for style consistency
      // The reference image provides the visual style; prompt describes the new scene

      // Normalize: strip data URL prefix if present (e.g. "data:image/jpeg;base64,...")
      // and derive MIME type + file extension from it
      let rawBase64 = referenceImageBase64
      let mimeType = 'image/png'
      let filename = 'reference.png'
      const dataUrlMatch = referenceImageBase64.match(/^data:([^;]+);base64,(.+)$/)
      if (dataUrlMatch) {
        mimeType = dataUrlMatch[1]
        rawBase64 = dataUrlMatch[2]
        const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
        filename = `reference.${ext}`
      }

      const imageBuffer = Buffer.from(rawBase64, 'base64')
      const imageFile = await toFile(imageBuffer, filename, { type: mimeType })

      const stylePrompt = `Using the provided reference image as a style guide, generate a NEW illustration with the EXACT SAME art style, color palette, line weight, and rendering technique as the reference. Do NOT copy the content of the reference image — create an entirely new scene. New scene to illustrate:\n\n${prompt}`

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const editResponse = await (openai.images as any).edit({
        model: 'gpt-image-1.5',
        image: imageFile,
        prompt: stylePrompt,
        n: 1,
        size,
        quality: 'high',
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const editData = (editResponse as any).data
      const editB64 = editData?.[0]?.b64_json as string | undefined
      if (editB64) {
        return { base64: editB64, provider: 'gpt-image-1.5-ref' }
      }
      console.warn('⚠️ gpt-image-1.5 edit (with reference) returned no b64_json, falling back to generate')
    }

    const response = await openai.images.generate({
   model: 'gpt-image-1.5',
   prompt,
   n: 1,
   size,
   quality: 'high',
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
 } as any)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const data = (response as any).data
 const b64 = data?.[0]?.b64_json as string | undefined
 if (b64) {
 return { base64: b64, provider: 'gpt-image-1.5' }
 }
 } catch (err) {
    console.warn('⚠️ gpt-image-1.5 failed, trying Gemini Imagen 3:', (err as Error).message)
 }

  // Tier 2: Gemini Imagen 3 via Google AI API
 const geminiAspect = size === '1024x1536' ? '3:4' : '1:1'
 try {
 const geminiApiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY
 if (geminiApiKey) {
 const geminiResponse = await fetch(
 `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${geminiApiKey}`,
 {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 instances: [{ prompt }],
 parameters: {
 sampleCount: 1,
 aspectRatio: geminiAspect,
 safetyFilterLevel: 'block_few'
 }
 })
 }
 )

 if (geminiResponse.ok) {
 const geminiData = await geminiResponse.json()
 const b64 = geminiData?.predictions?.[0]?.bytesBase64Encoded
 if (b64) {
 return { base64: b64, provider: 'gemini-imagen-3' }
 }
 }
 }
 } catch (err) {
    console.warn('⚠️ Gemini Imagen 3 failed:', (err as Error).message)
 }

  // All tiers failed
  console.error('❌ All image providers failed, skipping image')
 return null
}

function buildImagePrompt(
 characterDescription: string,
 scenePrompt: string,
 style: string,
 isCover: boolean,
 title?: string,
 author?: string
): string {
 const styleDesc = getStyleDescription(style)
 const antiText = 'ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO WORDS, NO SYMBOLS, NO WRITING, NO SIGNS, NO LABELS, NO CAPTIONS anywhere in the image. DO NOT include speech bubbles or any written marks.'
 const noCollage = 'Create EXACTLY ONE single illustration (no multi-panel collage, no grid, no split frames). One cohesive scene only.'

 if (isCover) {
 return `Create a ${styleDesc} for a book titled "${title}"${author ? ` by ${author}` : ''}.

CRITICAL REQUIREMENTS:
- Generate ONLY the front cover artwork as a FLAT, 2D image
- NO 3D book rendering, NO book spine, NO book edges
- The entire image should be filled with the cover artwork edge-to-edge
- This cover must match the exact art style, color palette, and character designs of the interior illustrations

ART STYLE (MANDATORY — identical to interior pages):
${styleDesc}
Use identical line weight, shading technique, and color saturation as the interior pages.

CHARACTER CONSISTENCY (use these exact descriptions for ALL characters):
${characterDescription}

Scene: ${scenePrompt}

TITLE TYPOGRAPHY (MANDATORY):
- Include the book title "${title}" as beautifully styled text integrated directly into the cover artwork
- The title text must look like it belongs to the illustration — use a font style matching ${styleDesc}
- Position the title prominently (e.g. top or bottom third of the image) in a visually appealing way
- Style the title with appropriate decorative elements (e.g. hand-lettered, chalk, painted, embossed) consistent with the book's art style
- The title should be fully legible and clearly readable${author ? `\n- Include the author name "${author}" in smaller text below the title` : ''}
- Do NOT add any other text, captions, or labels beyond the title${author ? ' and author name' : ''}`
 }

 return `You are illustrating a page of a children's picture book. Every page MUST show the SAME characters with IDENTICAL appearance.

ART STYLE (MANDATORY — use this EXACT style for every image):
${styleDesc}

CHARACTER SHEET (MANDATORY — copy these descriptions EXACTLY for every character appearance):
${characterDescription}

SCENE TO ILLUSTRATE:
${scenePrompt}

STRICT RULES:
${antiText}
${noCollage}
- Every character MUST match the CHARACTER SHEET above EXACTLY — same species, same skin/fur color, same hair color, same clothing colors and style, same proportions
- Use the SAME art style described above with IDENTICAL rendering technique, line weight, color palette, and texture across all pages
- DO NOT change character designs, DO NOT add new visual elements to characters between pages
- Maintain consistent lighting direction, color temperature, and overall visual mood`
}

// ─── Main Generation Function ────────────────────────────────────

export interface GeneratePictureBookOptions {
 referenceImageBase64?: string
 referenceImageMode?: 'style' | 'edit'
 /** If true, only generate cover + first FREE_PICTURE_PAGES pages. Book status → 'preview'. */
 previewMode?: boolean
 /** Continuation: skip outline regeneration (use saved one) and only render pages with pageIndex >= startFromPage. */
 startFromPage?: number
 /** Reused outline for continuation. If omitted while startFromPage>0, generation aborts. */
 existingOutline?: PictureBookOutline
}

/** Number of free preview pages (must stay in sync with FREE_PAGES in /api/books/[id] and PictureBookViewer). */
export const FREE_PICTURE_PAGES = 2

export async function generatePictureBook(
 jobId: string,
 bookId: string,
 userId: string,
 config: PicturebookConfig,
 referenceImageBase64OrOpts?: string | GeneratePictureBookOptions,
 _referenceImageMode?: 'style' | 'edit'
): Promise<void> {
 // Backwards-compatible parameter handling
 const opts: GeneratePictureBookOptions = typeof referenceImageBase64OrOpts === 'string'
 ? { referenceImageBase64: referenceImageBase64OrOpts, referenceImageMode: _referenceImageMode }
 : (referenceImageBase64OrOpts || {})
 const referenceImageBase64 = opts.referenceImageBase64
 const previewMode = opts.previewMode === true
 const startFromPage = opts.startFromPage ?? 0
 const isContinuation = startFromPage > 0
 const totalPages = config.totalPages || 12
 const style = config.imageStyle || 'watercolor'

  console.log('🎨 Starting native picture book generation:', { jobId, bookId, totalPages, style, previewMode, startFromPage })

 let heartbeatInterval: ReturnType<typeof setInterval> | null = null
 try {
 await SupabaseDB.updateBookGenerationJob(jobId, {
 status: 'processing',
 progress: 0,
 current_step: 'Starting picture book generation...',
 last_heartbeat_at: new Date().toISOString()
 })

    // Step 1: Generate or reuse outline
 let outline: PictureBookOutline
 if (opts.existingOutline?.pages?.length) {
 outline = opts.existingOutline
 await updateProgress(jobId, 10, 'Continuing with existing book structure...', { outline })
 } else {
 await updateProgress(jobId, 3, 'Creating picture book structure...')
 outline = await generatePictureBookOutline(config)
 await updateProgress(jobId, 10, 'Book structure created!', { outline })
 }
 const characterDescription = outline.characterDescription || ''
 const imagesPerPage = outline.pages[0]?.panels?.length || 1

 // Persist outline to job metadata so a post-purchase continuation can reuse it
 try {
 await SupabaseDB.updateBookGenerationJob(jobId, {
 metadata: JSON.stringify({ outline, previewMode, isContinuation })
 })
 } catch (metaErr) {
 console.warn('Could not persist outline to job metadata:', metaErr)
 }

 // Save picture book config to book (skip on continuation — already saved on the initial run)
 if (!isContinuation) {
 const pictureBookConfig = {
 pages: outline.pages.map(p => ({
 pageIndex: p.number - 1,
 text: p.text,
 panels: p.panels.map(panel => ({
 panelIndex: panel.panelIndex,
 description: panel.imagePrompt
 }))
 }))
 }

 await SupabaseDB.updateBook(bookId, {
 book_type: 'picture',
 chapters: totalPages,
 chapters_json: JSON.stringify({
 pictureBookConfig,
 imagesPerPage,
 characterDescription,
 imageStyle: style
 }),
 content: outline.pages.map(p => p.text).join('\n\n')
 })
 }

    // Flatten panels (keep original imageIndex so progress/storage stay stable across runs)
 const allPanels: FlatPanel[] = []
 let idx = 0
 for (const page of outline.pages) {
 for (const panel of page.panels) {
 allPanels.push({
 imageIndex: idx++,
 pageNumber: page.number,
 pageIndex: page.number - 1,
 panelIndex: panel.panelIndex,
 imagePrompt: panel.imagePrompt,
 pageText: page.text,
 characterDescription
 })
 }
 }

 // Filter panels for preview / continuation mode
 const panels: FlatPanel[] = allPanels.filter(p => {
 if (previewMode) return p.pageIndex < FREE_PICTURE_PAGES
 if (isContinuation) return p.pageIndex >= startFromPage
 return true
 })

 const totalImages = panels.length
 const openai = getOpenAI()

    // Step 2: Generate front + back cover in parallel for faster generation
 const coverPrompt = buildImagePrompt(
 characterDescription,
 outline.bookSummary,
 style,
 true,
 config.title,
 config.author
 )

 const description = config.description || outline.bookSummary || ''
 const blurb = description.length > 300 ? description.substring(0, 300) + '...' : description
 const backCoverPrompt = `Create a back cover design for a ${config.genre} children's picture book titled "${config.title}"${config.author ? ` by ${config.author}` : ''}.

CRITICAL REQUIREMENTS:
- This is the BACK COVER of a book, as a FLAT, 2D image
- NO 3D book rendering, NO book spine, NO book edges
- The entire image should be filled with the back cover artwork edge-to-edge

BACK COVER LAYOUT:
- Background: colorful, child-friendly design matching the book's art style
- Upper area: Book synopsis/blurb displayed elegantly: "${blurb}"
${config.author ? `- Middle area: Author name "${config.author}" in clean typography` : ''}
- Bottom area: Leave space for a barcode/ISBN area (small white rectangle in bottom-right)

CHARACTER CONSISTENCY (use these exact descriptions):
${characterDescription}

ART STYLE: ${getStyleDescription(style)}

Output: A single flat back cover image, NOT a 3D book mockup.`

 // Step 2b: Start cover generation — saving happens in parallel with first page batch below.
 // Skip cover generation on continuation runs (covers were generated on the initial preview run).
 await updateProgress(jobId, 12, isContinuation ? 'Generating remaining pages...' : 'Generating front and back cover...')
 const [coverResult, backCoverResult] = isContinuation
 ? [null, null] as const
 : await Promise.all([
 generateImage(coverPrompt, openai, '1024x1536', referenceImageBase64).catch(e => {
 console.error('⚠️ Cover generation failed:', e); return null
 }),
 generateImage(backCoverPrompt, openai, '1024x1536', referenceImageBase64).catch(e => {
 console.warn('⚠️ Back cover generation failed:', e); return null
 })
 ])
 // Note: cover images are saved to Supabase inside coverPromise (below),
 // which runs in parallel with the first page-image batch.

    // Step 3: Generate page images in batches (parallel)
 // BATCH_SIZE=4 reduces total generation time by ~40% vs size=2
 const BATCH_SIZE = 4
 let completedCount = 0

 // Helper to generate a single panel and immediately send SSE progress
 const generatePanelWithProgress = async (panel: FlatPanel) => {
   const imagePrompt = buildImagePrompt(
     panel.characterDescription,
     panel.imagePrompt,
     style,
     false
   )

   const result = await generateImage(imagePrompt, openai, '1024x1024', referenceImageBase64)

   if (result) {
     // Save to storage
     const storedImage = await saveBase64Image(result.base64, {
       userId,
       bookId,
       filenamePrefix: `page-${panel.pageIndex}-panel-${panel.panelIndex}`,
       contentType: 'image/png'
     })
     const imageUrl = attachPathFragment(storedImage.signedUrl, storedImage.path)

     // Update book images atomically
     await SupabaseDB.atomicUpdateBookImage(
       bookId,
       panel.pageIndex * imagesPerPage + panel.panelIndex,
       imageUrl,
       imagesPerPage
     )

     // Persist to book_images table
     try {
       await SupabaseDB.upsertBookImage({
         job_id: jobId,
         page_number: panel.pageNumber,
         panel_index: panel.panelIndex,
         image_url: imageUrl,
         image_prompt: panel.imagePrompt
       })
     } catch (err) {
       console.warn('Could not persist to book_images:', err)
     }

     // Progressive loading: send SSE immediately after each image is ready
     const currentCompleted = completedCount + 1
     const progressPercent = 15 + Math.round((currentCompleted / totalImages) * 80)
     const langIsGerman = config.language ? isGerman(config.language) : false
     const stepMsg = langIsGerman
       ? `🎨 Seite ${panel.pageNumber} illustriert (${currentCompleted}/${totalImages})`
       : `🎨 Page ${panel.pageNumber} illustrated (${currentCompleted}/${totalImages})`
     await updateProgress(jobId, progressPercent, stepMsg, {
       latestImage: { pageIndex: panel.pageIndex, imageUrl }
     })

     console.log(`📷 Image ${panel.imageIndex + 1}/${totalImages} generated via ${result.provider}`)
   } else {
     console.warn(`⏭️ Skipped image ${panel.imageIndex + 1}/${totalImages} (all providers failed)`)
   }
 }

 // Cover generation runs in parallel with the first batch of page images
 // No dependency between cover and page images — both go straight to Supabase
 const coverPromise = (async () => {
   if (coverResult) {
     try {
       const storedCover = await saveBase64Image(coverResult.base64, {
         userId,
         bookId,
         filenamePrefix: 'cover',
         contentType: 'image/png'
       })
       const coverUrl = attachPathFragment(storedCover.signedUrl, storedCover.path)
       await SupabaseDB.updateBook(bookId, { cover_image: coverUrl })
       console.log(`🎨 Cover saved via ${coverResult.provider}`)
     } catch (coverSaveError) {
       console.error('⚠️ Cover save failed, continuing with pages:', coverSaveError)
     }
   }
   if (backCoverResult) {
     try {
       const storedBackCover = await saveBase64Image(backCoverResult.base64, {
         userId,
         bookId,
         filenamePrefix: 'back-cover',
         contentType: 'image/png'
       })
       const backCoverUrl = attachPathFragment(storedBackCover.signedUrl, storedBackCover.path)
       await SupabaseDB.updateBook(bookId, { back_cover_image: backCoverUrl })
       console.log(`🎨 Back cover saved via ${backCoverResult.provider}`)
     } catch (backCoverSaveError) {
       console.warn('⚠️ Back cover save failed, continuing with pages:', backCoverSaveError)
     }
   }
 })()

 // Start heartbeat for image generation phase
 heartbeatInterval = setInterval(async () => {
   try { await SupabaseDB.updateBookGenerationJob(jobId, { last_heartbeat_at: new Date().toISOString() }) } catch { /* ignore */ }
 }, 60_000)

 // First batch runs in parallel with cover saving
 const firstBatch = panels.slice(0, BATCH_SIZE)
 const langIsGerman = config.language ? isGerman(config.language) : false
 if (firstBatch.length > 0) {
   const firstPanel = firstBatch[0]
   const lastPanel = firstBatch[firstBatch.length - 1]
   const stepMsg = firstBatch.length === 1
     ? (langIsGerman
       ? `🎨 Seite ${firstPanel.pageNumber} wird illustriert… (1/${totalImages})`
       : `🎨 Illustrating page ${firstPanel.pageNumber}… (1/${totalImages})`)
     : (langIsGerman
       ? `🎨 Seiten ${firstPanel.pageNumber}–${lastPanel.pageNumber} werden illustriert… (1–${Math.min(BATCH_SIZE, totalImages)}/${totalImages})`
       : `🎨 Illustrating pages ${firstPanel.pageNumber}–${lastPanel.pageNumber}… (1–${Math.min(BATCH_SIZE, totalImages)}/${totalImages})`)
   await updateProgress(jobId, 15, stepMsg)
 }

 const [firstBatchResults] = await Promise.all([
   Promise.allSettled(firstBatch.map(panel => generatePanelWithProgress(panel))),
   coverPromise
 ])

 firstBatchResults.forEach((res, i) => {
   if (res.status === 'rejected') {
     console.error(`❌ Panel ${firstBatch[i]?.imageIndex + 1}/${totalImages} failed:`, res.reason)
   }
 })
 completedCount += firstBatch.length

 // Remaining batches
 for (let batchStart = BATCH_SIZE; batchStart < panels.length; batchStart += BATCH_SIZE) {
   const batch = panels.slice(batchStart, batchStart + BATCH_SIZE)
   const progressPercent = 15 + Math.round((completedCount / totalImages) * 80)

   // Motivating progress messages referencing page numbers
   const firstPanel = batch[0]
   const lastPanel = batch[batch.length - 1]
   let stepMsg: string
   if (batch.length === 1) {
     stepMsg = langIsGerman
       ? `🎨 Seite ${firstPanel.pageNumber} wird illustriert… (${completedCount + 1}/${totalImages})`
       : `🎨 Illustrating page ${firstPanel.pageNumber}… (${completedCount + 1}/${totalImages})`
   } else {
     stepMsg = langIsGerman
       ? `🎨 Seiten ${firstPanel.pageNumber}–${lastPanel.pageNumber} werden illustriert… (${completedCount + 1}–${Math.min(completedCount + batch.length, totalImages)}/${totalImages})`
       : `🎨 Illustrating pages ${firstPanel.pageNumber}–${lastPanel.pageNumber}… (${completedCount + 1}–${Math.min(completedCount + batch.length, totalImages)}/${totalImages})`
   }

   await updateProgress(jobId, progressPercent, stepMsg)

   const batchResults = await Promise.allSettled(
     batch.map(panel => generatePanelWithProgress(panel))
   )

   batchResults.forEach((res, i) => {
     if (res.status === 'rejected') {
       console.error(`❌ Panel ${batch[i]?.imageIndex + 1}/${totalImages} failed:`, res.reason)
     }
   })

   completedCount += batch.length

   // Short delay between batches to respect rate limits
   if (batchStart + BATCH_SIZE < panels.length) {
     await new Promise(r => setTimeout(r, 1000))
   }
 }

    // Step 4: Complete
 const finalBookStatus = previewMode ? 'preview' : 'completed'
 await SupabaseDB.updateBook(bookId, { status: finalBookStatus, active_job_id: null })
 await completeJob(jobId, 'completed', {
    totalImages,
    style,
    previewMode,
    characterDescription: characterDescription.substring(0, 200)
  })

    // Non-blocking push notification to the user's devices
    sendPushNotification(
      userId,
      'Dein Buch ist fertig! 📖',
      `"${config.title}" wurde erfolgreich generiert.`,
      { bookId },
    ).catch(console.warn)

    // In-app notification (stored in Supabase)
    notifyBookReady(userId, config.title || 'Dein Bilderbuch', bookId).catch((err) => {
      console.error('[picturebook] notifyBookReady failed:', err)
    })

    console.log(`✅ Picture book generation complete:`, { jobId, bookId, images: totalImages })

 } catch (error) {
    console.error('❌ Picture book generation failed:', error)
 await failJob(jobId, error instanceof Error ? error.message : 'Unknown error')
 await SupabaseDB.updateBook(bookId, { status: 'error', active_job_id: null })
 throw error
 } finally {
    // Always clear the heartbeat interval regardless of success or failure
    if (heartbeatInterval) clearInterval(heartbeatInterval)
 }
}
