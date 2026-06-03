'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
 Elements,
 PaymentElement,
 AddressElement,
 useStripe,
 useElements
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
 DialogTrigger
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Printer, Package, CreditCard, Loader2, CheckCircle, Truck, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Badge } from '@/components/ui/badge'
import { formatPrice, getBookPrice } from '@/lib/pricing'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/components/ui/toast'

// TypeScript declarations for PayPal
declare global {
 interface Window {
 paypal?: {
 Buttons: (config: any) => {
 render: (selector: string) => void
 }
 }
 }
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface ShippingAddress {
 line1: string
 line2?: string
 city: string
 postal_code: string
 country: string
 state?: string
}

interface PrintOrderModalProps {
 bookId: string
 bookData: {
 title: string
 author?: string
 genre: string
 purchased: boolean // Must be true to order print
 }
 onOrderSuccess: () => void
 triggerElement?: React.ReactNode
 disabled?: boolean
}

const PRINT_OPTIONS = [
 {
 id: 'paperback',
 basePrice: 1999, // €19.99
 },
 {
 id: 'hardcover',
 basePrice: 2999, // €29.99
 }
]

const SHIPPING_COSTS = {
 'DE': 399, // €3.99
 'AT': 699, // €6.99 
 'CH': 699,
 'FR': 699,
 'NL': 699,
 'BE': 699,
 'OTHER': 1299 // €12.99
}

// Stripe Print Order Form
function PrintOrderCheckoutForm({
 bookId,
 bookData,
 printOption,
 quantity,
 shippingAddress,
 onSuccess
}: {
 bookId: string
 bookData: PrintOrderModalProps['bookData']
 printOption: string
 quantity: number
 shippingAddress: ShippingAddress
 onSuccess: () => void
}) {
 const stripe = useStripe()
 const elements = useElements()
 const [isLoading, setIsLoading] = useState(false)
 const [clientSecret, setClientSecret] = useState('')
 const { getIdToken } = useAuth()
 const { t } = useLanguage()
 const { showToast } = useToast()

  // Calculate pricing
 const selectedPrintOption = PRINT_OPTIONS.find(opt => opt.id === printOption)!
 const printPrice = selectedPrintOption.basePrice * quantity
 const shippingCost = SHIPPING_COSTS[shippingAddress.country as keyof typeof SHIPPING_COSTS] || SHIPPING_COSTS.OTHER
 const totalAmount = printPrice + shippingCost

 useEffect(() => {
    // Create payment intent when component mounts
 const createPaymentIntent = async () => {
 try {
 const token = await getIdToken?.()
 const response = await fetch(`/api/books/${bookId}/print`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 ...(token ? { Authorization: `Bearer ${token}` } : {}),
 },
 body: JSON.stringify({
 printOption,
 quantity,
 shippingAddress,
 estimatedPrice: selectedPrintOption.basePrice
 })
 })

 const data = await response.json()

 if (data.error) {
 if (data.code === 'DIGITAL_BOOK_REQUIRED') {
 showToast(t('mustBuyDigitalFirst'), 'warning')
 return
 }
 throw new Error(data.error)
 }

 setClientSecret(data.client_secret)
 } catch (error) {
        console.error('Error creating print order:', error)
 showToast(t('errorCreatingOrder'), 'error')
 }
 }

 if (shippingAddress.line1 && shippingAddress.city && shippingAddress.postal_code && shippingAddress.country) {
 createPaymentIntent()
 }
 }, [bookId, printOption, quantity, shippingAddress, selectedPrintOption.basePrice, getIdToken])

 const handleSubmit = async (event: React.FormEvent) => {
 event.preventDefault()

 if (!stripe || !elements || !clientSecret) {
 return
 }

 setIsLoading(true)

 const { error } = await stripe.confirmPayment({
 elements,
 confirmParams: {
 return_url: `${window.location.origin}/dashboard/books?print_ordered=${bookId}`,
 },
 })

 if (error) {
      console.error('Payment error:', error)
 showToast(error.message || t('errorCreatingOrder'), 'error')
 } else {
      // Payment succeeded
 onSuccess()
 }

 setIsLoading(false)
 }

 if (!clientSecret) {
 return (
 <div className="flex items-center justify-center p-8">
 <Loader2 className="h-6 w-6 animate-spin" />
 <span className="ml-2">{t('preparingOrder')}</span>
 </div>
 )
 }

 return (
 <div className="space-y-6">
 {/* Order Summary */}
 <Card>
 <CardHeader>
 <CardTitle className="text-sm">{t('orderSummary')}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-2">
 <div className="flex justify-between text-sm">
 <span>{quantity}x {t(selectedPrintOption.id as 'paperback' | 'hardcover')}</span>
 <span>€{(printPrice / 100).toFixed(2)}</span>
 </div>
 <div className="flex justify-between text-sm">
 <span>{t('shippingTo').replace('{country}', shippingAddress.country)}</span>
 <span>€{(shippingCost / 100).toFixed(2)}</span>
 </div>
 <div className="border-t pt-2 flex justify-between font-semibold">
 <span>{t('total')}</span>
 <span>€{(totalAmount / 100).toFixed(2)}</span>
 </div>
 </CardContent>
 </Card>

 <form onSubmit={handleSubmit} className="space-y-4">
 <PaymentElement 
 options={{
 layout: 'tabs'
 }}
 />
 
 <Button
 type="submit"
 disabled={!stripe || isLoading}
 className="w-full"
 size="lg"
 >
 {isLoading ? (
 <>
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 {t('orderProcessing')}
 </>
 ) : (
 <>
 <Printer className="mr-2 h-4 w-4" />
 {t('orderNow').replace('{price}', (totalAmount / 100).toFixed(2))}
 </>
 )}
 </Button>
 </form>
 </div>
 )
}

