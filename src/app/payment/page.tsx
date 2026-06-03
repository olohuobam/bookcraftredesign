import { Suspense } from 'react'
import PaymentClient from './PaymentClient'

// Server component wrapper: extracts search params and passes to client payment UI
export default async function PaymentPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
 const params = await searchParams
 const type = (params.type as string) || undefined
 const item = (params.item as string) || undefined
 const amount = (params.amount as string) || undefined
 const coins = (params.coins as string) || undefined
 const plan = (params.plan as string) || undefined

 return (
 <Suspense fallback={<div className="p-8 text-center">Lade Zahlung...</div>}>
 <PaymentClient
 type={type}
 itemId={item}
 amount={amount}
 coins={coins}
 planName={plan}
 />
 </Suspense>
 )
}

// ---------------- Client Component ----------------
// Split out to satisfy Next.js requirement (no direct useSearchParams in server prerender without Suspense)
// and keep interactive logic isolated.
 
// (Client logic moved to PaymentClient.tsx)
