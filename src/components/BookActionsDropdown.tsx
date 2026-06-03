"use client"

import { useState } from 'react'
import { MoreVertical, Edit, Trash2, Eye, Printer, BookOpen, Download, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import BookPurchaseSheet from '@/components/BookPurchaseSheet'
import PrintOrderModal from '@/components/PrintOrderModal'
import DownloadButton from '@/components/DownloadButton'
import PictureBookDownloadButton from '@/components/PictureBookDownloadButton'
import { formatPrice, getBookPrice } from '@/lib/pricing'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/components/ui/toast'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Book {
  id: string
  title: string
  genre: string
  chapters: number
  purchased?: boolean
  bookType?: string
}

interface BookActionsDropdownProps {
  book: Book
  allBooks: Array<{
    id: string
    title: string
    genre: string
    purchased?: boolean
  }>
  onDelete?: (bookId: string) => void
  onPaymentSuccess?: () => void
  size?: 'sm' | 'default'
}

export default function BookActionsDropdown({
  book,
  allBooks,
  onDelete,
  onPaymentSuccess,
  size = 'default'
}: BookActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [kdpLoading, setKdpLoading] = useState<'pdf' | 'epub' | null>(null)
  const { t } = useLanguage()
  const { showToast } = useToast()

  const handleDelete = async () => {
    if (!window.confirm(t('confirmDeleteBook', { title: book.title }))) return
    onDelete?.(book.id)
    setIsOpen(false)
  }

  const handleKdpExport = async (format: 'pdf' | 'epub') => {
    try {
      setKdpLoading(format)

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(`/api/books/${book.id}/kdp-export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Export failed' }))
        throw new Error(err.error || 'Export failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${book.title.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim() || 'book'}-KDP.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showToast(t('kdpExportReady'), 'success')
      setIsOpen(false)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Export failed', 'error')
    } finally {
      setKdpLoading(null)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={size}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link
            href={`/dashboard/books/${book.id}`}
            className="flex items-center w-full"
            onClick={() => setIsOpen(false)}
          >
            <Edit className="h-4 w-4 mr-2" />
            {t('editBook')}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href={`/dashboard/books/${book.id}`}
            className="flex items-center w-full"
            onClick={() => setIsOpen(false)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {t('view')}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {book.purchased ? (
          <>
            <DropdownMenuItem asChild>
              <div className="w-full">
                {book.bookType === 'picture' ? (
                  <PictureBookDownloadButton
                    bookId={book.id}
                    bookTitle={book.title}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start px-2"
                  />
                ) : (
                  <DownloadButton
                    bookId={book.id}
                    bookTitle={book.title}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start px-2"
                  />
                )}
              </div>
            </DropdownMenuItem>

            {book.bookType !== 'picture' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleKdpExport('pdf')}
                  disabled={kdpLoading !== null}
                >
                  {kdpLoading === 'pdf' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {t('kdpExportPdf')} (KDP)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleKdpExport('epub')}
                  disabled={kdpLoading !== null}
                >
                  {kdpLoading === 'epub' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {t('kdpExportEpub')} (KDP)
                </DropdownMenuItem>
              </>
            )}
          </>
        ) : (
          // 🔥 NEW: Separate Digital Purchase and Print Order options
          <>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              className="p-0"
            >
              <BookPurchaseSheet
                bookId={book.id}
                bookData={{
                  title: book.title,
                  genre: book.genre,
                  chapters: book.chapters,
                  bookType: book.bookType,
                  purchased: book.purchased || false
                }}
                price={getBookPrice(book.bookType)}
                onPurchaseSuccess={() => {
                  onPaymentSuccess?.()
                  setIsOpen(false)
                }}
                triggerElement={
                  <span className="flex items-center w-full px-2 py-1.5 hover:bg-accent rounded-sm">
                    <BookOpen className="h-4 w-4 mr-2" />
                    {book.purchased ? t('alreadyPurchased') : `${t('buyDigital')} (${formatPrice(getBookPrice(book.bookType))})`}
                  </span>
                }
              />
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              className="p-0"
            >
              <PrintOrderModal
                bookId={book.id}
                bookData={{
                  title: book.title,
                  genre: book.genre,
                  purchased: book.purchased || false
                }}
                onOrderSuccess={() => {
                  setIsOpen(false)
                }}
                triggerElement={
                  <span className="flex items-center w-full px-2 py-1.5 hover:bg-accent rounded-sm">
                    <Printer className="h-4 w-4 mr-2" />
                    {!book.purchased ? t('orderPrintBuyFirst') : t('orderPrintFrom', { price: '€19.99' })}
                  </span>
                }
                disabled={!book.purchased}
              />
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleDelete}
          className="text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t('delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
