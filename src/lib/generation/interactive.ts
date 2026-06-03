/**
 * Interactive Book Generation Engine
 * 
 * Replaces n8n-workflow-07ZmpXzQuBdGJkfJQ-Ew5.json (Interactive Book Gen).
 * 
 * Flow: Generate outline (with decision points marked) → write scenes →
 *       at decision points, generate options → save interaction point →
 *       pause for user decision → resume with decision context
 * 
 * CRITICAL: User decisions flow into the story naturally via context injection.
 * The DB-based state machine uses the interaction_points table.
 */

import { SupabaseDB } from '../supabase-db'
import { sendPushNotification } from '../push-sender'
import { downloadAndSaveImage, saveBase64Image, attachPathFragment } from '../image-storage'
import {
 getOpenAI, getLanguageName, isGerman, parseJSON, stringifyCharacters,
 updateProgress, saveChapterToBook, failJob, completeJob
} from './engine'
import { openaiWithRetry } from '../openai-retry'
import type { BookLanguage } from '../translations'

// ─── Config Types ────────────────────────────────────────────────

export interface InteractiveBookConfig {
 title: string
 genre: string
 targetAudience?: string
 description: string
 totalChapters: number
 writingStyle?: string
 tone?: string
 themes?: string[]
 mainCharacters?: string
 setting?: string
 plotOutline?: string
 pov?: 'first' | 'third' | 'mixed'
 tenseStyle?: 'past' | 'present' | 'mixed'
 language?: BookLanguage
 interactionMode?: 'automatic' | 'manual'
 category?: string
 subcategory?: string
 categoryConfig?: Record<string, unknown>
}

// ─── Interactive Outline ─────────────────────────────────────────

interface InteractiveScene {
 id: number
 title: string
 description: string
 hasDecisionPoint: boolean
 decisionPrompt: string | null
 potentialOptions: string[]
}

interface InteractiveChapter {
 number: number
 title: string
 summary: string
 scenes: InteractiveScene[]
}

interface InteractiveOutline {
 bookSummary: string
 chapters: InteractiveChapter[]
}

