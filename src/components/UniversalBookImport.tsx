'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload, FileText, FileJson, FileImage, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'

interface UniversalBookImportProps {
 onImportSuccess?: () => void
 standalone?: boolean
}

const MAX_IMPORT_FILE_SIZE = 15 * 1024 * 1024 // 15 MB

const SUPPORTED_FORMATS = [
 { ext: '.pdf', name: 'PDF', icon: FileText, color: 'red', disabled: true },
 { ext: '.doc', name: 'DOC', icon: FileText, color: 'blue', disabled: false },
 { ext: '.docx', name: 'DOCX', icon: FileText, color: 'blue', disabled: false },
 { ext: '.txt', name: 'TXT', icon: FileText, color: 'gray', disabled: false },
 { ext: '.json', name: 'JSON', icon: FileJson, color: 'green', disabled: false }
]

// Formats accepted by the file input (exclude disabled ones)
const ACCEPTED_EXTENSIONS = SUPPORTED_FORMATS
 .filter(f => !f.disabled)
 .map(f => f.ext)
 .join(',')

export default function UniversalBookImport({ onImportSuccess, standalone = false }: UniversalBookImportProps) {
 const { getIdToken } = useAuth()
 const router = useRouter()
 const { t } = useLanguage()
 const [importing, setImporting] = useState(false)
 const [error, setError] = useState<string | null>(null)
 const [success, setSuccess] = useState<string | null>(null)
 const [dragActive, setDragActive] = useState(false)
 const [progress, setProgress] = useState<string>('')

 const handleFileUpload = async (file: File) => {
 setError(null)
 setSuccess(null)
 setImporting(true)
 setProgress(t('readingFile'))

 try {
      // Validate file size first
 if (file.size > MAX_IMPORT_FILE_SIZE) {
 throw new Error(t('fileTooLargeImport'))
 }

 const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
 const supportedFormat = SUPPORTED_FORMATS.find(f => f.ext === fileExtension)

 if (!supportedFormat) {
 const supported = ACCEPTED_EXTENSIONS
 throw new Error(t('unsupportedFormatError').replace('{format}', fileExtension).replace('{supported}', supported))
 }

      // PDF is currently disabled — give a clear message instead of a confusing server error
 if (supportedFormat.disabled) {
 throw new Error(t('pdfNotSupportedError'))
 }

 const token = await getIdToken()
 if (!token) {
 throw new Error(t('authenticationFailed'))
 }

 setProgress(t('processingDocument'))

      // Create FormData for file upload
 const formData = new FormData()
 formData.append('file', file)

 const response = await fetch('/api/books/import-file', {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${token}`
 },
 body: formData
 })

 if (!response.ok) {
 const errorData = await response.json().catch(() => ({}))
 throw new Error(errorData.error || t('importFailed'))
 }

 const result = await response.json()
 setProgress(t('successfullyImported'))
 setSuccess(t('bookSuccessfullyImported').replace('{title}', result.book.title))

 setTimeout(() => {
 if (onImportSuccess) {
 onImportSuccess()
 } else {
 router.push(`/dashboard/books/${result.book.id}`)
 }
 }, 1500)

 } catch (err: any) {
 setError(err.message || t('anErrorOccurred') + ' Please check the file format and size (max 15 MB) and try again.')
 setProgress('')
 } finally {
 setImporting(false)
 }
 }

 const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
 e.preventDefault()
 e.stopPropagation()
 setDragActive(false)

 const files = e.dataTransfer.files
 if (files && files[0]) {
 handleFileUpload(files[0])
 }
 }

 const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
 e.preventDefault()
 e.stopPropagation()
 setDragActive(true)
 }

 const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
 e.preventDefault()
 e.stopPropagation()
 setDragActive(false)
 }

 const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
 const files = e.target.files
 if (files && files[0]) {
 handleFileUpload(files[0])
 }
 }

 return (
 <div className={standalone ? 'max-w-4xl mx-auto' : ''}>
 <Card className="p-6 sm:p-8">
 <div className="mb-6">
 <h2 className="text-2xl font-bold font-display text-foreground mb-2">{t('importBook')}</h2>
 <p className="text-muted-foreground">
 {t('uploadExistingDocument')}
 </p>
 </div>

 {/* Drag & Drop Area */}
 <div
 onDrop={handleDrop}
 onDragOver={handleDragOver}
 onDragLeave={handleDragLeave}
 className={`
 border-2 border-dashed rounded-xl p-12 text-center transition-all
 ${dragActive ? 'border-bookcraft-blue bg-blue-50 dark:bg-blue-900/20' : 'border-border bg-muted'}
 ${importing ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-bookcraft-blue/70 hover:bg-blue-50 dark:hover:bg-blue-900/20'}
 `}
 >
 <input
 type="file"
 id="file-upload-universal"
 accept={ACCEPTED_EXTENSIONS}
 onChange={handleFileSelect}
 disabled={importing}
 className="hidden"
 />
 <label htmlFor="file-upload-universal" className="cursor-pointer">
 <div className="mb-4">
 {importing ? (
 <Loader2 className="h-16 w-16 text-bookcraft-blue mx-auto animate-spin" />
 ) : (
 <Upload className="h-16 w-16 text-muted-foreground mx-auto" />
 )}
 </div>
 <p className="text-lg font-medium text-foreground mb-2">
 {importing ? progress : t('dropFileOrClick')}
 </p>
 <p className="text-sm text-muted-foreground mb-4">
 {t('supportedFormatsText')}
 </p>
 </label>
 </div>

 {/* Supported Formats */}
 <div className="mt-6">
 <h3 className="text-sm font-semibold text-foreground mb-3">{t('supportedFormatsLabel')}</h3>
 <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
 {SUPPORTED_FORMATS.map((format) => (
 <div
 key={format.ext}
 className={`
 relative flex items-center gap-2 p-3 rounded-lg border-2
 ${format.disabled ? 'opacity-50 border-border bg-muted' : ''}
 ${!format.disabled && format.color === 'blue' ? 'border-bookcraft-blue/30 bg-blue-50 dark:bg-blue-900/20' : ''}
 ${!format.disabled && format.color === 'gray' ? 'border-border bg-muted' : ''}
 ${!format.disabled && format.color === 'green' ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : ''}
 `}
 title={format.disabled ? t('pdfComingSoon') : format.name}
 >
 <format.icon className={`
 h-5 w-5
 ${format.disabled ? 'text-muted-foreground' : ''}
 ${!format.disabled && format.color === 'blue' ? 'text-bookcraft-blue' : ''}
 ${!format.disabled && format.color === 'gray' ? 'text-muted-foreground' : ''}
 ${!format.disabled && format.color === 'green' ? 'text-green-600 dark:text-green-400' : ''}
 `} />
 <div className="flex flex-col">
 <span className="text-sm font-medium text-foreground">{format.name}</span>
 {format.disabled && (
 <span className="text-xs text-muted-foreground">{t('pdfComingSoon')}</span>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Error Message */}
 {error && (
 <div className="mt-6 bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start">
 <AlertCircle className="h-5 w-5 text-destructive mr-3 flex-shrink-0 mt-0.5" />
 <div>
 <p className="text-sm font-medium text-destructive">{t('error')}</p>
 <p className="text-sm text-destructive/80">{error}</p>
 </div>
 </div>
 )}

 {/* Success Message */}
 {success && (
 <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start">
 <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-3 flex-shrink-0 mt-0.5" />
 <div>
 <p className="text-sm font-medium text-green-800 dark:text-green-200">{t('success')}</p>
 <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
 </div>
 </div>
 )}

 {/* Info Box */}
 <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
 <p className="text-sm text-blue-800 dark:text-blue-200">
 <strong> {t('importHint')}</strong> {t('importHintText')}
 </p>
 </div>
 </Card>
 </div>
 )
}
