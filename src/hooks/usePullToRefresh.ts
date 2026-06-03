'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useHaptics } from './useHaptics'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  pullDownThreshold?: number
  maxPullDown?: number
  refreshing?: boolean
}

export function usePullToRefresh({
  onRefresh,
  pullDownThreshold = 80,
  maxPullDown = 150,
  refreshing: externalRefreshing = false,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [shouldTriggerRefresh, setShouldTriggerRefresh] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const isPulling = useRef(false)
  const isPullGesture = useRef(false)
  const isRefreshingRef = useRef(false)
  // Use a ref for pullDistance to avoid recreating handlers on every frame
  const pullDistanceRef = useRef(0)
  const hapticFiredRef = useRef(false)
  const { impact } = useHaptics()

  // Keep isRefreshingRef in sync
  useEffect(() => {
    isRefreshingRef.current = isRefreshing
  }, [isRefreshing])

  // The non-passive touchmove handler — only attached during active pull-down gestures
  const handleActivePullMove = useCallback((e: TouchEvent) => {
    if (!isPullGesture.current || isRefreshingRef.current) return

    const container = containerRef.current
    if (!container || container.scrollTop > 0) {
      // User scrolled into the list — abort pull gesture
      isPullGesture.current = false
      pullDistanceRef.current = 0
      setPullDistance(0)
      return
    }

    const currentY = e.touches[0].clientY
    const deltaY = currentY - startY.current

    if (deltaY > 0) {
      // Still pulling down — safe to block native scroll
      e.preventDefault()

      const resistance = 0.5
      const adjusted = Math.min(deltaY * resistance, maxPullDown)
      pullDistanceRef.current = adjusted
      setPullDistance(adjusted)

      // Haptic at threshold — use ref to avoid re-render-driven handler swap
      if (adjusted >= pullDownThreshold && !hapticFiredRef.current) {
        hapticFiredRef.current = true
        impact('medium')
      }
    } else {
      // Finger moved back up — release pull, let native scroll take over
      isPullGesture.current = false
      pullDistanceRef.current = 0
      hapticFiredRef.current = false
      setPullDistance(0)
    }
  }, [maxPullDown, pullDownThreshold, impact])

  // Passive touchstart — arms pull detection when at the top
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const container = containerRef.current
    if (!container || isRefreshingRef.current) return

    isPulling.current = false
    isPullGesture.current = false
    hapticFiredRef.current = false

    if (container.scrollTop === 0) {
      startY.current = e.touches[0].clientY
      isPulling.current = true
      isPullGesture.current = true

      // Attach the non-passive handler only now that we might need preventDefault
      container.addEventListener('touchmove', handleActivePullMove, { passive: false })
    }
  }, [handleActivePullMove])

  const handleTouchEnd = useCallback(() => {
    const container = containerRef.current

    // Always remove the non-passive handler — we only need it while pulling
    if (container) {
      container.removeEventListener('touchmove', handleActivePullMove)
    }

    const distance = pullDistanceRef.current
    isPulling.current = false

    if (isPullGesture.current && distance >= pullDownThreshold && !isRefreshingRef.current) {
      setShouldTriggerRefresh(true)
      setIsRefreshing(true)
      isRefreshingRef.current = true
      impact('heavy')
    } else {
      pullDistanceRef.current = 0
      setPullDistance(0)
    }

    isPullGesture.current = false
    hapticFiredRef.current = false
  }, [handleActivePullMove, pullDownThreshold, impact])

  // Execute refresh
  useEffect(() => {
    if (shouldTriggerRefresh && !externalRefreshing) {
      onRefresh()
        .then(() => {
          setIsRefreshing(false)
          isRefreshingRef.current = false
          pullDistanceRef.current = 0
          setPullDistance(0)
          setShowSuccess(true)
          impact('light')
          setTimeout(() => {
            setShowSuccess(false)
            setShouldTriggerRefresh(false)
          }, 600)
        })
        .catch((error) => {
          console.error('Refresh error:', error)
          setIsRefreshing(false)
          isRefreshingRef.current = false
          pullDistanceRef.current = 0
          setPullDistance(0)
          setShouldTriggerRefresh(false)
        })
    }
  }, [shouldTriggerRefresh, onRefresh, externalRefreshing, impact])

  // Attach only passive listeners at mount — the non-passive touchmove is
  // added dynamically in handleTouchStart and removed in handleTouchEnd.
  // This means the browser can scroll freely (async) by default and only
  // waits for JS during confirmed pull-down gestures.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('touchcancel', handleTouchEnd)
      // Clean up non-passive handler if it was left attached
      container.removeEventListener('touchmove', handleActivePullMove)
    }
  }, [handleTouchStart, handleTouchEnd, handleActivePullMove])

  const pullProgress = Math.min(pullDistance / pullDownThreshold, 1)
  const shouldShowRefreshIndicator = pullDistance > 0 || isRefreshing
  const isPullingActive = pullDistance > 0 && !isRefreshing

  return {
    containerRef,
    pullDistance,
    pullProgress,
    isRefreshing,
    shouldShowRefreshIndicator,
    showSuccess,
    isPullingActive,
  }
}
