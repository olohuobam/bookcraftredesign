import jsPDF from 'jspdf'
import { Book } from './supabase-db'

/**
 * PDF Generation Service for Lulu Print-on-Demand
 * Generates Lulu-compatible PDFs for cover and interior content
 */
export class LuluPDFGenerator {
 
  /**
   * Generate cover PDF in Lulu-compatible format
   * Uses standard 6" x 9" format with proper margins
   */
 static generateCoverPDF(book: Book): Buffer {
    // Cover dimensions: 6.25" x 9.25" (including bleed)
 const doc = new jsPDF({
 orientation: 'portrait',
 unit: 'in',
 format: [6.25, 9.25]
 })

    // Background color (if needed)
 doc.setFillColor(255, 255, 255)
 doc.rect(0, 0, 6.25, 9.25, 'F')

    // Title - centered and large
 doc.setFontSize(24)
 doc.setFont('helvetica', 'bold')
 const titleLines = doc.splitTextToSize(book.title, 5)
 let yPos = 3
 titleLines.forEach((line: string) => {
 doc.text(line, 3.125, yPos, { align: 'center' })
 yPos += 0.4
 })

    // Author
 if (book.author) {
 doc.setFontSize(16)
 doc.setFont('helvetica', 'normal')
 doc.text(`by ${book.author}`, 3.125, yPos + 0.5, { align: 'center' })
 }

    // Genre
 doc.setFontSize(12)
 doc.text(book.genre, 3.125, 8.5, { align: 'center' })

    // Publisher at bottom
 if (book.publisher) {
 doc.setFontSize(10)
 doc.text(book.publisher, 3.125, 8.8, { align: 'center' })
 }

 const arrayBuffer = doc.output('arraybuffer')
 return Buffer.from(arrayBuffer)
 }

  /**
   * Generate interior PDF in Lulu-compatible format
   * 6" x 9" with proper margins for binding
   */
 static generateInteriorPDF(book: Book): Buffer {
 const doc = new jsPDF({
 orientation: 'portrait',
 unit: 'in',
 format: [6, 9]
 })

 const marginLeft = 0.75 // Left margin for binding
 const marginRight = 0.5 // Right margin
 const marginTop = 0.75 // Top margin
 const contentWidth = 6 - marginLeft - marginRight
 const pageHeight = 9

    // Title page
 doc.setFontSize(24)
 doc.setFont('helvetica', 'bold')
 doc.text(book.title, 3, 3, { align: 'center' })
 
 if (book.author) {
 doc.setFontSize(16)
 doc.text(`by ${book.author}`, 3, 3.8, { align: 'center' })
 }

 doc.setFontSize(12)
 doc.text(`Genre: ${book.genre}`, 3, 4.5, { align: 'center' })

 if (book.publisher) {
 doc.text(book.publisher, 3, 8, { align: 'center' })
 }

    // Copyright page
 doc.addPage()
 doc.setFontSize(10)
 doc.text('Copyright', marginLeft, marginTop)
 let yPos = marginTop + 0.3

 if (book.author) {
 doc.text(` ${book.author}`, marginLeft, yPos)
 yPos += 0.2
 }

 if (book.publication_date) {
 doc.text(`First Publication: ${book.publication_date}`, marginLeft, yPos)
 yPos += 0.2
 }

 if (book.isbn) {
 doc.text(`ISBN: ${book.isbn}`, marginLeft, yPos)
 yPos += 0.2
 }

 doc.text('Erstellt mit Bookcraft', marginLeft, yPos)

    // Description page (if available)
 if (book.description) {
 doc.addPage()
 doc.setFontSize(14)
 doc.setFont('helvetica', 'bold')
 doc.text('About the Book', marginLeft, marginTop)
 
 doc.setFontSize(11)
 doc.setFont('helvetica', 'normal')
 const descriptionLines = doc.splitTextToSize(book.description, contentWidth)
 yPos = marginTop + 0.4
 
 descriptionLines.forEach((line: string) => {
 if (yPos > pageHeight - 0.75) {
 doc.addPage()
 yPos = marginTop
 }
 doc.text(line, marginLeft, yPos)
 yPos += 0.18
 })
 }

    // Table of Contents
 doc.addPage()
 doc.setFontSize(16)
 doc.setFont('helvetica', 'bold')
 doc.text('Table of Contents', marginLeft, marginTop)
 
    // Parse chapters
 const chapters = this.parseChapters(book)
 yPos = marginTop + 0.5
 
 chapters.forEach((chapter, index) => {
 if (yPos > pageHeight - 0.75) {
 doc.addPage()
 yPos = marginTop
 }
 
 doc.setFontSize(11)
 doc.setFont('helvetica', 'normal')
 const chapterTitle = chapter.title.length > 50 
 ? chapter.title.substring(0, 50) + '...' 
 : chapter.title
 
 doc.text(`${index + 1}. ${chapterTitle}`, marginLeft, yPos)
 doc.text(`${chapter.pageNumber}`, 6 - marginRight, yPos, { align: 'right' })
 yPos += 0.25
 })

    // Content chapters
 chapters.forEach((chapter, index) => {
 doc.addPage()
 yPos = marginTop

      // Chapter title
 doc.setFontSize(16)
 doc.setFont('helvetica', 'bold')
 doc.text(`Chapter ${index + 1}`, marginLeft, yPos)
 yPos += 0.3

 if (chapter.title !== `Chapter ${index + 1}`) {
 doc.setFontSize(14)
 doc.text(chapter.title, marginLeft, yPos)
 yPos += 0.4
 } else {
 yPos += 0.2
 }

      // Chapter content
 doc.setFontSize(11)
 doc.setFont('helvetica', 'normal')
 
 const contentLines = doc.splitTextToSize(chapter.content, contentWidth)
 contentLines.forEach((line: string) => {
 if (yPos > pageHeight - 0.75) {
 doc.addPage()
 yPos = marginTop
 }
 doc.text(line, marginLeft, yPos)
 yPos += 0.18
 })
 })

 const arrayBuffer = doc.output('arraybuffer')
 return Buffer.from(arrayBuffer)
 }

