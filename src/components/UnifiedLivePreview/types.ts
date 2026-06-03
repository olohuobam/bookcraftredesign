// Types for Unified Live Preview Component

export interface ContentItem {
 id: string
 type: 'chapter' | 'image' | 'cover'
 index: number
 title?: string
 subtitle?: string
 content?: string
 imageUrl?: string
 isStreaming: boolean
 isComplete: boolean
 isNew: boolean
 timestamp: number
}

export interface ChapterData {
 chapterNumber: number
 chapterTitle?: string
 chapterSubtitle?: string
 text: string
 isComplete: boolean
 wordCount?: number
}

export interface UnifiedLivePreviewProps {
 jobId: string
 bookId: string
 bookType: 'text' | 'picture'
 bookTitle?: string
 bookAuthor?: string
 onComplete?: () => void
 onClose?: () => void
}

export interface StreamingContentProps {
 content: string
 isStreaming: boolean
 isComplete: boolean
 title?: string
 subtitle?: string
}

export interface ImageRevealProps {
 imageUrl: string
 alt?: string
 isNew?: boolean
 aspectRatio?: 'square' | 'portrait' | 'landscape'
 onLoad?: () => void
}

export interface ContentCardProps {
 item: ContentItem
 isActive?: boolean
}

export interface ProgressVisualizationProps {
 progress: number
 totalItems: number
 completedItems: number
 currentStep?: string
 eta?: string
 isConnected: boolean
 connectionType: 'realtime' | 'sse' | 'polling' | 'disconnected'
}

export interface CelebrationOverlayProps {
 isVisible: boolean
 onAnimationComplete?: () => void
}

export interface AnimatedBackgroundProps {
 intensity?: 'subtle' | 'medium' | 'high'
}

// Job/Book data from useJobRealtime
export interface JobRealtimeData {
 id: string
 status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'retrying'
 progress: number
 currentStep?: string
 errorMessage?: string
 metadata?: {
 textChunk?: string
 chapterNumber?: number
 chapterTitle?: string
 chapterSubtitle?: string
 isChapterComplete?: boolean
 }
}

export interface BookRealtimeData {
 id: string
 title: string
 status: string
 book_type: string
 cover_image?: string
 images?: string[]
 chapters?: ChapterData[]
}

export interface ETAData {
 estimatedSecondsRemaining: number | null
 displayText: string
 confidence: 'low' | 'medium' | 'high'
}
