'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Checkbox } from './ui/checkbox'
import {
  Loader2, Package, Truck, AlertTriangle,
  ChevronLeft, ChevronRight, Check, Minus, Plus, X,
  BookOpen, Palette, MapPin, ClipboardList, ShoppingBag
} from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import PrintPreviewBook from '@/components/PrintPreviewBook'
import { useLanguage } from '@/context/LanguageContext'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BookPrintConfigProps {
  bookId: string
  bookTitle: string
  coverImageUrl?: string
  pageCount: number
  onClose: () => void
  onSuccess: (orderId: string) => void
}

interface ShippingAddress {
  name: string
  street1: string
  street2?: string
  city: string
  state_code?: string
  country_code: string
  postcode: string
  phone_number: string
}

interface PricingData {
  success: boolean
  currency: string
  pricing: {
    book_cost: { description: string; incl_tax: string }
    shipping_cost: { description: string; incl_tax: string }
    fulfillment_cost: { description: string; incl_tax: string }
    total: { description: string; incl_tax: string; tax: string }
    retail?: { print_retail: string; print_cost_cents: number; print_retail_cents: number }
  }
  total_cost_incl_tax: number
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, labelKey: 'format', icon: BookOpen },
  { id: 2, labelKey: 'orderEquipment', icon: Palette },
  { id: 3, labelKey: 'quantity', icon: Package },
  { id: 4, labelKey: 'shippingAddress', icon: MapPin },
  { id: 5, labelKey: 'orderOverview', icon: ClipboardList },
] as const

// ─── Book Size Options ────────────────────────────────────────────────────────

// ── Book type determines available options ────────────────────────
// Text books: BW, any paper, portrait formats
// Picture/Photo books: Full Color, white paper only, square/large formats

const TEXT_BOOK_SIZES = [
  {
    id: '6x9',
    name: '6" × 9"',
    dimensions: '15.2 × 22.9 cm',
    descriptionKey: 'sizeStandardNovel',
    popular: true,
  },
  {
    id: '5.5x8.5',
    name: '5.5" × 8.5"',
    dimensions: '14 × 21.6 cm',
    descriptionKey: 'sizeCompactPaperback',
    popular: false,
  },
  {
    id: '8.5x11',
    name: '8.5" × 11"',
    dimensions: '21.6 × 27.9 cm',
    descriptionKey: 'sizeLargeWorkbook',
    popular: false,
  },
]

const PICTURE_BOOK_SIZES = [
  {
    id: '8.5x8.5',
    name: '8.5" × 8.5"',
    dimensions: '21.6 × 21.6 cm',
    descriptionKey: 'sizeSquareIdealPictures',
    popular: true,
  },
  {
    id: '7.5x7.5',
    name: '7.5" × 7.5"',
    dimensions: '19.1 × 19.1 cm',
    descriptionKey: 'sizeCompactSquareFormat',
    popular: false,
  },
  {
    id: '8.5x11',
    name: '8.5" × 11"',
    dimensions: '21.6 × 27.9 cm',
    descriptionKey: 'sizePortraitLargeImages',
    popular: false,
  },
]

// Default BOOK_SIZES for backwards compat (merged)
const BOOK_SIZES = [...TEXT_BOOK_SIZES, ...PICTURE_BOOK_SIZES.filter(s => !TEXT_BOOK_SIZES.find(t => t.id === s.id))]

const BINDING_OPTIONS = [
  {
    id: 'paperback',
    name: 'Paperback',
    descriptionKey: 'paperbackClassicAffordable',
    priceDiff: 0,
    icon: '📄',
  },
  // Hardcover removed — not available at Lulu for these formats
]

const PAPER_OPTIONS = [
  {
    id: 'white',
    nameKey: 'whitePaper',
    descriptionKey: 'paperStandardVersatile',
    priceDiff: 0,
  },
  {
    id: 'cream',
    nameKey: 'creamPaper',
    descriptionKey: 'paperTraditionalNovels',
    priceDiff: 0,
    textOnly: true, // Only available for BW/text books
  },
]

