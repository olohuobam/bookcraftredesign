'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Upload, FileJson, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'

interface BookImportDialogProps {
 onImportSuccess?: () => void
}

export default function BookImportDialog({ onImportSuccess }: BookImportDialogProps) {
 const { t } = useLanguage()
 const { getIdToken } = useAuth()
 const [open, setOpen] = useState(false)
 const [importing, setImporting] = useState(false)
 const [error, setError] = useState<string | null>(null)
 const [success, setSuccess] = useState<string | null>(null)
 const [dragActive, setDragActive] = useState(false)

 const validateBookData = (data: any): string | null => {
 if (!data.title || typeof data.title !== 'string') {
 return 'Title is required and must be a string'
 }
 if (!data.genre || typeof data.genre !== 'string') {
 return 'Genre is required and must be a string'
 }
 if (data.book_type && !['text', 'picture'].includes(data.book_type)) {
 return 'book_type must be "text" or "picture"'
 }
 if (data.status && !['draft', 'generating', 'completed', 'error'].includes(data.status)) {
 return 'status must be "draft", "generating", "completed" or "error"'
 }
 return null
 }

 const handleFileUpload = async (file: File) => {
 setError(null)
 setSuccess(null)
 setImporting(true)

 try {
      // Read file content
 const fileContent = await file.text()
 let bookData

 try {
 bookData = JSON.parse(fileContent)
 } catch (e) {
 throw new Error('Invalid JSON format')
 }

      // Validate book data
 const validationError = validateBookData(bookData)
 if (validationError) {
 throw new Error(validationError)
 }

      // Import the book
 const token = await getIdToken()
 if (!token) {
 throw new Error('Authentication failed')
 }

 const response = await fetch('/api/books/import', {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${token}`,
 'Content-Type': 'application/json'
 },
 body: JSON.stringify(bookData)
 })

 if (!response.ok) {
 const errorData = await response.json().catch(() => ({}))
 throw new Error(errorData.error || 'Import failed')
 }

 const result = await response.json()
 setSuccess(`Book "${result.book.title}" successfully imported!`)

 setTimeout(() => {
 setOpen(false)
 setSuccess(null)
 if (onImportSuccess) {
 onImportSuccess()
 }
 }, 2000)

 } catch (err: any) {
 setError(err.message || 'An error occurred')
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

 const downloadExample = () => {
 const exampleBook = {
 title: "My Incomplete Book",
 genre: "Fantasy",
 description: "An exciting story...",
 content: "",
 chapters: 5,
 style: "Adventure",
 target_audience: "Young Adults",
 book_type: "text",
 status: "draft",
 chapters_json: JSON.stringify([
 {
 id: "1",
 title: "Chapter 1: The Beginning",
 content: "Once upon a time...",
 wordCount: 100
 },
 {
 id: "2",
 title: "Chapter 2",
 content: "",
 wordCount: 0
 }
 ]),
 author: "John Doe",
 cover_image: null,
 back_cover_text: null
 }

 const blob = new Blob([JSON.stringify(exampleBook, null, 2)], { type: 'application/json' })
 const url = URL.createObjectURL(blob)
 const link = document.createElement('a')
 link.href = url
 link.download = 'example-book.json'
 document.body.appendChild(link)
 link.click()
 document.body.removeChild(link)
 URL.revokeObjectURL(url)
 }

 return (
 <Dialog open={open} onOpenChange={setOpen}>
 <DialogTrigger asChild>
 <Button variant="outline">
 <Upload className="h-4 w-4 mr-2" />
 {t('importBookDialog')}
 </Button>
 </DialogTrigger>
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <DialogTitle>{t('importBookDialog')}</DialogTitle>
 <DialogDescription>
 Import a partially completed book from a JSON file
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4">
 {/* Drag & Drop Area */}
 <div
 onDrop={handleDrop}
 onDragOver={handleDragOver}
 onDragLeave={handleDragLeave}
 className={`
 border-2 border-dashed rounded-lg p-8 text-center transition-colors
 ${dragActive ? 'border-bookcraft-blue bg-bookcraft-blue/5' : 'border-gray-300'}
 ${importing ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-bookcraft-blue'}
 `}
 >
 <input
 type="file"
 id="file-upload"
 accept=".json"
 onChange={handleFileSelect}
 disabled={importing}
 className="hidden"
 />
 <label htmlFor="file-upload" className="cursor-pointer">
 <FileJson className="h-12 w-12 text-gray-400 mx-auto mb-3" />
 <p className="text-sm text-gray-600 mb-1">
 {importing ? 'Importing...' : 'Drop JSON file here or click to select'}
 </p>
 <p className="text-xs text-gray-500">
 Supports .json files
 </p>
 </label>
 </div>

 {/* Example Download */}
 <div className="flex justify-center">
 <Button
 variant="link"
 size="sm"
 onClick={downloadExample}
 className="text-bookcraft-blue"
 >
 <FileJson className="h-4 w-4 mr-1" />
 Download example JSON
 </Button>
 </div>

 {/* Error Message */}
 {error && (
 <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
 <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
 <div>
 <p className="text-sm font-medium text-red-800">{t('error')}</p>
 <p className="text-sm text-red-600">{error}</p>
 </div>
 </div>
 )}

 {/* Success Message */}
 {success && (
 <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start">
 <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
 <div>
 <p className="text-sm font-medium text-green-800">{t('success')}</p>
 <p className="text-sm text-green-600">{success}</p>
 </div>
 </div>
 )}

 {/* Info */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
 <p className="text-xs text-blue-800">
 <strong>Note:</strong> The JSON file must contain at least the "title" and "genre" fields.
 All other fields are optional and can be added later.
 </p>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 )
}
