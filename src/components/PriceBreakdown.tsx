'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Printer, Package } from 'lucide-react'
import { formatPrice, calculateDynamicPrice, calculatePrintRetailPrice, calculateBundlePrice, type SupportedCurrency } from '@/lib/pricing'
import { cn } from '@/lib/utils'

interface PriceBreakdownProps {
 bookType: string
 chapterCount: number
 printBaseCostCents?: number | null
 currency?: SupportedCurrency
 compact?: boolean
 className?: string
}

export default function PriceBreakdown({
 bookType,
 chapterCount,
 printBaseCostCents,
 currency = 'EUR',
 compact = false,
 className,
}: PriceBreakdownProps) {
 const [selectedOption, setSelectedOption] = useState<'digital' | 'print' | 'bundle'>('digital')

 const pricing = useMemo(() => {
 const digital = calculateDynamicPrice(bookType, chapterCount)
 const hasPrint = printBaseCostCents !== undefined && printBaseCostCents !== null
 const printRetail = hasPrint ? calculatePrintRetailPrice(printBaseCostCents) : null
 const bundle = hasPrint && printRetail ? calculateBundlePrice(digital, printRetail) : null
 const savings = hasPrint && printRetail && bundle ? (digital + printRetail) - bundle : null

 return { digital, printRetail, bundle, savings, hasPrint }
 }, [bookType, chapterCount, printBaseCostCents])

 if (compact) {
 return (
 <div className={cn('flex items-center gap-2 text-sm', className)}>
 <BookOpen className="h-4 w-4 text-bookcraft-blue" />
 <span className="font-medium">{formatPrice(pricing.digital, currency)}</span>
 {pricing.hasPrint && pricing.printRetail && (
 <>
 <span className="text-muted-foreground">·</span>
 <Printer className="h-4 w-4 text-green-500" />
 <span className="font-medium">{formatPrice(pricing.printRetail, currency)}</span>
 </>
 )}
 </div>
 )
 }

 const options = [
 {
 id: 'digital' as const,
 icon: BookOpen,
 label: 'Digital Edition',
 price: pricing.digital,
 features: ['PDF & EPUB export', 'Unlimited access'],
 color: 'blue',
 },
 ...(pricing.hasPrint && pricing.printRetail
 ? [
 {
 id: 'print' as const,
 icon: Printer,
 label: 'Print Edition',
 price: pricing.printRetail,
 features: ['High quality print', 'Shipped to your door'],
 color: 'green',
 },
 {
 id: 'bundle' as const,
 icon: Package,
 label: 'Bundle Deal',
 price: pricing.bundle!,
 features: [
 'Digital + Print',
 `Save ${formatPrice(pricing.savings!, currency)}`,
 ],
 color: 'purple',
 badge: 'Best Value',
 },
 ]
 : []),
 ]

 return (
 <div className={cn('grid gap-3', pricing.hasPrint ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1', className)}>
 {options.map((option) => {
 const Icon = option.icon
 const isSelected = selectedOption === option.id
 return (
 <button
 key={option.id}
 onClick={() => setSelectedOption(option.id)}
 className={cn(
 'relative text-left p-4 rounded-xl border-2 transition-all',
 isSelected
 ? `border-${option.color}-500 bg-${option.color}-50 dark:bg-${option.color}-950/30`
 : 'border-border hover:border-muted-foreground/30'
 )}
 >
 {'badge' in option && option.badge && (
 <Badge className="absolute -top-2 right-2 bg-blue-500 text-white text-xs">
 {option.badge}
 </Badge>
 )}
 <div className="flex items-center gap-2 mb-2">
 <Icon className={cn('h-5 w-5', `text-${option.color}-500`)} />
 <span className="font-medium text-sm">{option.label}</span>
 </div>
 <div className="text-2xl font-bold mb-2">{formatPrice(option.price, currency)}</div>
 <ul className="space-y-1">
 {option.features.map((feature, i) => (
 <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
 <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
 {feature}
 </li>
 ))}
 </ul>
 </button>
 )
 })}
 </div>
 )
}
