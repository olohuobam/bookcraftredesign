/**
 * Native Book Generation Engine
 * 
 * Replaces all 3 n8n workflows with native Next.js code:
 * - Live text book generation (scene-by-scene with context)
 * - Interactive book generation (with decision state machine)
 * - Picture book generation (3-tier image fallback, style consistency)
 */

export { generateLiveBook, type LiveBookConfig } from './live'
export { generateInteractiveBook, type InteractiveBookConfig } from './interactive'
export { generatePictureBook, FREE_PICTURE_PAGES, type GeneratePictureBookOptions } from './picturebook'
export {
 getOpenAI,
 getLanguageName,
 updateProgress,
 failJob,
 completeJob,
 saveChapterToBook
} from './engine'
