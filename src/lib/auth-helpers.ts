import { NextRequest } from 'next/server'
import { verifySupabaseToken } from '@/lib/supabase-admin'

export async function verifySupabaseTokenFromRequest(request: NextRequest) {
 try {
 const authHeader = request.headers.get('Authorization')
 
 if (!authHeader || !authHeader.startsWith('Bearer ')) {
 return null
 }
 
 const token = authHeader.split(' ')[1]
 const userData = await verifySupabaseToken(token)
 
 return userData
 } catch (error) {
    console.error('Error verifying Supabase token:', error)
 return null
 }
}

export async function getSupabaseUser(request: NextRequest) {
 const userData = await verifySupabaseTokenFromRequest(request)
 
 if (!userData) {
 return null
 }
 
 return {
 userId: userData.userId,
 email: userData.email
 }
}
