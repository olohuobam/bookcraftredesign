'use client'

import BookExportDialog from '@/components/BookExportDialog'

interface DownloadButtonProps {
 bookId: string
 bookTitle: string
 variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
 size?: 'sm' | 'default' | 'lg' | 'icon'
 className?: string
}

export default function DownloadButton({
 bookId,
 bookTitle,
 variant = 'default',
 size = 'sm',
 className = ''
}: DownloadButtonProps) {
 const buttonClasses = `inline-flex items-center bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors ${className}
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
 Gekauft 
 </button>
 }
 />
 )
}