// PayPal Print Order Component
function PayPalPrintOrder({
 bookId,
 bookData,
 printOption,
 quantity,
 shippingAddress,
 onSuccess
}: {
 bookId: string
 bookData: PrintOrderModalProps['bookData']
 printOption: string
 quantity: number
 shippingAddress: ShippingAddress
 onSuccess: () => void
}) {
 const [isLoading, setIsLoading] = useState(false)
 const [paypalLoaded, setPaypalLoaded] = useState(false)
 const { getIdToken } = useAuth()
 const { t } = useLanguage()
 const { showToast } = useToast()

  // Calculate pricing
 const selectedPrintOption = PRINT_OPTIONS.find(opt => opt.id === printOption)!
 const printPrice = selectedPrintOption.basePrice * quantity
 const shippingCost = SHIPPING_COSTS[shippingAddress.country as keyof typeof SHIPPING_COSTS] || SHIPPING_COSTS.OTHER
 const totalAmount = printPrice + shippingCost

 useEffect(() => {
    // Load PayPal SDK
 const script = document.createElement('script')
 script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=EUR&components=buttons`
 script.async = true
 
 script.onload = () => {
 setPaypalLoaded(true)
 
      // Initialize PayPal buttons
 if (window.paypal) {
 window.paypal.Buttons({
 createOrder: async () => {
 setIsLoading(true)
 try {
 const token = await getIdToken?.()
 const response = await fetch(`/api/books/${bookId}/print/paypal`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 ...(token ? { Authorization: `Bearer ${token}` } : {}),
 },
 body: JSON.stringify({
 printOption,
 quantity,
 shippingAddress,
 estimatedPrice: selectedPrintOption.basePrice / 100 // Convert to euros
 }),
 })

 const data = await response.json()

 if (data.error) {
 if (data.code === 'DIGITAL_BOOK_REQUIRED') {
 showToast(t('mustBuyDigitalFirst'), 'warning')
 return
 }
 throw new Error(data.error)
 }

 return data.order_id
 } catch (error) {
              console.error('Error creating PayPal print order:', error)
 showToast(t('errorCreatingPayPalOrder'), 'error')
 throw error
 } finally {
 setIsLoading(false)
 }
 },
 onApprove: async (data: any) => {
 setIsLoading(true)
 try {
 const token = await getIdToken?.()
 const response = await fetch('/api/capture-paypal-order', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 ...(token ? { Authorization: `Bearer ${token}` } : {}),
 },
 body: JSON.stringify({
 orderId: data.orderID,
 }),
 })

 const result = await response.json()
 if (result.success) {
 onSuccess()
 } else {
 throw new Error('Payment capture failed')
 }
 } catch (error) {
              console.error('Error capturing PayPal payment:', error)
 showToast(t('errorPayPalPayment'), 'error')
 } finally {
 setIsLoading(false)
 }
 },
 style: {
 layout: 'vertical',
 color: 'blue',
 shape: 'rect',
 label: 'paypal',
 height: 45
 }
 }).render('#paypal-button-container-print')
 }
 }

 document.head.appendChild(script)

 return () => {
 document.head.removeChild(script)
 }
 }, [bookId, printOption, quantity, shippingAddress, selectedPrintOption.basePrice, getIdToken, onSuccess])

 return (
 <div className="space-y-4">
 {/* Order Summary */}
 <Card>
 <CardContent className="p-4 space-y-2">
 <div className="flex justify-between text-sm">
 <span>{quantity}x {t(selectedPrintOption.id as 'paperback' | 'hardcover')}</span>
 <span>€{(printPrice / 100).toFixed(2)}</span>
 </div>
 <div className="flex justify-between text-sm">
 <span>{t('shippingTo').replace('{country}', shippingAddress.country)}</span>
 <span>€{(shippingCost / 100).toFixed(2)}</span>
 </div>
 <div className="border-t pt-2 flex justify-between font-semibold">
 <span>{t('total')}</span>
 <span>€{(totalAmount / 100).toFixed(2)}</span>
 </div>
 </CardContent>
 </Card>

 {!paypalLoaded && (
 <div className="flex items-center justify-center p-4">
 <Loader2 className="h-6 w-6 animate-spin" />
 <span className="ml-2">{t('paypalLoading2')}</span>
 </div>
 )}

 <div id="paypal-button-container-print" />

 {isLoading && (
 <div className="flex items-center justify-center p-2">
 <Loader2 className="h-4 w-4 animate-spin" />
 <span className="ml-2 text-sm">{t('orderProcessing')}</span>
 </div>
 )}
 </div>
 )
}

export default function PrintOrderModal({
 bookId,
 bookData,
 onOrderSuccess,
 triggerElement,
 disabled = false
}: PrintOrderModalProps) {
 const [isOpen, setIsOpen] = useState(false)
 const [orderSuccess, setOrderSuccess] = useState(false)
 const [printOption, setPrintOption] = useState('paperback')
 const [quantity, setQuantity] = useState(1)
 const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
 line1: '',
 city: '',
 postal_code: '',
 country: 'DE'
 })
 const { t } = useLanguage()

 const handleSuccess = () => {
 setOrderSuccess(true)
 setTimeout(() => {
 setIsOpen(false)
 setOrderSuccess(false)
 onOrderSuccess()
 }, 3000)
 }

 const canOrder = bookData.purchased && shippingAddress.line1 && shippingAddress.city && shippingAddress.postal_code

 const defaultTrigger = (
 <Button
 variant="outline"
 size="lg"
 disabled={disabled || !bookData.purchased}
 className="border-orange-200 text-orange-700 hover:bg-orange-50"
 >
 <Printer className="mr-2 h-4 w-4" />
 {!bookData.purchased ? t('buyDigitalFirst') : t('orderPrint')}
 </Button>
 )

 return (
 <Dialog open={isOpen} onOpenChange={setIsOpen}>
 <DialogTrigger asChild>
 {triggerElement || defaultTrigger}
 </DialogTrigger>
 
 <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <Package className="h-5 w-5 text-orange-600" />
 {t('printOnDemandOrder')}
 </DialogTitle>
 <DialogDescription>
 {t('orderPrintedVersion').replace('{title}', bookData.title)}
 </DialogDescription>
 </DialogHeader>

 {!bookData.purchased ? (
 <div className="py-6 text-center">
 <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
 <h3 className="text-lg font-semibold text-orange-700 mb-2">
 {t('digitalBookRequired')}
 </h3>
 <p className="text-sm text-muted-foreground">
 {t('mustBuyDigitalFirstPrice').replace('{price}', formatPrice(getBookPrice()))}
 </p>
 </div>
 ) : orderSuccess ? (
 <div className="text-center py-8">
 <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
 <h3 className="text-lg font-semibold text-green-700 mb-2">
 {t('orderSuccessful')}
 </h3>
 <p className="text-sm text-muted-foreground">
 {t('printOrderBeingProcessed')}
 </p>
 </div>
 ) : (
 <div className="space-y-6">
 {/* Product Configuration */}
 <div className="space-y-4">
 <div>
 <Label htmlFor="print-option">{t('printOption')}</Label>
 <Select value={printOption} onValueChange={setPrintOption}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {PRINT_OPTIONS.map(option => (
 <SelectItem key={option.id} value={option.id}>
 <div className="flex items-center justify-between w-full">
 <div>
 <div className="font-medium">{t(option.id as 'paperback' | 'hardcover')}</div>
 <div className="text-xs text-muted-foreground">{t((option.id + 'Desc') as 'paperbackDesc' | 'hardcoverDesc')}</div>
 </div>
 <span className="text-sm font-semibold ml-4">
 €{(option.basePrice / 100).toFixed(2)}
 </span>
 </div>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div>
 <Label htmlFor="quantity">{t('quantity')}</Label>
 <Select value={quantity.toString()} onValueChange={(val) => setQuantity(parseInt(val))}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {[1,2,3,4,5].map(num => (
 <SelectItem key={num} value={num.toString()}>
 {t('copies').replace('{num}', num.toString()).replace('{plural}', num > 1 ? 'e' : '')}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 {/* Shipping Address */}
 <Card>
 <CardHeader>
 <CardTitle className="text-sm flex items-center gap-2">
 <Truck className="h-4 w-4" />
 {t('shippingAddress')}
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-3">
 <div>
 <Label htmlFor="address-line1">{t('streetAndNumber')}</Label>
 <Input
 id="address-line1"
 value={shippingAddress.line1}
 onChange={(e) => setShippingAddress(prev => ({ ...prev, line1: e.target.value }))}
 placeholder={t('streetPlaceholder')}
 required
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <Label htmlFor="postal-code">{t('postalCode')}</Label>
 <Input
 id="postal-code"
 value={shippingAddress.postal_code}
 onChange={(e) => setShippingAddress(prev => ({ ...prev, postal_code: e.target.value }))}
 placeholder={t('addressZipPlaceholder')}
 required
 />
 </div>
 <div>
 <Label htmlFor="city">{t('city')}</Label>
 <Input
 id="city"
 value={shippingAddress.city}
 onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
 placeholder={t('addressCityPlaceholder')}
 required
 />
 </div>
 </div>

 <div>
 <Label htmlFor="country">{t('country')}</Label>
 <Select
 value={shippingAddress.country}
 onValueChange={(val) => setShippingAddress(prev => ({ ...prev, country: val }))}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="DE">{t('germanyShipping')}</SelectItem>
 <SelectItem value="AT">{t('austriaShipping')}</SelectItem>
 <SelectItem value="CH">{t('switzerlandShipping')}</SelectItem>
 <SelectItem value="FR">{t('franceShipping')}</SelectItem>
 <SelectItem value="NL">{t('netherlandsShipping')}</SelectItem>
 <SelectItem value="BE">{t('belgiumShipping')}</SelectItem>
 <SelectItem value="OTHER">{t('otherCountriesShipping')}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </CardContent>
 </Card>

 {/* Payment Methods - Combined in One Section */}
 {canOrder && (
 <div className="space-y-6">
 {/* Stripe Payment */}
 <div>
 <div className="flex items-center gap-2 mb-3">
 <CreditCard className="h-4 w-4 text-bookcraft-blue" />
 <h4 className="font-medium text-sm">{t('cardGoogleApplePay')}</h4>
 </div>
 <Elements stripe={stripePromise}>
 <PrintOrderCheckoutForm
 bookId={bookId}
 bookData={bookData}
 printOption={printOption}
 quantity={quantity}
 shippingAddress={shippingAddress}
 onSuccess={handleSuccess}
 />
 </Elements>
 </div>

 {/* Divider */}
 <div className="relative">
 <div className="absolute inset-0 flex items-center">
 <span className="w-full border-t" />
 </div>
 <div className="relative flex justify-center text-xs uppercase">
 <span className="bg-background px-2 text-muted-foreground">{t('or')}</span>
 </div>
 </div>

 {/* PayPal Payment */}
 <div>
 <div className="flex items-center gap-2 mb-3">
 <div className="w-4 h-4 bg-bookcraft-blue rounded flex items-center justify-center">
 <span className="text-white text-xs font-bold">P</span>
 </div>
 <h4 className="font-medium text-sm">PayPal</h4>
 </div>
 <PayPalPrintOrder
 bookId={bookId}
 bookData={bookData}
 printOption={printOption}
 quantity={quantity}
 shippingAddress={shippingAddress}
 onSuccess={handleSuccess}
 />
 </div>
 </div>
 )}

 {!canOrder && shippingAddress.line1 && (
 <div className="p-3 bg-orange-50 rounded-lg">
 <p className="text-sm text-orange-700">
 {t('fillAllAddressFields')}
 </p>
 </div>
 )}
 </div>
 )}
 </DialogContent>
 </Dialog>
 )
}