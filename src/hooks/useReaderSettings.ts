'use client'

import { useState, useEffect, useCallback, startTransition } from 'react'

type ReaderTheme = 'light' | 'sepia' | 'dark'
type FontFamily = 'system' | 'serif' | 'mono'
type LineSpacing = 'compact' | 'normal' | 'relaxed'

interface ReaderSettings {
  fontSize: number
  fontFamily: FontFamily
  lineSpacing: LineSpacing
  readerTheme: ReaderTheme
}

const STORAGE_KEY = 'bookcraft-reader-settings'

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 18,
  fontFamily: 'serif',
  lineSpacing: 'normal',
  readerTheme: 'light',
}

const VALID_FONT_FAMILIES: FontFamily[] = ['system', 'serif', 'mono']
const VALID_LINE_SPACINGS: LineSpacing[] = ['compact', 'normal', 'relaxed']
const VALID_READER_THEMES: ReaderTheme[] = ['light', 'sepia', 'dark']

function loadSettings(): ReaderSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_SETTINGS
    const parsed = JSON.parse(stored) as Partial<ReaderSettings>
    return {
      fontSize: typeof parsed.fontSize === 'number' ? parsed.fontSize : DEFAULT_SETTINGS.fontSize,
      fontFamily: VALID_FONT_FAMILIES.includes(parsed.fontFamily as FontFamily)
        ? (parsed.fontFamily as FontFamily)
        : DEFAULT_SETTINGS.fontFamily,
      lineSpacing: VALID_LINE_SPACINGS.includes(parsed.lineSpacing as LineSpacing)
        ? (parsed.lineSpacing as LineSpacing)
        : DEFAULT_SETTINGS.lineSpacing,
      readerTheme: VALID_READER_THEMES.includes(parsed.readerTheme as ReaderTheme)
        ? (parsed.readerTheme as ReaderTheme)
        : DEFAULT_SETTINGS.readerTheme,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveSettings(settings: ReaderSettings): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // ignore storage errors
  }
}

export function useReaderSettings(systemTheme?: string) {
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_SETTINGS, readerTheme: systemTheme === 'dark' ? 'dark' : 'light' }
    }
    const hasStored = !!localStorage.getItem(STORAGE_KEY)
    const loaded = loadSettings()
    // If no theme was previously saved (first time), default based on system theme
    if (!hasStored) {
      return {
        ...loaded,
        readerTheme: systemTheme === 'dark' ? 'dark' : 'light',
      }
    }
    return loaded
  })

  // Sync readerTheme with systemTheme for first-time users
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!systemTheme) return
    const hasStored = !!localStorage.getItem(STORAGE_KEY)
    if (hasStored) return
    const desiredTheme: ReaderTheme = systemTheme === 'dark' ? 'dark' : 'light'
    startTransition(() => {
      setSettings(prev => {
        if (prev.readerTheme === desiredTheme) return prev
        return { ...prev, readerTheme: desiredTheme }
      })
    })
  }, [systemTheme])

  const update = useCallback(<K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      saveSettings(next)
      return next
    })
  }, [])

  return {
    fontSize: settings.fontSize,
    fontFamily: settings.fontFamily,
    lineSpacing: settings.lineSpacing,
    readerTheme: settings.readerTheme,
    setFontSize: (v: number) => update('fontSize', v),
    setFontFamily: (v: FontFamily) => update('fontFamily', v),
    setLineSpacing: (v: LineSpacing) => update('lineSpacing', v),
    setReaderTheme: (v: ReaderTheme) => update('readerTheme', v),
  }
}
