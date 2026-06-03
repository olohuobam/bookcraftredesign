'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Check, ImageIcon, Loader2, BookOpen } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'

// ------- Style presets ---------------------------------------------------
type TransformStyle = 'watercolor' | 'cartoon' | '3d' | 'realistic' | 'sketch' | 'anime' | string

interface CoverStyle {
  gradientFrom: string
  gradientTo: string
  overlayOpacity: number
  fontFamily: string
  fontWeight: string
  titleSize: string
  subtitleSize: string
  letterSpacing: string
  textColor: string
  textShadow: string
  borderRadius: string
}

function getCoverStyle(transformStyle: TransformStyle): CoverStyle {
  switch (transformStyle) {
    case 'watercolor':
      return {
        gradientFrom: 'rgba(62,134,215,0.75)',
        gradientTo: 'rgba(62,134,215,0.85)',
        overlayOpacity: 0.75,
        fontFamily: "'Georgia', 'Palatino', serif",
        fontWeight: '400',
        titleSize: 'clamp(1.4rem, 5vw, 2.2rem)',
        subtitleSize: 'clamp(0.8rem, 2.5vw, 1.1rem)',
        letterSpacing: '0.04em',
        textColor: '#1e3a8a',
        textShadow: '0 1px 4px rgba(255,255,255,0.6)',
        borderRadius: '16px',
      }
    case 'cartoon':
      return {
        gradientFrom: 'rgba(251,191,36,0.85)',
        gradientTo: 'rgba(249,115,22,0.9)',
        overlayOpacity: 0.85,
        fontFamily: "'Arial Rounded MT Bold', 'Arial Black', sans-serif",
        fontWeight: '900',
        titleSize: 'clamp(1.6rem, 5.5vw, 2.5rem)',
        subtitleSize: 'clamp(0.85rem, 2.5vw, 1.15rem)',
        letterSpacing: '-0.01em',
        textColor: '#ffffff',
        textShadow: '2px 2px 0 #7c2d12, 0 0 10px rgba(0,0,0,0.4)',
        borderRadius: '20px',
      }
    case '3d':
    case 'realistic':
      return {
        gradientFrom: 'rgba(15,23,42,0.6)',
        gradientTo: 'rgba(15,23,42,0.92)',
        overlayOpacity: 0.85,
        fontFamily: "'Gill Sans', 'Optima', sans-serif",
        fontWeight: '300',
        titleSize: 'clamp(1.4rem, 4.5vw, 2rem)',
        subtitleSize: 'clamp(0.75rem, 2vw, 0.95rem)',
        letterSpacing: '0.12em',
        textColor: '#e2e8f0',
        textShadow: '0 2px 8px rgba(0,0,0,0.8)',
        borderRadius: '12px',
      }
    case 'sketch':
      return {
        gradientFrom: 'rgba(245,245,220,0.8)',
        gradientTo: 'rgba(210,210,170,0.9)',
        overlayOpacity: 0.8,
        fontFamily: "'Courier New', 'Courier', monospace",
        fontWeight: '700',
        titleSize: 'clamp(1.3rem, 4.5vw, 2rem)',
        subtitleSize: 'clamp(0.75rem, 2vw, 0.95rem)',
        letterSpacing: '0.06em',
        textColor: '#1c1917',
        textShadow: '1px 1px 2px rgba(255,255,255,0.5)',
        borderRadius: '8px',
      }
    case 'anime':
      return {
        gradientFrom: 'rgba(236,72,153,0.7)',
        gradientTo: 'rgba(62,134,215,0.9)',
        overlayOpacity: 0.8,
        fontFamily: "'Trebuchet MS', 'Verdana', sans-serif",
        fontWeight: '800',
        titleSize: 'clamp(1.4rem, 5vw, 2.2rem)',
        subtitleSize: 'clamp(0.8rem, 2.5vw, 1.05rem)',
        letterSpacing: '0.02em',
        textColor: '#ffffff',
        textShadow: '0 0 12px rgba(236,72,153,0.8), 0 2px 4px rgba(0,0,0,0.5)',
        borderRadius: '16px',
      }
    default:
      return {
        gradientFrom: 'rgba(30,64,175,0.55)',
        gradientTo: 'rgba(30,64,175,0.88)',
        overlayOpacity: 0.8,
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        fontWeight: '700',
        titleSize: 'clamp(1.4rem, 5vw, 2.2rem)',
        subtitleSize: 'clamp(0.8rem, 2.5vw, 1rem)',
        letterSpacing: '0.01em',
        textColor: '#ffffff',
        textShadow: '0 2px 8px rgba(0,0,0,0.5)',
        borderRadius: '14px',
      }
  }
}

// ------- Cover Preview ---------------------------------------------------
interface CoverPreviewProps {
  imageUrl: string
  title: string
  author?: string
  subtitle?: string
  transformStyle: TransformStyle
  className?: string
}

