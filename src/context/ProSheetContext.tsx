'use client'

/**
 * ProSheetContext
 *
 * Provides a global `openProSheet()` function so any component can trigger the
 * Pro upgrade bottom sheet without knowing about DashboardLayout internals.
 *
 * Usage:
 *   const { openProSheet } = useProSheet()
 *   openProSheet()   // optional: openProSheet('export')
 *
 * The context is provided by DashboardLayout, which owns the actual sheet state
 * and renders the BottomSheet. Outside the layout the hook falls back gracefully
 * to router.push('/dashboard/billing') so it never breaks in isolation.
 */

import { createContext, useContext, ReactNode, useCallback, useState } from 'react'

export type ProSheetTrigger =
  | 'topbar'
  | 'export'
  | 'reader-gate'
  | 'create-limit'
  | 'picturebook'
  | 'photobook'
  | 'settings'
  | 'generic'

interface ProSheetContextValue {
  isOpen: boolean
  trigger: ProSheetTrigger
  openProSheet: (trigger?: ProSheetTrigger) => void
  closeProSheet: () => void
}

const ProSheetContext = createContext<ProSheetContextValue | null>(null)

export function ProSheetProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [trigger, setTrigger] = useState<ProSheetTrigger>('generic')

  const openProSheet = useCallback((t: ProSheetTrigger = 'generic') => {
    setTrigger(t)
    setIsOpen(true)
  }, [])

  const closeProSheet = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <ProSheetContext.Provider value={{ isOpen, trigger, openProSheet, closeProSheet }}>
      {children}
    </ProSheetContext.Provider>
  )
}

export function useProSheet(): ProSheetContextValue {
  const ctx = useContext(ProSheetContext)
  if (ctx) return ctx

  // Fallback outside DashboardLayout (e.g. landing pages, storybook)
  // Import useRouter lazily at call time to avoid server-side import
  return {
    isOpen: false,
    trigger: 'generic',
    openProSheet: () => {
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard/billing'
      }
    },
    closeProSheet: () => {},
  }
}
