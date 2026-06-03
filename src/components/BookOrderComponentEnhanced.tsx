'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Loader2, Package, Truck, AlertTriangle, Eye, FileText, Bookmark, Star, Trash2, Plus, ShoppingCart, Minus, CreditCard } from 'lucide-react'
import { useHaptics } from '@/hooks/useHaptics'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { getStripePublishableKey } from '@/lib/stripe'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/components/ui/toast'

const stripePromise = loadStripe(getStripePublishableKey())

interface Book {
 id: string
 title: string
 author?: string | null
 book_type?: 'text' | 'picture'
 status?: string
 chapters?: Array<{
 id: string
 title: string
 content: string
 }>
}

interface BookOrderComponentProps {
 book: Book
 onOrderComplete?: (orderId: string) => void
}

interface BookFormat {
 id: string
 name: string
 description: string
 size: string
 product_id: string
 basePrice: number
}

interface PaperType {
 id: string
 name: string
 description: string
 priceDiff: number
}

interface CoverType {
 id: string
 name: string
 description: string
 priceDiff: number
}

interface ShippingAddress {
 name: string
 street1: string
 street2?: string
 city: string
 country_code: string
 postcode: string
 state_code?: string
 phone_number: string
}

interface SavedAddress {
 id: string
 label: string
 name: string
 street1: string
 street2?: string
 city: string
 state_code?: string
 country_code: string
 postcode: string
 phone_number: string
 is_default: boolean
}

// Payment Form Component with Stripe Elements
function PaymentForm({
 onSuccess,
 paymentIntentId,
 clientSecret,
 onCancel
}: {
 onSuccess: (paymentIntentId: string) => void
 paymentIntentId: string
 clientSecret: string
 onCancel: () => void
}) {
 const stripe = useStripe()
 const elements = useElements()
 const [isProcessing, setIsProcessing] = useState(false)
 const [paymentError, setPaymentError] = useState<string | null>(null)
 const { impact } = useHaptics()
 const { t } = useLanguage()

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()

 if (!stripe || !elements) {
 return
 }

 setIsProcessing(true)
 setPaymentError(null)
 impact('medium')

 try {
 const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
 payment_method: {
 card: elements.getElement(CardElement)!
 }
 })

 if (error) {
 setPaymentError(error.message || 'Payment failed')
 setIsProcessing(false)
 } else if (paymentIntent?.status === 'succeeded') {
 impact('heavy')
 onSuccess(paymentIntent.id)
 }
 } catch (err) {
 setPaymentError('Payment failed. Please try again.')
 setIsProcessing(false)
 }
 }

 return (
 <form onSubmit={handleSubmit} className="space-y-6">
 {/* Card Input Section */}
 <div className="relative">
 <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-sky-50 rounded-2xl blur-xl opacity-50" />
 <div className="relative bg-white/80 backdrop-blur-sm border-2 border-blue-100 rounded-2xl p-6 shadow-xl">
 <div className="flex items-center gap-3 mb-4">
 <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
 <CreditCard className="h-5 w-5 text-white" />
 </div>
 <div>
 <Label className="text-base font-semibold text-gray-900">{t('paymentInformation')}</Label>
 <p className="text-xs text-gray-500">{t('dataTransmittedEncrypted')}</p>
 </div>
 </div>

 <div className="bg-background dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 focus-within:border-bookcraft-blue focus-within:ring-4 focus-within:ring-bookcraft-blue/10 dark:focus-within:ring-bookcraft-blue/20 transition-all">
 <CardElement
 options={{
 style: {
 base: {
 fontSize: '16px',
 color: '#1f2937',
 fontFamily: 'system-ui, -apple-system, sans-serif',
 '::placeholder': {
 color: '#9ca3af',
 },
 iconColor: '#3b82f6',
 },
 invalid: {
 color: '#ef4444',
 iconColor: '#ef4444',
 },
 },
 }}
 />
 </div>

 {/* Security Badges */}
 <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
 <div className="flex items-center gap-1.5 text-xs text-gray-600">
 <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
 <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
 </svg>
 <span className="font-medium">256-bit SSL</span>
 </div>
 <div className="flex items-center gap-1.5 text-xs text-gray-600">
 <svg className="h-4 w-4 text-bookcraft-blue" fill="currentColor" viewBox="0 0 20 20">
 <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
 </svg>
 <span className="font-medium">{t('pciDssCompliant')}</span>
 </div>
 <div className="ml-auto">
 <svg className="h-6 w-auto text-blue-600" viewBox="0 0 60 25" fill="currentColor">
 <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 01-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 013.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 01-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 01-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 00-4.1-1.06c-.86 0-1.44.25-1.44.9 0 1.85 6.29.97 6.29 5.88z"/>
 </svg>
 </div>
 </div>
 </div>
 </div>

 {paymentError && (
 <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-900 rounded-xl p-4 flex items-start gap-3">
 <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
 <div className="flex-1">
 <p className="text-sm font-medium text-red-900 dark:text-red-100">{t('paymentFailed')}</p>
 <p className="text-sm text-red-700 dark:text-red-300 mt-1">{paymentError}</p>
 </div>
 </div>
 )}

 <div className="flex gap-3">
 <Button
 type="button"
 variant="outline"
 onClick={onCancel}
 disabled={isProcessing}
 className="flex-1 touch-target h-14 text-base font-semibold border-2 hover:bg-gray-50"
 size="lg"
 >
 Cancel
 </Button>
 <Button
 type="submit"
 disabled={!stripe || isProcessing}
 className="flex-1 touch-target h-14 text-base font-semibold bg-gradient-to-r from-bookcraft-blue to-bookcraft-blue hover:brightness-110 shadow-lg hover:shadow-xl transition-all"
 size="lg"
 >
 {isProcessing ? (
 <>
 <Loader2 className="mr-2 h-5 w-5 animate-spin" />
 Processing payment...
 </>
 ) : (
 <>
 <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 Pay securely now
 </>
 )}
 </Button>
 </div>

 {/* Trust Indicators */}
 <div className="text-center">
 <p className="text-xs text-gray-500">
 Your payment is securely processed via Stripe. We do not store credit card data.
 </p>
 </div>
 </form>
 )
}

