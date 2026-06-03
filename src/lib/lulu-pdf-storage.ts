import { SupabaseDB } from './supabase-db'
import { LuluPDFGenerator } from './lulu-pdf-generator'
import { supabaseAdmin } from './supabase-admin'

/**
 * PDF Storage Service for Lulu Integration
 * Handles PDF generation, storage, and URL management
 */
export class LuluPDFStorage {
 
  /**
   * Generate and store PDFs for a book
   */
 static async generateAndStorePDFs(bookId: string, userId: string): Promise<{
 coverUrl: string,
 interiorUrl: string
 }> {
    // Get book data
 const book = await SupabaseDB.getBookById(bookId, userId)
 if (!book) {
 throw new Error('Book not found')
 }

 try {
      // Generate PDFs
 const coverPDF = LuluPDFGenerator.generateCoverPDF(book)
 const interiorPDF = LuluPDFGenerator.generateInteriorPDF(book)

      // Store PDFs and get URLs
 const coverUrl = await this.storePDF(coverPDF, `${bookId}_cover.pdf`, 'cover', userId)
 const interiorUrl = await this.storePDF(interiorPDF, `${bookId}_interior.pdf`, 'interior', userId)

      // Update book record with PDF URLs
 await SupabaseDB.updateBook(bookId, {
 cover_pdf_url: coverUrl,
 interior_pdf_url: interiorUrl,
 pdf_generated_at: new Date().toISOString()
 })

 return { coverUrl, interiorUrl }
 } catch (error) {
      console.error('Error generating PDFs:', error)
 throw new Error('Failed to generate PDFs for book')
 }
 }

  /**
   * Store PDF buffer and return public URL
   */
 private static async storePDF(pdfBuffer: Buffer, filename: string, type: 'cover' | 'interior', userId: string): Promise<string> {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

    // Create user-specific path to ensure privacy
 const filePath = `${userId}/${type}/${filename}`

 const { data, error } = await supabaseAdmin.storage
 .from('book-pdfs')
 .upload(filePath, pdfBuffer, {
 contentType: 'application/pdf',
 upsert: true
 })

 if (error) {
      console.error('Error uploading PDF to storage:', error)
 throw new Error(`Failed to store ${type} PDF: ${error.message}`)
 }

 const { data: { publicUrl } } = supabaseAdmin.storage
 .from('book-pdfs')
 .getPublicUrl(data.path)

 return publicUrl
 }

  /**
   * Check if book has valid PDFs for printing
   */
 static async hasValidPDFs(bookId: string, userId: string): Promise<boolean> {
 const book = await SupabaseDB.getBookById(bookId, userId)
 if (!book) return false
 
 return !!(book.cover_pdf_url && book.interior_pdf_url)
 }

  /**
   * Get PDF URLs for a book, generating them if they don't exist
   */
 static async getPDFUrls(bookId: string, userId: string): Promise<{
 coverUrl: string,
 interiorUrl: string
 }> {
 const book = await SupabaseDB.getBookById(bookId, userId)
 if (!book) {
 throw new Error('Book not found')
 }

    // If PDFs already exist and are recent (less than 7 days old), use them
 if (book.cover_pdf_url && book.interior_pdf_url && book.pdf_generated_at) {
 const generatedAt = new Date(book.pdf_generated_at)
 const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
 
 if (generatedAt > sevenDaysAgo) {
 return {
 coverUrl: book.cover_pdf_url,
 interiorUrl: book.interior_pdf_url
 }
 }
 }

    // Generate new PDFs
 return await this.generateAndStorePDFs(bookId, userId)
 }

  /**
   * Validate PDFs for Lulu compatibility
   * This would typically make API calls to Lulu's validation endpoints
   */
 static async validatePDFs(coverUrl: string, interiorUrl: string): Promise<{
 coverValid: boolean,
 interiorValid: boolean,
 errors: string[]
 }> {
 const errors: string[] = []
 let coverValid = true
 let interiorValid = true

 try {
      // Basic validation - in production, you would use Lulu's validation API
 if (!coverUrl || coverUrl === '') {
 coverValid = false
 errors.push('Cover PDF URL is required')
 }

 if (!interiorUrl || interiorUrl === '') {
 interiorValid = false
 errors.push('Interior PDF URL is required')
 }

      // Additional validation could include:
      // - File size limits
      // - Resolution requirements
      // - Color space validation
      // - Page count limits
 
 return {
 coverValid,
 interiorValid,
 errors
 }
 } catch (error) {
 return {
 coverValid: false,
 interiorValid: false,
 errors: ['Validation failed: ' + (error as Error).message]
 }
 }
 }
}