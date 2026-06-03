'use client'

import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Notification {
 id: string
 type: 'success' | 'error' | 'warning' | 'info'
 title: string
 message: string
 duration?: number
}

interface NotificationContextType {
 notifications: Notification[]
 addNotification: (notification: Omit<Notification, 'id'>) => void
 removeNotification: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotifications = () => {
 const context = useContext(NotificationContext)
 if (!context) {
 throw new Error('useNotifications must be used within a NotificationProvider')
 }
 return context
}

interface NotificationProviderProps {
 children: ReactNode
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
 const [notifications, setNotifications] = useState<Notification[]>([])
 const counterRef = useRef(0)

 const removeNotification = useCallback((id: string) => {
 setNotifications(prev => prev.filter(notification => notification.id !== id))
 }, [])

 const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
 counterRef.current += 1
 const id = `notif-${counterRef.current}-${Date.now()}`
 const newNotification = { ...notification, id }

 setNotifications(prev => [...prev, newNotification])

 setTimeout(() => {
 removeNotification(id)
 }, notification.duration || 5000)
 }, [removeNotification])

 return (
 <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
 {children}
 <NotificationContainer />
 </NotificationContext.Provider>
 )
}

const NotificationContainer: React.FC = () => {
 const { notifications, removeNotification } = useNotifications()

 const getIcon = (type: Notification['type']) => {
 switch (type) {
 case 'success':
 return <CheckCircle className="h-6 w-6 text-green-600" />
 case 'error':
 return <XCircle className="h-6 w-6 text-red-600" />
 case 'warning':
 return <AlertCircle className="h-6 w-6 text-yellow-600" />
 case 'info':
 return <Info className="h-6 w-6 text-blue-600" />
 }
 }

 const getBgColor = (type: Notification['type']) => {
 switch (type) {
 case 'success':
 return 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
 case 'error':
 return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
 case 'warning':
 return 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800'
 case 'info':
 return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
 }
 }

 return (
 <div className="fixed top-4 right-4 z-50 space-y-4 max-w-sm">
 <AnimatePresence mode="popLayout">
 {notifications.map((notification) => (
 <motion.div
 key={notification.id}
 initial={{ opacity: 0, x: 300, scale: 0.9 }}
 animate={{ opacity: 1, x: 0, scale: 1 }}
 exit={{ opacity: 0, x: 300, scale: 0.8 }}
 transition={{ type: "spring", damping: 25, stiffness: 300 }}
 className={`p-4 rounded-lg border shadow-lg ${getBgColor(notification.type)}`}
 >
 <div className="flex items-start space-x-3">
 {getIcon(notification.type)}
 <div className="flex-1 min-w-0">
 <h4 className="text-sm font-semibold text-foreground">
 {notification.title}
 </h4>
 <p className="text-sm text-muted-foreground mt-1">
 {notification.message}
 </p>
 </div>
 <button
 onClick={() => removeNotification(notification.id)}
 className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
 >
 <X className="h-4 w-4" />
 </button>
 </div>
 </motion.div>
 ))}
 </AnimatePresence>
 </div>
 )
}