export function CoverPreview({
  imageUrl,
  title,
  author,
  subtitle,
  transformStyle,
  className = '',
}: CoverPreviewProps) {
  const s = getCoverStyle(transformStyle)

  return (
    <div
      className={`relative overflow-hidden select-none ${className}`}
      style={{ borderRadius: s.borderRadius }}
    >
      {/* Background image */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-400 flex items-center justify-center">
          <ImageIcon className="w-12 h-12 text-gray-500 opacity-50" />
        </div>
      )}

      {/* Gradient overlay — bottom-heavy */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, transparent 30%, ${s.gradientFrom} 60%, ${s.gradientTo} 100%)`,
        }}
      />

      {/* Text overlay */}
      <div
        className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-1"
        style={{ fontFamily: s.fontFamily }}
      >
        {subtitle && (
          <p
            style={{
              fontSize: s.subtitleSize,
              fontWeight: '400',
              color: s.textColor,
              textShadow: s.textShadow,
              letterSpacing: s.letterSpacing,
              opacity: 0.9,
              lineHeight: 1.3,
            }}
          >
            {subtitle}
          </p>
        )}
        <h2
          style={{
            fontSize: s.titleSize,
            fontWeight: s.fontWeight,
            color: s.textColor,
            textShadow: s.textShadow,
            letterSpacing: s.letterSpacing,
            lineHeight: 1.2,
            wordBreak: 'break-word',
          }}
        >
          {title}
        </h2>
        {author && (
          <p
            style={{
              fontSize: s.subtitleSize,
              fontWeight: '400',
              color: s.textColor,
              textShadow: s.textShadow,
              letterSpacing: '0.08em',
              opacity: 0.85,
              marginTop: '2px',
            }}
          >
            {author}
          </p>
        )}
      </div>
    </div>
  )
}

// ------- Main Component --------------------------------------------------
interface PictureBookCoverSelectorProps {
  bookId: string
  bookTitle: string
  bookAuthor?: string
  bookSubtitle?: string
  transformStyle: TransformStyle
  allImages: string[]           // flat array of all book images
  currentCoverImage?: string    // currently saved cover_image
  onCoverSaved: (coverImageUrl: string) => void
}

export default function PictureBookCoverSelector({
  bookId,
  bookTitle,
  bookAuthor,
  bookSubtitle,
  transformStyle,
  allImages,
  currentCoverImage,
  onCoverSaved,
}: PictureBookCoverSelectorProps) {
  const { getIdToken } = useAuth()
  const { t } = useLanguage()
  const validImages = allImages.filter((u) => u && u.length > 0)

  const [selectedUrl, setSelectedUrl] = useState<string>(currentCoverImage || validImages[0] || '')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiReason, setAiReason] = useState<string>('')
  const [aiError, setAiError] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string>('')

  // FIX 7: Ref for setTimeout cleanup on unmount
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync if parent updates currentCoverImage
  useEffect(() => {
    if (currentCoverImage && currentCoverImage !== selectedUrl) {
      setSelectedUrl(currentCoverImage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCoverImage])

  // FIX 3: Update selectedUrl when allImages loads asynchronously
  useEffect(() => {
    if (!selectedUrl && validImages.length > 0) {
      setSelectedUrl(validImages[0])
    }
  }, [validImages.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // FIX 7: Cleanup setTimeout on unmount
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  const handleAiSelect = async () => {
    if (validImages.length === 0) return
    setAiLoading(true)
    setAiReason('')
    setAiError('')
    try {
      // FIX 5: null guard for getIdToken()
      const token = await getIdToken()
      if (!token) {
        setAiError("Nicht eingeloggt")
        setAiLoading(false)
        return
      }
      const res = await fetch(`/api/books/${bookId}/select-cover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ images: validImages }),
      })
      // FIX 5: check !res.ok
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || "KI-Auswahl fehlgeschlagen")
      }
      const data = await res.json()
      setSelectedUrl(data.selectedImageUrl)
      setAiReason(data.reason || '')
    } catch (e) {
      setAiError(e instanceof Error ? e.message : t('unexpectedError'))
    } finally {
      setAiLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedUrl) return
    setSaving(true)
    setSaveError('')
    try {
      // FIX 6: null guard for getIdToken()
      const token = await getIdToken()
      if (!token) {
        setSaveError(t('authTokenNotAvailable'))
        setSaving(false)
        return
      }
      const res = await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ coverImage: selectedUrl }),
      })
      // FIX 6: check !res.ok
      if (!res.ok) throw new Error(t('saveFailed'))
      setSaved(true)
      // FIX 7: use ref for setTimeout to allow cleanup
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaved(false), 2500)
      onCoverSaved(selectedUrl)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t('saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (validImages.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-400">
        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">{t('noImagesAvailableYet')} {t('generatePagesFirst')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Live Cover Preview */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-shrink-0 w-full md:w-56">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('livePreview')}</p>
          <CoverPreview
            imageUrl={selectedUrl}
            title={bookTitle}
            author={bookAuthor}
            subtitle={bookSubtitle}
            transformStyle={transformStyle}
            className="w-full aspect-[3/4] shadow-2xl"
          />
        </div>

        <div className="flex-1 space-y-4">
          {/* AI Button */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-50 dark:from-blue-950/30 dark:to-blue-950/30 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
            <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-200 mb-1 flex items-center gap-2">
              {t('aiRecommendation')}
            </h3>
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
              {t('aiAnalyzesImagesForCover')}
            </p>
            <Button
              onClick={handleAiSelect}
              disabled={aiLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
              size="sm"
            >
              {aiLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('aiChoosing')}</>
              ) : (
                <>{t('aiDecides')}</>
              )}
            </Button>
            {aiReason && (
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-2 italic">
                &ldquo;{aiReason}&rdquo;
              </p>
            )}
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={saving || !selectedUrl}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('saving')}</>
            ) : saved ? (
              <><Check className="w-4 h-4 mr-2" /> {t('coverSaved')}</>
            ) : (
              <><Check className="w-4 h-4 mr-2" /> {t('useThisCover')}</>
            )}
          </Button>
        </div>
      </div>

      {/* Image Grid */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          {t('allBookImages', { count: validImages.length })}
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {validImages.map((url, idx) => {
            const isSelected = url === selectedUrl
            return (
              <button
                key={idx}
                type="button"
                onClick={() => { setSelectedUrl(url); setAiReason('') }}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-300 scale-105 shadow-lg'
                    : 'border-transparent hover:border-blue-300 hover:scale-[1.02]'
                }`}
              >
                <img
                  src={url}
                  alt={`Image ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                    <div className="bg-blue-600 rounded-full p-1">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
