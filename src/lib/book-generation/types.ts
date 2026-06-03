// Shared types for book generation pipeline

export interface BookConfig {
  title: string
  genre: string
  targetAudience: string
  description: string
  bookType: 'text' | 'picture'
  totalChapters: number
  wordsPerChapter: number
  totalPages?: number
  writingStyle: string
  tone: string
  themes: string[]
  mainCharacters: string
  setting: string
  plotOutline: string
  imagesPerPage: number
  imageStyle: string
  pov: 'first' | 'third' | 'mixed'
  tenseStyle: 'past' | 'present' | 'mixed'
  complexity: 'simple' | 'medium' | 'complex'
  customPrompt: string
}

export interface GenerationProgress {
  progress: number
  status: string
  bookId?: string
  error?: string
  complete?: boolean
}

export interface ChapterData {
  title: string
  content: string
  images?: string[]
}

export interface ChapterOutline {
  number: number
  title: string
  summary: string
  keyEvents?: string[]
  characters?: string[]
  themes?: string[]
  visualScenes?: string[]
  imagePrompts?: string[]
  wordCount?: number
}

export interface CharacterDescription {
  name?: string
  appearance: string
  personality: string
  role: string
}

export interface BookOutline {
  bookSummary: string
  characterDescriptions?: Record<string, CharacterDescription>
  visualTheme?: string
  chapters: ChapterOutline[]
  characterArcs?: Record<string, string>
  consistencyGuidelines?: {
    characters?: string
    settings?: string
    style?: string
  }
}
