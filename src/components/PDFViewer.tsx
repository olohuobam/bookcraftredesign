'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Loader2, Download, ExternalLink, FileText, Eye } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useLanguage } from '@/context/LanguageContext'

interface PDFViewerProps {
 bookId: string
 bookTitle: string
 type: 'cover' | 'interior'
 onClose?: () => void
}

export default function PDFViewer({ bookId, bookTitle, type, onClose }: PDFViewerProps) {
 const { getIdToken } = useAuth()
 const { showToast } = useToast()
 const { t } = useLanguage()
 const [pdfUrl, setPdfUrl] = useState<string | null>(null)
 const [isLoading, setIsLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)

 useEffect(() => {
 loadPDF()

    // Cleanup function to revoke URL when component unmounts
 return () => {
 if (pdfUrl) {
 URL.revokeObjectURL(pdfUrl)
 }
 }
 }, [bookId, type]) // eslint-disable-line react-hooks/exhaustive-deps

 const loadPDF = async () => {
 try {
 setIsLoading(true)
 setError(null)

 const token = await getIdToken()
 if (!token) {
 setError(t('authenticationFailed'))
 return
 }

 const response = await fetch(`/api/books/${bookId}/preview-pdf?type=${type}`, {
 headers: {
 'Authorization': `Bearer ${token}`
 }
 })

 if (!response.ok) {
        // Try to get error details from response
 const contentType = response.headers.get('content-type')
 if (contentType && contentType.includes('application/json')) {
 const errorData = await response.json()
 throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
 } else {
 throw new Error(`HTTP ${response.status}: ${response.statusText}`)
 }
 }

 const blob = await response.blob()

      // Ensure blob is valid PDF
 if (blob.type !== 'application/pdf') {
        // Check if this is actually a JSON error response
 if (blob.type === 'application/json' || blob.type.includes('json')) {
 const text = await blob.text()
 try {
 const errorData = JSON.parse(text)
 throw new Error(errorData.error || 'Received JSON instead of PDF')
 } catch (parseError) {
 throw new Error('Received invalid response instead of PDF')
 }
 }
 throw new Error(`Invalid PDF response. Received: ${blob.type}`)
 }

 const url = URL.createObjectURL(blob)
 setPdfUrl(url)
 } catch (error) {
      console.error('Error loading PDF:', error)
 setError(error instanceof Error ? error.message : 'Failed to load PDF')
 } finally {
 setIsLoading(false)
 }
 }

 const handleDownload = async () => {
 if (!pdfUrl) return

 try {
 const token = await getIdToken()
 if (!token) return

 const response = await fetch(`/api/books/${bookId}/preview-pdf?type=${type}`, {
 headers: {
 'Authorization': `Bearer ${token}`
 }
 })

 const blob = await response.blob()
 const url = URL.createObjectURL(blob)

 const a = document.createElement('a')
 a.href = url
 a.download = `${bookTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${type}.pdf`
 document.body.appendChild(a)
 a.click()
 document.body.removeChild(a)

      // Clean up
 setTimeout(() => URL.revokeObjectURL(url), 1000)
 } catch (error) {
      console.error('Download error:', error)
      showToast('Download failed. Please try again.', 'error')
 }
 }

 const handleOpenInNewTab = () => {
 if (pdfUrl) {
 window.open(pdfUrl, '_blank')
 }
 }

 const getTitle = () => {
 return type === 'cover' ? 'Cover PDF' : 'Interior PDF'
 }

 const getIcon = () => {
 return type === 'cover' ? <Eye className="h-5 w-5" /> : <FileText className="h-5 w-5" />
 }

 if (isLoading) {
 return (
 <Card className="w-full h-full min-h-[600px]">
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 {getIcon()}
 Loading {getTitle()}...
 </CardTitle>
 </CardHeader>
 <CardContent className="flex items-center justify-center h-96">
 <div className="text-center">
 <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
 <p>Loading PDF...</p>
 </div>
 </CardContent>
 </Card>
 )
 }

 if (error) {
 return (
 <Card className="w-full h-full min-h-[600px]">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-red-600">
 {getIcon()}
 Error loading PDF
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-center py-8">
 <p className="text-red-600 mb-4">{error}</p>
 <div className="flex gap-2 justify-center">
 <Button onClick={loadPDF} variant="outline">
 Try again
 </Button>
 {onClose && (
 <Button onClick={onClose} variant="secondary">
 Close
 </Button>
 )}
 </div>
 </div>
 </CardContent>
 </Card>
 )
 }

 return (
 <Card className="w-full h-full min-h-[600px]">
 <CardHeader>
 <div className="flex items-center justify-between">
 <CardTitle className="flex items-center gap-2">
 {getIcon()}
 {getTitle()} - {bookTitle}
 </CardTitle>
 <div className="flex gap-2">
 <Button
 onClick={handleDownload}
 variant="outline"
 size="sm"
 className="flex items-center gap-2"
 >
 <Download className="h-4 w-4" />
 Download
 </Button>
 <Button
 onClick={handleOpenInNewTab}
 variant="outline"
 size="sm"
 className="flex items-center gap-2"
 >
 <ExternalLink className="h-4 w-4" />
 New Tab
 </Button>
 {onClose && (
 <Button onClick={onClose} variant="secondary" size="sm">
 Close
 </Button>
 )}
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-0">
 {pdfUrl && (
 <div className="w-full h-[800px] border-t">
 <iframe
 src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1&page=1&view=FitH`}
 className="w-full h-full border-0"
 title={`${getTitle()} - ${bookTitle}`}
 loading="lazy"
 />
 </div>
 )}
 </CardContent>
 </Card>
 )
}