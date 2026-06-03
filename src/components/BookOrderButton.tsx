'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Package } from 'lucide-react'
import BookOrderComponentEnhanced from './BookOrderComponentEnhanced'
import { useLanguage } from '@/context/LanguageContext'

interface Book {
 id: string
 title: string
 author?: string | null
 book_type?: 'text' | 'picture'
 status?: string
}

interface BookOrderButtonProps {
 book: Book
 className?: string
}

export default function BookOrderButton({ book, className }: BookOrderButtonProps) {
 const { t } = useLanguage()
 const [isDialogOpen, setIsDialogOpen] = useState(false)
 
 const handleOrderComplete = (_orderId: string) => {
    // Close dialog after successful order
 setTimeout(() => {
 setIsDialogOpen(false)
 }, 3000)
 }

  // Only show order button for completed books
 if (book.status !== 'completed') {
 return null
 }

 return (
 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
 <DialogTrigger asChild>
 <Button variant="outline" className={className}>
 <Package className="mr-2 h-4 w-4" />
 Order Print Copy
 </Button>
 </DialogTrigger>
 <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>{t('orderPhysicalBook')}</DialogTitle>
 <DialogDescription>
 Order a professionally printed copy of your book
 </DialogDescription>
 </DialogHeader>
 
 <BookOrderComponentEnhanced
 book={book}
 onOrderComplete={handleOrderComplete}
 />
 </DialogContent>
 </Dialog>
 )
}