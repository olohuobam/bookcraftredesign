// Photobook types for AI-analyzed photo albums

export const PHOTOBOOK_MAX_PHOTOS = 10
export const PHOTOBOOK_MAX_FILE_SIZE_MB = 50
export const PHOTOBOOK_MAX_FILE_SIZE_BYTES = PHOTOBOOK_MAX_FILE_SIZE_MB * 1024 * 1024

export type PhotoSortOption = 'age' | 'similarity' | 'random' | 'manual' | 'date_taken'

// Media Library Item - for reusable photo uploads
export interface MediaLibraryItem {
 id: string
 userId: string
 originalFilename: string
 url: string
 storagePath?: string
 storageType: 'supabase' | 'base64' | 'local'
 thumbnailUrl?: string

  // Photo metadata
 fileSize?: number
 mimeType?: string
 width?: number
 height?: number

  // AI Analysis
 analysis?: PhotoAnalysis
 analysisStatus: 'pending' | 'analyzing' | 'completed' | 'failed'
 analyzedWith?: string // AI model used for analysis, e.g. 'gpt-4o'

  // Organization
 tags?: string[]
 folder?: string

  // Timestamps
 createdAt: string
 updatedAt?: string
}

export type PhotoEra =
 | '1900-1920'
 | '1920-1940'
 | '1940-1960'
 | '1960-1980'
 | '1980-2000'
 | '2000-2010'
 | '2010-2020'
 | '2020-present'
 | 'unknown'

export interface PhotoAnalysis {
  // Zeitliche Einschätzung
 estimatedEra: PhotoEra
 estimatedYear?: number
 eraConfidence: number // 0-1
 eraReasoning: string // Begründung für die Einschätzung

  // Inhaltliche Analyse
 description: string
 subjects: string[] // Menschen, Objekte, etc.
 peopleCount: number
 hasText: boolean
 detectedText?: string

  // Technische Merkmale
 colorPalette: string[] // Dominante Farben
 isBlackAndWhite: boolean
 isSepia: boolean
 photoQuality: 'low' | 'medium' | 'high'

  // Kategorisierung
 categories: string[] // z.B. "Familie", "Urlaub", "Hochzeit"
 mood: string // z.B. "fröhlich", "feierlich", "nachdenklich"
 setting: string // z.B. "Innenraum", "Strand", "Stadt"

  // Für Ähnlichkeitsberechnung
 embeddingVector?: number[]
 visualFeatures: string[] // Extrahierte visuelle Merkmale
}

export interface CropData {
 x: number
 y: number
 width: number
 height: number
}

export interface PhotobookPhoto {
 id: string
 mediaLibraryId?: string
 originalFilename: string
 url: string
 thumbnailUrl?: string
 uploadedAt: string

  // Analyse-Ergebnisse
 analysis?: PhotoAnalysis
 analysisStatus: 'pending' | 'analyzing' | 'completed' | 'failed'
 analysisError?: string

  // Manuelle Überschreibungen
 manualYear?: number
 manualDescription?: string
 manualCategories?: string[]

  // Position in book
 pageIndex?: number
 position?: number
 caption?: string
 cropData?: CropData
}

// Bildstile für die KI-Transformation
export type PhotoTransformStyle =
 | 'original' // Keine Transformation
 | 'comic' // Comic/Cartoon Stil
 | 'watercolor' // Aquarell
 | 'anime' // Anime/Manga Stil
 | 'oil_painting' // Ölgemälde
 | 'pencil_sketch' // Bleistiftzeichnung
 | 'pop_art' // Pop Art Stil
 | 'vintage_film' // Vintage Filmoptik
 | 'pixel_art' // Pixel Art

export interface PhotobookConfig {
 title: string
 subtitle?: string
 description?: string

  // Sortierung und Layout
 sortBy: PhotoSortOption
 photosPerPage: 1 | 2 | 4 | 6
 includeAnalysisText: boolean // Soll KI-Beschreibung als Caption angezeigt werden?

  // Filter
 filterByEra?: PhotoEra[]
 filterByCategory?: string[]

  // Stil
 theme: 'classic' | 'modern' | 'vintage' | 'minimal' | 'elegant'
 coverPhoto?: string // URL des Cover-Fotos

  // KI-Bildtransformation
 transformStyle?: PhotoTransformStyle // Stil für Foto-Transformation
 transformEnabled?: boolean // Ob Fotos transformiert werden sollen
}

export interface PhotobookGenerationJob {
 id: string
 userId: string
 bookId?: string

 status: 'uploading' | 'analyzing' | 'sorting' | 'generating' | 'completed' | 'failed'
 progress: number // 0-100
 currentStep: string

  // Foto-Status
 totalPhotos: number
 analyzedPhotos: number

 config: PhotobookConfig
 photos: PhotobookPhoto[]

 createdAt: string
 updatedAt: string
 error?: string
}

export interface PhotobookPage {
 pageNumber: number
 photos: {
 photo: PhotobookPhoto
 position: 'full' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'left' | 'right'
 caption?: string
 }[]
 pageTitle?: string
 pageDescription?: string
}

