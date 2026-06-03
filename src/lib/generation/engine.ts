/**
 * Shared Generation Engine
 * 
 * Common utilities for all book generation modes:
 * - OpenAI client management
 * - Progress/status updates via DB (consumed by SSE stream endpoint)
 * - Language support
 * - Context management for maintaining consistency
 */

import OpenAI from 'openai'
import { SupabaseDB, BookGenerationJob } from '../supabase-db'

// ─── OpenAI Client ───────────────────────────────────────────────

let _openai: OpenAI | null = null

export function getOpenAI(): OpenAI {
 if (!_openai) {
 _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
 }
 return _openai
}

// ─── Language Support ────────────────────────────────────────────

const LANGUAGE_NAMES: Record<string, string> = {
 en: 'English', de: 'German (Deutsch)', es: 'Spanish (Español)',
 fr: 'French (Français)', it: 'Italian (Italiano)', pt: 'Portuguese (Português)',
 nl: 'Dutch (Nederlands)', pl: 'Polish (Polski)', ru: 'Russian (Русский)',
 ja: 'Japanese (日本語)', ko: 'Korean (한국어)', zh: 'Chinese (中文)',
 ar: 'Arabic (العربية)', tr: 'Turkish (Türkçe)', hi: 'Hindi (हिन्दी)',
 sv: 'Swedish (Svenska)', da: 'Danish (Dansk)', no: 'Norwegian (Norsk)',
 fi: 'Finnish (Suomi)', cs: 'Czech (Čeština)', el: 'Greek (Ελληνικά)',
 he: 'Hebrew (עברית)', id: 'Indonesian (Bahasa Indonesia)',
 th: 'Thai (ไทย)', vi: 'Vietnamese (Tiếng Việt)'
}

export function getLanguageName(code: string): string {
 return LANGUAGE_NAMES[code] || 'English'
}

export function isGerman(code?: string): boolean {
 return code === 'de'
}

// ─── Metadata Cache (Fix 2: avoid READ→MERGE→WRITE per call) ─────
//
// Instead of reading the DB each time to merge metadata, we keep a
// local in-memory accumulator per job. Every write is just a WRITE
// (no READ). The cache is module-level so it survives across the
// async scene-writing loop within a single serverless invocation.
//
// Key: jobId, Value: accumulated metadata object

const _metadataCache: Map<string, Record<string, unknown>> = new Map()

export function getMetadataCache(jobId: string): Record<string, unknown> {
 if (!_metadataCache.has(jobId)) {
  _metadataCache.set(jobId, {})
 }
 return _metadataCache.get(jobId)!
}

export function flushMetadataCache(jobId: string): void {
 _metadataCache.delete(jobId)
}

// ─── Progress Management ─────────────────────────────────────────

export async function updateProgress(
 jobId: string,
 progress: number,
 currentStep: string,
 extraMetadata?: Record<string, unknown>
): Promise<void> {
 const updates: Partial<BookGenerationJob> = {
 progress: Math.min(100, Math.max(0, progress)),
 current_step: currentStep,
 last_heartbeat_at: new Date().toISOString()
 }

 if (extraMetadata) {
  // Fix 2: accumulate in local cache — no DB READ needed
  const cache = getMetadataCache(jobId)
  Object.assign(cache, extraMetadata)
  updates.metadata = JSON.stringify(cache)
 }

 await SupabaseDB.updateBookGenerationJob(jobId, updates)
}

export async function sendTextChunk(
 jobId: string,
 chapterNumber: number,
 chapterTitle: string,
 text: string,
 isComplete: boolean
): Promise<void> {
 await updateProgress(jobId, -1, '', {
 textChunk: {
 chapterNumber,
 chapterTitle,
 text,
 isComplete,
 wordCount: text.split(/\s+/).filter(Boolean).length
 },
 lastTextChunkAt: new Date().toISOString()
 })
}

