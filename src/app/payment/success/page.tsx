import { Suspense } from 'react'
import PaymentSuccessClient from './successClient'
import { getTranslations } from '@/lib/translations'

export default async function PaymentSuccessPage({ searchParams }: { searchParams: Promise<{ [k: string]: string | string[] | undefined }> }) {
 const params = await searchParams
 const tr = getTranslations('en')
 return (
 <Suspense fallback={<div className="p-8 text-center">{tr.loadingPaymentConfirmation}</div>}>
 <PaymentSuccessClient
 sessionId={(params.session_id as string) || ''}
 type={(params.type as string) || ''}
 coins={(params.coins as string) || ''}
 planName={(params.plan as string) || ''}
 />
 </Suspense>
 )
}
