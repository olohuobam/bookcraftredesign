'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CreditCard, Lock, ArrowLeft, Coins, Crown, AlertCircle, Loader2, Shield, CheckCircle } from 'lucide-react'

interface Props {
 type?: string
 itemId?: string
 amount?: string
 coins?: string
 planName?: string
}

export default function PaymentClient({ type, itemId, amount, coins, planName }: Props) {
 const { user } = useAuth()
 const router = useRouter()
 const { t } = useLanguage()

 const [paymentMethod, setPaymentMethod] = useState('credit-card')
 const [isProcessing, setIsProcessing] = useState(false)
 const [formData, setFormData] = useState({
 cardNumber: '',
 expiryDate: '',
 cvv: '',
 cardHolder: '',
 email: user?.email || '',
 acceptTerms: false
 })

 const paymentMethods = [
 { id: 'credit-card', name: 'Credit Card', icon: '' },
 { id: 'paypal', name: 'PayPal', icon: '' },
 { id: 'apple-pay', name: 'Apple Pay', icon: '' },
 { id: 'google-pay', name: 'Google Pay', icon: '' },
 ]

 const handleInputChange = (field: string, value: string | boolean) => {
 setFormData(prev => ({ ...prev, [field]: value }))
 }

 const formatCardNumber = (value: string) => {
 const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
 const matches = v.match(/\d{4,16}/g)
 const match = (matches && matches[0]) || ''
 const parts: string[] = []
 for (let i = 0, len = match.length; i < len; i += 4) {
 parts.push(match.substring(i, i + 4))
 }
 return parts.length ? parts.join(' ') : v
 }

 const formatExpiryDate = (value: string) => {
 const v = value.replace(/\D/g, '')
 if (v.length >= 2) return v.substring(0, 2) + '/' + v.substring(2, 4)
 return v
 }

 const handlePayment = async () => {
 if (!formData.acceptTerms) {
 alert(t('acceptTerms'))
 return
 }
 setIsProcessing(true)
 setTimeout(() => {
 const successParams = new URLSearchParams({
 type: type || '',
 item: itemId || '',
 amount: amount || '',
 coins: coins || '',
 plan: planName || '',
 method: paymentMethod
 })
 router.push(`/payment/success?${successParams.toString()}`)
 }, 3000)
 }

 if (!user) {
 router.push('/')
 return null
 }

 if (!type || !itemId || !amount) {
 return (
 <div className="min-h-screen bg-background flex items-center justify-center">
 <Card className="p-8 max-w-md w-full mx-4">
 <div className="text-center">
 <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
 <h2 className="text-xl font-bold text-foreground mb-2">{t('invalidPaymentRequest')}</h2>
 <p className="text-muted-foreground mb-6">The payment information is incomplete.</p>
 <Link href="/dashboard/billing">
 <Button>{t('backToBilling')}</Button>
 </Link>
 </div>
 </Card>
 </div>
 )
 }

 return (
 <div className="min-h-screen bg-background pb-8 safe-area-all">
 {/* Mobile-First Header with Trust Indicators */}
 <header className="bg-background/95 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50">
 <div className="max-w-3xl mx-auto px-4 sm:px-6">
 <div className="flex justify-between items-center h-16">
 <Link href="/dashboard/billing" className="touch-target">
 <Button variant="ghost" size="sm" className="min-w-[44px] min-h-[44px] rounded-xl">
 <ArrowLeft className="h-5 w-5 mr-2" />
 <span className="hidden sm:inline">{t('back')}</span>
 </Button>
 </Link>
 <div className="flex items-center space-x-3">
 <div className="flex items-center space-x-2">
 <Shield className="h-5 w-5 text-bookcraft-blue dark:text-bookcraft-blue/80" />
 <span className="text-sm font-semibold text-bookcraft-blue dark:text-bookcraft-blue/80 hidden sm:inline">
 SSL Encrypted
 </span>
 </div>
 <div className="flex items-center space-x-2">
 <Lock className="h-5 w-5 text-green-600 dark:text-green-400" />
 <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
 {t('secureMethod')}
 </span>
 </div>
 </div>
 </div>
 </div>
 </header>

 <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Mobile: Order summary first, Desktop: Payment form first */}
 <div className="order-1 lg:order-2">
 <Card className="mobile-card lg:sticky lg:top-8 overflow-hidden">
 <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 p-6 border-b border-border">
 <h3 className="text-xl font-bold text-foreground mb-2">{t('orderSummary')}</h3>
 <p className="text-sm text-muted-foreground">{t('reviewPurchaseDetails')}</p>
 </div>
 <div className="p-6 space-y-6">
 {/* Product Item */}
 <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50/50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/30 rounded-2xl border border-blue-200/50 dark:border-blue-800/30">
 <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-bookcraft-blue to-bookcraft-blue flex items-center justify-center">
 {type === 'coins' ? (
 <Coins className="h-6 w-6 text-white" />
 ) : (
 <Crown className="h-6 w-6 text-white" />
 )}
 </div>
 <div className="flex-1 min-w-0">
 <h4 className="font-semibold text-foreground text-base">
 {type === 'coins' ? `${coins} Coins` : `${planName} Plan`}
 </h4>
 <p className="text-sm text-muted-foreground">
 {type === 'coins' ? 'One-time Payment' : 'Monthly Subscription'}
 </p>
 </div>
 <div className="text-right flex-shrink-0">
 <div className="font-bold text-xl text-foreground">€{amount}</div>
 {type === 'subscription' && (
 <div className="text-xs text-muted-foreground">per month</div>
 )}
 </div>
 </div>
 {/* Price Breakdown */}
 <div className="border-t border-border pt-6">
 <div className="space-y-3">
 <div className="flex justify-between text-base text-muted-foreground">
 <span>{t('subtotal')}</span>
 <span className="font-medium">€{amount}</span>
 </div>
 <div className="flex justify-between text-base text-muted-foreground">
 <span>VAT (19%)</span>
 <span className="font-medium">€{(parseFloat(amount || '0') * 0.19).toFixed(2)}</span>
 </div>
 <div className="border-t border-border pt-3">
 <div className="flex justify-between items-center">
 <span className="text-lg font-bold text-foreground">{t('total')}</span>
 <div className="text-right">
 <div className="text-2xl font-bold text-bookcraft-blue dark:text-bookcraft-blue/80">
 €{(parseFloat(amount || '0') * 1.19).toFixed(2)}
 </div>
 <div className="text-xs text-muted-foreground">incl. VAT</div>
 </div>
 </div>
 </div>
 </div>
 </div>
 
 {/* Trust Indicators */}
 <div className="space-y-3">
 <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800/50 rounded-2xl">
 <div className="flex items-start space-x-3">
 <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
 <div>
 <h4 className="text-sm font-semibold text-green-900 dark:text-green-200">256-bit SSL Encryption</h4>
 <p className="text-sm text-green-700 dark:text-green-300">
 Bank-level security for your payment data
 </p>
 </div>
 </div>
 </div>
 <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-950/30 dark:to-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-2xl">
 <div className="flex items-start space-x-3">
 <Shield className="h-5 w-5 text-bookcraft-blue dark:text-bookcraft-blue/80 mt-0.5 flex-shrink-0" />
 <div>
 <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">{t('pciDssCompliant')}</h4>
 <p className="text-sm text-bookcraft-blue dark:text-bookcraft-blue/80">
 Industry standard payment processing
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </Card>
 </div>
 
 {/* Payment Form */}
 <div className="order-2 lg:order-1">
 <Card className="mobile-card overflow-hidden">
 <div className="bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/10 dark:to-background p-6 border-b border-border">
 <h2 className="text-2xl font-bold text-foreground mb-2">{t('paymentInformation')}</h2>
 <p className="text-sm text-muted-foreground">{t('choosePaymentMethod')}</p>
 </div>
 
 <div className="p-6 space-y-8">
 {/* Payment Methods */}
 <div>
 <Label className="text-base font-semibold text-foreground mb-4 block">
 Payment Method
 </Label>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {paymentMethods.map((method) => (
 <button
 key={method.id}
 onClick={() => setPaymentMethod(method.id)}
 className={`p-4 border-2 rounded-2xl text-left transition-all duration-200 touch-target ${
 paymentMethod === method.id
 ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-md'
 : 'border-border hover:border-blue-200 dark:hover:border-blue-800 hover:bg-muted/50'
 }`}
 >
 <div className="flex items-center space-x-3">
 <div className="text-2xl">{method.icon}</div>
 <div>
 <span className="font-semibold text-base text-foreground block">
 {method.name}
 </span>
 {paymentMethod === method.id && (
 <span className="text-sm text-bookcraft-blue dark:text-bookcraft-blue/80">
 Selected
 </span>
 )}
 </div>
 </div>
 </button>
 ))}
 </div>
 </div>
 {/* Credit Card Form */}
 {paymentMethod === 'credit-card' && (
 <div className="space-y-6 p-6 bg-muted/30 rounded-2xl border border-border">
 <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
 <CreditCard className="h-5 w-5" />
 Card Details
 </h3>
 
 <div className="space-y-5">
 <div>
 <Label htmlFor="cardHolder" className="text-sm font-medium text-foreground mb-2 block">
 Name on Card
 </Label>
 <Input
 id="cardHolder"
 value={formData.cardHolder}
 onChange={(e) => handleInputChange('cardHolder', e.target.value)}
 placeholder={t('cardholderNamePlaceholder')}
 className="h-12 text-base touch-target"
 autoComplete="cc-name"
 />
 </div>
 
 <div>
 <Label htmlFor="cardNumber" className="text-sm font-medium text-foreground mb-2 block">
 Card Number
 </Label>
 <Input
 id="cardNumber"
 value={formData.cardNumber}
 onChange={(e) => handleInputChange('cardNumber', formatCardNumber(e.target.value))}
 placeholder="1234 5678 9012 3456"
 maxLength={19}
 className="h-12 text-base touch-target font-mono tracking-wider"
 autoComplete="cc-number"
 inputMode="numeric"
 />
 </div>
 
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label htmlFor="expiryDate" className="text-sm font-medium text-foreground mb-2 block">
 Expiry Date
 </Label>
 <Input
 id="expiryDate"
 value={formData.expiryDate}
 onChange={(e) => handleInputChange('expiryDate', formatExpiryDate(e.target.value))}
 placeholder={t('expiryDatePlaceholder')}
 maxLength={5}
 className="h-12 text-base touch-target font-mono"
 autoComplete="cc-exp"
 inputMode="numeric"
 />
 </div>
 <div>
 <Label htmlFor="cvv" className="text-sm font-medium text-foreground mb-2 block">
 Security Code
 </Label>
 <Input
 id="cvv"
 value={formData.cvv}
 onChange={(e) => handleInputChange('cvv', e.target.value.replace(/\D/g, '').substring(0, 4))}
 placeholder="123"
 maxLength={4}
 className="h-12 text-base touch-target font-mono"
 autoComplete="cc-csc"
 inputMode="numeric"
 />
 </div>
 </div>
 </div>
 </div>
 )}
 {/* Alternative Payment Methods */}
 {paymentMethod !== 'credit-card' && (
 <div className="p-8 text-center border-2 border-dashed border-border rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30">
 <div className="text-5xl mb-4">
 {paymentMethods.find((m) => m.id === paymentMethod)?.icon}
 </div>
 <h3 className="text-lg font-semibold text-foreground mb-2">
 Pay with {paymentMethods.find((m) => m.id === paymentMethod)?.name}
 </h3>
 <p className="text-sm text-muted-foreground mb-4">
 Secure redirect to {paymentMethods.find((m) => m.id === paymentMethod)?.name}
 </p>
 <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-100 dark:bg-blue-950/30 rounded-xl">
 <Shield className="h-4 w-4 text-bookcraft-blue dark:text-bookcraft-blue/80" />
 <span className="text-sm font-medium text-bookcraft-blue dark:text-bookcraft-blue/80">
 {t('secureMethod')}
 </span>
 </div>
 </div>
 )}
 
 {/* Email Confirmation */}
 <div>
 <Label htmlFor="email" className="text-sm font-medium text-foreground mb-2 block">
 Email for Receipt
 </Label>
 <Input
 id="email"
 type="email"
 value={formData.email}
 onChange={(e) => handleInputChange('email', e.target.value)}
 placeholder="your@email.com"
 className="h-12 text-base touch-target"
 autoComplete="email"
 inputMode="email"
 />
 <p className="text-xs text-muted-foreground mt-2">
 Receipt and order updates will be sent to this email
 </p>
 </div>
 {/* Terms Agreement */}
 <div className="p-4 bg-muted/50 rounded-2xl border border-border">
 <label className="flex items-start space-x-3 cursor-pointer touch-target">
 <div className="relative">
 <input
 type="checkbox"
 checked={formData.acceptTerms}
 onChange={(e) => handleInputChange('acceptTerms', (e.target as HTMLInputElement).checked)}
 className="sr-only peer"
 />
 <div className="w-6 h-6 bg-background border-2 border-border rounded-md peer-checked:bg-bookcraft-blue peer-checked:border-bookcraft-blue flex items-center justify-center transition-colors">
 {formData.acceptTerms && (
 <CheckCircle className="h-4 w-4 text-white" fill="currentColor" />
 )}
 </div>
 </div>
 <span className="text-sm text-muted-foreground leading-relaxed">
 I agree to the{' '}
 <a href="#" className="text-bookcraft-blue dark:text-bookcraft-blue/80 font-medium hover:underline">
 Terms of Service
 </a>
 {' '}and{' '}
 <a href="#" className="text-bookcraft-blue dark:text-bookcraft-blue/80 font-medium hover:underline">
 Privacy Policy
 </a>
 </span>
 </label>
 </div>
 
 {/* Payment Button */}
 <div className="pt-4 space-y-4">
 <Button
 onClick={handlePayment}
 disabled={isProcessing || !formData.acceptTerms}
 className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-bookcraft-blue to-bookcraft-blue hover:brightness-110 shadow-xl hover:shadow-2xl transform-gpu transition-all duration-200 active:scale-95"
 size="lg"
 >
 {isProcessing ? (
 <div className="flex items-center">
 <Loader2 className="h-5 w-5 mr-3 animate-spin" />
 <span>Processing payment...</span>
 </div>
 ) : (
 <div className="flex items-center">
 <Lock className="h-5 w-5 mr-3" />
 <span>Pay €{(parseFloat(amount || '0') * 1.19).toFixed(2)} Securely</span>
 </div>
 )}
 </Button>
 
 <div className="text-center">
 <p className="text-xs text-muted-foreground">
 Secured by 256-bit SSL encryption
 </p>
 </div>
 </div>
 </div>
 </Card>
 </div>
 </div>
 </div>
 </div>
 )
}
