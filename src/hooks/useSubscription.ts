'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'

export interface Subscription {
 plan: 'free' | 'pro'
 status: 'active' | 'canceled' | 'past_due' | 'none'
 currentPeriodEnd?: string
 cancelAtPeriodEnd?: boolean
}

interface UseSubscriptionReturn {
 subscription: Subscription | null
 isPro: boolean
 isLoading: boolean
 error: string | null
 refresh: () => Promise<void>
}

/**
 * Hook to manage user subscription status
 * Fetches and caches subscription data from the API
 */
export function useSubscription(): UseSubscriptionReturn {
 const { user, getIdToken } = useAuth()
 const [subscription, setSubscription] = useState<Subscription | null>(null)
 const [isLoading, setIsLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)

 const fetchSubscription = useCallback(async () => {
 if (!user) {
 setSubscription(null)
 setIsLoading(false)
 return
 }

 try {
 setIsLoading(true)
 setError(null)

 const token = await getIdToken()
 if (!token) {
        // No token - assume free plan
 setSubscription({ plan: 'free', status: 'none' })
 return
 }

 const response = await fetch('/api/user/subscription', {
 headers: {
 Authorization: `Bearer ${token}`,
 },
 })

 if (!response.ok) {
        // If API fails, assume free plan
        console.warn('Failed to fetch subscription, defaulting to free')
 setSubscription({ plan: 'free', status: 'none' })
 return
 }

 const data = await response.json()
 setSubscription(data.subscription || { plan: 'free', status: 'none' })
 } catch (err) {
      console.error('Error fetching subscription:', err)
 setError(err instanceof Error ? err.message : 'Failed to load subscription')
      // Default to free on error
 setSubscription({ plan: 'free', status: 'none' })
 } finally {
 setIsLoading(false)
 }
 }, [user, getIdToken])

 useEffect(() => {
 fetchSubscription()
 }, [fetchSubscription])

 const isPro = subscription?.plan === 'pro' && subscription?.status === 'active'

 return {
 subscription,
 isPro,
 isLoading,
 error,
 refresh: fetchSubscription,
 }
}
