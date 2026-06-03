'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Package, BookOpen, ArrowRight, X, MapPin, ExternalLink, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'
import type { TranslationKey } from '@/lib/translations'

interface ShippingAddress {
  name?: string
  street1?: string
  city?: string
  state?: string
  postcode?: string
  country?: string
  phone?: string
}

interface LineItem {
  quantity?: number
  book_type?: string
  book_title?: string
  cover_type?: string
  paper_type?: string
  book_format?: string
}

interface PrintJob {
  id: string
  lulu_print_job_id?: string
  status: string
  book_title?: string
  book_id?: string
  cover_image?: string | null
  total_cost_incl_tax?: string | number
  total_cost?: number
  shipping_address?: ShippingAddress
  line_items?: LineItem[]
  tracking_number?: string
  tracking_url?: string
  carrier?: string
  created_at: string
  updated_at?: string
}

function getStatusConfig(status: string, t: (key: TranslationKey) => string): { label: string; className: string } {
  const map: Record<string, { labelKey: string; className: string }> = {
    pending:          { labelKey: 'orderStatusPending',         className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
    payment_received: { labelKey: 'orderStatusPaymentReceived', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    processing:       { labelKey: 'orderStatusProcessing',      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    production_ready: { labelKey: 'orderStatusProductionReady', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    in_production:    { labelKey: 'orderStatusInProduction',    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    shipped:          { labelKey: 'orderStatusShipped',         className: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400' },
    delivered:        { labelKey: 'orderStatusDelivered',       className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    error:            { labelKey: 'orderStatusError',           className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    cancelled:        { labelKey: 'orderStatusCancelled',       className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
    rejected:         { labelKey: 'orderStatusRejected',        className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  }
  const config = map[status?.toLowerCase()]
  if (!config) return { label: status, className: 'bg-muted text-muted-foreground' }
  return { label: t(config.labelKey as TranslationKey), className: config.className }
}

function getTimelineSteps(t: (key: TranslationKey) => string) {
  return [
    { key: 'payment_received', label: t('orderStatusPaymentReceived') },
    { key: 'in_production',    label: t('orderStatusInProduction') },
    { key: 'shipped',          label: t('orderStatusShipped') },
    { key: 'delivered',        label: t('orderStatusDelivered') },
  ]
}

function getTimelineIndex(status: string): number {
  const keys = ['payment_received', 'in_production', 'shipped', 'delivered']
  return keys.findIndex(k => k === status?.toLowerCase())
}

function StatusBadge({ status, t }: { status: string; t: (key: TranslationKey) => string }) {
  const config = getStatusConfig(status, t)
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  )
}

function OrderSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="border border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function formatPrice(value?: string | number): string | null {
  if (value === undefined || value === null || value === '') return null
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return null
  return `€${num.toFixed(2)}`
}

function formatDate(dateStr: string, language: string): string {
  const locale = language === 'de' ? 'de-DE' : language === 'es' ? 'es-ES' : 'en-US'
  return new Date(dateStr).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getPaperLabel(paperType: string, t: (key: TranslationKey) => string): string {
  if (paperType === 'white') return t('orderPaperWhite')
  if (paperType === 'cream') return t('orderPaperCream')
  return paperType
}

function getCoverLabel(coverType: string, t: (key: TranslationKey) => string): string {
  if (coverType === 'matte') return t('orderCoverMatte')
  if (coverType === 'gloss') return t('orderCoverGloss')
  return coverType
}

function OrderDetailModal({ job, onClose }: { job: PrintJob; onClose: () => void }) {
  const { t, language } = useLanguage()
  const currentIndex = getTimelineIndex(job.status)
  const timelineSteps = getTimelineSteps(t)
  const lineItems: LineItem[] = job.line_items ?? []
  const addr: ShippingAddress = job.shipping_address ?? {}

  const price =
    job.total_cost_incl_tax != null
      ? formatPrice(job.total_cost_incl_tax)
      : job.total_cost != null
      ? `€${(job.total_cost / 100).toFixed(2)}`
      : null

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      {/* Cover Hero */}
      <div className="relative w-full h-72 sm:h-80 bg-muted overflow-hidden">
        {job.cover_image ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={job.cover_image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={job.cover_image}
              alt={job.book_title || t('unknownBook')}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-56 sm:h-64 rounded-lg shadow-2xl object-cover"
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-6 bg-muted-foreground/5 rounded-2xl">
              <BookOpen className="h-16 w-16 text-muted-foreground/30" />
            </div>
          </div>
        )}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors z-10"
        >
          <X className="h-4 w-4 text-white" />
        </button>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-5 -mt-6 relative z-10 pb-12">
        {/* Title + Status */}
        <div className="mb-6">
          <h2 className="text-xl font-bold font-display text-foreground">{job.book_title || t('unknownBook')}</h2>
          <div className="flex items-center gap-3 mt-2">
            <StatusBadge status={job.status} t={t} />
            <span className="text-xs text-muted-foreground">{formatDate(job.created_at, language)}</span>
            {price && <span className="text-sm font-bold text-foreground ml-auto">{price}</span>}
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('orderTimeline')}</p>
          <div className="relative">
            <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border" />
            <div className="space-y-4">
              {timelineSteps.map((step, i) => {
                const isActive = currentIndex >= 0 && i <= currentIndex
                return (
                  <div key={step.key} className="flex items-center gap-3 relative">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10 transition-colors ${
                        isActive
                          ? 'bg-foreground border-foreground'
                          : 'bg-background border-border'
                      }`}
                    >
                      {isActive && <div className="w-2 h-2 rounded-full bg-background" />}
                    </div>
                    <span className={`text-sm ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Line items */}
        {lineItems.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('orderItems')}</p>
            <div className="space-y-3">
              {lineItems.map((item, i) => (
                <div key={i} className="bg-muted/50 rounded-xl p-4 border border-border/50">
                  <p className="font-semibold text-foreground text-sm">
                    {item.book_title || job.book_title || t('orderBook')}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                    {item.book_format && (
                      <span>{t('orderFormat')}: <span className="text-foreground font-medium">{item.book_format}&quot;</span></span>
                    )}
                    {item.paper_type && (
                      <span>{t('orderPaper')}: <span className="text-foreground font-medium">{getPaperLabel(item.paper_type, t)}</span></span>
                    )}
                    {item.cover_type && (
                      <span>{t('orderCover')}: <span className="text-foreground font-medium">{getCoverLabel(item.cover_type, t)}</span></span>
                    )}
                    {item.quantity != null && (
                      <span>{t('orderQuantity')}: <span className="text-foreground font-medium">{item.quantity}x</span></span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shipping address */}
        {(addr.name || addr.street1) && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('orderShippingAddress')}</p>
            <div className="bg-muted/50 rounded-xl p-4 border border-border/50 flex gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm text-foreground leading-relaxed">
                {addr.name && <p className="font-medium">{addr.name}</p>}
                {addr.street1 && <p>{addr.street1}</p>}
                {(addr.postcode || addr.city) && (
                  <p>{[addr.postcode, addr.city].filter(Boolean).join(' ')}</p>
                )}
                {addr.country && <p>{addr.country}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Tracking */}
        {job.tracking_number && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {t('orderTracking')}
            </p>
            <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
              <p className="text-sm text-muted-foreground">
                {job.carrier && <>{job.carrier} · </>}
                {job.tracking_number}
              </p>
              {job.tracking_url && (
                <a
                  href={job.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-bookcraft-blue dark:text-bookcraft-blue/80 hover:underline"
                >
                  {t('orderTrackShipment')}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Back button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={onClose}
        >
          {t('backToOrders')}
        </Button>
      </div>
    </div>
  )
}

export default function OrdersPage() {
  const { t, language } = useLanguage()
  const { user, getIdToken } = useAuth()
  const [jobs, setJobs] = useState<PrintJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<PrintJob | null>(null)

  useEffect(() => {
    if (!user) return
    const fetchJobs = async () => {
      try {
        const token = await getIdToken()
        const res = await fetch('/api/print-jobs', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(t('orderLoadError'))
        const data = await res.json()
        setJobs(data.print_jobs ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : t('orderUnknownError'))
      } finally {
        setIsLoading(false)
      }
    }
    fetchJobs()
  }, [user, getIdToken, t])

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">{t('myOrders')}</h1>
            <p className="text-sm text-muted-foreground">{t('myPrintedBooks')}</p>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <OrderSkeleton />
        ) : error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-6 text-center text-destructive">{error}</CardContent>
          </Card>
        ) : jobs.length === 0 ? (
          <Card className="border border-dashed border-border">
            <CardContent className="p-10 flex flex-col items-center gap-4 text-center">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 bg-gradient-to-br from-bookcraft-blue/20 to-bookcraft-blue/20 rounded-3xl blur-xl" />
                <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-bookcraft-blue/10 to-bookcraft-blue/10 flex items-center justify-center">
                  <Package className="h-9 w-9 text-bookcraft-blue" />
                </div>
              </div>
              <div>
                <p className="font-bold font-display text-foreground text-lg">{t('noOrdersYet')}</p>
                <p className="text-muted-foreground text-sm mt-1">{t('printFirstBook')}</p>
              </div>
              <motion.div
                animate={{ boxShadow: ['0 0 0 0 rgba(62,134,215,0)', '0 0 0 8px rgba(62,134,215,0.18)', '0 0 0 0 rgba(62,134,215,0)'] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-block rounded-2xl mt-2"
              >
                <Button asChild className="rounded-2xl bg-gradient-to-r from-bookcraft-blue to-bookcraft-blue hover:brightness-110 text-white font-semibold shadow-lg shadow-bookcraft-blue/25 transition-all">
                  <Link href="/dashboard/books">
                    {t('viewBooks')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const price =
                job.total_cost_incl_tax != null
                  ? formatPrice(job.total_cost_incl_tax)
                  : job.total_cost != null
                  ? `€${(job.total_cost / 100).toFixed(2)}`
                  : null

              return (
                <Card
                  key={job.id}
                  className="border border-border hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedJob(job)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex-shrink-0">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {job.book_title || t('unknownBook')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(job.created_at, language)}
                          {price && <> · {price}</>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={job.status} t={t} />
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedJob && (
        <OrderDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </>
  )
}
