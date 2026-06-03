'use client'

import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function CancelPage() {
 return (
 <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 flex items-center justify-center p-4">
 <div className="max-w-md w-full bg-card rounded-lg shadow-xl p-8 text-center">
 <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
 <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
 </div>

 <h1 className="text-2xl font-bold text-foreground mb-4">
 Payment Cancelled
 </h1>

 <p className="text-muted-foreground mb-6">
 The payment process was cancelled. Don't worry, no charges were made.
 </p>

 <div className="space-y-4">
 <Link href="/">
 <Button className="w-full" size="lg">
 <RefreshCw className="mr-2 h-5 w-5" />
 Try Again
 </Button>
 </Link>

 <Link href="/">
 <Button variant="outline" className="w-full" size="lg">
 <ArrowLeft className="mr-2 h-5 w-5" />
 Back to Home
 </Button>
 </Link>
 </div>

 <div className="mt-6 p-4 bg-muted rounded-lg">
 <p className="text-sm text-muted-foreground">
 Your generated book remains saved in your account.
 You can retry the payment at any time.
 </p>
 </div>
 </div>
 </div>
 )
}
