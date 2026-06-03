'use client'

import { useMemo } from 'react'
import { formatPrice, calculateDynamicPrice } from '@/lib/pricing'
import { Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LivePricePreviewProps {
 bookType: string
 count: number // chapters for text, pages for picture
 className?: string
}

export default function LivePricePreview({ bookType, count, className }: LivePricePreviewProps) {
 const price = useMemo(() => calculateDynamicPrice(bookType, count), [bookType, count])
 const label = bookType === 'picture'
 ? `${count} pages`
 : `${count} chapters`

 return (
 <div className={cn(
 'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-sm',
 className
 )}>
 <Tag className="h-3.5 w-3.5 text-bookcraft-blue" />
 <span className="text-muted-foreground">Est. price:</span>
 <span className="font-semibold text-primary">
 {formatPrice(price)}
 </span>
 <span className="text-xs text-muted-foreground">({label})</span>
 </div>
 )
}
