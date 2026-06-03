import { supabaseAdmin } from './supabase-admin'
import type { Language } from './translations'

// ====================================
// Shared Types
// ====================================

export interface ChapterData {
 number: number
 title: string
 content: string
 image?: string
}

export interface ShippingAddress {
 name: string
 street1: string
 street2?: string
 city: string
 state_code?: string
 country_code: string
 postcode: string
 phone_number?: string
}

export interface PrintJobLineItem {
 external_id?: string
 print_cost?: string
 product_id?: string
 quantity?: number
 title?: string
 status?: string
 print_option?: string
 [key: string]: unknown
}

export interface WebhookUpdate {
 timestamp?: string
 event_type?: string
 status?: string
 received_at?: string
 data?: Record<string, unknown>
 [key: string]: unknown
}

export interface BookGenerationConfig {
 title?: string
 genre?: string
 description?: string
 chapters?: number
 style?: string
 targetAudience?: string
 bookType?: string
 totalPages?: number
 imagesPerPage?: number
 imageStyle?: string
}

// ====================================
// Database Types
// ====================================
export interface Profile {
 id?: string
 name?: string
 email: string
 email_verified?: string
 image?: string
 bio?: string
 language?: Language
 theme?: string
 email_notifications?: boolean
 push_notifications?: boolean
 weekly_report?: boolean
 book_completion_alert?: boolean
 has_completed_onboarding?: boolean
 credits?: number
 cover_generation_credits?: number // 3 free cover generations, then 0.99€ per cover
 created_at?: string
 updated_at?: string
}

export interface Book {
 id?: string
 title: string
 genre: string
 description: string
 content: string
 chapters: number
 style: string
 target_audience: string
 book_type?: 'text' | 'picture' | 'production'
 book_subtype?: 'photobook'
 user_id: string
 status?: 'draft' | 'generating' | 'processing' | 'completed' | 'error' | 'preview'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
 images?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
 chapters_json?: any
 cover_image?: string
 back_cover_image?: string
 back_cover_text?: string
 author?: string
 publisher?: string
 isbn?: string
 publication_date?: string
 purchased?: boolean
 purchased_at?: string
 ai_generated?: boolean
 active_job_id?: string | null
 is_favorite?: boolean
 is_public?: boolean
 view_count?: number
 cover_pdf_url?: string
 interior_pdf_url?: string
 pdf_generated_at?: string
 word_count?: number
 created_at?: string
 updated_at?: string
}

export interface GeneratedImage {
 id?: string
 user_id: string
 book_id?: string
 chapter_index?: number
 page_key?: string
 style?: string
 prompt?: string
 url: string
 width?: number
 height?: number
 created_at?: string
 updated_at?: string
}

export interface PrintJob {
 id?: string
 user_id: string
 book_id: string
 lulu_print_job_id: string
 external_id: string
 status: string
 total_cost_incl_tax?: string
 shipping_address: ShippingAddress | Record<string, unknown>
 shipping_level: string
 line_items: PrintJobLineItem[]
 product_id?: string
 print_job_data?: Record<string, unknown>
 webhook_updates?: WebhookUpdate[]
 quantity?: number
 tracking_number?: string
 tracking_url?: string
 carrier?: string
 estimated_delivery_date?: string
 payment_intent_id?: string
 payment_status?: string
 payment_amount?: number
 created_at?: string
 updated_at?: string
}

export interface BookGenerationJob {
 id?: string
 user_id: string
 book_id?: string
 status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'retrying' | 'preview_completed'
 progress: number
 current_step?: string
 config: BookGenerationConfig | Record<string, unknown>
 error_message?: string
 n8n_execution_id?: string
 metadata?: string
  // Timeout and retry tracking
 last_heartbeat_at?: string
 retry_count?: number
 created_at?: string
 updated_at?: string
 completed_at?: string
}

export interface SavedAddress {
 id?: string
 user_id: string
 label: string
 name: string
 street1: string
 street2?: string
 city: string
 state_code?: string
 country_code: string
 postcode: string
 phone_number: string
 is_default?: boolean
 created_at?: string
 updated_at?: string
}

// Media Library Item for reusable photo uploads
export interface MediaLibraryItem {
 id?: string
 user_id: string
 original_filename: string
 url: string
 storage_path?: string
 storage_type: 'supabase' | 'base64' | 'local'
 thumbnail_url?: string
 file_size?: number
 mime_type?: string
 width?: number
 height?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
 analysis?: any
 analysis_status: 'pending' | 'analyzing' | 'completed' | 'failed'
 analyzed_with?: string
 tags?: string[]
 folder?: string
 created_at?: string
 updated_at?: string
}

// Database operations class
export class SupabaseDB {
 
  // User/Profile operations
 static async createProfile(profile: Profile) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

    // Use upsert to avoid conflicts if user already exists
 const { data, error } = await supabaseAdmin
 .from('users')
 .upsert([profile], {
 onConflict: 'id',
 ignoreDuplicates: false
 })
 .select()
 .single()