export default function BookOrderComponentEnhanced({ book, onOrderComplete }: BookOrderComponentProps) {
 const { getIdToken } = useAuth()
 const { impact } = useHaptics()
 const { showToast } = useToast()
 const { t } = useLanguage()
 const [isOrdering, setIsOrdering] = useState(false)
 const [orderStep, setOrderStep] = useState<'address' | 'confirm' | 'payment' | 'processing' | 'complete'>('address')
 const [error, setError] = useState<string | null>(null)
 const [pdfStatus, setPdfStatus] = useState<'checking' | 'generating' | 'ready' | 'error'>('checking')
 const [estimatedCost, setEstimatedCost] = useState<string | null>(null)
 const [realTimePricing, setRealTimePricing] = useState<any>(null)
 const [isPricingLoading, setIsPricingLoading] = useState(false)
 const [orderId, setOrderId] = useState<string | null>(null)
 const [clientSecret, setClientSecret] = useState<string | null>(null)
 const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)

 const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
 name: '',
 street1: '',
 street2: '',
 city: '',
 country_code: 'DE',
 postcode: '',
 state_code: '',
 phone_number: ''
 })

 const [shippingLevel, setShippingLevel] = useState<'MAIL' | 'PRIORITY_MAIL' | 'GROUND' | 'EXPEDITED' | 'EXPRESS'>('MAIL')
 const [selectedFormat, setSelectedFormat] = useState<string>('')
 const [selectedPaper, setSelectedPaper] = useState<string>('white')
 const [selectedCover, setSelectedCover] = useState<string>('matte')
 const [isPreviewLoading, setIsPreviewLoading] = useState<string | null>(null)
 const [quantity, setQuantity] = useState<number>(1)
 const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
 const [isLoadingAddresses, setIsLoadingAddresses] = useState(false)
 const [showAddressSelector, setShowAddressSelector] = useState(false)
 const [saveAddress, setSaveAddress] = useState(false)
 const [addressLabel, setAddressLabel] = useState('')

  // Available book formats based on Lulu specifications
 const bookFormats: BookFormat[] = [
 {
 id: '6x9',
 name: '6" × 9" (15.2 × 22.9 cm)',
 description: 'Standard novel size - most popular',
 size: '6" × 9"',
 product_id: book.book_type === 'picture' ? '0600X0900FCSTDPB060UW444MXX' : '0600X0900BWSTDPB060UW444MXX',
 basePrice: 5.99
 },
 {
 id: '5.5x8.5',
 name: '5.5" × 8.5" (14 × 21.6 cm)',
 description: 'Compact paperback size',
 size: '5.5" × 8.5"',
 product_id: book.book_type === 'picture' ? '0550X0850FCSTDPB060UW444MXX' : '0550X0850BWSTDPB060UW444MXX',
 basePrice: 5.49
 },
 {
 id: '8.5x11',
 name: '8.5" × 11" (21.6 × 27.9 cm)',
 description: 'Large format - ideal for workbooks',
 size: '8.5" × 11"',
 product_id: book.book_type === 'picture' ? '0850X1100FCSTDPB060UW444MXX' : '0850X1100BWSTDPB060UW444MXX',
 basePrice: 7.99
 },
 {
 id: '7.5x7.5',
 name: '7.5" × 7.5" (19.1 × 19.1 cm)',
 description: 'Square format - great for picture books',
 size: '7.5" × 7.5"',
 product_id: book.book_type === 'picture' ? '0750X0750FCSTDPB060UW444MXX' : '0750X0750BWSTDPB060UW444MXX',
 basePrice: 6.99
 }
 ]

 const paperTypes: PaperType[] = [
 {
 id: 'white',
 name: 'White Paper (60# Uncoated)',
 description: 'Standard white paper - versatile and cost-effective',
 priceDiff: 0
 },
 {
 id: 'cream',
 name: 'Cream Paper (60# Uncoated)',
 description: 'Traditional cream paper - ideal for novels',
 priceDiff: 0.50
 }
 ]

 const coverTypes: CoverType[] = [
 {
 id: 'matte',
 name: 'Matte Coating',
 description: 'Reduces glare, professional appearance',
 priceDiff: 0
 },
 {
 id: 'gloss',
 name: 'Glossy Coating',
 description: 'Vibrant colors, glossy finish',
 priceDiff: 0.25
 }
 ]

  // Check PDF status when component mounts
 useEffect(() => {
 checkPDFStatus()
 loadSavedAddresses()
    // Set default format based on book type
 if (!selectedFormat) {
 setSelectedFormat(book.book_type === 'picture' ? '7.5x7.5' : '6x9')
 }
 }, []) // eslint-disable-line react-hooks/exhaustive-deps

 const loadSavedAddresses = async () => {
 try {
 setIsLoadingAddresses(true)
 const token = await getIdToken()
 if (!token) return

 const response = await fetch('/api/saved-addresses', {
 headers: {
 'Authorization': `Bearer ${token}`
 }
 })

 const data = await response.json()
 if (data.success) {
 setSavedAddresses(data.addresses || [])

        // Auto-load default address if exists
 const defaultAddr = data.addresses.find((addr: SavedAddress) => addr.is_default)
 if (defaultAddr) {
 loadAddressToForm(defaultAddr)
 }
 }
 } catch (error) {
      console.error('Error loading saved addresses:', error)
 } finally {
 setIsLoadingAddresses(false)
 }
 }

 const loadAddressToForm = (address: SavedAddress) => {
 setShippingAddress({
 name: address.name,
 street1: address.street1,
 street2: address.street2 || '',
 city: address.city,
 state_code: address.state_code || '',
 country_code: address.country_code,
 postcode: address.postcode,
 phone_number: address.phone_number
 })
 setShowAddressSelector(false)
 impact('light')
 }

 const handleSaveCurrentAddress = async () => {
 try {
 const token = await getIdToken()
 if (!token) return

 if (!addressLabel.trim()) {
 setError(t('enterAddressName'))
 return
 }

 const response = await fetch('/api/saved-addresses', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({
 label: addressLabel,
 ...shippingAddress,
 is_default: savedAddresses.length === 0 // First address becomes default
 })
 })

 const data = await response.json()
 if (data.success) {
 setSavedAddresses([...savedAddresses, data.address])
 setSaveAddress(false)
 setAddressLabel('')
 setError(null)
 impact('medium')
 } else {
 setError(data.error || t('couldNotSaveAddress'))
 }
 } catch (error) {
      console.error('Error saving address:', error)
      setError(t('couldNotSaveAddress'))
 }
 }

 const handleDeleteAddress = async (addressId: string) => {
 try {
 const token = await getIdToken()
 if (!token) return

 const response = await fetch(`/api/saved-addresses?id=${addressId}`, {
 method: 'DELETE',
 headers: {
 'Authorization': `Bearer ${token}`
 }
 })

 const data = await response.json()
 if (data.success) {
 setSavedAddresses(savedAddresses.filter(addr => addr.id !== addressId))
 impact('medium')
 }
 } catch (error) {
      console.error('Error deleting address:', error)
      showToast('Could not delete address. Please try again.', 'error')
 }
 }

 const checkPDFStatus = async () => {
 try {
 const token = await getIdToken()
 if (!token) {
 setError(t('authenticationFailed'))
 setPdfStatus('error')
 return
 }

 const response = await fetch(`/api/books/${book.id}/generate-pdfs`, {
 headers: {
 'Authorization': `Bearer ${token}`
 }
 })

 const data = await response.json()

 if (data.has_pdfs) {
 setPdfStatus('ready')
 } else {
        // Generate PDFs if they don't exist
 await generatePDFs()
 }
 } catch (error) {
      console.error('Error checking PDF status:', error)
 setPdfStatus('error')
 setError(t('failedToCheckPdfStatus'))
 }
 }

 const generatePDFs = async () => {
 try {
 setPdfStatus('generating')

 const token = await getIdToken()
 if (!token) {
 setError(t('authenticationFailed'))
 setPdfStatus('error')
 return
 }

 const response = await fetch(`/api/books/${book.id}/generate-pdfs`, {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${token}`
 }
 })

 const data = await response.json()

 if (data.success) {
 setPdfStatus('ready')
 } else {
 setPdfStatus('error')
 setError(t('failedToGeneratePdfs') + (data.error ? ': ' + data.error : ''))
 }
 } catch (error) {
      console.error('Error generating PDFs:', error)
 setPdfStatus('error')
 setError(t('failedToGeneratePdfs'))
 }
 }

 const handlePDFPreview = (type: 'cover' | 'interior') => {
 setIsPreviewLoading(type)
 impact('light')

    // Open PDF viewer page in new tab
 const viewerUrl = `/dashboard/books/${book.id}/pdf-viewer?type=${type}`
 window.open(viewerUrl, '_blank')

 setIsPreviewLoading(null)
 }

 const handleAddressSubmit = async (e: React.FormEvent) => {
 e.preventDefault()

    // Validate address
 const requiredFields: Array<[keyof ShippingAddress, string]> = [
      ['name', 'Full name'],
      ['street1', 'Street address'],
      ['city', 'City'],
      ['country_code', 'Country'],
      ['postcode', 'Postcode / ZIP'],
      ['phone_number', 'Phone number'],
 ]
 for (const [field, label] of requiredFields) {
 if (!shippingAddress[field]) {
 setError(`Please fill in the "${label}" field`)
 return
 }
 }

 setError(null)
 setOrderStep('confirm')
 impact('medium')

    // Calculate real-time pricing from Lulu API
 await calculateRealTimePricing()
 }

 const calculateRealTimePricing = async () => {
 if (!shippingAddress.name || !shippingAddress.street1 || !shippingAddress.city ||
 !shippingAddress.country_code || !shippingAddress.postcode || !shippingAddress.phone_number) {
 return // Don't calculate if address is incomplete
 }

 setIsPricingLoading(true)
 try {
 const token = await getIdToken()
 if (!token) return

 const response = await fetch('/api/pricing', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({
 shippingAddress,
 shippingLevel,
 bookFormat: selectedFormat,
 paperType: selectedPaper,
 coverType: selectedCover,
 bookType: book.book_type || 'text',
 quantity: quantity,
 chapters: book.chapters || [],
 pageCount: book.chapters?.length ? Math.max(20, Math.min(500, book.chapters.reduce((total, chapter) =>
 total + Math.ceil((chapter.content?.length || 0) / 2000), 0))) : 50
 })
 })

 const data = await response.json()
 if (data.success) {
 setRealTimePricing(data)
 setEstimatedCost(data.pricing.total.incl_tax)
 setError(null) // Clear any previous errors
 } else {
        // Handle API errors with user-friendly messages
 const errorMsg = data.details
 ? `${data.error}: ${data.details}`
 : data.error || 'Price calculation failed'

        console.error('Pricing error:', errorMsg)
 setError(errorMsg)
 setRealTimePricing(null)
 }
 } catch (error) {
      console.error('Error calculating real-time pricing:', error)
 setError(t('priceCalculationFailed'))
 setRealTimePricing(null)
 } finally {
 setIsPricingLoading(false)
 }
 }

 const handleOrderConfirm = async () => {
 setIsOrdering(true)
 setOrderStep('payment')
 setError(null)
 impact('medium')

 try {
 const token = await getIdToken()
 if (!token) {
 setError(t('authenticationFailed'))
 setIsOrdering(false)
 setOrderStep('address')
 return
 }

      // Create Payment Intent
 const response = await fetch('/api/print-payment', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({
 bookId: book.id,
 bookTitle: book.title,
 quantity: quantity,
 luluTotalCost: realTimePricing?.total_cost_incl_tax || Math.round(estimatedCost ? parseFloat(estimatedCost) * 100 : 1000),
 currency: realTimePricing?.line_item_costs?.[0]?.currency || 'USD',
 shippingAddress: {
 name: shippingAddress.name,
 country_code: shippingAddress.country_code
 }
 })
 })

 const data = await response.json()

 if (data.clientSecret && data.paymentIntentId) {
 setClientSecret(data.clientSecret)
 setPaymentIntentId(data.paymentIntentId)
 } else {
 setError(data.error || t('failedToCreatePayment'))
 setOrderStep('confirm')
 }
 } catch (error) {
      console.error('Error creating payment:', error)
 setError(t('failedToCreatePayment'))
 setOrderStep('confirm')
 } finally {
 setIsOrdering(false)
 }
 }

 const handlePaymentSuccess = async (paymentIntentId: string) => {
 setIsOrdering(true)
 setOrderStep('processing')
 setError(null)
 impact('heavy')

 try {
 const token = await getIdToken()
 if (!token) {
 setError(t('authenticationFailed'))
 setIsOrdering(false)
 setOrderStep('payment')
 return
 }

 const response = await fetch('/api/print-jobs', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({
 bookId: book.id,
 shippingAddress,
 shippingLevel,
 bookFormat: selectedFormat,
 paperType: selectedPaper,
 coverType: selectedCover,
 quantity: quantity,
 paymentIntentId: paymentIntentId
 })
 })

 const data = await response.json()

 if (data.success) {
 setOrderId(data.print_job_id)
 setOrderStep('complete')
 impact('heavy')
 onOrderComplete?.(data.print_job_id)
 } else {
 setError(data.error || t('failedToCreatePrintOrder'))
 setOrderStep('payment')
 }
 } catch (error) {
      console.error('Error creating print order:', error)
 setError(t('failedToCreatePrintOrder'))
 setOrderStep('payment')
 } finally {
 setIsOrdering(false)
 }
 }

 const getShippingLevelDescription = (level: string): string => {
 switch (level) {
 case 'MAIL': return 'Standard (7-10 business days)'
 case 'PRIORITY_MAIL': return 'Priority (5-7 business days)'
 case 'GROUND': return 'Ground (5-8 business days)'
 case 'EXPEDITED': return 'Expedited (3-5 business days)'
 case 'EXPRESS': return 'Express (1-2 business days)'
 default: return 'Standard Shipping'
 }
 }

 if (pdfStatus === 'checking' || pdfStatus === 'generating') {
 return (
 <Card className="w-full max-w-2xl mx-auto">
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Package className="h-5 w-5" />
 Preparing book for print
 </CardTitle>
 <CardDescription>
 Your book is being prepared for printing...
 </CardDescription>
 </CardHeader>
 <CardContent>
 <div className="flex items-center gap-3">
 <Loader2 className="h-5 w-5 animate-spin" />
 <span>
 {pdfStatus === 'checking' ? 'Checking PDF files...' : 'Generating print-ready PDFs...'}
 </span>
 </div>
 </CardContent>
 </Card>
 )
 }

 if (pdfStatus === 'error') {
 return (
 <Card className="w-full max-w-2xl mx-auto">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-red-600">
 <AlertTriangle className="h-5 w-5" />
 Book cannot be prepared
 </CardTitle>
 <CardDescription>
 A problem occurred while preparing your book for printing.
 </CardDescription>
 </CardHeader>
 <CardContent>
 <p className="text-sm text-gray-600 mb-4">
 {error || 'Please try again or contact support if the problem persists.'}
 </p>
 <Button onClick={checkPDFStatus} variant="outline" className="touch-target">
 Try again
 </Button>
 </CardContent>
 </Card>
 )
 }

 return (
 <div className="w-full max-w-4xl mx-auto">
 {/* Premium Header with Gradient */}
 <div className="relative overflow-hidden mb-8">
 <div className="absolute inset-0 bg-gradient-to-r from-bookcraft-blue via-bookcraft-blue to-bookcraft-blue opacity-5" />
 <div className="relative bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl border border-gray-200/50 p-8">
 <div className="flex items-start justify-between">
 <div className="flex items-start gap-6">
 <div className="relative">
 <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl blur-lg opacity-20 animate-pulse" />
 <div className="relative bg-gradient-to-br from-bookcraft-blue to-bookcraft-blue p-5 rounded-2xl shadow-xl">
 <Package className="h-8 w-8 text-white" />
 </div>
 </div>
 <div className="flex-1">
 <div className="flex items-center gap-3 mb-2">
 <h2 className="text-3xl font-bold font-display bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
 Print-on-Demand
 </h2>
 {book.book_type && (
 <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 px-3 py-1">
 {book.book_type === 'picture' ? ' Picture Book' : ' Text Book'}
 </Badge>
 )}
 </div>
 <p className="text-gray-600 text-lg">
 Order your book <span className="font-semibold text-gray-900">&quot;{book.title}&quot;</span> as a high-quality print product
 </p>
 <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200">
 <div className="flex items-center gap-2 text-sm text-gray-600">
 <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
 </svg>
 <span className="font-medium">{t('premiumPrint')}</span>
 </div>
 <div className="flex items-center gap-2 text-sm text-gray-600">
 <Truck className="h-5 w-5 text-bookcraft-blue" />
 <span className="font-medium">{t('fastShipping')}</span>
 </div>
 <div className="flex items-center gap-2 text-sm text-gray-600">
 <svg className="h-5 w-5 text-bookcraft-blue" fill="currentColor" viewBox="0 0 20 20">
 <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
 </svg>
 <span className="font-medium">{t('secureMethod')}</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Error Message */}
 {error && (
 <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-6 mb-6 shadow-lg">
 <div className="flex items-start gap-4">
 <div className="p-3 bg-red-100 rounded-xl">
 <AlertTriangle className="h-6 w-6 text-red-600" />
 </div>
 <div className="flex-1">
 <h4 className="font-bold text-red-900 mb-1">{t('anErrorOccurred')}</h4>
 <p className="text-red-700">{error}</p>
 </div>
 </div>
 </div>
 )}

 {/* Main Content Card */}
 <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-gradient-to-br from-white to-gray-50">
 <CardContent className="p-8">
 {orderStep === 'address' && (
 <div className="space-y-6">
 {/* Saved Addresses Section */}
 {savedAddresses.length > 0 && (
 <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
 <div className="flex items-center justify-between mb-3">
 <h3 className="font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
 <Bookmark className="h-4 w-4" />
 Saved Addresses
 </h3>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setShowAddressSelector(!showAddressSelector)}
 className="touch-target"
 >
 {showAddressSelector ? 'Hide' : 'Show'}
 </Button>
 </div>

 {showAddressSelector && (
 <div className="space-y-2">
 {savedAddresses.map((addr) => (
 <div
 key={addr.id}
 className="flex items-start justify-between bg-card p-3 rounded border border-border hover:border-bookcraft-blue/40 dark:hover:border-bookcraft-blue/40 transition-colors"
 >
 <button
 onClick={() => loadAddressToForm(addr)}
 className="flex-1 text-left touch-target"
 >
 <div className="flex items-center gap-2 mb-1">
 <span className="font-medium text-sm">{addr.label}</span>
 {addr.is_default && (
 <Badge variant="secondary" className="text-xs">
 <Star className="h-3 w-3 mr-1" />
 Default
 </Badge>
 )}
 </div>
 <div className="text-xs text-muted-foreground">
 {addr.name}, {addr.city}, {addr.country_code}
 </div>
 </button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleDeleteAddress(addr.id)}
 className="text-red-600 hover:text-red-700 touch-target"
 >
 <Trash2 className="h-4 w-4" />
 </Button>
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {/* PDF Preview Section */}
 <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
 <h3 className="font-medium mb-3 text-blue-900 dark:text-blue-100"> Book Preview</h3>
 <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
 View your book as PDF before ordering:
 </p>
 <div className="flex flex-wrap gap-3">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => handlePDFPreview('interior')}
 disabled={isPreviewLoading !== null}
 className="bg-card touch-target"
 >
 {isPreviewLoading === 'interior' ? (
 <Loader2 className="w-4 h-4 mr-2 animate-spin" />
 ) : (
 <FileText className="w-4 h-4 mr-2" />
 )}
 View Interior PDF
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => handlePDFPreview('cover')}
 disabled={isPreviewLoading !== null}
 className="bg-card touch-target"
 >
 {isPreviewLoading === 'cover' ? (
 <Loader2 className="w-4 h-4 mr-2 animate-spin" />
 ) : (
 <Eye className="w-4 h-4 mr-2" />
 )}
 View Cover PDF
 </Button>
 </div>
 </div>

 {/* Book Format and Quantity */}
 {/* Product Configuration Section */}
 <div className="relative overflow-hidden mb-6">
 <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-blue-950/30 opacity-50 rounded-2xl" />
 <div className="relative bg-card/80 backdrop-blur-sm border-2 border-blue-100 dark:border-blue-900 rounded-2xl p-6 shadow-lg">
 <div className="flex items-center gap-3 mb-6">
 <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
 <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
 </svg>
 </div>
 <h3 className="text-xl font-bold font-display text-foreground">{t('configureProduct')}</h3>
 </div>

 {/* Quantity Selector - Premium Style */}
 <div className="mb-6">
 <Label className="text-sm font-semibold text-foreground mb-3 block">{t('quantity')}</Label>
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-2 bg-gradient-to-br from-muted to-card border-2 border-border rounded-xl p-2 shadow-sm">
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => {
 if (quantity > 1) {
 setQuantity(quantity - 1)
 impact('light')
 }
 }}
 disabled={quantity <= 1}
 className="h-10 w-10 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-all"
 >
 <Minus className="h-5 w-5 text-gray-700" />
 </Button>
 <div className="relative">
 <Input
 id="quantity"
 type="number"
 min="1"
 max="50"
 value={quantity}
 onChange={(e) => {
 const val = parseInt(e.target.value)
 if (val >= 1 && val <= 50) {
 setQuantity(val)
 }
 }}
 className="w-24 h-10 text-center text-2xl font-bold border-0 bg-transparent focus:ring-0 focus:outline-none"
 />
 </div>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => {
 if (quantity < 50) {
 setQuantity(quantity + 1)
 impact('light')
 }
 }}
 disabled={quantity >= 50}
 className="h-10 w-10 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-all"
 >
 <Plus className="h-5 w-5 text-gray-700" />
 </Button>
 </div>
 <div className="flex-1">
 <p className="text-sm font-medium text-foreground">
 {quantity === 1 ? '1 Copy' : `${quantity} Copies`}
 </p>
 {quantity > 5 && (
 <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
 <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
 </svg>
 Volume discount available
 </p>
 )}
 </div>
 </div>
 </div>

 {/* Format Selection - Card Grid */}
 <div className="mb-6">
 <Label className="text-sm font-semibold text-foreground mb-3 block">{t('bookFormat')}</Label>
 <div className="grid grid-cols-2 gap-3">
 {bookFormats.map((format) => (
 <button
 key={format.id}
 type="button"
 onClick={() => {
 setSelectedFormat(format.id)
 impact('light')
 }}
 className={`relative p-4 rounded-xl border-2 text-left transition-all ${
 selectedFormat === format.id
 ? 'border-bookcraft-blue bg-gradient-to-br from-bookcraft-blue/5 to-bookcraft-blue/5 dark:from-bookcraft-blue/10 dark:to-bookcraft-blue/10 shadow-lg'
 : 'border-border bg-card hover:border-bookcraft-blue/30 dark:hover:border-bookcraft-blue/30 hover:shadow-md'
 }`}
 >
 {selectedFormat === format.id && (
 <div className="absolute top-2 right-2 w-6 h-6 bg-gradient-to-br from-bookcraft-blue to-bookcraft-blue rounded-full flex items-center justify-center">
 <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
 <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
 </svg>
 </div>
 )}
 <div className="text-base font-bold text-foreground mb-1">{format.name}</div>
 <div className="text-xs text-muted-foreground">{format.description}</div>
 </button>
 ))}
 </div>
 </div>

 {/* Paper Type Selection */}
 <div className="mb-6">
 <Label className="text-sm font-semibold text-foreground mb-3 block">{t('paperType')}</Label>
 <Select value={selectedPaper} onValueChange={setSelectedPaper}>
 <SelectTrigger className="h-12 border-2 border-border rounded-xl hover:border-bookcraft-blue/40 dark:hover:border-bookcraft-blue/40 transition-colors">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {paperTypes.map((paper) => (
 <SelectItem key={paper.id} value={paper.id}>
 <div className="flex flex-col py-1">
 <span className="font-semibold">{paper.name}</span>
 <span className="text-xs text-muted-foreground">
 {paper.description} {paper.priceDiff > 0 && `(+€${paper.priceDiff.toFixed(2)})`}
 </span>
 </div>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Cover Type Selection */}
 <div>
 <Label className="text-sm font-semibold text-foreground mb-3 block">{t('coverCoating')}</Label>
 <Select value={selectedCover} onValueChange={setSelectedCover}>
 <SelectTrigger className="h-12 border-2 border-border rounded-xl hover:border-bookcraft-blue/40 dark:hover:border-bookcraft-blue/40 transition-colors">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {coverTypes.map((cover) => (
 <SelectItem key={cover.id} value={cover.id}>
 <div className="flex flex-col py-1">
 <span className="font-semibold">{cover.name}</span>
 <span className="text-xs text-muted-foreground">
 {cover.description} {cover.priceDiff > 0 && `(+€${cover.priceDiff.toFixed(2)})`}
 </span>
 </div>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>
 </div>

 <form onSubmit={handleAddressSubmit} className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <Label htmlFor="name">Full Name *</Label>
 <Input
 id="name"
 value={shippingAddress.name}
 onChange={(e) => setShippingAddress(prev => ({ ...prev, name: e.target.value }))}
 required
 className="touch-target"
 />
 </div>

 <div>
 <Label htmlFor="country">Country *</Label>
 <Select
 value={shippingAddress.country_code}
 onValueChange={(value) => setShippingAddress(prev => ({ ...prev, country_code: value }))}
 >
 <SelectTrigger className="touch-target">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="DE">{t('countryGermany')}</SelectItem>
 <SelectItem value="US">{t('countryUSA')}</SelectItem>
 <SelectItem value="GB">{t('countryUK')}</SelectItem>
 <SelectItem value="FR">{t('countryFrance')}</SelectItem>
 <SelectItem value="ES">{t('countrySpain')}</SelectItem>
 <SelectItem value="IT">{t('countryItaly')}</SelectItem>
 <SelectItem value="CA">{t('countryCanada')}</SelectItem>
 <SelectItem value="AU">{t('countryAustralia')}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div>
 <Label htmlFor="street1">Street Address *</Label>
 <Input
 id="street1"
 value={shippingAddress.street1}
 onChange={(e) => setShippingAddress(prev => ({ ...prev, street1: e.target.value }))}
 required
 className="touch-target"
 />
 </div>

 <div>
 <Label htmlFor="street2">Apartment, Building, etc. (optional)</Label>
 <Input
 id="street2"
 value={shippingAddress.street2 || ''}
 onChange={(e) => setShippingAddress(prev => ({ ...prev, street2: e.target.value }))}
 className="touch-target"
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <Label htmlFor="city">City *</Label>
 <Input
 id="city"
 value={shippingAddress.city}
 onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
 required
 className="touch-target"
 />
 </div>

 <div>
 <Label htmlFor="state">State/Province</Label>
 <Input
 id="state"
 value={shippingAddress.state_code || ''}
 onChange={(e) => setShippingAddress(prev => ({ ...prev, state_code: e.target.value }))}
 className="touch-target"
 />
 </div>

 <div>
 <Label htmlFor="postcode">Postal Code *</Label>
 <Input
 id="postcode"
 value={shippingAddress.postcode}
 onChange={(e) => setShippingAddress(prev => ({ ...prev, postcode: e.target.value }))}
 required
 className="touch-target"
 />
 </div>
 </div>

 <div>
 <Label htmlFor="phone">Phone Number *</Label>
 <Input
 id="phone"
 type="tel"
 placeholder="+49 123 456789"
 value={shippingAddress.phone_number}
 onChange={(e) => setShippingAddress(prev => ({ ...prev, phone_number: e.target.value }))}
 required
 className="touch-target"
 />
 </div>

 <div>
 <Label htmlFor="shipping">{t('shippingSpeed')}</Label>
 <Select
 value={shippingLevel}
 onValueChange={(value: any) => setShippingLevel(value)}
 >
 <SelectTrigger className="touch-target">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="MAIL">Standard - {getShippingLevelDescription('MAIL')}</SelectItem>
 <SelectItem value="PRIORITY_MAIL">Priority - {getShippingLevelDescription('PRIORITY_MAIL')}</SelectItem>
 <SelectItem value="GROUND">Ground - {getShippingLevelDescription('GROUND')}</SelectItem>
 <SelectItem value="EXPEDITED">Expedited - {getShippingLevelDescription('EXPEDITED')}</SelectItem>
 <SelectItem value="EXPRESS">Express - {getShippingLevelDescription('EXPRESS')}</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Save Address Option */}
 <div className="bg-muted p-3 rounded border border-border">
 <div className="flex items-center gap-2 mb-2">
 <input
 type="checkbox"
 id="save-address"
 checked={saveAddress}
 onChange={(e) => setSaveAddress(e.target.checked)}
 className="w-4 h-4"
 />
 <Label htmlFor="save-address" className="cursor-pointer">
 Save this address for future orders
 </Label>
 </div>
 {saveAddress && (
 <div className="mt-2">
 <Label htmlFor="address-label" className="text-sm">{t('addressName')}</Label>
 <div className="flex gap-2">
 <Input
 id="address-label"
 placeholder="e.g. Home, Office, Parents..."
 value={addressLabel}
 onChange={(e) => setAddressLabel(e.target.value)}
 className="touch-target"
 />
 <Button
 type="button"
 variant="outline"
 onClick={handleSaveCurrentAddress}
 disabled={!addressLabel.trim()}
 className="touch-target"
 >
 <Bookmark className="h-4 w-4" />
 </Button>
 </div>
 </div>
 )}
 </div>

 <Button type="submit" className="w-full touch-target" size="lg">
 Continue to Order Summary
 </Button>
 </form>
 </div>
 )}

 {orderStep === 'confirm' && (
 <div className="space-y-4">
 <div>
 <h3 className="font-medium mb-2 text-foreground">Shipping Address</h3>
 <div className="bg-muted p-3 rounded text-sm">
 <div>{shippingAddress.name}</div>
 <div>{shippingAddress.street1}</div>
 {shippingAddress.street2 && <div>{shippingAddress.street2}</div>}
 <div>{shippingAddress.city}, {shippingAddress.state_code} {shippingAddress.postcode}</div>
 <div>{shippingAddress.country_code}</div>
 <div className="mt-2"> {shippingAddress.phone_number}</div>
 </div>
 </div>

 <div>
 <h3 className="font-medium mb-2 text-foreground">Shipping Method</h3>
 <div className="bg-muted p-3 rounded text-sm">
 {getShippingLevelDescription(shippingLevel)}
 </div>
 </div>

 <div>
 <h3 className="font-medium mb-2 text-foreground">Book Specifications</h3>
 <div className="bg-muted p-3 rounded text-sm space-y-2">
 <div className="flex justify-between">
 <span>Quantity:</span>
 <span className="font-medium">{quantity} {quantity === 1 ? 'Copy' : 'Copies'}</span>
 </div>
 <div className="flex justify-between">
 <span>Format:</span>
 <span className="font-medium">
 {bookFormats.find(f => f.id === selectedFormat)?.name || 'Standard'}
 </span>
 </div>
 <div className="flex justify-between">
 <span>Paper:</span>
 <span className="font-medium">
 {paperTypes.find(p => p.id === selectedPaper)?.name || 'White Paper'}
 </span>
 </div>
 <div className="flex justify-between">
 <span>Cover:</span>
 <span className="font-medium">
 {coverTypes.find(c => c.id === selectedCover)?.name || 'Matte Coating'}
 </span>
 </div>
 </div>
 </div>

 <div>
 <h3 className="font-medium mb-2 text-foreground"> Transparent Pricing</h3>
 <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
 {isPricingLoading && (
 <div className="flex items-center gap-3 text-bookcraft-blue dark:text-bookcraft-blue/80">
 <Loader2 className="h-4 w-4 animate-spin" />
 <span>Fetching current prices from Lulu...</span>
 </div>
 )}

 {realTimePricing && !isPricingLoading && (
 <div className="space-y-3 text-sm">
 <div className="flex items-center gap-2 mb-3 text-blue-900 dark:text-blue-100 font-medium">
 <span> Live prices from Lulu ({realTimePricing.currency})</span>
 </div>

 <div className="space-y-2 text-blue-900 dark:text-blue-100">
 <div className="flex justify-between">
 <span>{realTimePricing.pricing.book_cost.description} (×{quantity}):</span>
 <span className="font-medium">{realTimePricing.currency === 'EUR' ? '€' : '$'}{realTimePricing.pricing.book_cost.incl_tax}</span>
 </div>
 <div className="flex justify-between">
 <span>{realTimePricing.pricing.shipping_cost.description}:</span>
 <span className="font-medium">{realTimePricing.currency === 'EUR' ? '€' : '$'}{realTimePricing.pricing.shipping_cost.incl_tax}</span>
 </div>
 {parseFloat(realTimePricing.pricing.fulfillment_cost.incl_tax) > 0 && (
 <div className="flex justify-between">
 <span>{realTimePricing.pricing.fulfillment_cost.description}:</span>
 <span className="font-medium">{realTimePricing.currency === 'EUR' ? '€' : '$'}{realTimePricing.pricing.fulfillment_cost.incl_tax}</span>
 </div>
 )}
 <hr className="border-bookcraft-blue/30 dark:border-bookcraft-blue/30" />
 <div className="flex justify-between text-base font-bold">
 <span>{realTimePricing.pricing.total.description}:</span>
 <span>{realTimePricing.currency === 'EUR' ? '€' : '$'}{realTimePricing.pricing.total.incl_tax}</span>
 </div>
 <div className="text-xs text-bookcraft-blue dark:text-bookcraft-blue/80">
 (incl. {realTimePricing.currency === 'EUR' ? '€' : '$'}{realTimePricing.pricing.total.tax} tax)
 </div>
 </div>
 </div>
 )}

 {!realTimePricing && !isPricingLoading && (
 <div className="text-sm text-bookcraft-blue dark:text-bookcraft-blue/80">
 <p> Enter your complete address to get current pricing.</p>
 </div>
 )}
 </div>
 </div>

 <div className="flex gap-3">
 <Button
 variant="outline"
 onClick={() => {
 setOrderStep('address')
 impact('light')
 }}
 className="flex-1 touch-target"
 size="lg"
 >
 Back to Address
 </Button>
 <Button
 onClick={handleOrderConfirm}
 disabled={isOrdering}
 className="flex-1 touch-target"
 size="lg"
 >
 {isOrdering ? (
 <>
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 Creating order...
 </>
 ) : (
 'Confirm Order'
 )}
 </Button>
 </div>
 </div>
 )}

 {orderStep === 'payment' && clientSecret && (
 <div className="space-y-6">
 {/* Payment Header */}
 <div className="relative overflow-hidden">
 <div className="absolute inset-0 bg-gradient-to-r from-bookcraft-blue to-bookcraft-blue opacity-10 rounded-2xl" />
 <div className="relative bg-gradient-to-br from-blue-50 to-sky-50 border-2 border-blue-200 rounded-2xl p-6">
 <div className="flex items-start gap-4">
 <div className="p-3 bg-gradient-to-br from-bookcraft-blue to-bookcraft-blue rounded-xl shadow-lg">
 <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
 </svg>
 </div>
 <div className="flex-1">
 <h3 className="text-lg font-bold font-display text-gray-900 mb-1">{t('secureMethod')}</h3>
 <p className="text-sm text-gray-600">
 Your payment is securely processed via Stripe. Your book will be printed only after successful payment.
 </p>
 </div>
 </div>
 </div>
 </div>

 {/* Order Summary */}
 {realTimePricing && (
 <div className="relative">
 <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 rounded-2xl" />
 <div className="relative bg-card/60 backdrop-blur-sm border-2 border-border rounded-2xl p-6 shadow-sm">
 <div className="flex items-center gap-2 mb-4">
 <ShoppingCart className="h-5 w-5 text-foreground" />
 <h3 className="font-bold text-foreground">{t('orderSummary')}</h3>
 </div>

 <div className="space-y-3">
 {/* Book Details */}
 <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl p-4">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
 <FileText className="h-5 w-5 text-bookcraft-blue dark:text-bookcraft-blue/80" />
 </div>
 <div className="flex-1">
 <p className="font-semibold text-foreground">{book.title}</p>
 <p className="text-sm text-muted-foreground">{quantity} {quantity === 1 ? 'Copy' : 'Copies'}</p>
 </div>
 </div>
 </div>

 {/* Price Breakdown */}
 <div className="space-y-2 pt-3">
 <div className="flex justify-between text-sm">
 <span className="text-muted-foreground">Print costs (Lulu):</span>
 <span className="font-semibold text-foreground">
 {realTimePricing.currency === 'EUR' ? '€' : '$'}{realTimePricing.pricing.total.incl_tax}
 </span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-muted-foreground">Service fee:</span>
 <span className="font-semibold text-foreground">
 {realTimePricing.currency === 'EUR' ? '€' : '$'}{(Math.max(299, Math.round(realTimePricing.total_cost_incl_tax * 0.15)) / 100).toFixed(2)}
 </span>
 </div>

 <div className="border-t-2 border-dashed border-border my-3" />

 <div className="flex justify-between items-center bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-blue-950/30 rounded-lg p-3 -mx-1">
 <span className="text-base font-bold text-foreground">Total to pay:</span>
 <span className="text-2xl font-bold bg-gradient-to-r from-bookcraft-blue to-bookcraft-blue bg-clip-text text-transparent">
 {realTimePricing.currency === 'EUR' ? '€' : '$'}{((realTimePricing.total_cost_incl_tax + Math.max(299, Math.round(realTimePricing.total_cost_incl_tax * 0.15))) / 100).toFixed(2)}
 </span>
 </div>

 <p className="text-xs text-muted-foreground text-center mt-2">
 incl. tax • Shipping costs included
 </p>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Payment Form */}
 <Elements stripe={stripePromise} options={{ clientSecret }}>
 <PaymentForm
 onSuccess={handlePaymentSuccess}
 paymentIntentId={paymentIntentId!}
 clientSecret={clientSecret}
 onCancel={() => {
 setOrderStep('confirm')
 setClientSecret(null)
 setPaymentIntentId(null)
 impact('light')
 }}
 />
 </Elements>
 </div>
 )}

 {orderStep === 'processing' && (
 <div className="text-center py-12">
 <div className="relative inline-block mb-6">
 <div className="absolute inset-0 bg-blue-200 rounded-full blur-xl animate-pulse" />
 <div className="relative bg-gradient-to-br from-blue-500 to-cyan-500 p-6 rounded-full">
 <Loader2 className="h-12 w-12 text-white animate-spin" />
 </div>
 </div>
 <h3 className="text-xl font-bold font-display text-gray-900 mb-2">{t('creatingPrintOrder')}</h3>
 <p className="text-sm text-gray-600 max-w-md mx-auto">
 Please wait while we process your order with our printing partner Lulu...
 </p>
 </div>
 )}

 {orderStep === 'complete' && (
 <div className="text-center py-8">
 {/* Success Animation */}
 <div className="relative inline-block mb-6">
 <div className="absolute inset-0 bg-green-200 dark:bg-green-800 rounded-full blur-2xl animate-pulse" />
 <div className="relative">
 <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-6 rounded-full shadow-2xl">
 <svg className="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
 </svg>
 </div>
 </div>
 </div>

 <h3 className="text-2xl font-bold font-display text-foreground mb-2">Order successful!</h3>
 <p className="text-muted-foreground mb-6 max-w-md mx-auto">
 Your print order for <span className="font-semibold">{quantity} {quantity === 1 ? 'copy' : 'copies'}</span> has been submitted and will be processed within 2 hours.
 </p>

 {/* Order ID Card */}
 <div className="bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-blue-950/30 border-2 border-blue-200 dark:border-blue-900 rounded-2xl p-6 mb-6 max-w-md mx-auto">
 <div className="flex items-center gap-3 mb-3">
 <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
 <Package className="h-5 w-5 text-bookcraft-blue dark:text-bookcraft-blue/80" />
 </div>
 <span className="text-sm font-medium text-muted-foreground">{t('orderId')}</span>
 </div>
 <div className="bg-card rounded-lg p-3 font-mono text-sm font-semibold text-foreground break-all">
 {orderId}
 </div>
 </div>

 {/* Timeline Preview */}
 <div className="bg-muted border border-border rounded-xl p-6 max-w-md mx-auto mb-6">
 <h4 className="font-semibold text-foreground mb-4 text-left">Next steps:</h4>
 <div className="space-y-3 text-left">
 <div className="flex items-start gap-3">
 <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
 <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
 <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
 </svg>
 </div>
 <div className="flex-1">
 <p className="text-sm font-medium text-foreground">{t('paymentSuccessfulStep')}</p>
 <p className="text-xs text-muted-foreground">Your payment has been confirmed</p>
 </div>
 </div>
 <div className="flex items-start gap-3">
 <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
 <Loader2 className="h-3 w-3 text-bookcraft-blue dark:text-bookcraft-blue/80 animate-spin" />
 </div>
 <div className="flex-1">
 <p className="text-sm font-medium text-foreground">{t('processing')}</p>
 <p className="text-xs text-muted-foreground">Your book is being prepared (approx. 2 hours)</p>
 </div>
 </div>
 <div className="flex items-start gap-3">
 <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
 <span className="text-xs text-muted-foreground">3</span>
 </div>
 <div className="flex-1">
 <p className="text-sm font-medium text-muted-foreground">{t('production')}</p>
 <p className="text-xs text-muted-foreground">Printing at Lulu (3-5 business days)</p>
 </div>
 </div>
 <div className="flex items-start gap-3">
 <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
 <Truck className="h-3.5 w-3.5 text-muted-foreground" />
 </div>
 <div className="flex-1">
 <p className="text-sm font-medium text-muted-foreground">{t('shipping')}</p>
 <p className="text-xs text-muted-foreground">{t('youWillReceiveTrackingNumber')}</p>
 </div>
 </div>
 </div>
 </div>

 <p className="text-xs text-muted-foreground">
 You will receive updates about your order progress in the app
 </p>
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 )
}
