import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface AuthenticatedUser {
 id: string
 email: string
 name?: string
}

/**
 * Custom error for authentication failures
 */
export class AuthError extends Error {
 constructor(message: string, public statusCode: number = 401) {
 super(message)
 this.name = 'AuthError'
 }
}

/**
 * Verifies Supabase JWT token from request headers
 * Returns user data if valid, throws AuthError if invalid
 */
export async function verifyAuth(request: NextRequest): Promise<AuthenticatedUser> {
 const authHeader = request.headers.get('authorization')
 
 if (!authHeader || !authHeader.startsWith('Bearer ')) {
 throw new AuthError('No authorization token provided')
 }

 const token = authHeader.substring(7)
 
 try {
    // Verify JWT token with Supabase
 const { data: user, error } = await supabaseAdmin.auth.getUser(token)
 
 if (error || !user.user) {
 throw new AuthError('Invalid token')
 }

 const { user: userData } = user
 
 if (!userData.email) {
 throw new AuthError('User email not found')
 }

 return {
 id: userData.id,
 email: userData.email,
 name: userData.user_metadata?.name || userData.email.split('@')[0]
 }
 
 } catch (error) {
 if (error instanceof AuthError) {
 throw error
 }
    console.error('Auth verification error:', error)
 throw new AuthError('Authentication failed')
 }
}

/**
 * Extract user email from authenticated request
 * Convenience function that calls verifyAuth and returns email
 */
export async function getUserEmail(request: NextRequest): Promise<string> {
 const user = await verifyAuth(request)
 return user.email
}

/**
 * Extract user ID from authenticated request  
 * Convenience function that calls verifyAuth and returns user ID
 */
export async function getUserId(request: NextRequest): Promise<string> {
 const user = await verifyAuth(request)
 return user.id
}