import { BookFormat, BookPage, BookLayout, isLeftPage, isRightPage } from '@/types/book-formats'

interface Chapter {
 id: string
 title: string
 content: string
 wordCount?: number
}

/**
 * Calculate how many characters fit on a page based on format
 * Using conservative estimates to prevent overflow
 */
function calculateCharsPerPage(format: BookFormat): number {
 const { charsPerLine, linesPerPage } = format.typography

  // Be VERY conservative to prevent overflow
  // Reserve space for:
  // - Page number (1 line)
  // - Header/spacing (2-3 lines)
  // - Paragraph spacing (mb-3 = ~10px per paragraph, ~5-6 lines total)
 const reservedLines = 8
 const usableLines = Math.max(10, linesPerPage - reservedLines)

  // Reduce chars per line to account for indentation and spacing
 const effectiveCharsPerLine = Math.floor(charsPerLine * 0.85)

 return effectiveCharsPerLine * usableLines
}

/**
 * Split text into paragraphs, preserving paragraph structure
 */
function splitIntoParagraphs(text: string): string[] {
 return text
 .split(/\n\n+/)
 .map(p => p.trim())
 .filter(p => p.length > 0)
}

/**
 * Split paragraphs into pages while preserving paragraph integrity
 */
function distributeTextToPages(
 paragraphs: string[],
 charsPerPage: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
 format: BookFormat
): string[] {
 const pages: string[] = []
 let currentPage = ''
 let currentPageChars = 0

 for (const paragraph of paragraphs) {
 const paragraphLength = paragraph.length

    // If paragraph fits on current page
 if (currentPageChars + paragraphLength + 2 <= charsPerPage) {
 if (currentPage) {
 currentPage += '\n\n' + paragraph
 currentPageChars += paragraphLength + 2
 } else {
 currentPage = paragraph
 currentPageChars = paragraphLength
 }
 }
    // If paragraph is too long for a single page, split it
 else if (paragraphLength > charsPerPage * 0.9) {
      // Finish current page if it has content
 if (currentPage) {
 pages.push(currentPage)
 currentPage = ''
 currentPageChars = 0
 }

      // Split long paragraph into multiple pages
 const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph]
 let tempPage = ''
 let tempChars = 0

 for (const sentence of sentences) {
 if (tempChars + sentence.length + 1 <= charsPerPage) {
 tempPage += (tempPage ? ' ' : '') + sentence
 tempChars += sentence.length + 1
 } else {
 if (tempPage) {
 pages.push(tempPage)
 }
 tempPage = sentence
 tempChars = sentence.length
 }
 }

 if (tempPage) {
 currentPage = tempPage
 currentPageChars = tempChars
 }
 }
    // Start new page with this paragraph
 else {
 if (currentPage) {
 pages.push(currentPage)
 }
 currentPage = paragraph
 currentPageChars = paragraphLength
 }
 }

  // Add last page
 if (currentPage) {
 pages.push(currentPage)
 }

 return pages
}

/**
 * Main function to generate book layout from chapters
 */
export function generateBookLayout(
 chapters: Chapter[],
 format: BookFormat
): BookLayout {
 const charsPerPage = calculateCharsPerPage(format)
 const pages: BookPage[] = []
 const chaptersMap = new Map<number, number>()
 let pageNumber = 1

 for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex++) {
 const chapter = chapters[chapterIndex]

    // Chapters should start on right page (odd number)
 if (pageNumber % 2 === 0 && pageNumber > 1) {
      // Add blank left page
 pages.push({
 pageNumber: pageNumber,
 isLeftPage: true,
 isRightPage: false,
 chapterIndex: chapterIndex - 1,
 chapterTitle: chapterIndex > 0 ? chapters[chapterIndex - 1].title : '',
 content: '',
 hasChapterStart: false,
 })
 pageNumber++
 }

    // Remember first page of this chapter
 chaptersMap.set(chapterIndex, pageNumber)

    // Split content into paragraphs
 const paragraphs = splitIntoParagraphs(chapter.content || '')

 if (paragraphs.length === 0) {
      // Empty chapter - add single page with title only
 pages.push({
 pageNumber,
 isLeftPage: isLeftPage(pageNumber),
 isRightPage: isRightPage(pageNumber),
 chapterIndex,
 chapterTitle: chapter.title,
 content: '',
 hasChapterStart: true,
 })
 pageNumber++
 continue
 }

    // Distribute content to pages
 const chapterPages = distributeTextToPages(paragraphs, charsPerPage, format)

 chapterPages.forEach((pageContent, pageIndex) => {
 pages.push({
 pageNumber,
 isLeftPage: isLeftPage(pageNumber),
 isRightPage: isRightPage(pageNumber),
 chapterIndex,
 chapterTitle: chapter.title,
 content: pageContent,
 hasChapterStart: pageIndex === 0,
 })
 pageNumber++
 })
 }

 return {
 format,
 pages,
 totalPages: pages.length,
 chaptersMap,
 }
}

/**
 * Find page number for a specific chapter
 */
export function getChapterStartPage(
 layout: BookLayout,
 chapterIndex: number
): number {
 return layout.chaptersMap.get(chapterIndex) || 1
}

/**
 * Get chapter index for a specific page
 */
export function getChapterForPage(
 layout: BookLayout,
 pageNumber: number
): number {
 const page = layout.pages.find(p => p.pageNumber === pageNumber)
 return page?.chapterIndex || 0
}

/**
 * Navigate to next page, returns new page number or null if at end
 */
export function getNextPage(layout: BookLayout, currentPage: number): number | null {
 if (currentPage >= layout.totalPages) return null
 return currentPage + 1
}

/**
 * Navigate to previous page, returns new page number or null if at start
 */
export function getPreviousPage(layout: BookLayout, currentPage: number): number | null {
 if (currentPage <= 1) return null
 return currentPage - 1
}
