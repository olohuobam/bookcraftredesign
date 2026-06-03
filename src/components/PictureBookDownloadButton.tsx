'use client'

import BookExportDialog from '@/components/BookExportDialog'
import { Download } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

interface PictureBookDownloadButtonProps {
 bookId: string
 bookTitle: string
 variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
 size?: 'sm' | 'default' | 'lg' | 'icon'
 className?: string
}

export default function PictureBookDownloadButton({
 bookId,
 bookTitle,
 variant = 'default',
 size = 'sm',
 className = ''
}: PictureBookDownloadButtonProps) {
 const { t } = useLanguage()

 const buttonClasses = `inline-flex items-center gap-1.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors ${className}
 ${size === 'sm' ? 'px-3 py-1.5 text-sm' : size === 'lg' ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'}
 ${variant === 'ghost' ? 'bg-transparent text-gray-700 hover:bg-gray-100' : ''}
 ${variant === 'outline' ? 'bg-transparent text-green-600 border border-green-600 hover:bg-green-600 hover:text-white' : ''}
 `

 return (
 <BookExportDialog
 bookId={bookId}
 bookTitle={bookTitle}
 triggerElement={
 <button className={buttonClasses}>
 <Download className="h-3.5 w-3.5" />
 {t('pdfDownloadLabel')}
 </button>
 }
 />
 )
}