  /**
   * Parse book content into structured chapters
   */
 private static parseChapters(book: Book): Array<{title: string, content: string, pageNumber: number}> {
 let chapters = []
 
    // If book has structured chapters_json, use that
 if (book.chapters_json && typeof book.chapters_json === 'object') {
 const chaptersData = Array.isArray(book.chapters_json) 
 ? book.chapters_json 
 : Object.values(book.chapters_json)
 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
 chapters = chaptersData.map((chapter: any, index: number) => ({
 title: chapter.title || chapter.name || `Chapter ${index + 1}`,
 content: chapter.content || chapter.text || '',
 pageNumber: 0 // Will be calculated
 }))
 } else {
      // Parse from content string
 const contentParts = book.content.split(/\n\n---\n\n/).filter(Boolean)
 chapters = contentParts.map((part: string, index: number) => {
 const lines = part.split('\n').filter(line => line.trim())
 const title = lines[0] || `Chapter ${index + 1}`
 const content = lines.slice(1).join('\n')

 return {
 title,
 content,
 pageNumber: 0 // Will be calculated
 }
 })
 }

    // Calculate approximate page numbers (starting after title, copyright, description, TOC)
 let currentPage = 5 // Approximate start page
 chapters.forEach(chapter => {
 chapter.pageNumber = currentPage
      // Rough estimate: 500 characters per page
 const estimatedPages = Math.max(1, Math.ceil(chapter.content.length / 500))
 currentPage += estimatedPages
 })

 return chapters
 }

  /**
   * Get appropriate Lulu product ID based on book characteristics and user selections
   */
 static getLuluProductId(
 book: Book,
 format: string = '6x9',
 paperType: string = 'white',
 coverType: string = 'matte'
 ): string {
    // Map format to size codes
 const formatMap: { [key: string]: string } = {
 '6x9': '0600X0900',
 '5.5x8.5': '0550X0850',
 '8.5x11': '0850X1100',
 '7.5x7.5': '0750X0750'
 }

    // Color type: BW = Black & White, FC = Full Color
 const colorType = book.book_type === 'picture' ? 'FC' : 'BW'

    // Print quality: STD = Standard
 const printQuality = 'STD'

    // Binding: PB = Perfect Bound
 const binding = 'PB'

    // Paper: 060UW444 = 60# Uncoated White 444 PPI, 060UC444 = 60# Uncoated Cream 444 PPI
 const paperCode = paperType === 'cream' ? '060UC444' : '060UW444'

    // Cover finish: M = Matte, G = Gloss
 const coverFinish = coverType === 'gloss' ? 'G' : 'M'

    // Additional codes: XX = no linen, no foil
 const additionalCodes = 'XX'

 const sizeCode = formatMap[format] || '0600X0900'
 const productId = `${sizeCode}${colorType}${printQuality}${binding}${paperCode}${coverFinish}${additionalCodes}`

 return productId
 }

  /**
   * Estimate print cost based on book characteristics and user selections
   * This is a rough estimate - actual costs come from Lulu API
   */
 static estimatePrintCost(
 book: Book,
 format: string = '6x9',
 paperType: string = 'white',
 coverType: string = 'matte'
 ): string {
    // Base prices by format
 const formatPrices: { [key: string]: number } = {
 '6x9': book.book_type === 'picture' ? 6.99 : 5.99,
 '5.5x8.5': book.book_type === 'picture' ? 6.49 : 5.49,
 '8.5x11': book.book_type === 'picture' ? 8.99 : 7.99,
 '7.5x7.5': book.book_type === 'picture' ? 7.99 : 6.99
 }

 const basePrice = formatPrices[format] || formatPrices['6x9']

    // Paper type adjustment
 const paperAdjustment = paperType === 'cream' ? 0.50 : 0

    // Cover type adjustment
 const coverAdjustment = coverType === 'gloss' ? 0.25 : 0

    // Add cost based on page count estimate
 const chapters = this.parseChapters(book)
 const estimatedPages = Math.max(20, chapters.reduce((total, chapter) =>
 total + Math.ceil(chapter.content.length / 500), 0) + 10)

 const pagePrice = book.book_type === 'picture' ? 0.05 : 0.02
 const totalPrice = basePrice + paperAdjustment + coverAdjustment + (estimatedPages * pagePrice)

 return totalPrice.toFixed(2)
 }
}