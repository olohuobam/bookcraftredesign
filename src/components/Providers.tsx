'use client'

import { AuthProvider } from '@/context/AuthContext'
import { NotificationProvider } from '@/context/NotificationContext'
import { LanguageProvider } from '@/context/LanguageContext'
import CapacitorProvider from '@/components/CapacitorProvider'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ToastProvider } from '@/components/ui/toast'
import PushNotificationInitializer from '@/components/PushNotificationInitializer'

export default function Providers({
 children,
}: {
 children: React.ReactNode
}) {
 return (
 <ThemeProvider>
 <CapacitorProvider>
 <AuthProvider>
 <LanguageProvider>
 <NotificationProvider>
 <ToastProvider>
 {/* Initialise push-notification permissions & listeners on native platforms */}
 <PushNotificationInitializer />
 {children}
 </ToastProvider>
 </NotificationProvider>
 </LanguageProvider>
 </AuthProvider>
 </CapacitorProvider>
 </ThemeProvider>
 )
}