async function generateInteractiveOutline(config: InteractiveBookConfig): Promise<InteractiveOutline> {
 const openai = getOpenAI()
 const lang = config.language || 'de'
 const langName = getLanguageName(lang)
 const de = isGerman(lang)
 const chars = stringifyCharacters(config.mainCharacters)

 const systemPrompt = de
 ? 'Du bist ein erfahrener interaktiver Buchautor. Antworte NUR mit validem JSON.'
 : `You are an experienced interactive book author. Write in ${langName}. Respond ONLY with valid JSON.`

 const userPrompt = de
 ? `Erstelle eine interaktive Buchgliederung:

TITEL: "${config.title}"
GENRE: ${config.genre}
BESCHREIBUNG: ${config.description}
HANDLUNG: ${config.plotOutline || 'Entwickle eine fesselnde interaktive Handlung'}
CHARAKTERE: ${chars}
SCHAUPLATZ: ${config.setting || ''}

Erstelle EXAKT ${config.totalChapters} Kapitel. Jedes Kapitel hat 3-4 Szenen.
Markiere 1-2 Szenen pro Kapitel als Entscheidungspunkte (hasDecisionPoint: true).

JSON FORMAT:
{
 "bookSummary": "Zusammenfassung",
 "chapters": [
 {
 "number": 1,
 "title": "Kapiteltitel",
 "summary": "Zusammenfassung",
 "scenes": [
 {
 "id": 1,
 "title": "Szenen-Titel",
 "description": "Was passiert",
 "hasDecisionPoint": false,
 "decisionPrompt": null,
 "potentialOptions": []
 },
 {
 "id": 2,
 "title": "Die Weggabelung",
 "description": "Protagonist steht vor einer Entscheidung",
 "hasDecisionPoint": true,
 "decisionPrompt": "Welchen Weg wählst du?",
 "potentialOptions": ["Den dunklen Pfad", "Den beleuchteten Weg", "Umkehren"]
 }
 ]
 }
 ]
}`
 : `Create an interactive book outline:

TITLE: "${config.title}"
GENRE: ${config.genre}
DESCRIPTION: ${config.description}
PLOT: ${config.plotOutline || 'Develop an engaging interactive plot'}
CHARACTERS: ${chars}
SETTING: ${config.setting || ''}

Create EXACTLY ${config.totalChapters} chapters. Each chapter has 3-4 scenes.
Mark 1-2 scenes per chapter as decision points (hasDecisionPoint: true).

**ALL text must be in ${langName}!**

JSON FORMAT:
{
 "bookSummary": "Summary",
 "chapters": [
 {
 "number": 1,
 "title": "Chapter title",
 "summary": "Summary",
 "scenes": [
 {
 "id": 1, "title": "Scene", "description": "What happens",
 "hasDecisionPoint": false, "decisionPrompt": null, "potentialOptions": []
 },
 {
 "id": 2, "title": "The Crossroads", "description": "Protagonist faces a choice",
 "hasDecisionPoint": true, "decisionPrompt": "Which path do you choose?",
 "potentialOptions": ["The dark path", "The lit way", "Turn back"]
 }
 ]
 }
 ]
}`

 // Fix 1: gpt-4.1-mini for JSON-only outline — ~6x faster, ~10x cheaper
 // Fix 3: retry wrapper for 429/5xx resilience
 const completion = await openaiWithRetry(openai, {
 model: 'gpt-4.1-mini',
 messages: [
 { role: 'system', content: systemPrompt },
 { role: 'user', content: userPrompt }
 ],
 temperature: 0.85,
 max_tokens: 5000
 })

 const raw = completion.choices[0]?.message?.content || '{}'
 const outline = parseJSON<InteractiveOutline>(raw, {
 bookSummary: config.title,
 chapters: []
 })

  // Normalize
 if (!outline.chapters.length) {
 outline.chapters = Array.from({ length: config.totalChapters }, (_, i) => ({
 number: i + 1,
 title: `Chapter ${i + 1}`,
 summary: `Chapter ${i + 1}`,
 scenes: [
 { id: 1, title: 'Opening', description: 'Scene begins', hasDecisionPoint: false, decisionPrompt: null, potentialOptions: [] },
 { id: 2, title: 'Development', description: 'Story develops', hasDecisionPoint: true, decisionPrompt: 'What happens next?', potentialOptions: ['Continue cautiously', 'Take bold action', 'Seek help'] },
 { id: 3, title: 'Conclusion', description: 'Scene ends', hasDecisionPoint: false, decisionPrompt: null, potentialOptions: [] }
 ]
 }))
 }

 outline.chapters.forEach((ch, i) => {
 ch.number = i + 1
 if (!ch.scenes?.length) {
 ch.scenes = [
 { id: 1, title: 'Scene', description: 'Action', hasDecisionPoint: false, decisionPrompt: null, potentialOptions: [] }
 ]
 }
 ch.scenes.forEach((s, j) => { s.id = j + 1 })
 })

 return outline
}

// ─── Scene Writing ───────────────────────────────────────────────

interface DecisionRecord {
 optionId: string
 optionLabel: string
 consequenceHint: string
 customInput?: string
}

