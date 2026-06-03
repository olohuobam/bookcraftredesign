import { SupabaseDB } from './supabase-db'
import { supabaseAdmin } from './supabase-admin'

// Function to ensure user exists in users table
export async function ensureUserProfile(userId: string, email: string, name?: string) {
 try {
    // Try to get existing profile
 const existingProfile = await SupabaseDB.getProfile(userId)
 if (existingProfile) {
      console.log('Found existing user profile:', existingProfile.id)
 return existingProfile
 }
 } catch (error) {
    console.log('Profile not found, will create:', error)
 }

 try {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialized')
 }

    // Use upsert with admin client to bypass RLS and handle conflicts
 const { data, error } = await supabaseAdmin
 .from('users')
 .upsert([{
 id: userId,
 email: email,
 name: name || email.split('@')[0],
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString()
 }], {
 onConflict: 'id',
 ignoreDuplicates: false
 })
 .select()
 .single()

 if (error) {
      console.error('Error upserting user profile:', error)
 throw error
 }

    console.log('Created/updated user profile:', data.id)
 return data
 } catch (error) {
    console.error('Error ensuring user profile:', error)
 throw error
 }
}