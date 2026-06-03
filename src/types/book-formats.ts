/**
 * German Book Format Definitions
 * Standard formats for printed books in Germany
 */

export interface BookFormat {
 id: string
 name: string
 displayName: string
 width: number // in cm
 height: number // in cm
 margins: {
 inner: number // Inner margin (book spine side) in cm
 outer: number // Outer margin in cm
 top: number // Top margin in cm
 bottom: number // Bottom margin in cm
 }
 typography: {
 fontSize: number // in pt
 lineHeight: number // multiplier
 charsPerLine: number // approximate
 linesPerPage: number // approximate
 }
}

export const BOOK_FORMATS: Record<string, BookFormat> = {
 DIN_A5: {
 id: 'din-a5',
 name: 'DIN A5',
 displayName: 'DIN A5 (14,8 × 21,0 cm)',
 width: 14.8,
 height: 21.0,
 margins: {
 inner: 2.0,
 outer: 1.5,
 top: 2.0,
 bottom: 2.0,
 },
 typography: {
 fontSize: 11,
 lineHeight: 1.5,
 charsPerLine: 65,
 linesPerPage: 32,
 },
 },
 PAPERBACK_SMALL: {
 id: 'paperback-small',
 name: 'Pocket Book Small',
 displayName: 'Paperback (13,0 × 19,0 cm)',
 width: 13.0,
 height: 19.0,
 margins: {
 inner: 1.8,
 outer: 1.3,
 top: 1.8,
 bottom: 1.8,
 },
 typography: {
 fontSize: 10,
 lineHeight: 1.5,
 charsPerLine: 58,
 linesPerPage: 30,
 },
 },
 PAPERBACK_LARGE: {
 id: 'paperback-large',
 name: 'Large Paperback',
 displayName: 'Large Paperback (13,5 × 21,5 cm)',
 width: 13.5,
 height: 21.5,
 margins: {
 inner: 1.9,
 outer: 1.4,
 top: 2.0,
 bottom: 2.0,
 },
 typography: {
 fontSize: 11,
 lineHeight: 1.5,
 charsPerLine: 60,
 linesPerPage: 33,
 },
 },
}

export const DEFAULT_FORMAT = BOOK_FORMATS.DIN_A5

/**
 * Page represents a single page in the book
 */
export interface BookPage {
 pageNumber: number
 isLeftPage: boolean // true for even pages (left side)
 isRightPage: boolean // true for odd pages (right side)
 chapterIndex: number
 chapterTitle: string
 content: string // text content for this page
 hasChapterStart: boolean // true if this page starts a new chapter
}

/**
 * Layout calculation result
 */
export interface BookLayout {
 format: BookFormat
 pages: BookPage[]
 totalPages: number
 chaptersMap: Map<number, number> // chapter index -> first page number
}

/**
 * Helper function to calculate usable page area
 */
export function getUsablePageDimensions(format: BookFormat): {
 width: number
 height: number
} {
 return {
 width: format.width - format.margins.inner - format.margins.outer,
 height: format.height - format.margins.top - format.margins.bottom,
 }
}

/**
 * Helper function to check if page is left or right
 */
export function isLeftPage(pageNumber: number): boolean {
 return pageNumber % 2 === 0
}

export function isRightPage(pageNumber: number): boolean {
 return pageNumber % 2 === 1
}