const COLOR_OPTIONS = [
  {
    id: 'bw',
    nameKey: 'blackAndWhite',
    descriptionKey: 'costEfficient',
    bookType: 'text' as const,
    priceDiff: 0,
  },
  {
    id: 'color',
    nameKey: 'fullColor',
    descriptionKey: 'vividAndColorful',
    bookType: 'picture' as const,
    priceDiff: 3.0,
    priceNote: '+ca. €3 pro Exemplar',
  },
]

const COUNTRIES = [
  { code: 'DE', nameKey: 'germany' },
  { code: 'AT', nameKey: 'austria' },
  { code: 'CH', nameKey: 'switzerland' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', nameKey: 'france' },
  { code: 'ES', nameKey: 'spain' },
  { code: 'IT', nameKey: 'italy' },
  { code: 'CA', nameKey: 'canada' },
  { code: 'AU', nameKey: 'australia' },
]

// ─── Animation variants ───────────────────────────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
  }),
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BookPrintConfig({
  bookId,
  bookTitle,
  coverImageUrl,
  pageCount,
  onClose,
  onSuccess,
}: BookPrintConfigProps) {
  const { t } = useLanguage()
  const { getIdToken } = useAuth()

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1)
  const [direction, setDirection] = useState(1)

  // Config state
  const [selectedSize, setSelectedSize] = useState('6x9')
  const [selectedBinding, setSelectedBinding] = useState('paperback')
  const [selectedPaper, setSelectedPaper] = useState('white')
  const [selectedColor, setSelectedColor] = useState('bw')

  // Dynamic options based on color selection
  const isColorBook = selectedColor === 'color'
  const availableSizes = isColorBook ? PICTURE_BOOK_SIZES : TEXT_BOOK_SIZES
  const availablePaper = PAPER_OPTIONS.filter(p => !isColorBook || !p.textOnly)
  const [quantity, setQuantity] = useState(1)

  // Address state
  const [address, setAddress] = useState<ShippingAddress>({
    name: '',
    street1: '',
    street2: '',
    city: '',
    state_code: '',
    country_code: 'DE',
    postcode: '',
    phone_number: '',
  })
  const [saveAddress, setSaveAddress] = useState(false)
  const [addressErrors, setAddressErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({})

  // Pricing state
  const [pricing, setPricing] = useState<PricingData | null>(null)
  const [isPricingLoading, setIsPricingLoading] = useState(false)
  const [pricingError, setPricingError] = useState<string | null>(null)

  // Payment state
  const [isCreatingPayment, setIsCreatingPayment] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ─── Pricing calculation ───────────────────────────────────────────────────

  const fetchPricing = useCallback(async () => {
    if (!address.name || !address.street1 || !address.city || !address.postcode) return

    setIsPricingLoading(true)
    setPricingError(null)

    try {
      const token = await getIdToken()
      if (!token) return

      const colorOption = COLOR_OPTIONS.find(c => c.id === selectedColor)
      const bookType = colorOption?.bookType || 'text'

      const response = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          shippingAddress: address,
          shippingLevel: 'MAIL',
          bookFormat: selectedSize,
          paperType: selectedPaper,
          coverType: selectedBinding === 'hardcover' ? 'gloss' : 'matte',
          bookType,
          quantity,
          pageCount,
          chapters: [],
        }),
      })

      const data = await response.json()
      if (data.success) {
        setPricing(data)
      } else {
        setPricingError(data.error || 'Preisberechnung fehlgeschlagen')
      }
    } catch {
      setPricingError('Preisberechnung konnte nicht durchgeführt werden')
    } finally {
      setIsPricingLoading(false)
    }
  }, [address, selectedSize, selectedPaper, selectedBinding, selectedColor, quantity, pageCount, getIdToken])

  // Recalculate when relevant fields change
  useEffect(() => {
    if (currentStep >= 3) {
      const timer = setTimeout(fetchPricing, 600)
      return () => clearTimeout(timer)
    }
  }, [selectedSize, selectedPaper, selectedBinding, selectedColor, quantity, currentStep, fetchPricing])

  // ─── Navigation ───────────────────────────────────────────────────────────

  const goToStep = (step: number) => {
    setDirection(step > currentStep ? 1 : -1)
    setCurrentStep(step)
  }

  const validateAddress = (): boolean => {
    const errors: Partial<Record<keyof ShippingAddress, string>> = {}
    if (!address.name.trim()) errors.name = 'Name ist erforderlich'
    if (!address.street1.trim()) errors.street1 = t('streetRequired')
    if (!address.city.trim()) errors.city = 'Stadt ist erforderlich'
    if (!address.postcode.trim()) errors.postcode = 'Postleitzahl ist erforderlich'
    if (!address.phone_number.trim()) errors.phone_number = 'Telefonnummer ist erforderlich'
    setAddressErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleNextFromAddress = async () => {
    if (!validateAddress()) return
    goToStep(5)
    await fetchPricing()
  }

  const handleConfirmOrder = async () => {
    setIsCreatingPayment(true)
    setError(null)

    try {
      const token = await getIdToken()
      if (!token) throw new Error('Authentifizierung fehlgeschlagen')

      const colorOption = COLOR_OPTIONS.find(c => c.id === selectedColor)

      const response = await fetch('/api/stripe/print-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          bookId,
          bookTitle,
          quantity,
          luluTotalCost: pricing?.total_cost_incl_tax || 1000,
          currency: pricing?.currency || 'EUR',
          shippingAddress: address,
          bookFormat: selectedSize,
          paperType: selectedPaper,
          coverType: selectedBinding === 'hardcover' ? 'gloss' : 'matte',
          bookType: colorOption?.bookType || 'text',
          shippingLevel: 'MAIL',
        }),
      })

      const data = await response.json()

      if (data.url) {
        // Redirect to Stripe Checkout
        if (Capacitor.isNativePlatform()) {
          await Browser.open({ url: data.url })
        } else {
          window.location.href = data.url
        }
      } else {
        setError(data.error || 'Checkout-Erstellung fehlgeschlagen')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setIsCreatingPayment(false)
    }
  }

  // ─── Derived values ────────────────────────────────────────────────────────

  const currency = pricing?.currency === 'EUR' ? '€' : '$'
  const totalDisplay = pricing
    ? `${currency}${pricing.pricing.retail?.print_retail || parseFloat(pricing.pricing.total.incl_tax).toFixed(2)}`
    : null

  const selectedSizeLabel = BOOK_SIZES.find(s => s.id === selectedSize)?.name
  const selectedBindingLabel = selectedBinding === 'paperback' ? t('paperback') : BINDING_OPTIONS.find(b => b.id === selectedBinding)?.name
  const selectedPaperLabel = (() => {
    const option = PAPER_OPTIONS.find(p => p.id === selectedPaper)
    return option?.nameKey ? t(option.nameKey as any) : ''
  })()
  const selectedColorLabel = (() => {
    const option = COLOR_OPTIONS.find(c => c.id === selectedColor)
    return option?.nameKey ? t(option.nameKey as any) : ''
  })()

  // ─── Success Screen ────────────────────────────────────────────────────────

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-10 px-4"
      >
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-green-200 dark:bg-green-800 rounded-full blur-2xl opacity-60 animate-pulse" />
          <div className="relative bg-gradient-to-br from-green-400 to-emerald-500 p-6 rounded-full shadow-2xl">
            <Check className="h-12 w-12 text-white" strokeWidth={2.5} />
          </div>
        </div>

        <h2 className="text-2xl font-bold font-display text-foreground mb-2">{t('orderSuccessful')}</h2>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          Deine Bestellung für <span className="font-semibold text-foreground">{quantity} Exemplar{quantity !== 1 ? 'e' : ''}</span> von
          <span className="font-semibold text-foreground"> „{bookTitle}"</span> wurde aufgegeben.
        </p>

        {orderId && (
          <div className="bg-muted rounded-xl p-4 mb-6 max-w-xs mx-auto">
            <p className="text-xs text-muted-foreground mb-1">Bestell-ID</p>
            <p className="font-mono text-sm font-medium text-foreground break-all">{orderId}</p>
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl p-5 max-w-sm mx-auto mb-6 text-left">
          <h3 className="font-semibold text-sm text-foreground mb-3">Nächste Schritte</h3>
          <div className="space-y-2.5">
            {[
              { done: true, label: 'Zahlung bestätigt' },
              { done: false, label: t('printPreparationEta') },
              { done: false, label: 'Produktion bei Lulu (3–5 Tage)' },
              { done: false, label: t('shippingWithTracking') },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? 'bg-green-100 dark:bg-green-900/40' : 'bg-muted'}`}>
                  {step.done
                    ? <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                    : <span className="text-xs text-muted-foreground">{i + 1}</span>
                  }
                </div>
                <p className={`text-sm ${step.done ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {step.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={onClose} className="h-12 px-8">
          {t('close')}
        </Button>
      </motion.div>
    )
  }


  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full max-h-[85vh] md:max-h-none">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold font-display text-foreground">{t('printOption')}</h2>
          <p className="text-xs text-muted-foreground">{bookTitle}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label={t('close')}
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Step Indicator */}
      <div className="px-5 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isActive = step.id === currentStep
            const isCompleted = step.id < currentStep
            const Icon = step.icon

            return (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  onClick={() => step.id < currentStep && goToStep(step.id)}
                  disabled={step.id > currentStep}
                  className="flex flex-col items-center gap-1 group"
                  aria-label={`Step ${step.id}: ${t(step.labelKey as any)}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-bookcraft-blue text-white shadow-md'
                      : isActive
                        ? 'bg-bookcraft-blue text-white shadow-lg ring-4 ring-bookcraft-blue/10 dark:ring-bookcraft-blue/20'
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {isCompleted
                      ? <Check className="h-4 w-4" />
                      : <Icon className="h-4 w-4" />
                    }
                  </div>
                  <span className={`text-[10px] font-medium hidden sm:block ${
                    isActive ? 'text-bookcraft-blue' : isCompleted ? 'text-bookcraft-blue/70' : 'text-muted-foreground'
                  }`}>
                    {t(step.labelKey as any)}
                  </span>
                </button>

                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 rounded transition-colors ${
                    step.id < currentStep ? 'bg-bookcraft-blue' : 'bg-muted'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-5 mb-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-3 flex gap-2 flex-shrink-0">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4 text-red-400" />
          </button>
        </div>
      )}

      {/* Step Content */}
      <div className="flex-1 px-5 pb-4">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >

            {/* ── Step 1: Format ── */}
            {currentStep === 1 && (
              <div className="space-y-4 py-2">
                {/* Live Book Preview */}
                <div className="flex justify-center py-3">
                  <PrintPreviewBook
                    coverImage={coverImageUrl}
                    title={bookTitle}
                    format={selectedSize}
                    paper={selectedPaper as 'white' | 'cream' | 'premium'}
                    isColor={isColorBook}
                  />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">{t('chooseBookFormat')}</h3>
                  <p className="text-sm text-muted-foreground">Wähle das Format für dein gedrucktes Buch</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {availableSizes.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => setSelectedSize(size.id)}
                      className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
                        selectedSize === size.id
                          ? 'border-bookcraft-blue bg-bookcraft-blue/5 dark:bg-bookcraft-blue/10 shadow-md'
                          : 'border-border hover:border-blue-200 dark:hover:border-blue-800'
                      }`}
                    >
                      {size.popular && (
                        <Badge className="absolute -top-2 -right-2 bg-bookcraft-blue text-white text-[10px] px-1.5 py-0 h-4 border-0">
                          Beliebt
                        </Badge>
                      )}
                      {selectedSize === size.id && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-bookcraft-blue rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <p className="font-bold text-sm text-foreground mb-0.5">{size.name}</p>
                      <p className="text-xs text-muted-foreground mb-1">{size.dimensions}</p>
                      <p className="text-xs text-muted-foreground">{t(size.descriptionKey as any)}</p>
                    </button>
                  ))}
                </div>

                <Button
                  className="w-full h-12 bg-bookcraft-blue hover:brightness-110 text-white"
                  onClick={() => goToStep(2)}
                >
                  {t('next')}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}

            {/* ── Step 2: Ausstattung ── */}
            {currentStep === 2 && (
              <div className="space-y-5 py-2">
                {/* Live Book Preview */}
                <div className="flex justify-center py-3">
                  <PrintPreviewBook
                    coverImage={coverImageUrl}
                    title={bookTitle}
                    format={selectedSize}
                    paper={selectedPaper as 'white' | 'cream' | 'premium'}
                    isColor={isColorBook}
                  />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">{t('configureEquipment')}</h3>
                  <p className="text-sm text-muted-foreground">{t('bindingPaperColor')}</p>
                </div>

                {/* Binding */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">{t('paperback')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {BINDING_OPTIONS.map((binding) => (
                      <button
                        key={binding.id}
                        onClick={() => setSelectedBinding(binding.id)}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${
                          selectedBinding === binding.id
                            ? 'border-bookcraft-blue bg-bookcraft-blue/5 dark:bg-bookcraft-blue/10'
                            : 'border-border hover:border-blue-200'
                        }`}
                      >
                        <div className="text-2xl mb-2">{binding.icon}</div>
                        <p className="font-semibold text-sm text-foreground">{binding.id === 'paperback' ? t('paperback') : binding.name}</p>
                        <p className="text-xs text-muted-foreground">{binding.descriptionKey ? t(binding.descriptionKey as any) : ''}</p>
                        {binding.priceDiff > 0 && (
                          <p className="text-xs text-bookcraft-blue mt-1">+€{binding.priceDiff.toFixed(2)}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Paper */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">{t('paperType')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {availablePaper.map((paper) => (
                      <button
                        key={paper.id}
                        onClick={() => setSelectedPaper(paper.id)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          selectedPaper === paper.id
                            ? 'border-bookcraft-blue bg-bookcraft-blue/5 dark:bg-bookcraft-blue/10'
                            : 'border-border hover:border-blue-200'
                        }`}
                      >
                        <p className="font-medium text-sm text-foreground">{t(paper.nameKey as any)}</p>
                        <p className="text-xs text-muted-foreground">{t(paper.descriptionKey as any)}</p>
                        {paper.priceDiff > 0 && (
                          <p className="text-xs text-bookcraft-blue mt-0.5">+€{paper.priceDiff.toFixed(2)}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">{t('colorMode')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color.id}
                        onClick={() => {
                          setSelectedColor(color.id)
                          // Reset size to first available when switching color mode
                          const newSizes = color.id === 'color' ? PICTURE_BOOK_SIZES : TEXT_BOOK_SIZES
                          if (!newSizes.find(s => s.id === selectedSize)) {
                            setSelectedSize(newSizes[0].id)
                          }
                          // Force white paper for color books
                          if (color.id === 'color') {
                            setSelectedPaper('white')
                          }
                        }}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          selectedColor === color.id
                            ? 'border-bookcraft-blue bg-bookcraft-blue/5 dark:bg-bookcraft-blue/10'
                            : 'border-border hover:border-blue-200'
                        }`}
                      >
                        <p className="font-medium text-sm text-foreground">{t(color.nameKey as any)}</p>
                        <p className="text-xs text-muted-foreground">{t(color.descriptionKey as any)}</p>
                        {color.priceNote && (
                          <p className="text-xs text-orange-500 mt-0.5">{color.priceNote}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-12" onClick={() => goToStep(1)}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t('previous')}
                  </Button>
                  <Button className="flex-1 h-12 bg-bookcraft-blue hover:brightness-110 text-white" onClick={() => goToStep(3)}>
                    {t('next')}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 3: Menge & Preis ── */}
            {currentStep === 3 && (
              <div className="space-y-5 py-2">
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">Menge & Preis</h3>
                  <p className="text-sm text-muted-foreground">Wie viele Exemplare möchtest du bestellen?</p>
                </div>

                {/* Quantity Picker */}
                <div className="bg-muted/50 rounded-2xl p-5">
                  <p className="text-sm font-medium text-foreground mb-4">{t('numberOfCopies')}</p>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="w-12 h-12 rounded-xl bg-white dark:bg-gray-900 border-2 border-border flex items-center justify-center hover:border-bookcraft-blue/40 disabled:opacity-40 transition-colors"
                    >
                      <Minus className="h-4 w-4 text-foreground" />
                    </button>

                    <div className="flex-1 text-center">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={quantity}
                        onChange={(e) => {
                          const v = parseInt(e.target.value)
                          if (!isNaN(v) && v >= 1 && v <= 100) setQuantity(v)
                        }}
                        className="w-20 text-center text-3xl font-bold bg-transparent border-0 outline-none text-foreground"
                      />
                      <p className="text-xs text-muted-foreground">Exemplar{quantity !== 1 ? 'e' : ''}</p>
                    </div>

                    <button
                      onClick={() => setQuantity(q => Math.min(100, q + 1))}
                      disabled={quantity >= 100}
                      className="w-12 h-12 rounded-xl bg-white dark:bg-gray-900 border-2 border-border flex items-center justify-center hover:border-bookcraft-blue/40 disabled:opacity-40 transition-colors"
                    >
                      <Plus className="h-4 w-4 text-foreground" />
                    </button>
                  </div>

                  {quantity >= 10 && (
                    <p className="text-xs text-green-600 dark:text-green-400 text-center mt-3 flex items-center justify-center gap-1">
                      <Check className="h-3 w-3" />
                      Mengenrabatt verfügbar
                    </p>
                  )}
                </div>

                {/* Price Preview */}
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-foreground">{t('pricePreview')}</p>
                    {isPricingLoading && <Loader2 className="h-4 w-4 animate-spin text-bookcraft-blue" />}
                  </div>

                  {pricing && !isPricingLoading ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{t('printCostLabel')} ({quantity}×):</span>
                        <span>{currency}{pricing.pricing.book_cost.incl_tax}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Versand:</span>
                        <span>{currency}{pricing.pricing.shipping_cost.incl_tax}</span>
                      </div>
                      <div className="flex justify-between font-bold text-foreground border-t border-bookcraft-blue/20 dark:border-bookcraft-blue/30 pt-2 mt-2">
                        <span>Geschätztes Total:</span>
                        <span className="text-bookcraft-blue">{totalDisplay}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Truck className="h-3.5 w-3.5" />
                        <span>{t('standardShippingBusinessDays')}</span>
                      </div>
                    </div>
                  ) : !isPricingLoading ? (
                    <p className="text-sm text-muted-foreground">
                      Gib deine Adresse ein für genaue Preise.
                    </p>
                  ) : (
                    <p className="text-sm text-bookcraft-blue">Preise werden berechnet…</p>
                  )}

                  {pricingError && (
                    <p className="text-xs text-red-500 mt-2">{pricingError}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-12" onClick={() => goToStep(2)}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t('previous')}
                  </Button>
                  <Button className="flex-1 h-12 bg-bookcraft-blue hover:brightness-110 text-white" onClick={() => goToStep(4)}>
                    {t('next')}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 4: Lieferadresse ── */}
            {currentStep === 4 && (
              <div className="space-y-4 py-2">
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">{t('shippingAddress')}</h3>
                  <p className="text-sm text-muted-foreground">Wohin soll dein Buch geliefert werden?</p>
                </div>

                <div className="space-y-3">
                  {/* Name */}
                  <div>
                    <Label htmlFor="addr-name" className="text-sm">{t('name')} *</Label>
                    <Input
                      id="addr-name"
                      value={address.name}
                      onChange={e => setAddress(a => ({ ...a, name: e.target.value }))}
                      placeholder={t('addressNamePlaceholder')}
                      className={`mt-1 ${addressErrors.name ? 'border-red-400' : ''}`}
                    />
                    {addressErrors.name && (
                      <p className="text-xs text-red-500 mt-1">{addressErrors.name}</p>
                    )}
                  </div>

                  {/* Street */}
                  <div>
                    <Label htmlFor="addr-street" className="text-sm">{t('streetAndNumber')} *</Label>
                    <Input
                      id="addr-street"
                      value={address.street1}
                      onChange={e => setAddress(a => ({ ...a, street1: e.target.value }))}
                      placeholder={t('addressStreetPlaceholder')}
                      className={`mt-1 ${addressErrors.street1 ? 'border-red-400' : ''}`}
                    />
                    {addressErrors.street1 && (
                      <p className="text-xs text-red-500 mt-1">{addressErrors.street1}</p>
                    )}
                  </div>

                  {/* Street 2 */}
                  <div>
                    <Label htmlFor="addr-street2" className="text-sm">{t('addressLine2Label')}</Label>
                    <Input
                      id="addr-street2"
                      value={address.street2 || ''}
                      onChange={e => setAddress(a => ({ ...a, street2: e.target.value }))}
                      placeholder={t('addressAptPlaceholder')}
                      className="mt-1"
                    />
                  </div>

                  {/* City + ZIP */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="addr-zip" className="text-sm">{t('postalCode')} *</Label>
                      <Input
                        id="addr-zip"
                        value={address.postcode}
                        onChange={e => setAddress(a => ({ ...a, postcode: e.target.value }))}
                        placeholder={t('addressZipPlaceholder')}
                        className={`mt-1 ${addressErrors.postcode ? 'border-red-400' : ''}`}
                      />
                      {addressErrors.postcode && (
                        <p className="text-xs text-red-500 mt-1">{addressErrors.postcode}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="addr-city" className="text-sm">{t('cityLabel')} *</Label>
                      <Input
                        id="addr-city"
                        value={address.city}
                        onChange={e => setAddress(a => ({ ...a, city: e.target.value }))}
                        placeholder={t('addressCityPlaceholder')}
                        className={`mt-1 ${addressErrors.city ? 'border-red-400' : ''}`}
                      />
                      {addressErrors.city && (
                        <p className="text-xs text-red-500 mt-1">{addressErrors.city}</p>
                      )}
                    </div>
                  </div>

                  {/* State + Country */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="addr-state" className="text-sm">{t('stateRegionLabel')}</Label>
                      <Input
                        id="addr-state"
                        value={address.state_code || ''}
                        onChange={e => setAddress(a => ({ ...a, state_code: e.target.value }))}
                        placeholder={t('addressStatePlaceholder')}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">{t('countryLabel')} *</Label>
                      <Select
                        value={address.country_code}
                        onValueChange={v => setAddress(a => ({ ...a, country_code: v }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map(c => (
                            <SelectItem key={c.code} value={c.code}>{c.nameKey ? t(c.nameKey as any) : c.code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <Label htmlFor="addr-phone" className="text-sm">{t('phoneNumberLabel')} *</Label>
                    <Input
                      id="addr-phone"
                      type="tel"
                      value={address.phone_number}
                      onChange={e => setAddress(a => ({ ...a, phone_number: e.target.value }))}
                      placeholder={t('addressPhonePlaceholder')}
                      className={`mt-1 ${addressErrors.phone_number ? 'border-red-400' : ''}`}
                    />
                    {addressErrors.phone_number && (
                      <p className="text-xs text-red-500 mt-1">{addressErrors.phone_number}</p>
                    )}
                  </div>

                  {/* Save Address */}
                  <div className="flex items-center gap-2 py-1">
                    <Checkbox
                      id="save-addr"
                      checked={saveAddress}
                      onCheckedChange={checked => setSaveAddress(checked === true)}
                    />
                    <Label htmlFor="save-addr" className="text-sm cursor-pointer">
                      Adresse speichern
                    </Label>
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <Button variant="outline" className="flex-1 h-12" onClick={() => goToStep(3)}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t('previous')}
                  </Button>
                  <Button
                    className="flex-1 h-12 bg-bookcraft-blue hover:brightness-110 text-white"
                    onClick={handleNextFromAddress}
                  >
                    {t('next')}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 5: Zusammenfassung ── */}
            {currentStep === 5 && (
              <div className="space-y-4 py-2">
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">{t('orderOverview')}</h3>
                  <p className="text-sm text-muted-foreground">{t('reviewYourOrder')}</p>
                </div>

                {/* Book preview card */}
                <div className="bg-muted/50 rounded-2xl p-4 flex gap-4 items-center">
                  <div className="flex-shrink-0">
                    <PrintPreviewBook
                      coverImage={coverImageUrl}
                      title={bookTitle}
                      format={selectedSize}
                      paper={selectedPaper as 'white' | 'cream' | 'premium'}
                      isColor={isColorBook}
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">{bookTitle}</p>
                    <p className="text-sm text-muted-foreground">{pageCount} {t('pages')}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge variant="secondary" className="text-xs">{selectedSizeLabel}</Badge>
                      <Badge variant="secondary" className="text-xs">{selectedBindingLabel}</Badge>
                    </div>
                  </div>
                </div>

                {/* Config summary */}
                <div className="bg-white dark:bg-gray-900 border border-border rounded-2xl divide-y divide-border overflow-hidden">
                  {[
                    { label: t('format'), value: selectedSizeLabel },
                    { label: t('paperback'), value: selectedBindingLabel },
                    { label: t('paperType'), value: selectedPaperLabel },
                    { label: t('colorMode'), value: selectedColorLabel },
                    { label: t('quantity'), value: String(quantity) },
                    { label: t('shippingAddress'), value: `${address.name}, ${address.city}, ${address.country_code}` },
                    { label: t('shipping'), value: 'Standard (7–10 Werktage)' },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between items-center px-4 py-2.5">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <span className="text-sm font-medium text-foreground text-right max-w-[55%]">{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Price breakdown */}
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-2xl p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-3">Kostenübersicht</h4>
                  {isPricingLoading ? (
                    <div className="flex items-center gap-2 text-sm text-bookcraft-blue">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Preise werden geladen…
                    </div>
                  ) : pricing ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>{t('printCostLabel')} ({quantity}× à {currency}{(parseFloat(pricing.pricing.book_cost.incl_tax) / quantity).toFixed(2)}):</span>
                        <span>{currency}{pricing.pricing.book_cost.incl_tax}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Versand:</span>
                        <span>{currency}{pricing.pricing.shipping_cost.incl_tax}</span>
                      </div>
                      {parseFloat(pricing.pricing.fulfillment_cost.incl_tax) > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Bearbeitungsgebühr:</span>
                          <span>{currency}{pricing.pricing.fulfillment_cost.incl_tax}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-foreground border-t border-bookcraft-blue/20 dark:border-bookcraft-blue/30 pt-2">
                        <span>Gesamt inkl. MwSt.:</span>
                        <span className="text-bookcraft-blue text-base">{totalDisplay}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">inkl. {currency}{pricing.pricing.total.tax} MwSt.</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Preise konnten nicht geladen werden.</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-12" onClick={() => goToStep(4)}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t('previous')}
                  </Button>
                  <Button
                    className="flex-1 h-12 bg-bookcraft-blue hover:brightness-110 text-white font-semibold"
                    onClick={handleConfirmOrder}
                    disabled={isCreatingPayment}
                  >
                    {isCreatingPayment ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Vorbereitung…</>
                    ) : (
                      <>
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        Jetzt bestellen
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}



          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky Mobile Price Bar (steps 3–5) */}
      {(currentStep >= 3 && currentStep <= 5) && totalDisplay && !isPricingLoading && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex-shrink-0 border-t border-border bg-background px-5 py-3 flex items-center justify-between md:hidden"
        >
          <div>
            <p className="text-xs text-muted-foreground">Geschätztes Total</p>
            <p className="text-lg font-bold text-bookcraft-blue">{totalDisplay}</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Truck className="h-3.5 w-3.5" />
            <span>{t('includesShipping')}</span>
          </div>
        </motion.div>
      )}
    </div>
  )

}
