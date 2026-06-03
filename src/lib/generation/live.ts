/**
 * Live Text Book Generation Engine
 * 
 * Replaces n8n-workflow-4grYBWewto20Q9Pl.json (Book Live Generation).
 * 
 * Flow: Generate outline → flatten scenes → write scene-by-scene →
 *       merge into chapters → save to book → complete
 * 
 * CRITICAL: Every scene receives full prior context (outline + all previous content)
 * to maintain narrative consistency.
 */

import { SupabaseDB } from '../supabase-db'
import { sendPushNotification } from '../push-sender'
import { downloadAndSaveImage, saveBase64Image, attachPathFragment } from '../image-storage'
import {
 getOpenAI, getLanguageName, isGerman, parseJSON, stringifyCharacters,
 updateProgress, saveChapterToBook, failJob, completeJob,
 type BookOutline, type ChapterOutline, type ChapterData
} from './engine'
import { openaiWithRetry } from '../openai-retry'
import type { BookLanguage } from '../translations'

// ─── Config Types ────────────────────────────────────────────────

export interface LiveBookConfig {
 title: string
 author?: string
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
 language?: BookLanguage
 previewMode?: boolean
 startFromChapter?: number
}

// ─── Outline Generation ──────────────────────────────────────────

async function generateOutline(config: LiveBookConfig): Promise<BookOutline> {
 const openai = getOpenAI()
 const lang = config.language || 'en'
 const langName = getLanguageName(lang)
 const de = isGerman(lang)
 const chars = stringifyCharacters(config.mainCharacters)

 const genreDE = config.genre || 'Literatur'
 const genreEN = config.genre || 'fiction'
 const systemPrompt = de
 ? `Du bist ein preisgekrönter deutschsprachiger Bestsellerautor im Genre ${genreDE} mit jahrzehntelanger Erfahrung. Deine Werke haben Millionen von Lesern bewegt und stehen regelmäßig auf den Spiegel-Bestsellerlisten. Du schaffst lebendige Welten, unvergessliche Charaktere und eine Sprache, die mit natürlichem Rhythmus, emotionaler Tiefe und literarischer Präzision fließt. Antworte NUR mit validem JSON.`
 : `You are a New York Times bestselling author in the ${genreEN} genre with decades of experience crafting novels that captivate millions of readers worldwide. Your prose flows with natural rhythm and emotional depth, your characters leap off the page, and your worlds feel utterly real. You write with the precision of literary masters like Hemingway and Atwood, balancing vivid sensory detail with compelling narrative momentum. Respond ONLY with valid JSON. Write in ${langName}.`

 const userPrompt = de
 ? `Erstelle eine Buchgliederung:

TITEL: "${config.title}"
GENRE: ${config.genre}
BESCHREIBUNG: ${config.description}
HANDLUNG: ${config.plotOutline || 'Entwickle eine fesselnde Handlung'}
CHARAKTERE: ${chars}
SCHAUPLATZ: ${config.setting}

 WICHTIG: Erstelle EXAKT ${config.totalChapters} Kapitel!

STIL: ${config.writingStyle}, TON: ${config.tone}, POV: ${config.pov}, ZEITFORM: ${config.tenseStyle}

Jedes Kapitel hat 3-4 Szenen (keyEvents). Jede Szene wird zu ~1500 Wörtern.

JSON FORMAT:
{
 "bookSummary": "Zusammenfassung",
 "chapters": [
 {
 "number": 1,
 "title": "Kapiteltitel",
 "summary": "Zusammenfassung",
 "keyEvents": [
 { "id": 1, "title": "Szenen-Titel", "description": "Was passiert", "emotion": "Stimmung" }
 ]
 }
 ]
}`
 : `Create a book outline:

**IMPORTANT: All text must be written in ${langName}!**

TITLE: "${config.title}"
GENRE: ${config.genre}
DESCRIPTION: ${config.description}
PLOT: ${config.plotOutline || 'Develop an engaging plot'}
CHARACTERS: ${chars}
SETTING: ${config.setting}

 IMPORTANT: Create EXACTLY ${config.totalChapters} chapters!

STYLE: ${config.writingStyle}, TONE: ${config.tone}, POV: ${config.pov}, TENSE: ${config.tenseStyle}

Each chapter has 3-4 scenes (keyEvents). Each scene will be ~1500 words.

JSON FORMAT:
{
 "bookSummary": "Summary in ${langName}",
 "chapters": [
 {
 "number": 1,
 "title": "Chapter title in ${langName}",
 "summary": "Summary in ${langName}",
 "keyEvents": [
 { "id": 1, "title": "Scene title", "description": "What happens", "emotion": "Mood" }
 ]
 }
 ]
}`

 // Fix 1: gpt-4.1-mini for JSON-only outline — ~6x faster, ~10x cheaper
 const completion = await openaiWithRetry(openai, {
 model: 'gpt-4.1-mini',
 messages: [
 { role: 'system', content: systemPrompt },
 { role: 'user', content: userPrompt }
 ],
 temperature: 0.8,
 max_tokens: 4000
 })

 const raw = completion.choices[0]?.message?.content || '{}'
 const outline = parseJSON<BookOutline>(raw, {
 bookSummary: config.title,
 chapters: []
 })

  // Normalize: ensure correct chapter count and 3+ keyEvents per chapter
 while (outline.chapters.length < config.totalChapters) {
 outline.chapters.push({
 number: outline.chapters.length + 1,
 title: `Chapter ${outline.chapters.length + 1}`,
 summary: 'Continuation',
 keyEvents: [
 { id: 1, title: 'Scene 1', description: 'Action', emotion: 'Tense' },
 { id: 2, title: 'Scene 2', description: 'Development', emotion: 'Dramatic' },
 { id: 3, title: 'Scene 3', description: 'Resolution', emotion: 'Hopeful' }
 ]
 })
 }
 outline.chapters = outline.chapters.slice(0, config.totalChapters)

 outline.chapters.forEach((ch, i) => {
 ch.number = i + 1
 if (!ch.keyEvents || ch.keyEvents.length < 3) {
 ch.keyEvents = ch.keyEvents || []
 while (ch.keyEvents.length < 3) {
 ch.keyEvents.push({
 id: ch.keyEvents.length + 1,
 title: `Scene ${ch.keyEvents.length + 1}`,
 description: 'Action',
 emotion: 'Tense'
 })
 }
 }
 ch.keyEvents.forEach((ev, j) => { ev.id = j + 1 })
 })

 return outline
}