async function writeInteractiveScene(
 config: InteractiveBookConfig,
 scene: InteractiveScene & { chapterNumber: number; chapterTitle: string; chapterSummary: string },
 previousTexts: string[],
 previousDecisions: DecisionRecord[]
): Promise<string> {
 const openai = getOpenAI()
 const lang = config.language || 'de'
 const langName = getLanguageName(lang)
 const de = isGerman(lang)

 const decisionsContext = previousDecisions.length > 0
 ? (de
 ? `\nBisherige Entscheidungen des Lesers: ${previousDecisions.map(d => d.optionLabel).join(', ')}. `
 : `\nPrevious reader decisions: ${previousDecisions.map(d => d.optionLabel).join(', ')}. `)
 : ''

 const previousContext = previousTexts.length > 0
 ? (de
 ? `\n\nBISHERIGER TEXT:\n---\n${previousTexts.slice(-3).join('\n\n---\n\n')}\n---`
 : `\n\nPREVIOUS TEXT:\n---\n${previousTexts.slice(-3).join('\n\n---\n\n')}\n---`)
 : ''

 const systemPrompt = de
 ? `Du bist ein Meisterautor im Genre ${config.subcategory || config.genre}. Schreibe fesselnde, lebendige Prosa.

WICHTIG:
- Schreibe NUR Fließtext, keine Überschriften oder Aufzählungen
- Mindestens 1200 Wörter
- Show, don't tell - lebendige Details und Dialoge
- ${scene.hasDecisionPoint ? 'ENDE die Szene an einem spannenden Punkt, der eine Entscheidung erfordert!' : 'Führe die Szene zu einem natürlichen Abschluss.'}`
 : `You are a master author in the ${config.subcategory || config.genre} genre. Write in ${langName}.
Write compelling, vivid prose. Minimum 1200 words.
${scene.hasDecisionPoint ? 'END the scene at a tense decision point!' : 'Lead the scene to a natural conclusion.'}`

 const userPrompt = de
 ? `Schreibe die Szene "${scene.title}" für Kapitel ${scene.chapterNumber}: ${scene.chapterTitle}
${decisionsContext}

BUCH: ${config.title}
KAPITEL-ZUSAMMENFASSUNG: ${scene.chapterSummary}

SZENE:
- Titel: ${scene.title}
- Beschreibung: ${scene.description}
- Position: Szene ${scene.id}

${scene.hasDecisionPoint ? ' WICHTIG: Diese Szene endet an einem Entscheidungspunkt! Baue Spannung auf und ende so, dass der Leser eine Wahl treffen muss.' : ''}
${previousContext}`
 : `Write the scene "${scene.title}" for Chapter ${scene.chapterNumber}: ${scene.chapterTitle}
${decisionsContext}

BOOK: ${config.title}
CHAPTER SUMMARY: ${scene.chapterSummary}

SCENE:
- Title: ${scene.title}
- Description: ${scene.description}
- Position: Scene ${scene.id}

${scene.hasDecisionPoint ? ' IMPORTANT: End at a decision point! Build tension so the reader must make a choice.' : ''}
${previousContext}`

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
 text = text.replace(/^#+\s+.*$/gm, '').replace(/\*\*.*?\*\*/g, m => m.replace(/\*\*/g, '')).trim()
 return text
}

// ─── Decision Options Generation ─────────────────────────────────

interface DecisionOption {
 id: string
 label: string
 consequenceHint: string
}

interface DecisionOptions {
 prompt: string
 options: DecisionOption[]
}

async function generateDecisionOptions(
 config: InteractiveBookConfig,
 scene: InteractiveScene,
 sceneText: string
): Promise<DecisionOptions> {
 const openai = getOpenAI()
 const lang = config.language || 'de'
 const de = isGerman(lang)

 const systemPrompt = de
 ? `Du bist ein kreativer Autor. Generiere 3-4 interessante Entscheidungsoptionen.
Antworte NUR mit JSON: { "prompt": "Frage", "options": [{ "id": "a", "label": "...", "consequenceHint": "..." }] }`
 : `Generate 3-4 decision options. Respond ONLY with JSON: { "prompt": "Question", "options": [{ "id": "a", "label": "...", "consequenceHint": "..." }] }`

 const userPrompt = de
 ? `Basierend auf dieser Szene, generiere Entscheidungsoptionen:

Szene: ${scene.title}
Text-Ende: "${sceneText.slice(-500)}..."

Entscheidungs-Prompt: ${scene.decisionPrompt || 'Was soll als nächstes passieren?'}`
 : `Based on this scene, generate decision options:

Scene: ${scene.title}
Text ending: "${sceneText.slice(-500)}..."

Decision prompt: ${scene.decisionPrompt || 'What should happen next?'}`

 // Fix 3: retry wrapper for 429/5xx resilience
 const completion = await openaiWithRetry(openai, {
 model: 'gpt-4.1-mini',
 messages: [
 { role: 'system', content: systemPrompt },
 { role: 'user', content: userPrompt }
 ],
 response_format: { type: 'json_object' },
 temperature: 0.9,
 max_tokens: 1000
 })

 const raw = completion.choices[0]?.message?.content || '{}'
 return parseJSON<DecisionOptions>(raw, {
 prompt: scene.decisionPrompt || (de ? 'Was soll als nächstes passieren?' : 'What should happen next?'),
 options: [
 { id: 'a', label: de ? 'Die Geschichte spannend fortsetzen' : 'Continue excitingly', consequenceHint: '' },
 { id: 'b', label: de ? 'Eine überraschende Wendung' : 'A surprising twist', consequenceHint: '' },
 { id: 'c', label: de ? 'Die Charaktere vertiefen' : 'Deepen the characters', consequenceHint: '' }
 ]
 })
}

// ─── Cover Generation ────────────────────────────────────────────

/**
 * Bug 4b fix: Generate a portrait cover image for interactive books.
 * Mirrors the cover generation used in live.ts (generateTextBookCover).
 */
async function generateInteractiveBookCover(
 jobId: string,
 bookId: string,
 userId: string,
 config: InteractiveBookConfig,
 outline: InteractiveOutline
): Promise<void> {
 const openai = getOpenAI()
 const chapterSummaries = outline.chapters.slice(0, 3).map(ch => ch.title).join(', ')
 const coverPrompt = `Create a beautiful, atmospheric book cover illustration for a ${config.genre} story titled "${config.title}".

The story is about: ${config.description || config.plotOutline || chapterSummaries}
Target audience: ${config.targetAudience || 'general'}
Tone: ${config.tone || 'engaging'}
${config.setting ? `Setting: ${config.setting}` : ''}

REQUIREMENTS:
- Generate ONLY the front cover artwork as a FLAT, 2D image
- NO 3D book rendering, NO book spine, NO book edges
- The entire image should be filled with the artwork edge-to-edge
- Professional, eye-catching design suitable for a published book
- Include the title "${config.title}" in elegant, readable typography
- Cinematic, high quality, evocative mood
- Convey the sense of choice and adventure (branching paths, multiple possibilities)`

 try {
    // gpt-image-1.5 (primary model) — does NOT accept response_format param
 const response = await openai.images.generate({
 model: 'gpt-image-1.5',
 prompt: coverPrompt,
 n: 1,
 size: '1024x1536',
 quality: 'high',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
 } as any)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const b64 = (response as any).data?.[0]?.b64_json as string | undefined
 if (b64) {
 const stored = await saveBase64Image(b64, { bookId, userId, filenamePrefix: 'cover' })
 const coverUrl = attachPathFragment(stored.signedUrl, stored.path)
 await SupabaseDB.updateBook(bookId, { cover_image: coverUrl })
      console.log('🎨 Interactive book cover generated (gpt-image-1.5)')
 return
 }
 } catch (err) {
    console.warn('⚠️ gpt-image-1.5 cover failed for interactive book:', (err as Error).message)
 }

  // DALL-E 3 fallback
 try {
    console.log('🔄 Trying DALL-E 3 fallback for interactive book cover...')
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
 const stored = await downloadAndSaveImage(imageUrl, { bookId, userId, filenamePrefix: 'cover' })
 const coverUrl = attachPathFragment(stored.signedUrl, stored.path)
 await SupabaseDB.updateBook(bookId, { cover_image: coverUrl })
      console.log('🎨 Interactive book cover generated (dall-e-3 fallback)')
 return
 }
 } catch (fallbackErr) {
    console.warn('⚠️ DALL-E 3 cover fallback also failed for interactive book:', (fallbackErr as Error).message)
 }

  console.error('❌ Cover generation failed for interactive book')
 void jobId // suppress unused-var warning
}