 if (error) throw error
 return data
 }

 static async getProfile(userId: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('users')
 .select('*')
 .eq('id', userId)
 .single()

    // Handle "not found" error - return null instead of throwing
 if (error && error.code === 'PGRST116') {
 return null
 }
 if (error) throw error
 return data
 }

 static async updateProfile(userId: string, updates: Partial<Profile>) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('users')
 .update(updates)
 .eq('id', userId)
 .select()
 .single()

 if (error) throw error
 return data
 }

 static async findUserByEmail(email: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('users')
 .select('*')
 .eq('email', email)
 .single()

    // Handle "not found" error - return null instead of throwing
 if (error && error.code === 'PGRST116') {
 return null
 }
 if (error) throw error
 return data
 }

 static async deleteProfile(userId: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('users')
 .delete()
 .eq('id', userId)
 .select()

 if (error) throw error
 return data
 }

  // Book operations
 static async createBook(book: Omit<Book, 'id' | 'created_at' | 'updated_at'>) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }
 
 const { data, error } = await supabaseAdmin
 .from('books')
 .insert([book])
 .select()
 .single()
 
 if (error) throw error
 return data
 }
 
 static async getBook(bookId: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }
 
 const { data, error } = await supabaseAdmin
 .from('books')
 .select('*')
 .eq('id', bookId)
 .single()
 
    // Handle "not found" error - return null instead of throwing
 if (error && error.code === 'PGRST116') {
 return null
 }
 if (error) throw error
 return data
 }
 
 static async getUserBooks(
 userId: string,
 filter?: { purchased?: boolean },
 limit?: number
 ): Promise<Book[]> {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }
 
    // PERFORMANCE FIX: Only select fields needed for list view
    // Exclude large JSONB fields (images, chapters_json, content)
 let query = supabaseAdmin
 .from('books')
 .select(`
 id,
 title,
 genre,
 description,
 chapters,
 style,
 target_audience,
 book_type,
 user_id,
 status,
 cover_image,
 back_cover_image,
 back_cover_text,
 author,
 publisher,
 isbn,
 publication_date,
 purchased,
 ai_generated,
 active_job_id,
 cover_pdf_url,
 interior_pdf_url,
 pdf_generated_at,
 word_count,
 created_at,
 updated_at,
 stripe_charge_id,
 stripe_payment_intent_id,
 purchase_price_cents,
 purchase_currency,
 purchased_at
 `)
 .eq('user_id', userId)
 
 if (filter?.purchased !== undefined) {
 query = query.eq('purchased', filter.purchased)
 }
 
 query = query.order('created_at', { ascending: false })
 
 if (limit) {
 query = query.limit(limit)
 }
 
 const { data, error } = await query
 
 if (error) throw error
 return (data ?? []) as Book[]
 }

 /**
  * Count a user's existing photobooks, identified by the dedicated
  * book_subtype = 'photobook' marker.
  */
 static async countUserPhotobooks(userId: string): Promise<number> {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { count, error } = await supabaseAdmin
 .from('books')
 .select('id', { count: 'exact', head: true })
 .eq('user_id', userId)
 .eq('book_subtype', 'photobook')

 if (error) throw error
 return count ?? 0
 }

 static async getAllBooks() {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }
 
    // PERFORMANCE FIX: Only select fields needed for list view
    // Exclude large JSONB fields (images, chapters_json, content)
 const { data, error } = await supabaseAdmin
 .from('books')
 .select(`
 id,
 title,
 genre,
 description,
 chapters,
 style,
 target_audience,
 book_type,
 user_id,
 status,
 cover_image,
 back_cover_image,
 back_cover_text,
 author,
 publisher,
 isbn,
 publication_date,
 purchased,
 ai_generated,
 active_job_id,
 cover_pdf_url,
 interior_pdf_url,
 pdf_generated_at,
 word_count,
 created_at,
 updated_at,
 stripe_charge_id,
 stripe_payment_intent_id,
 purchase_price_cents,
 purchase_currency,
 purchased_at
 `)
 .order('created_at', { ascending: false })
 
 if (error) throw error
 return data || []
 }
 
 static async getPublicBooks(options?: {
 genre?: string
 sortBy?: 'newest' | 'popular'
 limit?: number
 search?: string
 language?: string
 userId?: string
 }): Promise<Book[]> {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 let query = supabaseAdmin
 .from('books')
 .select(`
 id,
 title,
 genre,
 description,
 chapters,
 style,
 target_audience,
 book_type,
 user_id,
 status,
 cover_image,
 back_cover_image,
 author,
 ai_generated,
 is_public,
 view_count,
 created_at,
 updated_at
 `)
 .eq('is_public', true)

 if (options?.userId) {
  query = query.eq('user_id', options.userId)
 }

 if (options?.genre && options.genre !== 'Alle') {
 query = query.eq('genre', options.genre)
 }

 if (options?.search) {
 query = query.ilike('title', `%${options.search}%`)
 }

 if (options?.sortBy === 'popular') {
 query = query.order('view_count', { ascending: false })
 } else {
 query = query.order('created_at', { ascending: false })
 }

 if (options?.limit) {
 query = query.limit(options.limit)
 }

 const { data, error } = await query
 if (error) throw error
 return (data ?? []) as Book[]
 }

 static async incrementBookViewCount(bookId: string): Promise<void> {
 if (!supabaseAdmin) return
 await supabaseAdmin.rpc('increment_book_view_count', { book_id: bookId }).throwOnError()
 }

 static async updateBook(bookId: string, updates: Partial<Book>) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }
 
 const { data, error } = await supabaseAdmin
 .from('books')
 .update(updates)
 .eq('id', bookId)
 .select()
 .single()
 
 if (error) throw error
 return data
 }
 
 static async deleteBook(bookId: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }
 
 const { data, error } = await supabaseAdmin
 .from('books')
 .delete()
 .eq('id', bookId)
 .select()
 .single()
 
 if (error) throw error
 return data
 }

  // Generated Image operations
 static async createGeneratedImage(image: Omit<GeneratedImage, 'id' | 'created_at' | 'updated_at'>) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }
 
 const { data, error } = await supabaseAdmin
 .from('generated_images')
 .insert([image])
 .select()
 .single()
 
 if (error) throw error
 return data
 }
 
 static async getGeneratedImage(imageId: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }
 
 const { data, error } = await supabaseAdmin
 .from('generated_images')
 .select('*')
 .eq('id', imageId)
 .single()
 
 if (error) throw error
 return data
 }
 
 static async getUserGeneratedImages(userId: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }
 
 const { data, error } = await supabaseAdmin
 .from('generated_images')
 .select('*')
 .eq('user_id', userId)
 .order('created_at', { ascending: false })
 
 if (error) throw error
 return data || []
 }
 
 static async getBookGeneratedImages(bookId: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }
 
 const { data, error } = await supabaseAdmin
 .from('generated_images')
 .select('*')
 .eq('book_id', bookId)
 .order('chapter_index', { ascending: true })
 
 if (error) throw error
 return data || []
 }
 
 static async updateGeneratedImage(imageId: string, updates: Partial<GeneratedImage>) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }
 
 const { data, error } = await supabaseAdmin
 .from('generated_images')
 .update(updates)
 .eq('id', imageId)
 .select()
 .single()
 
 if (error) throw error
 return data
 }
 
 static async deleteGeneratedImage(imageId: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }
 
 const { data, error } = await supabaseAdmin
 .from('generated_images')
 .delete()
 .eq('id', imageId)
 .select()
 .single()
 
 if (error) throw error
 return data
 }

  // Print Job operations
 static async createPrintJob(printJob: Omit<PrintJob, 'id' | 'created_at' | 'updated_at'>) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }
 
 const { data, error } = await supabaseAdmin
 .from('print_jobs')
 .insert(printJob)
 .select()
 .single()
 
 if (error) throw error
 return data
 }

 static async getPrintJob(printJobId: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }
 
 const { data, error } = await supabaseAdmin
 .from('print_jobs')
 .select('*')
 .eq('id', printJobId)
 .single()
 
 if (error && error.code === 'PGRST116') {
 return null
 }
 if (error) throw error
 return data
 }

 static async getPrintJobByExternalId(externalId: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('print_jobs')
 .select('*')
 .eq('external_id', externalId)
 .maybeSingle()

 if (error) throw error
 return data
 }

 static async getPrintJobByLuluId(luluPrintJobId: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }
 
 const { data, error } = await supabaseAdmin
 .from('print_jobs')
 .select('*')
 .eq('lulu_print_job_id', luluPrintJobId)
 .single()
 
 if (error && error.code === 'PGRST116') {
 return null
 }
 if (error) throw error
 return data
 }

 static async getUserPrintJobs(userId: string, limit?: number): Promise<PrintJob[]> {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }
 
 let query = supabaseAdmin
 .from('print_jobs')
 .select(`
        *,
 books:book_id (
 id,
 title,
 author,
 book_type,
 cover_image
 )
 `)
 .eq('user_id', userId)
 .order('created_at', { ascending: false })
 
 if (limit) {
 query = query.limit(limit)
 }
 
 const { data, error } = await query
 
 if (error) throw error
 return (data ?? []) as PrintJob[]
 }

 static async updatePrintJob(printJobId: string, updates: Partial<PrintJob>) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }
 
 const { data, error } = await supabaseAdmin
 .from('print_jobs')
 .update(updates)
 .eq('id', printJobId)
 .select()
 .single()
 
 if (error) throw error
 return data
 }

 static async updatePrintJobByLuluId(luluPrintJobId: string, updates: Partial<PrintJob>) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }
 
 const { data, error } = await supabaseAdmin
 .from('print_jobs')
 .update(updates)
 .eq('lulu_print_job_id', luluPrintJobId)
 .select()
 .single()
 
 if (error) throw error
 return data
 }

 static async addWebhookUpdate(luluPrintJobId: string, webhookData: Record<string, unknown>) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }
 
    // Get current print job
 const printJob = await this.getPrintJobByLuluId(luluPrintJobId)
 if (!printJob) {
 throw new Error('Print job not found')
 }
 
    // Add new webhook update to the array
 const currentUpdates = printJob.webhook_updates || []
 const updatedWebhooks = [...currentUpdates, {
 ...webhookData,
 received_at: new Date().toISOString()
 }]
 
    // Update the print job
 return await this.updatePrintJobByLuluId(luluPrintJobId, {
 webhook_updates: updatedWebhooks,
 status: webhookData.status || printJob.status
 })
 }

  // Alias methods for compatibility
 static async getUserByEmail(email: string) {
 return this.findUserByEmail(email)
 }
 
 static async createUser(userData: { email: string; name: string }) {
 return this.createProfile({
 id: '', // Will be set by Supabase
 email: userData.email,
 name: userData.name
 })
 }
 
 static async getBookById(bookId: string, userId?: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }
 
 let query = supabaseAdmin
 .from('books')
 .select('*')
 .eq('id', bookId)
 
 if (userId) {
 query = query.eq('user_id', userId)
 }
 
 const { data, error } = await query.single()
 
    // Handle "not found" error - return null instead of throwing
 if (error && error.code === 'PGRST116') {
 return null
 }
 if (error) throw error
 return data
 }
 
  // Mark a book as purchased (with Stripe Payment Intent reference)
 static async markBookAsPurchased(
 bookId: string, 
 userId: string,
 stripePaymentIntentId?: string
 ) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }
 
 const updateData: Record<string, unknown> = {
 purchased: true,
 purchased_at: new Date().toISOString()
 }

    // Link to Stripe Payment Intent (foreign table)
 if (stripePaymentIntentId) {
 updateData.stripe_payment_intent_id = stripePaymentIntentId
 }
 
 const { data, error } = await supabaseAdmin
 .from('books')
 .update(updateData)
 .eq('id', bookId)
 .eq('user_id', userId)
 .select()
 .single()
 
 if (error) throw error
 return data
 }

  // Get book with Stripe payment details (joins with foreign table)
 static async getBookWithPaymentDetails(bookId: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }
 
    // Query book
 const { data: book, error: bookError } = await supabaseAdmin
 .from('books')
 .select('*')
 .eq('id', bookId)
 .single()
 
 if (bookError) throw bookError
 if (!book) return null
 
    // If book has payment intent, fetch Stripe details
 if (book.stripe_payment_intent_id) {
 const { data: paymentIntent, error: stripeError } = await supabaseAdmin
 .from('stripe_payment_intents')
 .select('id, amount, currency, created, attrs')
 .eq('id', book.stripe_payment_intent_id)
 .single()
 
      // Don't throw on Stripe error - book data is more important
 if (!stripeError && paymentIntent) {
 return {
 ...book,
 stripe_payment: {
 id: paymentIntent.id,
 amount: paymentIntent.amount,
 currency: paymentIntent.currency,
 status: paymentIntent.attrs?.status || 'unknown', // Extract from JSON attrs
 created: paymentIntent.created,
 receipt_email: paymentIntent.attrs?.receipt_email,
            // Add more fields as needed
 }
 }
 }
 }
 
 return book
 }

  // Get user's payment history (joins with Stripe foreign table)
 static async getUserPaymentHistory(userId: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }
 
    // Get all purchased books with payment details
 const { data, error } = await supabaseAdmin
 .from('books')
 .select(`
 id,
 title,
 genre,
 purchased,
 purchased_at,
 stripe_payment_intent_id
 `)
 .eq('user_id', userId)
 .eq('purchased', true)
 .order('purchased_at', { ascending: false })
 
 if (error) throw error
 
    // Enrich with Stripe payment details
 const enrichedData = await Promise.all(
 (data || []).map(async (book: Book & { stripe_payment_intent_id?: string }) => {
 if (!book.stripe_payment_intent_id) return book
 
 const { data: paymentIntent } = await supabaseAdmin
 .from('stripe_payment_intents')
 .select('id, amount, currency, attrs')
 .eq('id', book.stripe_payment_intent_id)
 .single()
 
 return {
 ...book,
 payment: paymentIntent ? {
 ...paymentIntent,
 status: paymentIntent.attrs?.status || 'unknown' // Extract from JSON attrs
 } : null
 }
 })
 )
 
 return enrichedData
 }
 
  // Utility functions
 static async upsertGeneratedImage(
 userId: string,
 bookId: string,
 pageKey: string,
 image: Partial<GeneratedImage>
 ) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('generated_images')
 .upsert([
 {
 user_id: userId,
 book_id: bookId,
 page_key: pageKey,
 ...image
 }
 ], {
 onConflict: 'user_id,book_id,page_key'
 })
 .select()
 .single()

 if (error) throw error
 return data
 }

  // Book Generation Job operations
 static async createBookGenerationJob(job: Omit<BookGenerationJob, 'id' | 'created_at' | 'updated_at' | 'completed_at'>) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('book_generation_jobs')
 .insert([job])
 .select()
 .single()

 if (error) throw error
 return data as BookGenerationJob
 }

 static async getBookGenerationJob(jobId: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('book_generation_jobs')
 .select('*')
 .eq('id', jobId)
 .single()

 if (error && error.code === 'PGRST116') {
 return null
 }
 if (error) throw error
 return data as BookGenerationJob
 }

 static async getUserBookGenerationJobs(userId: string, limit?: number): Promise<BookGenerationJob[]> {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 let query = supabaseAdmin
 .from('book_generation_jobs')
 .select('*')
 .eq('user_id', userId)
 .order('created_at', { ascending: false })

 if (limit) {
 query = query.limit(limit)
 }

 const { data, error } = await query

 if (error) throw error
 return (data ?? []) as BookGenerationJob[]
 }

 static async updateBookGenerationJob(jobId: string, updates: Partial<BookGenerationJob>) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('book_generation_jobs')
 .update(updates)
 .eq('id', jobId)
 .select()
 .single()

 if (error) throw error
 return data as BookGenerationJob
 }

 static async deleteBookGenerationJob(jobId: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('book_generation_jobs')
 .delete()
 .eq('id', jobId)
 .select()
 .single()

 if (error) throw error
 return data
 }

  // Get active (non-completed) jobs for a user
 static async getUserActiveJobs(userId: string): Promise<BookGenerationJob[]> {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('book_generation_jobs')
 .select('*')
 .eq('user_id', userId)
 .in('status', ['pending', 'processing'])
 .order('created_at', { ascending: false })

 if (error) throw error
 return (data ?? []) as BookGenerationJob[]
 }

  // Get ALL jobs for a user (regardless of status)
 static async getAllUserJobs(userId: string): Promise<BookGenerationJob[]> {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('book_generation_jobs')
 .select('*')
 .eq('user_id', userId)
 .order('created_at', { ascending: false })

 if (error) throw error
 return (data ?? []) as BookGenerationJob[]
 }

  // Delete ALL jobs for a user AND books with error/generating status
 static async deleteAllUserJobs(userId: string): Promise<{ deletedCount: number; deletedBooksCount: number }> {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

    // First get all jobs to know how many we're deleting
 const { data: jobs, error: fetchError } = await supabaseAdmin
 .from('book_generation_jobs')
 .select('id, book_id')
 .eq('user_id', userId)

 if (fetchError) throw fetchError

 const jobCount = jobs?.length || 0

    // Get all books with error/generating/processing status to delete them
 const { data: booksToDelete, error: booksError } = await supabaseAdmin
 .from('books')
 .select('id')
 .eq('user_id', userId)
 .in('status', ['error', 'generating', 'processing', 'pending'])

 if (booksError) {
      console.error('Error fetching books to delete:', booksError)
 }

 const bookIdsToDelete = booksToDelete?.map((b: { id: string }) => b.id) || []

    // Delete all jobs first
 if (jobCount > 0) {
 const { error: deleteJobsError } = await supabaseAdmin
 .from('book_generation_jobs')
 .delete()
 .eq('user_id', userId)

 if (deleteJobsError) throw deleteJobsError
 }

    // Delete books with error/generating status
 let deletedBooksCount = 0
 if (bookIdsToDelete.length > 0) {
 const { error: deleteBooksError } = await supabaseAdmin
 .from('books')
 .delete()
 .in('id', bookIdsToDelete)

 if (deleteBooksError) {
        console.error('Error deleting books:', deleteBooksError)
 } else {
 deletedBooksCount = bookIdsToDelete.length
 }
 }

 return { deletedCount: jobCount, deletedBooksCount }
 }

  // Get active job for a specific book
 static async getBookActiveJob(bookId: string): Promise<BookGenerationJob | null> {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('book_generation_jobs')
 .select('*')
 .eq('book_id', bookId)
 .in('status', ['pending', 'processing'])
 .order('created_at', { ascending: false })
 .limit(1)
 .maybeSingle()

 if (error) throw error
 return data as BookGenerationJob | null
 }

  // Get the latest job for a specific book (any status)
  // Used for fetching images from book_images table for completed picture books
 static async getLatestBookJob(bookId: string): Promise<BookGenerationJob | null> {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('book_generation_jobs')
 .select('*')
 .eq('book_id', bookId)
 .order('created_at', { ascending: false })
 .limit(1)
 .maybeSingle()

 if (error) throw error
 return data as BookGenerationJob | null
 }

  /**
   * Get jobs that have exceeded the hard timeout threshold
   * Used by the cron job to automatically fail stale jobs
   *
   * @param timeoutSeconds - Maximum allowed job duration in seconds (default 45 minutes)
   * @returns Array of timed-out jobs
   */
 static async getTimedOutJobs(timeoutSeconds: number = 45 * 60): Promise<BookGenerationJob[]> {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

    // Calculate the cutoff time
 const cutoffTime = new Date(Date.now() - timeoutSeconds * 1000).toISOString()

 const { data, error } = await supabaseAdmin
 .from('book_generation_jobs')
 .select('*')
 .in('status', ['pending', 'processing', 'retrying'])
 .lt('created_at', cutoffTime)
 .order('created_at', { ascending: true })

 if (error) throw error
 return (data ?? []) as BookGenerationJob[]
 }

  /**
   * Atomically update a single image in the book's images array
   * This prevents race conditions when multiple webhook updates arrive simultaneously
   *
   * @param bookId - The book ID
   * @param flatIndex - The flat index in the images array
   * @param imageUrl - The image URL to set
   * @param imagesPerPage - Number of images per page (for array sizing)
   * @returns The updated book
   */
 static async atomicUpdateBookImage(
 bookId: string,
 flatIndex: number,
 imageUrl: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
 _imagesPerPage: number = 1
 ) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

    // First, get the current book to check if images array needs initialization
 const book = await this.getBook(bookId)
 if (!book) {
 throw new Error('Book not found')
 }

    // Parse existing images array
 let imagesArray: string[] = []
 if (book.images) {
 try {
 imagesArray = Array.isArray(book.images) ? book.images : JSON.parse(book.images as unknown as string)
 } catch (e) {
        console.error('Error parsing existing images:', e)
 imagesArray = []
 }
 }

    // Ensure array is large enough
 while (imagesArray.length <= flatIndex) {
 imagesArray.push('')
 }

    // Update the specific image
 imagesArray[flatIndex] = imageUrl

    // Use atomic update with retry logic
 let retries = 3
 while (retries > 0) {
 try {
 const { data, error } = await supabaseAdmin
 .from('books')
 .update({ images: imagesArray })
 .eq('id', bookId)
 .select()
 .single()

 if (error) {
          // If it's a conflict error, retry
 if (error.code === '409' || error.message.includes('conflict')) {
 retries--
 if (retries > 0) {
              console.warn(`Image update conflict for book ${bookId}, retrying... (${retries} attempts left)`)
              // Wait a bit before retrying
 await new Promise(resolve => setTimeout(resolve, 100))

              // Re-fetch the book to get the latest state
 const updatedBook = await this.getBook(bookId)
 if (updatedBook && updatedBook.images) {
 imagesArray = Array.isArray(updatedBook.images)
 ? updatedBook.images
 : JSON.parse(updatedBook.images as unknown as string)

                // Re-apply our update
 while (imagesArray.length <= flatIndex) {
 imagesArray.push('')
 }
 imagesArray[flatIndex] = imageUrl
 }
 continue
 }
 }
 throw error
 }

 return data
 } catch (e) {
 if (retries === 0) throw e
 retries--
 }
 }

 throw new Error('Failed to update book image after retries')
 }

  // Saved Address operations
 static async createSavedAddress(address: Omit<SavedAddress, 'id' | 'created_at' | 'updated_at'>) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

    // If this is set as default, unset other defaults first
 if (address.is_default) {
 await supabaseAdmin
 .from('saved_addresses')
 .update({ is_default: false })
 .eq('user_id', address.user_id)
 }

 const { data, error } = await supabaseAdmin
 .from('saved_addresses')
 .insert([address])
 .select()
 .single()

 if (error) throw error
 return data
 }

 static async getUserSavedAddresses(userId: string): Promise<SavedAddress[]> {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('saved_addresses')
 .select('*')
 .eq('user_id', userId)
 .order('is_default', { ascending: false })
 .order('created_at', { ascending: false })

 if (error) throw error
 return (data ?? []) as SavedAddress[]
 }

 static async getSavedAddress(addressId: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('saved_addresses')
 .select('*')
 .eq('id', addressId)
 .single()

 if (error && error.code === 'PGRST116') {
 return null
 }
 if (error) throw error
 return data
 }

 static async updateSavedAddress(addressId: string, updates: Partial<SavedAddress>) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

    // If setting as default, unset other defaults first
 if (updates.is_default) {
 const address = await this.getSavedAddress(addressId)
 if (address) {
 await supabaseAdmin
 .from('saved_addresses')
 .update({ is_default: false })
 .eq('user_id', address.user_id)
 }
 }

 const { data, error } = await supabaseAdmin
 .from('saved_addresses')
 .update(updates)
 .eq('id', addressId)
 .select()
 .single()

 if (error) throw error
 return data
 }

 static async deleteSavedAddress(addressId: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('saved_addresses')
 .delete()
 .eq('id', addressId)
 .select()
 .single()

 if (error) throw error
 return data
 }

 static async getDefaultAddress(userId: string): Promise<SavedAddress | null> {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('saved_addresses')
 .select('*')
 .eq('user_id', userId)
 .eq('is_default', true)
 .maybeSingle()

 if (error) throw error
 return data as SavedAddress | null
 }

  // ====================================
  // IN-APP PURCHASE OPERATIONS
  // ====================================

 static async createIAPPurchase(purchase: {
 user_id: string
 book_id: string
 product_id: string
 transaction_id: string
 provider: 'android' | 'ios'
 receipt_data?: string
 validation_response?: Record<string, unknown>
 credits_granted: number
 status: 'pending' | 'completed' | 'failed' | 'refunded'
 }) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('iap_purchases')
 .insert([{
 ...purchase,
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 }])
 .select()
 .single()

 if (error) throw error
 return data
 }

 static async getIAPPurchaseByTransactionId(transactionId: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('iap_purchases')
 .select('*')
 .eq('transaction_id', transactionId)
 .maybeSingle()

 if (error) throw error
 return data
 }

 static async getUserIAPPurchases(userId: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('iap_purchases')
 .select('*')
 .eq('user_id', userId)
 .order('created_at', { ascending: false })

 if (error) throw error
 return data || []
 }

  // ====================================
  // BOOK IMAGES OPERATIONS (for picture books)
  // ====================================

  /**
   * Get all images for a book generation job from the book_images table
   * This is used for picture book workflows where images are stored during generation
   *
   * @param jobId - The job ID (UUID)
   * @returns Array of book images ordered by page_number and panel_index
   */
 static async getBookImagesByJobId(jobId: string): Promise<{
 id: string
 job_id: string
 page_number: number
 panel_index: number
 image_url: string | null
 image_prompt: string | null
 page_text: string | null
 created_at: string
 }[]> {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('book_images')
 .select('*')
 .eq('job_id', jobId)
 .order('page_number', { ascending: true })
 .order('panel_index', { ascending: true })

 if (error) throw error
 return data || []
 }

  /**
   * Get a specific image by job_id, page_number, and panel_index
   *
   * @param jobId - The job ID (UUID)
   * @param pageNumber - The page number (1-indexed)
   * @param panelIndex - The panel index (0-indexed)
   * @returns The book image or null
   */
 static async getBookImage(jobId: string, pageNumber: number, panelIndex: number) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('book_images')
 .select('*')
 .eq('job_id', jobId)
 .eq('page_number', pageNumber)
 .eq('panel_index', panelIndex)
 .maybeSingle()

 if (error) throw error
 return data
 }

  /**
   * Create or update a book image entry
   *
   * @param imageData - The image data to upsert
   * @returns The created/updated book image
   */
 static async upsertBookImage(imageData: {
 job_id: string
 page_number: number
 panel_index: number
 image_url?: string | null
 image_prompt?: string | null
 page_text?: string | null
 }) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('book_images')
 .upsert([imageData], {
 onConflict: 'job_id,page_number,panel_index'
 })
 .select()
 .single()

 if (error) throw error
 return data
 }

  /**
   * Resolve book_images references to actual URLs
   * Takes a string like "book_images:jobId:pageNumber:panelIndex" and returns the actual URL
   *
   * @param reference - The reference string
   * @returns The actual image URL or null
   */
 static async resolveBookImageReference(reference: string): Promise<string | null> {
 if (!reference.startsWith('book_images:')) {
 return reference // Not a reference, return as-is
 }

 const parts = reference.split(':')
 if (parts.length !== 4) {
      console.warn('Invalid book_images reference format:', reference)
 return null
 }

 const [, jobId, pageNumber, panelIndex] = parts
 const image = await this.getBookImage(jobId, parseInt(pageNumber), parseInt(panelIndex))
 return image?.image_url || null
 }

  // ====================================
  // MEDIA LIBRARY OPERATIONS
  // ====================================

  /**
   * Create a new media library item
   */
 static async createMediaLibraryItem(item: Omit<MediaLibraryItem, 'id' | 'created_at' | 'updated_at'>) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('media_library')
 .insert([item])
 .select()
 .single()

 if (error) throw error
 return data as MediaLibraryItem
 }

  /**
   * Get all media library items for a user
   */
 static async getUserMediaLibrary(userId: string, options?: {
 folder?: string
 tags?: string[]
 analysisStatus?: string
 limit?: number
 offset?: number
 }): Promise<MediaLibraryItem[]> {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 let query = supabaseAdmin
 .from('media_library')
 .select('*')
 .eq('user_id', userId)
 .order('created_at', { ascending: false })

 if (options?.folder) {
 query = query.eq('folder', options.folder)
 }

 if (options?.analysisStatus) {
 query = query.eq('analysis_status', options.analysisStatus)
 }

 if (options?.limit) {
 query = query.limit(options.limit)
 }

 if (options?.offset) {
 query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
 }

 const { data, error } = await query

 if (error) throw error
 return (data ?? []) as MediaLibraryItem[]
 }

  /**
   * Get a single media library item by ID
   */
 static async getMediaLibraryItem(itemId: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('media_library')
 .select('*')
 .eq('id', itemId)
 .single()

 if (error && error.code === 'PGRST116') {
 return null
 }
 if (error) throw error
 return data as MediaLibraryItem
 }

  /**
   * Get multiple media library items by IDs
   */
 static async getMediaLibraryItems(itemIds: string[]): Promise<MediaLibraryItem[]> {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('media_library')
 .select('*')
 .in('id', itemIds)

 if (error) throw error
 return (data ?? []) as MediaLibraryItem[]
 }

  /**
   * Update a media library item
   */
 static async updateMediaLibraryItem(itemId: string, updates: Partial<MediaLibraryItem>) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('media_library')
 .update({ ...updates, updated_at: new Date().toISOString() })
 .eq('id', itemId)
 .select()
 .single()

 if (error) throw error
 return data as MediaLibraryItem
 }

  /**
   * Delete a media library item
   */
 static async deleteMediaLibraryItem(itemId: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('media_library')
 .delete()
 .eq('id', itemId)
 .select()
 .single()

 if (error) throw error
 return data
 }

  /**
   * Delete multiple media library items
   */
 static async deleteMediaLibraryItems(itemIds: string[]) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('media_library')
 .delete()
 .in('id', itemIds)
 .select()

 if (error) throw error
 return data
 }

  /**
   * Get media library item count for a user
   */
 static async getMediaLibraryCount(userId: string): Promise<number> {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { count, error } = await supabaseAdmin
 .from('media_library')
 .select('*', { count: 'exact', head: true })
 .eq('user_id', userId)

 if (error) throw error
 return count || 0
 }

  /**
   * Get unique folders for a user's media library
   */
 static async getMediaLibraryFolders(userId: string): Promise<string[]> {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('media_library')
 .select('folder')
 .eq('user_id', userId)
 .not('folder', 'is', null)

 if (error) throw error

    // Get unique folders
 const folders = new Set<string>()
 data?.forEach((item: { folder: string | null }) => {
 if (item.folder) folders.add(item.folder)
 })
 return Array.from(folders).sort()
 }

  // ====================================
  // Device Token Methods (Push Notifications)
  // ====================================

  /**
   * Save (upsert) a device token for push notifications.
   * The token column is unique — if the same device token already exists for
   * a different user (e.g. after logout/login), it is reassigned to the new user.
   * If it already exists for this user, updated_at is refreshed.
   */
  static async saveDeviceToken(
    userId: string,
    token: string,
    platform: 'ios' | 'android',
  ): Promise<void> {
    if (!supabaseAdmin) throw new Error('Supabase Admin not initialized')

    // First try to update existing row for this user+token combination
    const { data: existing } = await supabaseAdmin
      .from('device_tokens')
      .select('id')
      .eq('user_id', userId)
      .eq('token', token)
      .maybeSingle()

    if (existing) {
      const { error } = await supabaseAdmin
        .from('device_tokens')
        .update({ platform, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) throw error
    } else {
      // Token might exist for another user — delete it first, then insert
      await supabaseAdmin.from('device_tokens').delete().eq('token', token)
      const { error } = await supabaseAdmin
        .from('device_tokens')
        .insert({ user_id: userId, token, platform, updated_at: new Date().toISOString() })
      if (error) throw error
    }
  }

  /**
   * Retrieve all device tokens for a user.
   */
  static async getUserDeviceTokens(
    userId: string,
  ): Promise<{ token: string; platform: string }[]> {
    if (!supabaseAdmin) throw new Error('Supabase Admin not initialized')

    const { data, error } = await supabaseAdmin
      .from('device_tokens')
      .select('token, platform')
      .eq('user_id', userId)

    if (error) throw error
    return (data ?? []) as { token: string; platform: string }[]
  }

  /**
   * Delete a specific device token (e.g. when the token becomes invalid).
   */
  static async deleteDeviceToken(token: string): Promise<void> {
    if (!supabaseAdmin) throw new Error('Supabase Admin not initialized')

    const { error } = await supabaseAdmin
      .from('device_tokens')
      .delete()
      .eq('token', token)

    if (error) throw error
  }

  /**
   * Delete a device token scoped to a specific user.
   * Prevents one user from deleting another user's token.
   */
  static async deleteDeviceTokenForUser(userId: string, token: string): Promise<void> {
    if (!supabaseAdmin) throw new Error('Supabase Admin not initialized')

    const { error } = await supabaseAdmin
      .from('device_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', token)

    if (error) throw error
  }
}

// Export for backward compatibility and convenience
export const db = SupabaseDB