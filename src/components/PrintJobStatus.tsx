'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { RefreshCw, Package, Truck, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

interface PrintJob {
 id: string
 lulu_print_job_id: string
 external_id: string
 status: string
 book_title: string
 book_author?: string
 book_type?: string
 total_cost?: string
 shipping_level: string
 product_id?: string
 quantity?: number
 tracking_number?: string
 tracking_url?: string
 carrier?: string
 estimated_delivery_date?: string
 created_at: string
 updated_at: string
 last_webhook_update?: string
}

export default function PrintJobStatus() {
 const [printJobs, setPrintJobs] = useState<PrintJob[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)
 const { user, getIdToken } = useAuth()
 const { t } = useLanguage()

 const fetchPrintJobs = useCallback(async () => {
 try {
 setLoading(true)
 setError(null)

 if (!user) {
 setError(t('pleaseLogInForPrintJobs'))
 setLoading(false)
 return
 }

 const token = await getIdToken()
 if (!token) {
 setError(t('authFailedRelogin'))
 setLoading(false)
 return
 }

 const response = await fetch('/api/print-jobs', {
 headers: {
 'Authorization': `Bearer ${token}`
 }
 })

 const data = await response.json()

 if (response.ok) {
 setPrintJobs(data.print_jobs || [])
 } else {
 setError(data.error || t('failedToFetchPrintJobs'))
 }
 } catch (error) {
      console.error('Error fetching print jobs:', error)
 setError(t('failedToFetchPrintJobs'))
 } finally {
 setLoading(false)
 }
 }, [user, getIdToken, t])

 useEffect(() => {
 if (user) {
 fetchPrintJobs()
 }
 }, [user, fetchPrintJobs])

 const getStatusIcon = (status: string) => {
 switch (status.toLowerCase()) {
 case 'created':
 case 'unpaid':
 return <Clock className="h-4 w-4" />
 case 'payment_in_progress':
 return <RefreshCw className="h-4 w-4 animate-spin" />
 case 'production_delay':
 case 'in_production':
 return <Package className="h-4 w-4" />
 case 'shipped':
 return <Truck className="h-4 w-4" />
 case 'completed':
 return <CheckCircle className="h-4 w-4" />
 case 'cancelled':
 return <XCircle className="h-4 w-4" />
 case 'error':
 return <AlertCircle className="h-4 w-4" />
 default:
 return <Clock className="h-4 w-4" />
 }
 }

 const getStatusColor = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
 switch (status.toLowerCase()) {
 case 'created':
 case 'unpaid':
 case 'payment_in_progress':
 return 'outline'
 case 'production_delay':
 case 'in_production':
 return 'default'
 case 'shipped':
 case 'completed':
 return 'secondary'
 case 'cancelled':
 case 'error':
 return 'destructive'
 default:
 return 'outline'
 }
 }

 const formatStatus = (status: string): string => {
 return status.split('_').map(word => 
 word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
 ).join(' ')
 }

 const formatDate = (dateString: string): string => {
 return new Date(dateString).toLocaleDateString('en-US', {
 year: 'numeric',
 month: 'short',
 day: 'numeric',
 hour: '2-digit',
 minute: '2-digit'
 })
 }

 if (loading) {
 return (
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <RefreshCw className="h-5 w-5 animate-spin" />
 Loading Print Jobs...
 </CardTitle>
 </CardHeader>
 </Card>
 )
 }

 if (error) {
 return (
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-red-600">
 <AlertCircle className="h-5 w-5" />
 Error Loading Print Jobs
 </CardTitle>
 <CardDescription>{error}</CardDescription>
 </CardHeader>
 <CardContent>
 <Button onClick={fetchPrintJobs} variant="outline">
 Try Again
 </Button>
 </CardContent>
 </Card>
 )
 }

 if (printJobs.length === 0) {
 return (
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Package className="h-5 w-5" />
 Print Orders
 </CardTitle>
 <CardDescription>You haven&apos;t ordered any books yet.</CardDescription>
 </CardHeader>
 <CardContent>
 <p className="text-sm text-gray-600 mb-4">
 When you order physical copies of your books, they&apos;ll appear here.
 </p>
 <Button onClick={fetchPrintJobs} variant="outline" size="sm">
 <RefreshCw className="mr-2 h-4 w-4" />
 Refresh
 </Button>
 </CardContent>
 </Card>
 )
 }

 return (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold flex items-center gap-2">
 <Package className="h-5 w-5" />
 Print Orders ({printJobs.length})
 </h2>
 <Button onClick={fetchPrintJobs} variant="outline" size="sm">
 <RefreshCw className="mr-2 h-4 w-4" />
 Refresh
 </Button>
 </div>

 {printJobs.map((job) => (
 <Card key={job.id}>
 <CardHeader>
 <div className="flex items-start justify-between">
 <div>
 <CardTitle className="text-lg">{job.book_title}</CardTitle>
 <CardDescription>
 {job.book_author && `by ${job.book_author} • `}
 Order #{job.external_id.split('-').pop()}
 </CardDescription>
 </div>
 <Badge variant={getStatusColor(job.status)} className="flex items-center gap-1">
 {getStatusIcon(job.status)}
 {formatStatus(job.status)}
 </Badge>
 </div>
 </CardHeader>
 
 <CardContent>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
 <div>
 <div className="font-medium">{t('bookType')}</div>
 <div className="text-gray-600 capitalize">
 {job.book_type || t('textBook')}
 </div>
 </div>

 <div>
 <div className="font-medium">{t('quantity')}</div>
 <div className="text-gray-600">
 {t('copies', { num: job.quantity || 1, plural: (job.quantity || 1) === 1 ? 'y' : 'ies' })}
 </div>
 </div>

 <div>
 <div className="font-medium">{t('shipping')}</div>
 <div className="text-gray-600 capitalize">
 {job.shipping_level.replace('_', ' ').toLowerCase()}
 </div>
 </div>

 {job.total_cost && (
 <div>
 <div className="font-medium">{t('totalCost')}</div>
 <div className="text-gray-600">${job.total_cost}</div>
 </div>
 )}

 <div>
 <div className="font-medium">{t('ordered')}</div>
 <div className="text-gray-600">
 {formatDate(job.created_at)}
 </div>
 </div>
 </div>

 {/* Tracking Information */}
 {job.tracking_number && (
 <div className="mt-4 pt-4 border-t">
 <div className="bg-green-50 border border-green-200 rounded p-3">
 <div className="flex items-center gap-2 mb-2">
 <Truck className="h-4 w-4 text-green-600" />
 <span className="font-medium text-green-900">{t('trackingInformation')}</span>
 </div>
 <div className="space-y-1 text-sm">
 <div className="flex justify-between">
 <span className="text-gray-600">{t('trackingNumber')}:</span>
 <span className="font-mono">{job.tracking_number}</span>
 </div>
 {job.carrier && (
 <div className="flex justify-between">
 <span className="text-gray-600">Carrier:</span>
 <span className="font-medium">{job.carrier}</span>
 </div>
 )}
 {job.estimated_delivery_date && (
 <div className="flex justify-between">
 <span className="text-gray-600">Est. Delivery:</span>
 <span>{formatDate(job.estimated_delivery_date)}</span>
 </div>
 )}
 {job.tracking_url && (
 <div className="mt-2">
 <a
 href={job.tracking_url}
 target="_blank"
 rel="noopener noreferrer"
 className="text-bookcraft-blue hover:text-bookcraft-blue/80 underline text-sm"
 >
 Track Package →
 </a>
 </div>
 )}
 </div>
 </div>
 </div>
 )}

 {job.last_webhook_update && (
 <div className="mt-4 pt-4 border-t">
 <div className="text-xs text-gray-500">
 Last update: {formatDate(job.last_webhook_update)}
 </div>
 </div>
 )}

 {job.status.toLowerCase() === 'error' && (
 <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
 There was an issue with your print order. Please contact support for assistance.
 </div>
 )}
 </CardContent>
 </Card>
 ))}
 </div>
 )
}