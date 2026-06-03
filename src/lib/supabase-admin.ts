import { createClient } from '@supabase/supabase-js'

// Function to validate JWT tokens server-side
async function verifySupabaseToken(token: string): Promise<{ email?: string; userId?: string } | null> {
  // Check if Supabase environment variables are available
 const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
 const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
 
 if (!supabaseUrl || !supabaseServiceRoleKey) {
    // Mock token verification is gated on NODE_ENV === 'development' AND
    // an explicit ALLOW_MOCK_AUTH opt-in. An unset NODE_ENV in a misconfigured
    // production deploy must not enable the bypass.
 if (
 process.env.NODE_ENV === 'development' &&
 process.env.ALLOW_MOCK_AUTH === 'true' &&
 token.startsWith('mock-token-')
 ) {
 console.warn('⚠️ Supabase admin not configured - accepting mock token (development only)')
 const mockUserId = token.replace('mock-token-', '')
 return {
 email: 'test@example.com',
 userId: mockUserId,
 }
 }

 console.error('Supabase admin not configured - rejecting token')
 return null
 }

 try {
    // Create admin client with service role key
 const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)
 
    // Verify the JWT token
 const { data, error } = await supabaseAdmin.auth.getUser(token)
 
 if (error || !data.user) {
      console.error('Token verification failed:', error?.message)
 return null
 }
 
 return {
 email: data.user.email,
 userId: data.user.id
 }
 } catch (error) {
    console.error('Error verifying Supabase token:', error)
 return null
 }
}


// Create admin client for server-side operations (if configured)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseAdmin: any = null

if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
 try {
 supabaseAdmin = createClient(
 process.env.NEXT_PUBLIC_SUPABASE_URL,
 process.env.SUPABASE_SERVICE_ROLE_KEY
 )
    console.log('✅ Supabase Admin client initialized')
 } catch (error) {
    console.error('Failed to initialize Supabase Admin client:', error)
 }
} else {
  console.log('🔧 Supabase Admin not configured - running in mock mode')
}

// Export configuration status for consistency checks
export const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

export { supabaseAdmin, verifySupabaseToken }