// ─── Scene Writing ───────────────────────────────────────────────

interface FlatScene {
 sceneIndex: number
 eventId: number
 eventTitle: string
 eventDescription: string
 eventEmotion: string
 chapterNumber: number
 chapterTitle: string
 chapterSummary: string
 totalEventsInChapter: number
}

function flattenScenes(chapters: ChapterOutline[]): FlatScene[] {
 const scenes: FlatScene[] = []
 let idx = 0
 for (const ch of chapters) {
 for (const ev of ch.keyEvents) {
 scenes.push({
 sceneIndex: idx++,
 eventId: ev.id,
 eventTitle: ev.title,
 eventDescription: ev.description,
 eventEmotion: ev.emotion,
 chapterNumber: ch.number,
 chapterTitle: ch.title,
 chapterSummary: ch.summary,
 totalEventsInChapter: ch.keyEvents.length
 })
 }
 }
 return scenes
}

async function writeScene(
 config: LiveBookConfig,
 scene: FlatScene,
 outline: BookOutline,
 previousSceneTexts: string[]
): Promise<string> {
 const openai = getOpenAI()
 const lang = config.language || 'en'
 const langName = getLanguageName(lang)
 const de = isGerman(lang)
 const chars = stringifyCharacters(config.mainCharacters)

  // Build context: recent scenes in full, older scenes summarized to stay within token limits
  // gpt-4.1-mini has 1M token context, but we keep it efficient
 const MAX_FULL_SCENES = 6 // Last 6 scenes in full (~9000 words)
 const recentScenes = previousSceneTexts.slice(-MAX_FULL_SCENES)
 const olderScenes = previousSceneTexts.slice(0, -MAX_FULL_SCENES)
 
 let contextBlock = ''
 if (previousSceneTexts.length > 0) {
 const olderSummary = olderScenes.length > 0
 ? (de
 ? `[Zusammenfassung der bisherigen ${olderScenes.length} Szenen: ${olderScenes.map(t => t.slice(0, 150) + '...').join(' | ')}]\n\n`
 : `[Summary of previous ${olderScenes.length} scenes: ${olderScenes.map(t => t.slice(0, 150) + '...').join(' | ')}]\n\n`)
 : ''
 const recentText = recentScenes.join('\n\n---\n\n')
 contextBlock = de
 ? `\n\nBISHERIGER TEXT (für Konsistenz - beziehe dich darauf):\n---\n${olderSummary}${recentText}\n---`
 : `\n\nPREVIOUS TEXT (for consistency - reference this):\n---\n${olderSummary}${recentText}\n---`
 }

 // Fix 4: Static book config moved to system prompt (constant across all scenes)
 // User prompt only contains scene-specific + rolling context data
 const systemPrompt = de
 ? `Du bist ein preisgekrönter deutschsprachiger Bestsellerautor im Genre ${config.genre}. Du schreibst mit der Präzision literarischer Meister — lebendige Bilder, packende Dialoge, emotionale Tiefe und ein Erzählfluss, der Leser bis zur letzten Zeile fesselt. Schreibe NUR Fließtext, keine Überschriften oder Kommentare.

BUCH-KONTEXT (konstant für alle Szenen):
TITEL: ${config.title}
GENRE: ${config.genre}
BESCHREIBUNG: ${config.description}
HANDLUNG: ${config.plotOutline || ''}
CHARAKTERE: ${chars}
SCHAUPLATZ: ${config.setting}
STIL: ${config.writingStyle}, TON: ${config.tone}
POV: ${config.pov}, ZEITFORM: ${config.tenseStyle}`
 : `You are a New York Times bestselling author in the ${config.genre} genre. You craft prose with the mastery of literary greats — vivid sensory detail, natural dialogue, emotional resonance, and narrative momentum that compels readers to turn every page. Write ONLY prose text in ${langName}. No headers, no meta-commentary.

BOOK CONTEXT (constant across all scenes):
TITLE: ${config.title}
GENRE: ${config.genre}
DESCRIPTION: ${config.description}
PLOT: ${config.plotOutline || ''}
CHARACTERS: ${chars}
SETTING: ${config.setting}
STYLE: ${config.writingStyle}, TONE: ${config.tone}
POV: ${config.pov}, TENSE: ${config.tenseStyle}`

 // Fix 4: User prompt contains only scene-specific + rolling context (no static repetition)
 const userPrompt = de
 ? `Schreibe die Szene "${scene.eventTitle}" für Kapitel ${scene.chapterNumber}: "${scene.chapterTitle}".

KAPITEL-ZUSAMMENFASSUNG: ${scene.chapterSummary}

SZENE:
- Titel: ${scene.eventTitle}
- Beschreibung: ${scene.eventDescription}
- Stimmung: ${scene.eventEmotion}
- Position: Szene ${scene.eventId} von ${scene.totalEventsInChapter}
${contextBlock}

Anforderungen:
1. Schreibe mindestens 1500 Wörter
2. Nur Fließtext - keine Überschriften, Aufzählungen oder Meta-Kommentare
3. Show, don't tell - lebendige Details und Dialoge
4. Fließender Übergang zur nächsten Szene`
 : `Write the scene "${scene.eventTitle}" for Chapter ${scene.chapterNumber}: "${scene.chapterTitle}".

**Write ALL text in ${langName}!**

CHAPTER SUMMARY: ${scene.chapterSummary}

SCENE:
- Title: ${scene.eventTitle}
- Description: ${scene.eventDescription}
- Mood: ${scene.eventEmotion}
- Position: Scene ${scene.eventId} of ${scene.totalEventsInChapter}
${contextBlock}

Requirements:
1. Write at least 1500 words
2. Prose only - no headers, lists, or meta-comments
3. Show, don't tell - vivid details and dialogues
4. Smooth transition to the next scene`

 // Fix 3: retry wrapper for 429/5xx resilience
 const completion = await openaiWithRetry(openai, {
 model: 'gpt-4.1-mini',
 messages: [
 { role: 'system', content: systemPrompt },
 { role: 'user', content: userPrompt }
 ],
 temperature: 0.85,
 max_tokens: 6000
 })

 let text = completion.choices[0]?.message?.content || ''
  // Clean: remove headers and bold markers
 text = text
 .replace(/^#+\s+.*$/gm, '')
 .replace(/\*\*.*?\*\*/g, m => m.replace(/\*\*/g, ''))
 .trim()

 return text
}

// ─── Main Generation Function ────────────────────────────────────

// ─── Cover Generation for Text Books ─────────────────────────────

async function generateTextBookCover(
 jobId: string,
 bookId: string,
 config: LiveBookConfig,
 outline: BookOutline
): Promise<void> {
 const openai = getOpenAI()
 // Build a cover prompt based on the book's outline
 const chapterSummaries = outline.chapters.slice(0, 3).map(ch => ch.title).join(', ')
 const writingStyleHint = config.writingStyle ? `\nWriting style: ${config.writingStyle}` : ''
 const coverPrompt = `Create a beautiful, atmospheric book cover illustration for a ${config.genre} novel titled "${config.title}"${config.author ? ` by ${config.author}` : ''}.

The story is about: ${config.description || config.plotOutline || chapterSummaries}
Target audience: ${config.targetAudience}
Tone: ${config.tone}${writingStyleHint}
${config.setting ? `Setting: ${config.setting}` : ''}

REQUIREMENTS:
- Generate ONLY the front cover artwork as a FLAT, 2D image
- NO 3D book rendering, NO book spine, NO book edges
- The entire image should be filled with the artwork edge-to-edge
- Professional, cohesive design that matches the book's tone and genre
- Professional, eye-catching design suitable for a published book
- Include the title "${config.title}" in elegant, readable typography
${config.author ? `- Include the author name "${config.author}" on the cover\n` : ''}- Cinematic, high quality, evocative mood
- Color scheme and visual atmosphere must reflect the ${config.genre} genre and ${config.tone} tone`

 try {
    // gpt-image-1.5 (primary model) — does NOT accept response_format param
 const response = await openai.images.generate({
 model: 'gpt-image-1.5',
 prompt: coverPrompt,
 n: 1,
 size: '1024x1536',
 quality: 'high',
 } as any)

 const b64 = (response.data?.[0] as any)?.b64_json
 if (b64) {
 const stored = await saveBase64Image(b64, {
 bookId,
 userId: '',
 filenamePrefix: 'cover',
 })
 const coverUrl = attachPathFragment(stored.signedUrl, stored.path)
 await SupabaseDB.updateBook(bookId, { cover_image: coverUrl })
      console.log(`🎨 Text book cover generated successfully (gpt-image-1.5)`)
 return
 }
 } catch (err) {
    console.warn('⚠️ gpt-image-1.5 cover failed:', (err as Error).message)
 }

  // DALL-E 3 fallback
 try {
    console.log('🔄 Trying DALL-E 3 fallback for text book cover...')
 const fallbackResponse = await openai.images.generate({
 model: 'dall-e-3',
 prompt: coverPrompt,
 n: 1,
 size: '1024x1792',
 quality: 'standard',
 response_format: 'url',
 })
 const imageUrl = fallbackResponse.data?.[0]?.url
 if (imageUrl) {
 const stored = await downloadAndSaveImage(imageUrl, {
 bookId,
 userId: '',
 filenamePrefix: 'cover',
 })
 const coverUrl = attachPathFragment(stored.signedUrl, stored.path)
 await SupabaseDB.updateBook(bookId, { cover_image: coverUrl })
      console.log('🎨 Text book cover generated successfully (dall-e-3 fallback)')
 return
 }
 } catch (fallbackErr) {
    console.warn('⚠️ DALL-E 3 cover fallback also failed:', (fallbackErr as Error).message)
 }

  console.error('❌ Cover generation failed for text book')
}

async function generateTextBookBackCover(
 bookId: string,
 config: LiveBookConfig,
 outline: BookOutline
): Promise<void> {
 const openai = getOpenAI()

 const description = config.description || config.plotOutline || outline.bookSummary || ''
 const blurb = description.length > 300 ? description.substring(0, 300) + '...' : description

 const backCoverPrompt = `Create a back cover design for a ${config.genre} book titled "${config.title}"${config.author ? ` by ${config.author}` : ''}.

CRITICAL REQUIREMENTS:
- This is the BACK COVER of a book, as a FLAT, 2D image
- NO 3D book rendering, NO book spine, NO book edges
- The entire image should be filled with the back cover artwork edge-to-edge

BACK COVER LAYOUT:
- Background: atmospheric design matching the ${config.genre} genre
- Upper area: Book synopsis/blurb displayed elegantly: "${blurb}"
${config.author ? `- Middle area: Author name "${config.author}" in clean typography` : ''}
- Bottom area: Leave space for a barcode/ISBN area (small white rectangle in bottom-right)
- Overall design should complement the front cover

Target audience: ${config.targetAudience}
Tone: ${config.tone}

Output: A single flat back cover image, NOT a 3D book mockup.`

 try {
    // gpt-image-1.5 (primary model) — does NOT accept response_format param
 const response = await openai.images.generate({
 model: 'gpt-image-1.5',
 prompt: backCoverPrompt,
 n: 1,
 size: '1024x1536',
 quality: 'high',
 } as any)

 const b64 = (response.data?.[0] as any)?.b64_json
 if (b64) {
 const stored = await saveBase64Image(b64, {
 bookId,
 userId: '',
 filenamePrefix: 'back-cover',
 })
 const backCoverUrl = attachPathFragment(stored.signedUrl, stored.path)
 await SupabaseDB.updateBook(bookId, { back_cover_image: backCoverUrl })
      console.log('🎨 Text book back cover generated successfully (gpt-image-1.5)')
 return
 }
 } catch (err) {
    console.warn('⚠️ gpt-image-1.5 back cover failed:', (err as Error).message)
 }

  // DALL-E 3 fallback
 try {
    console.log('🔄 Trying DALL-E 3 fallback for text book back cover...')
 const fallbackResponse = await openai.images.generate({
 model: 'dall-e-3',
 prompt: backCoverPrompt,
 n: 1,
 size: '1024x1792',
 quality: 'standard',
 response_format: 'url',
 })
 const imageUrl = fallbackResponse.data?.[0]?.url
 if (imageUrl) {
 const stored = await downloadAndSaveImage(imageUrl, {
 bookId,
 userId: '',
 filenamePrefix: 'back-cover',
 })
 const backCoverUrl = attachPathFragment(stored.signedUrl, stored.path)
 await SupabaseDB.updateBook(bookId, { back_cover_image: backCoverUrl })
      console.log('🎨 Text book back cover generated successfully (dall-e-3 fallback)')
 return
 }
 } catch (fallbackErr) {
    console.warn('⚠️ DALL-E 3 back cover fallback also failed:', (fallbackErr as Error).message)
 }

  console.error('❌ Back cover generation failed for text book')
}

export async function generateLiveBook(
 jobId: string,
 bookId: string,
 userId: string,
 config: LiveBookConfig,
 existingOutline?: BookOutline
): Promise<void> {
 const previewMode = config.previewMode !== false
 const startFrom = config.startFromChapter || 1

  console.log('📖 Starting native live book generation:', { jobId, bookId, previewMode, startFrom })

 try {
 await SupabaseDB.updateBookGenerationJob(jobId, {
 status: 'processing',
 progress: 0,
 current_step: 'Starting book generation...',
 last_heartbeat_at: new Date().toISOString()
 })

    // Step 1: Generate or reuse outline
 let outline: BookOutline
 if (existingOutline?.chapters?.length) {
 outline = existingOutline
 await updateProgress(jobId, 10, 'Using existing book structure...', { outline })
 } else {
 await updateProgress(jobId, 3, 'Creating book structure...')
 outline = await generateOutline(config)
 await updateProgress(jobId, 10, 'Book structure created!', { outline })
 }

    // Generate cover images — fire-and-forget so chapters start immediately
 if (startFrom <= 1) {
 await updateProgress(jobId, 11, 'Generating covers...')
    // Both covers run in parallel, non-blocking — chapters start right away
 generateTextBookCover(jobId, bookId, config, outline).catch(err =>
 console.warn('⚠️ Cover generation failed:', err)
 )
 generateTextBookBackCover(bookId, config, outline).catch(err =>
 console.warn('⚠️ Back cover generation failed:', err)
 )
 }

    // Determine which chapters to generate
 const chaptersToProcess = previewMode
 ? [outline.chapters[0]]
 : outline.chapters.filter(ch => ch.number >= startFrom)

 const scenes = flattenScenes(chaptersToProcess)
 const totalScenes = scenes.length

    // Track all scene texts for context passing
 const allSceneTexts: string[] = []
    // Track scenes per chapter for merging
 const chapterScenes: Map<number, string[]> = new Map()

    // Step 2: Write scenes one by one
 for (let i = 0; i < scenes.length; i++) {
 const scene = scenes[i]
 const progressPercent = 10 + Math.round((i / totalScenes) * 80)

 await updateProgress(
 jobId,
 progressPercent,
 `Writing Chapter ${scene.chapterNumber}, Scene ${scene.eventId}: "${scene.eventTitle}"...`
 )

      // Write the scene with full prior context
 const sceneText = await writeScene(config, scene, outline, allSceneTexts)
 allSceneTexts.push(sceneText)

      // Send text chunk for live streaming
 await updateProgress(jobId, progressPercent, `Writing Chapter ${scene.chapterNumber}...`, {
 textChunk: {
 chapterNumber: scene.chapterNumber,
 chapterTitle: scene.chapterTitle,
 text: sceneText,
 isComplete: scene.eventId === scene.totalEventsInChapter,
 wordCount: sceneText.split(/\s+/).filter(Boolean).length
 },
 lastTextChunkAt: new Date().toISOString()
 })

      // Accumulate scenes for this chapter
 if (!chapterScenes.has(scene.chapterNumber)) {
 chapterScenes.set(scene.chapterNumber, [])
 }
 chapterScenes.get(scene.chapterNumber)!.push(sceneText)

      // If last scene in chapter, merge and save
 if (scene.eventId === scene.totalEventsInChapter) {
 const chapterTexts = chapterScenes.get(scene.chapterNumber)!
 const mergedContent = chapterTexts.join('\n\n')
 const wordCount = mergedContent.split(/\s+/).filter(Boolean).length

 const chapter: ChapterData = {
 number: scene.chapterNumber,
 title: scene.chapterTitle,
 content: mergedContent,
 wordCount
 }

 await saveChapterToBook(bookId, chapter)

        // Notify chapter complete
 await updateProgress(jobId, progressPercent + 2, `Chapter ${scene.chapterNumber} complete!`, {
 chapterComplete: {
 number: scene.chapterNumber,
 title: scene.chapterTitle,
 wordCount
 },
 lastChapterCompleteAt: new Date().toISOString(),
 textChunk: null
 })

        console.log(`✅ Chapter ${scene.chapterNumber} complete: "${scene.chapterTitle}" (${wordCount} words)`)
 }
 }

    // Step 3: Finalize
 const finalStatus = previewMode ? 'preview_completed' : 'completed'
 const bookStatus = previewMode ? 'preview' : 'completed'

 await SupabaseDB.updateBook(bookId, {
 status: bookStatus,
 ...(bookStatus === 'completed' ? { active_job_id: null } : {})
 })

 await completeJob(jobId, finalStatus, {
    outline,
    generatedScenes: allSceneTexts.length,
    totalWordCount: allSceneTexts.reduce((s, t) => s + t.split(/\s+/).filter(Boolean).length, 0)
  })

    // Non-blocking push notification to the user's devices
    if (finalStatus === 'completed') {
      sendPushNotification(
        userId,
        'Dein Buch ist fertig! 📖',
        `"${config.title}" wurde erfolgreich generiert.`,
        { bookId },
      ).catch(console.warn)
    }

    console.log(`✅ Live book generation ${finalStatus}:`, { jobId, bookId, scenes: allSceneTexts.length })

 } catch (error) {
    console.error('❌ Live book generation failed:', error)
 await failJob(jobId, error instanceof Error ? error.message : 'Unknown error')
 await SupabaseDB.updateBook(bookId, { status: 'error', active_job_id: null })
 throw error
 }
}