// ─── Main Generation Function ────────────────────────────────────

/**
 * Generate an interactive book.
 * 
 * Unlike the n8n version which used a Wait node for decisions,
 * this version generates all content at once. Decision points are
 * saved to the interaction_points table for the reader to interact
 * with during reading. The story branches are pre-generated based
 * on the most likely path, and can be regenerated on-demand when
 * the reader makes a different choice.
 */
export async function generateInteractiveBook(
 jobId: string,
 bookId: string,
 userId: string,
 config: InteractiveBookConfig
): Promise<void> {
  console.log('📖 Starting native interactive book generation:', { jobId, bookId })

 try {
 await SupabaseDB.updateBookGenerationJob(jobId, {
 status: 'processing',
 progress: 0,
 current_step: 'Starting interactive book generation...',
 last_heartbeat_at: new Date().toISOString()
 })

    // Step 1: Generate outline with decision points
 await updateProgress(jobId, 3, 'Creating interactive book structure...')
 const outline = await generateInteractiveOutline(config)
 await updateProgress(jobId, 10, 'Book structure created!', { outline })

    // Step 1b: Generate cover image (Bug 4b fix)
 try {
 await updateProgress(jobId, 11, 'Generating book cover...')
 await generateInteractiveBookCover(jobId, bookId, userId, config, outline)
 } catch (coverErr) {
      console.warn('⚠️ Interactive cover generation failed, continuing:', coverErr)
 }

    // Flatten all scenes
 const allScenes: Array<InteractiveScene & {
 chapterNumber: number
 chapterTitle: string
 chapterSummary: string
 totalScenesInChapter: number
 }> = []

 for (const ch of outline.chapters) {
 for (const scene of ch.scenes) {
 allScenes.push({
 ...scene,
 chapterNumber: ch.number,
 chapterTitle: ch.title,
 chapterSummary: ch.summary,
 totalScenesInChapter: ch.scenes.length
 })
 }
 }

 const totalScenes = allScenes.length
 const allTexts: string[] = []
 const decisions: DecisionRecord[] = []
 const chapterTexts: Map<number, string[]> = new Map()
 let decisionPointIndex = 0

    // Step 2: Write scenes
 for (let i = 0; i < allScenes.length; i++) {
 const scene = allScenes[i]
 const progress = 10 + Math.round((i / totalScenes) * 80)

 await updateProgress(jobId, progress,
 `Writing Chapter ${scene.chapterNumber}, Scene ${scene.id}: "${scene.title}"...`)

      // Write the scene
 const text = await writeInteractiveScene(config, scene, allTexts, decisions)
 allTexts.push(text)

      // Send text chunk for streaming
 await updateProgress(jobId, progress, `Writing Chapter ${scene.chapterNumber}...`, {
 textChunk: {
 chapterNumber: scene.chapterNumber,
 chapterTitle: scene.chapterTitle,
 text,
 isComplete: scene.id === scene.totalScenesInChapter,
 wordCount: text.split(/\s+/).filter(Boolean).length
 },
 lastTextChunkAt: new Date().toISOString()
 })

      // If this is a decision point, generate options and save
 if (scene.hasDecisionPoint) {
 await updateProgress(jobId, progress + 1, 'Generating decision options...')
 const options = await generateDecisionOptions(config, scene, text)

        // Save interaction point to DB
 try {
 const { supabaseAdmin } = await import('../supabase-admin')
 if (supabaseAdmin) {
 await supabaseAdmin.from('interaction_points').insert({
 book_id: bookId,
 chapter_index: scene.chapterNumber - 1,
 position: decisionPointIndex,
 prompt: options.prompt,
 options: options.options,
 scene_text_end: text.slice(-300)
 })
 }
 } catch (err) {
          console.warn('Could not save interaction point (table may not exist):', err)
 }

 decisionPointIndex++

        // For auto-generation, pick the first option and continue
 const autoDecision: DecisionRecord = {
 optionId: options.options[0]?.id || 'a',
 optionLabel: options.options[0]?.label || 'Continue',
 consequenceHint: options.options[0]?.consequenceHint || ''
 }
 decisions.push(autoDecision)
 }

      // Accumulate chapter texts
 if (!chapterTexts.has(scene.chapterNumber)) {
 chapterTexts.set(scene.chapterNumber, [])
 }
 chapterTexts.get(scene.chapterNumber)!.push(text)

      // If last scene in chapter, save chapter
 if (scene.id === scene.totalScenesInChapter) {
 const texts = chapterTexts.get(scene.chapterNumber)!
 const content = texts.join('\n\n')
 const wordCount = content.split(/\s+/).filter(Boolean).length

 await saveChapterToBook(bookId, {
 number: scene.chapterNumber,
 title: scene.chapterTitle,
 content,
 wordCount
 })

 await updateProgress(jobId, progress + 2, `Chapter ${scene.chapterNumber} complete!`, {
 chapterComplete: {
 number: scene.chapterNumber,
 title: scene.chapterTitle,
 wordCount
 },
 lastChapterCompleteAt: new Date().toISOString(),
 textChunk: null
 })
 }
 }

    // Step 3: Complete
 await SupabaseDB.updateBook(bookId, { status: 'completed', active_job_id: null })
 await completeJob(jobId, 'completed', {
 outline,
 totalDecisionPoints: decisionPointIndex,
 totalScenes: allScenes.length
 })

    // Non-blocking push notification to the user's devices
    sendPushNotification(
      userId,
      'Dein Buch ist fertig! 📖',
      `"${config.title}" wurde erfolgreich generiert.`,
      { bookId },
    ).catch(console.warn)

    console.log(`✅ Interactive book generation complete:`, { jobId, bookId, scenes: allScenes.length, decisions: decisionPointIndex })

 } catch (error) {
    console.error('❌ Interactive book generation failed:', error)
 await failJob(jobId, error instanceof Error ? error.message : 'Unknown error')
 await SupabaseDB.updateBook(bookId, { status: 'error', active_job_id: null })
 throw error
 }
}
