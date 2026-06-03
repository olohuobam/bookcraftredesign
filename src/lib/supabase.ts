import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate Supabase configuration
const validateSupabaseConfig = () => {
 const required = [
 { key: 'NEXT_PUBLIC_SUPABASE_URL', value: supabaseUrl },
 { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: supabaseAnonKey }
 ]
 
 const missing = required.filter(item => !item.value)
 
 if (missing.length > 0) {
    console.error('[Bookcraft] Supabase configuration is incomplete. Missing environment variables:', missing.map(item => item.key).join(', '))
    console.error('[Bookcraft] Authentication is DISABLED. Set the missing environment variables to enable login.')
 return false
 }
 
  console.log('✅ Supabase configuration is complete')
 return true
}

// Validate configuration
const isConfigValid = validateSupabaseConfig()

// Initialize Supabase client only if configuration is valid
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabase: any = null

if (isConfigValid && supabaseUrl && supabaseAnonKey) {
 try {
 supabase = createClient(supabaseUrl, supabaseAnonKey, {
 realtime: {
 params: {
 eventsPerSecond: 10
 },
 heartbeatIntervalMs: 15000, // Send heartbeat every 15 seconds
 reconnectAfterMs: (tries: number) => {
          // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
 return Math.min(1000 * Math.pow(2, tries), 30000)
 },
 timeout: 30000 // 30 second timeout
 },
 auth: {
 persistSession: true,
 autoRefreshToken: true,
 flowType: 'pkce',
 detectSessionInUrl: true,
 }
 })
    console.log('🚀 Supabase initialized successfully with Realtime config')
 } catch (error) {
    console.error('Supabase initialization failed:', error)
    console.log('🔧 Running in Supabase-disabled mode')
 }
} else {
  console.error('[Bookcraft] Supabase disabled - missing configuration. Authentication will not work.')
}

// Export supabase client (may be null if Supabase is disabled)
export { supabase }
export default supabase