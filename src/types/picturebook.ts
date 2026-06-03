import type { BookLanguage } from '@/lib/translations'

// Layout types for dynamic page arrangements
export type PageLayout =
 | 'full-image' // 1 large image, full page
 | 'image-with-text' // 1 image with text area
 | 'two-horizontal' // 2 images side by side
 | 'two-vertical' // 2 images stacked
 | 'four-grid' // 4 images in 2x2 grid
 | 'text-only' // Text only, no images

export interface PicturebookConfig {
 title: string
 author?: string
 genre: string
 targetAudience: string
 description: string
 bookType: 'picture'
 totalPages?: number // Optional - AI decides
 imageStyle: 'watercolor' | 'realistic' | 'cartoon' | '3d' | 'sketch' | 'anime'
 tone: string
 mainCharacters: string
 setting: string
 plotOutline?: string
 themes?: string[]
 customPrompt?: string
 language?: BookLanguage // Language for book generation
  // Legacy support
 imagesPerPage?: number
}

export interface PicturebookPanel {
 panelIndex: number
 description: string
 imagePrompt: string
 imageUrl?: string
 imageBase64?: string
}

export interface PicturebookPage {
 number: number
 layout: PageLayout
 text: string
 panels: PicturebookPanel[]
  // Legacy support
 imageUrl?: string
 imageBase64?: string
 imagePrompt?: string
 id?: string
}

// Helper to get image count from layout
export function getImageCountForLayout(layout: PageLayout): number {
 switch (layout) {
 case 'full-image': return 1
 case 'image-with-text': return 1
 case 'two-horizontal': return 2
 case 'two-vertical': return 2
 case 'four-grid': return 4
 case 'text-only': return 0
 default: return 1
 }
}

export interface PicturebookGenerationJob {
 jobId: string
 userId: string
 bookId: string
 config: PicturebookConfig
 callbackUrl: string
}

export interface PicturebookStatusUpdate {
 jobId: string
 status: 'pending' | 'processing' | 'completed' | 'failed'
 progress: number
 currentStep: string
 n8nExecutionId?: string
 page?: PicturebookPage
 error?: string
}

// `value` strings are sent to the AI image-generation pipeline and MUST stay
// stable/unlocalised. Only `labelKey`/`descKey` are i18n keys for the UI.
export const PICTUREBOOK_IMAGE_STYLES = [
 { value: 'watercolor', labelKey: 'pbStyleWatercolor', descKey: 'pbStyleWatercolorDesc' },
 { value: 'cartoon', labelKey: 'pbStyleCartoon', descKey: 'pbStyleCartoonDesc' },
 { value: '3d', labelKey: 'pbStyle3d', descKey: 'pbStyle3dDesc' },
 { value: 'realistic', labelKey: 'pbStyleRealistic', descKey: 'pbStyleRealisticDesc' },
 { value: 'sketch', labelKey: 'pbStyleSketch', descKey: 'pbStyleSketchDesc' },
 { value: 'anime', labelKey: 'pbStyleAnime', descKey: 'pbStyleAnimeDesc' }
] as const

export const PICTUREBOOK_TARGET_AUDIENCES = [
 { value: 'Kinder 0-3 Jahre', labelKey: 'pbAudienceToddler' },
 { value: 'Kinder 4-6 Jahre', labelKey: 'pbAudiencePreschool' },
 { value: 'Kinder 7-10 Jahre', labelKey: 'pbAudiencePrimary' },
 { value: 'Jugendliche', labelKey: 'pbAudienceTeen' },
 { value: 'Erwachsene', labelKey: 'pbAudienceAdult' }
] as const

export const PICTUREBOOK_GENRES = [
 { value: 'Märchen', labelKey: 'pbGenreFairytale' },
 { value: 'Abenteuer', labelKey: 'pbGenreAdventure' },
 { value: 'Fantasy', labelKey: 'pbGenreFantasy' },
 { value: 'Tiere', labelKey: 'pbGenreAnimals' },
 { value: 'Familie', labelKey: 'pbGenreFamily' },
 { value: 'Freundschaft', labelKey: 'pbGenreFriendship' },
 { value: 'Lernen/Bildung', labelKey: 'pbGenreEducation' },
 { value: 'Gute-Nacht-Geschichte', labelKey: 'pbGenreBedtime' },
 { value: 'Natur/Umwelt', labelKey: 'pbGenreNature' },
 { value: 'Alltag', labelKey: 'pbGenreEveryday' },
 { value: 'Humor', labelKey: 'pbGenreHumor' },
 { value: 'Magie', labelKey: 'pbGenreMagic' }
] as const
