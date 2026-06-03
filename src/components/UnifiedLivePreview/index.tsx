// Unified Live Preview Component
// A modern, timeline-based live preview for book generation

export { default } from './UnifiedLivePreview'
export { default as UnifiedLivePreview } from './UnifiedLivePreview'

// Sub-components (for custom implementations)
export { default as AnimatedBackground } from './AnimatedBackground'
export { default as ContentCard } from './ContentCard'
export { default as StreamingContent } from './StreamingContent'
export { default as ImageReveal } from './ImageReveal'
export { default as ProgressVisualization } from './ProgressVisualization'
export { default as CelebrationOverlay } from './CelebrationOverlay'

// Types
export type {
 ContentItem,
 UnifiedLivePreviewProps,
 StreamingContentProps,
 ImageRevealProps,
 ContentCardProps,
 ProgressVisualizationProps,
 CelebrationOverlayProps,
 AnimatedBackgroundProps
} from './types'

// Animation variants
export * from './animations'
