'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/context/LanguageContext'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Review {
  id: string
  bookId: string
  userId: string
  rating: number
  text: string | null
  createdAt: string
  updatedAt: string
  userName: string | null
  userAvatar: string | null
}

interface ReviewsResponse {
  reviews: Review[]
  averageRating: number
  totalReviews: number
  page: number
  limit: number
}

// ─── Star Rating Component ─────────────────────────────────────────────────────

interface StarRatingProps {
  value: number
  max?: number
  interactive?: boolean
  onChange?: (value: number) => void
  size?: 'sm' | 'md' | 'lg'
}

function StarRating({ value, max = 5, interactive = false, onChange, size = 'md' }: StarRatingProps) {
  const [hovered, setHovered] = useState(0)

  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  }[size]

  const displayed = interactive && hovered > 0 ? hovered : value

  return (
    <div className="flex items-center gap-0.5" role={interactive ? 'radiogroup' : 'img'} aria-label={`${value} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1
        const filled = starValue <= displayed
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            aria-label={`${starValue} star${starValue !== 1 ? 's' : ''}`}
            onClick={() => interactive && onChange?.(starValue)}
            onMouseEnter={() => interactive && setHovered(starValue)}
            onMouseLeave={() => interactive && setHovered(0)}
            className={[
              'transition-transform duration-100',
              interactive ? 'cursor-pointer hover:scale-110 focus:outline-none focus:scale-110' : 'cursor-default',
              'disabled:cursor-default',
            ].join(' ')}
          >
            <svg
              className={[sizeClass, 'transition-colors duration-100'].join(' ')}
              viewBox="0 0 20 20"
              fill={filled ? '#FFA452' : 'none'}
              stroke={filled ? '#FFA452' : '#D1D5DB'}
              strokeWidth="1.5"
              strokeLinejoin="round"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        )
      })}
    </div>
  )
}

// ─── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, src }: { name: string | null; src: string | null }) {
  const initials = name
    ? name.split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase()).join('')
    : '?'

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ?? 'User'}
        className="w-9 h-9 rounded-full object-cover ring-2 ring-border flex-shrink-0"
      />
    )
  }

  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-bookcraft-blue to-bookcraft-blue flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ring-2 ring-border">
      {initials}
    </div>
  )
}

// ─── Review Card ───────────────────────────────────────────────────────────────

function ReviewCard({ review, index }: { review: Review; index: number }) {
  const relativeDate = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const diff = Date.now() - new Date(review.createdAt).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 30) return `${days} days ago`
    if (days < 365) return `${Math.floor(days / 30)} months ago`
    return `${Math.floor(days / 365)} years ago`
  }, [review.createdAt])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: 'easeOut' }}
    >
      <Card className="rounded-2xl border border-border bg-white dark:bg-slate-800/60">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Avatar name={review.userName} src={review.userAvatar} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1.5">
                <span className="font-semibold text-sm text-foreground">
                  {review.userName ?? 'Anonymous'}
                </span>
                <StarRating value={review.rating} size="sm" />
                <span className="text-xs text-muted-foreground ml-auto">{relativeDate}</span>
              </div>
              {review.text && (
                <p className="text-sm text-muted-foreground leading-relaxed">{review.text}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface BookReviewsProps {
  bookId: string
  /** Pass the current user's auth token to allow submitting reviews */
  authToken?: string | null
}

export default function BookReviews({ bookId, authToken }: BookReviewsProps) {
  const { t } = useLanguage()
  const [data, setData] = useState<ReviewsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [selectedRating, setSelectedRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/books/${bookId}/reviews?limit=20`)
      if (!res.ok) throw new Error('Failed to load reviews')
      const json = await res.json()
      setData(json)
    } catch {
      setError(t('loadReviewsError'))
    } finally {
      setLoading(false)
    }
  }, [bookId])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedRating === 0) {
      setSubmitError(t('selectRatingError'))
      return
    }
    if (!authToken) {
      setSubmitError(t('signedInError'))
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch(`/api/books/${bookId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ rating: selectedRating, text: reviewText.trim() || undefined }),
      })

      const json = await res.json()

      if (!res.ok) {
        setSubmitError(json.error ?? t('submitReviewError'))
        return
      }

      setSubmitted(true)
      setSelectedRating(0)
      setReviewText('')
      // Re-fetch to show the new review
      await fetchReviews()
    } catch {
      setSubmitError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section className="mt-12 mb-8">
      {/* Section heading */}
      <div className="flex items-center gap-4 mb-8">
        <div className="h-px flex-1 bg-border" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap font-display">
          {t('reviewsSectionTitle')}
        </h2>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Aggregate rating */}
      {data && data.totalReviews > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 p-5 rounded-2xl bg-gradient-to-br from-bookcraft-orange/5 to-bookcraft-blue/5 border border-border"
        >
          <span className="text-5xl font-bold text-foreground font-display leading-none">
            {data.averageRating.toFixed(1)}
          </span>
          <div className="flex flex-col items-center sm:items-start gap-1">
            <StarRating value={Math.round(data.averageRating)} size="lg" />
            <span className="text-sm text-muted-foreground">
              {data.totalReviews} review{data.totalReviews !== 1 ? 's' : ''}
            </span>
          </div>
        </motion.div>
      )}

      {/* Submit form */}
      <AnimatePresence>
        {!submitted ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <Card className="rounded-2xl border border-border bg-white dark:bg-slate-800/60">
              <CardContent className="p-5 sm:p-6">
                <h3 className="font-semibold text-sm text-foreground mb-4 font-display">
                  {authToken ? t('leaveReview') : t('signInToReview')}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">{t('yourRating')}</p>
                    <StarRating
                      value={selectedRating}
                      interactive
                      onChange={setSelectedRating}
                      size="lg"
                    />
                  </div>
                  <Textarea
                    placeholder={t('reviewPlaceholder')}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    maxLength={1000}
                    disabled={!authToken || submitting}
                    className="min-h-[80px]"
                  />
                  {submitError && (
                    <p className="text-xs text-destructive">{submitError}</p>
                  )}
                  <Button
                    type="submit"
                    disabled={!authToken || submitting || selectedRating === 0}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    {submitting ? t('submittingReview') : t('submitReview')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="thanks"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-8 p-5 rounded-2xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 text-center"
          >
            <p className="text-sm font-semibold text-green-700 dark:text-green-300">
              {t('reviewThanks')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews list */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-muted-foreground text-center py-6">{error}</p>
      )}

      {!loading && !error && data && data.reviews.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center py-10 text-muted-foreground"
        >
          <p className="text-sm">{t('noReviewsYet')}</p>
        </motion.div>
      )}

      {!loading && !error && data && data.reviews.length > 0 && (
        <div className="space-y-3">
          {data.reviews.map((review, i) => (
            <ReviewCard key={review.id} review={review} index={i} />
          ))}
        </div>
      )}
    </section>
  )
}
