import type { PostgrestError } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'

const USER_TABLES = ['profiles', 'users'] as const
const NOT_FOUND_ERROR_CODE = 'PGRST116'
const TABLE_NOT_FOUND_ERROR_CODE = 'PGRST205'
const UNIQUE_VIOLATION_CODE = '23505'

function isRecordNotFound(error: PostgrestError | null): boolean {
 return !!error && error.code === NOT_FOUND_ERROR_CODE
}

function isTableMissing(error: PostgrestError | null): boolean {
 return !!error && error.code === TABLE_NOT_FOUND_ERROR_CODE
}

/**
 * Ensures user exists in Supabase database
 * Creates user if it doesn't exist, returns user data
 */
export async function ensureUserExists(id: string, email: string, name?: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const payload = {
 id,
 email,
 name: name || email.split('@')[0],
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString()
 }

 let lastMissingTableError: PostgrestError | null = null

 for (const table of USER_TABLES) {
 const { data: existingUser, error: fetchError } = await supabaseAdmin
 .from(table)
 .select('*')
 .eq('id', id)
 .single()

 if (fetchError && !isRecordNotFound(fetchError)) {
 if (isTableMissing(fetchError)) {
 lastMissingTableError = fetchError
 continue
 }

      console.error(`Error fetching user profile from ${table}:`, fetchError)
 throw new Error('Failed to fetch user')
 }

 if (existingUser) {
 return existingUser
 }

    // Create user if it doesn't exist
 const { data: newUser, error: createError } = await supabaseAdmin
 .from(table)
 .insert(payload)
 .select()
 .single()

 if (!createError) {
 return newUser
 }

 if (createError.code === UNIQUE_VIOLATION_CODE) {
 const { data } = await supabaseAdmin
 .from(table)
 .select('*')
 .eq('id', id)
 .single()
 if (data) {
 return data
 }
 }

 if (isTableMissing(createError)) {
 lastMissingTableError = createError
 continue
 }

    console.error(`Error creating user in ${table}:`, createError)
 throw new Error('Failed to create user')
 }

 if (lastMissingTableError) {
    console.error('Supabase schema missing expected user table:', lastMissingTableError)
 }

 throw new Error('Failed to create user')
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 let lastMissingTableError: PostgrestError | null = null

 for (const table of USER_TABLES) {
 const { data, error } = await supabaseAdmin
 .from(table)
 .select('*')
 .eq('email', email)
 .single()

 if (!error) {
 return data
 }

 if (isRecordNotFound(error)) {
 continue
 }

 if (isTableMissing(error)) {
 lastMissingTableError = error
 continue
 }

    console.error(`Error fetching user from ${table}:`, error)
 throw new Error('Failed to fetch user')
 }

 if (lastMissingTableError) {
    console.error(
 'Supabase schema missing expected user table when looking up by email:',
 lastMissingTableError
 )
 }

 return null
}

/**
 * Get user by ID
 */
export async function getUserById(id: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 let lastMissingTableError: PostgrestError | null = null

 for (const table of USER_TABLES) {
 const { data, error } = await supabaseAdmin
 .from(table)
 .select('*')
 .eq('id', id)
 .single()

 if (!error) {
 return data
 }

 if (isRecordNotFound(error)) {
 continue
 }

 if (isTableMissing(error)) {
 lastMissingTableError = error
 continue
 }

    console.error(`Error fetching user from ${table}:`, error)
 throw new Error('Failed to fetch user')
 }

 if (lastMissingTableError) {
    console.error(
 'Supabase schema missing expected user table when looking up by id:',
 lastMissingTableError
 )
 }

 return null
}

/**
 * Create a new book
 */
export async function createBook(bookData: {
 title: string
 genre: string
 description: string
 content: string
 chapters: number
 style: string
 target_audience: string
 book_type: string
 user_id: string
 status: string
}) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('books')
 .insert({
 ...bookData,
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString()
 })
 .select()
 .single()

 if (error) {
    console.error('Error creating book:', error)
 throw new Error('Failed to create book')
 }

 return data
}

/**
 * Update book by ID
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateBook(bookId: string, updateData: Record<string, any>) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('books')
 .update({
 ...updateData,
 updated_at: new Date().toISOString()
 })
 .eq('id', bookId)
 .select()
 .single()

 if (error) {
    console.error('Error updating book:', error)
 throw new Error('Failed to update book')
 }

 return data
}

/**
 * Get book by ID and user ID (security check)
 */
export async function getBookByIdAndUser(bookId: string, userId: string) {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

 const { data, error } = await supabaseAdmin
 .from('books')
 .select('*')
 .eq('id', bookId)
 .eq('user_id', userId)
 .single()

 if (error && error.code !== NOT_FOUND_ERROR_CODE) {
    console.error('Error fetching book:', error)
 throw new Error('Failed to fetch book')
 }

 return data
}