export async function markChapterComplete(
 jobId: string,
 chapterNumber: number,
 chapterTitle: string,
 wordCount: number
): Promise<void> {
 await updateProgress(jobId, -1, '', {
 chapterComplete: { number: chapterNumber, title: chapterTitle, wordCount },
 lastChapterCompleteAt: new Date().toISOString(),
 textChunk: null
 })
}

export async function failJob(jobId: string, error: string): Promise<void> {
 flushMetadataCache(jobId)
 await SupabaseDB.updateBookGenerationJob(jobId, {
 status: 'failed',
 current_step: error,
 error_message: error,
 completed_at: new Date().toISOString()
 })
}

export async function completeJob(
 jobId: string,
 status: 'completed' | 'preview_completed',
 metadata?: Record<string, unknown>
): Promise<void> {
 const updates: Partial<BookGenerationJob> = {
 status,
 progress: 100,
 current_step: status === 'preview_completed' ? 'Preview ready!' : 'Book complete!',
 completed_at: new Date().toISOString()
 }
 if (metadata) {
  // Fix 2: merge into local cache for final write — no DB READ needed
  const cache = getMetadataCache(jobId)
  Object.assign(cache, metadata)
  updates.metadata = JSON.stringify(cache)
 }
 flushMetadataCache(jobId)
 await SupabaseDB.updateBookGenerationJob(jobId, updates)
}

// ─── Book Content Management ─────────────────────────────────────

export interface ChapterData {
 number: number
 title: string
 content: string
 wordCount: number
 id?: string
}

/**
 * Save a chapter to the book, merging with existing chapters.
 * This is the equivalent of the n8n "Update Book Content" + "Save Book" nodes.
 */
export async function saveChapterToBook(
 bookId: string,
 chapter: ChapterData
): Promise<void> {
 const book = await SupabaseDB.getBook(bookId)
 if (!book) throw new Error(`Book ${bookId} not found`)

 let chapters: ChapterData[] = []
 if (book.chapters_json) {
 try {
 const parsed = typeof book.chapters_json === 'string'
 ? JSON.parse(book.chapters_json) : book.chapters_json
 chapters = Array.isArray(parsed) ? parsed : []
 } catch { chapters = [] }
 }

 const newChapter: ChapterData = {
 id: `chapter-${chapter.number}`,
 number: chapter.number,
 title: chapter.title,
 content: chapter.content,
 wordCount: chapter.wordCount
 }

 const idx = chapters.findIndex(c => c.number === chapter.number)
 if (idx >= 0) chapters[idx] = newChapter
 else chapters.push(newChapter)

 chapters.sort((a, b) => a.number - b.number)

 const fullContent = chapters
 .map(c => `# ${c.title}\n\n${c.content}`)
 .join('\n\n---\n\n')

 await SupabaseDB.updateBook(bookId, {
 chapters_json: JSON.stringify(chapters),
 content: fullContent,
 status: 'generating'
 })
}

// ─── Outline Types ───────────────────────────────────────────────

export interface SceneOutline {
 id: number
 title: string
 description: string
 emotion: string
}

export interface ChapterOutline {
 number: number
 title: string
 summary: string
 keyEvents: SceneOutline[]
}

export interface BookOutline {
 bookSummary: string
 chapters: ChapterOutline[]
}

// ─── JSON Parsing Helper ─────────────────────────────────────────

export function parseJSON<T>(raw: string, fallback: T): T {
 try {
 const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
 return JSON.parse(cleaned)
 } catch {
 const match = raw.match(/\{[\s\S]*\}/)
 if (match) {
 try { return JSON.parse(match[0]) } catch { /* fall through */ }
 }
 return fallback
 }
}

// ─── Stringify Characters Helper ─────────────────────────────────

export function stringifyCharacters(chars: unknown): string {
 if (typeof chars === 'string') return chars
 if (Array.isArray(chars)) {
 return chars.map(c =>
 typeof c === 'object' ? ((c as Record<string, string>).name || JSON.stringify(c)) : String(c)
 ).join(', ')
 }
 if (chars && typeof chars === 'object') return JSON.stringify(chars)
 return ''
}