export interface Photobook {
 id: string
 userId: string
 config: PhotobookConfig
 photos: PhotobookPhoto[]
 pages: PhotobookPage[]
 status: 'draft' | 'processing' | 'completed'
 createdAt: string
 updatedAt: string
}

// Konstanten für die UI
// Note: label/description are translation keys — use t(labelKey) in components
export const PHOTOBOOK_SORT_OPTIONS = [
 { value: 'age', labelKey: 'photobookSortAge', descriptionKey: 'photobookSortAgeDesc' },
 { value: 'similarity', labelKey: 'photobookSortSimilarity', descriptionKey: 'photobookSortSimilarityDesc' },
 { value: 'random', labelKey: 'photobookSortRandom', descriptionKey: 'photobookSortRandomDesc' },
 { value: 'manual', labelKey: 'photobookSortManual', descriptionKey: 'photobookSortManualDesc' },
 { value: 'date_taken', labelKey: 'photobookSortDateTaken', descriptionKey: 'photobookSortDateTakenDesc' }
] as const

export const PHOTOBOOK_THEMES = [
 { value: 'classic', labelKey: 'photobookThemeClassic', descriptionKey: 'photobookThemeClassicDesc' },
 { value: 'modern', labelKey: 'photobookThemeModern', descriptionKey: 'photobookThemeModernDesc' },
 { value: 'vintage', labelKey: 'photobookThemeVintage', descriptionKey: 'photobookThemeVintageDesc' },
 { value: 'minimal', labelKey: 'photobookThemeMinimal', descriptionKey: 'photobookThemeMinimalDesc' },
 { value: 'elegant', labelKey: 'photobookThemeElegant', descriptionKey: 'photobookThemeElegantDesc' }
] as const

export const PHOTOBOOK_LAYOUTS = [
 { value: 1, labelKey: 'photobookLayout1', descriptionKey: 'photobookLayout1Desc' },
 { value: 2, labelKey: 'photobookLayout2', descriptionKey: 'photobookLayout2Desc' },
 { value: 4, labelKey: 'photobookLayout4', descriptionKey: 'photobookLayout4Desc' },
 { value: 6, labelKey: 'photobookLayout6', descriptionKey: 'photobookLayout6Desc' }
] as const

// Bildstile für KI-Transformation
export const PHOTOBOOK_TRANSFORM_STYLES = [
 { value: 'original', labelKey: 'photobookStyleOriginal', descriptionKey: 'photobookStyleOriginalDesc', icon: '' },
 { value: 'comic', labelKey: 'photobookStyleComic', descriptionKey: 'photobookStyleComicDesc', icon: '' },
 { value: 'watercolor', labelKey: 'photobookStyleWatercolor', descriptionKey: 'photobookStyleWatercolorDesc', icon: '' },
 { value: 'anime', labelKey: 'photobookStyleAnime', descriptionKey: 'photobookStyleAnimeDesc', icon: '' },
 { value: 'oil_painting', labelKey: 'photobookStyleOilPainting', descriptionKey: 'photobookStyleOilPaintingDesc', icon: '' },
 { value: 'pencil_sketch', labelKey: 'photobookStylePencilSketch', descriptionKey: 'photobookStylePencilSketchDesc', icon: '' },
 { value: 'pop_art', labelKey: 'photobookStylePopArt', descriptionKey: 'photobookStylePopArtDesc', icon: '' },
 { value: 'vintage_film', labelKey: 'photobookStyleVintageFilm', descriptionKey: 'photobookStyleVintageFilmDesc', icon: '' },
 { value: 'pixel_art', labelKey: 'photobookStylePixelArt', descriptionKey: 'photobookStylePixelArtDesc', icon: '' }
] as const

// Translation key for each era — use t(PHOTO_ERA_LABEL_KEYS[era]) in components
export const PHOTO_ERA_LABEL_KEYS: Record<PhotoEra, string> = {
 '1900-1920': 'photoEra19001920',
 '1920-1940': 'photoEra19201940',
 '1940-1960': 'photoEra19401960',
 '1960-1980': 'photoEra19601980',
 '1980-2000': 'photoEra19802000',
 '2000-2010': 'photoEra20002010',
 '2010-2020': 'photoEra20102020',
 '2020-present': 'photoEra2020Present',
 'unknown': 'photoEraUnknown'
}

// Hilfsfunktionen
export function getEraFromYear(year: number): PhotoEra {
 if (year < 1920) return '1900-1920'
 if (year < 1940) return '1920-1940'
 if (year < 1960) return '1940-1960'
 if (year < 1980) return '1960-1980'
 if (year < 2000) return '1980-2000'
 if (year < 2010) return '2000-2010'
 if (year < 2020) return '2010-2020'
 return '2020-present'
}

export function getEraOrder(era: PhotoEra): number {
 const order: Record<PhotoEra, number> = {
 '1900-1920': 1,
 '1920-1940': 2,
 '1940-1960': 3,
 '1960-1980': 4,
 '1980-2000': 5,
 '2000-2010': 6,
 '2010-2020': 7,
 '2020-present': 8,
 'unknown': 9
 }
 return order[era]
}
