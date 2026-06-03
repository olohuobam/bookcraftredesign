'use client'

import { Metadata } from 'next'
import { useRef } from 'react'

export default function WiderrufPage() {
 const formRef = useRef<HTMLDivElement>(null)

 const handlePrint = () => {
 window.print()
 }

 return (
 <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-blue-50 dark:from-blue-950/20 dark:via-background dark:to-blue-950/20">
 <div className="container mx-auto px-6 py-12">
 <div className="max-w-3xl mx-auto">
 <div className="flex justify-between items-center mb-8">
 <h1 className="text-4xl font-bold text-foreground">Withdrawal Form</h1>
 <button
 onClick={handlePrint}
 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors print:hidden flex items-center gap-2"
 >
 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
 </svg>
 Print / PDF
 </button>
 </div>

 <div ref={formRef} className="bg-card rounded-lg shadow-lg p-8 print:shadow-none print:p-0">
 <div className="space-y-6">
 <div className="text-center border-b border-border pb-6">
 <h2 className="text-2xl font-semibold text-foreground">Sample Withdrawal Form</h2>
 <p className="text-sm text-muted-foreground mt-2">
 (If you wish to withdraw from the contract, please complete this form and return it)
 </p>
 </div>

 <div className="space-y-4 text-foreground">
 <div className="bg-muted p-4 rounded-lg">
 <p className="font-medium">To:</p>
 <p className="mt-2">
 Jakob Kasimir Altenburg<br />
 Burgseestraße 1<br />
 19053 Schwerin<br />
 E-mail: info@bookcraft.dev
 </p>
 </div>

 <div className="space-y-4 mt-6">
 <p>
 I/We (*) hereby give notice that I/We (*) withdraw from my/our (*) contract for the
 purchase of the following goods (*) / provision of the following service (*):
 </p>

 <div className="border-b border-border py-4">
 <label className="block text-sm font-medium text-muted-foreground mb-1">
 Description of goods/service:
 </label>
 <div className="h-16 border border-border rounded bg-muted print:border-border"></div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="border-b border-border py-4">
 <label className="block text-sm font-medium text-muted-foreground mb-1">
 Ordered on (*) / received on (*):
 </label>
 <div className="h-8 border border-border rounded bg-muted print:border-border"></div>
 </div>
 <div className="border-b border-border py-4">
 <label className="block text-sm font-medium text-muted-foreground mb-1">
 Order number (if available):
 </label>
 <div className="h-8 border border-border rounded bg-muted print:border-border"></div>
 </div>
 </div>

 <div className="border-b border-border py-4">
 <label className="block text-sm font-medium text-muted-foreground mb-1">
 Name of consumer(s):
 </label>
 <div className="h-8 border border-border rounded bg-muted print:border-border"></div>
 </div>

 <div className="border-b border-border py-4">
 <label className="block text-sm font-medium text-muted-foreground mb-1">
 Address of consumer(s):
 </label>
 <div className="h-16 border border-border rounded bg-muted print:border-border"></div>
 </div>

 <div className="border-b border-border py-4">
 <label className="block text-sm font-medium text-muted-foreground mb-1">
 E-mail address (optional):
 </label>
 <div className="h-8 border border-border rounded bg-muted print:border-border"></div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
 <div>
 <label className="block text-sm font-medium text-muted-foreground mb-1">
 Date:
 </label>
 <div className="h-8 border-b border-border"></div>
 </div>
 <div>
 <label className="block text-sm font-medium text-muted-foreground mb-1">
 Signature of consumer(s):
 </label>
 <div className="h-8 border-b border-border"></div>
 <p className="text-xs text-muted-foreground mt-1">(only if notified on paper)</p>
 </div>
 </div>
 </div>

 <div className="mt-8 pt-6 border-t border-border text-sm text-muted-foreground">
 <p>(*) Delete as appropriate.</p>
 </div>
 </div>
 </div>
 </div>

 <div className="mt-8 bg-blue-50 dark:bg-blue-950/30 rounded-lg p-6 print:hidden">
 <h3 className="font-semibold text-foreground mb-2">Notice about the Right of Withdrawal</h3>
 <p className="text-sm text-muted-foreground">
 You have the right to withdraw from this contract within fourteen days without giving any reason.
 The withdrawal period is fourteen days from the date of contract conclusion. You can print this
 form, complete it, and send it to us by post or email.
 </p>
 </div>
 </div>
 </div>

 <style jsx global>{`
 @media print {
 body * {
 visibility: hidden;
 }
 .container, .container * {
 visibility: visible;
 }
 .container {
 position: absolute;
 left: 0;
 top: 0;
 width: 100%;
 }
 .bg-gradient-to-br {
 background: white !important;
 }
 }
 `}</style>
 </div>
 )
}
