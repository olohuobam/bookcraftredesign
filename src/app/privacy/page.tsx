'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PrivacyPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/datenschutz')
  }, [router])

  return null
}
