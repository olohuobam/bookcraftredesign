'use client'

import { useEffect, useCallback, useRef } from 'react'

/**
 * Auto-saves wizard form data to localStorage with debounce.
 * Returns helpers to load, save, and clear the draft.
 */
export function useWizardAutoSave<T extends Record<string, unknown>>(
 key: string,
 data: T,
 setData: (d: T) => void,
 { debounceMs = 800 } = {}
) {
 const loaded = useRef(false)

  // Load draft on first mount
 useEffect(() => {
 if (loaded.current) return
 loaded.current = true
 try {
 const raw = localStorage.getItem(key)
 if (raw) {
 const parsed = JSON.parse(raw) as T
 setData(parsed)
 }
 } catch {
      // ignore corrupt data
 }
 }, [key, setData])

  // Debounced auto-save
 useEffect(() => {
 const timer = setTimeout(() => {
 try {
 localStorage.setItem(key, JSON.stringify(data))
 } catch {
        // quota exceeded etc.
 }
 }, debounceMs)
 return () => clearTimeout(timer)
 }, [key, data, debounceMs])

 const clear = useCallback(() => {
 localStorage.removeItem(key)
 }, [key])

 const hasDraft = useCallback(() => {
 try {
 return localStorage.getItem(key) !== null
 } catch {
 return false
 }
 }, [key])

 return { clear, hasDraft }
}
