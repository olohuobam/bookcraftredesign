'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

interface CreateOptions {
 endpoint: string
 body: Record<string, unknown>
  /** localStorage key to clear on success */
 clearDraftKey?: string
  /** Redirect path builder — receives the JSON response */
 redirectTo?: (data: Record<string, unknown>) => string
}

/**
 * Thin wrapper around the "start generation / create book" fetch call.
 * Handles auth token, loading state, error alert, redirect.
 */
export function useBookCreation() {
 const router = useRouter()
 const { getIdToken } = useAuth()
 const [isCreating, setIsCreating] = useState(false)

 const create = useCallback(
 async ({ endpoint, body, clearDraftKey, redirectTo }: CreateOptions) => {
 setIsCreating(true)
 try {
 const token = await getIdToken()
 const res = await fetch(endpoint, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
 body: JSON.stringify(body),
 })
 if (!res.ok) {
 const err = await res.json().catch(() => ({}))
 throw new Error((err as Record<string, string>).error || 'Request failed')
 }
 const data = (await res.json()) as Record<string, unknown>

 if (clearDraftKey) {
 try { localStorage.removeItem(clearDraftKey) } catch { /* */ }
 }

 if (redirectTo) {
 router.push(redirectTo(data))
 }
 return data
 } catch (err) {
        console.error('Book creation failed:', err)
 alert(err instanceof Error ? err.message : 'Something went wrong')
 return null
 } finally {
 setIsCreating(false)
 }
 },
 [getIdToken, router],
 )

 return { create, isCreating }
}
