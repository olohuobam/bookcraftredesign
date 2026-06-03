'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { X } from 'lucide-react'

interface Toast {
 id: string
 message: string
 type: 'error' | 'success' | 'info' | 'warning'
 duration?: number
}

interface ToastContextType {
 showToast: (message: string, type?: Toast['type'], duration?: number) => void
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} })

export function useToast() {
 return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
 const [toasts, setToasts] = useState<Toast[]>([])

 const showToast = useCallback((message: string, type: Toast['type'] = 'error', duration = 5000) => {
 const id = Math.random().toString(36).slice(2)
 setToasts(prev => [...prev, { id, message, type, duration }])
 }, [])

 const removeToast = useCallback((id: string) => {
 setToasts(prev => prev.filter(t => t.id !== id))
 }, [])

 return (
 <ToastContext.Provider value={{ showToast }}>
 {children}
 {/* Toast container */}
 <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-[90vw] max-w-md pointer-events-none drop-shadow-2xl">
 {toasts.map(toast => (
 <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
 ))}
 </div>
 </ToastContext.Provider>
 )
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
 useEffect(() => {
 const timer = setTimeout(() => onRemove(toast.id), toast.duration || 5000)
 return () => clearTimeout(timer)
 }, [toast, onRemove])

 const bgClass = toast.type === 'error'
 ? 'bg-red-600/90 text-white border border-red-400/20 shadow-red-900/20'
 : toast.type === 'success'
 ? 'bg-emerald-600/90 text-white border border-emerald-400/20 shadow-emerald-900/20'
 : toast.type === 'warning'
 ? 'bg-amber-500/90 text-white border border-amber-300/20 shadow-amber-900/20'
 : 'bg-bookcraft-blue/90 text-white border border-blue-400/20 shadow-bookcraft-blue/20'

 return (
 <div className={`${bgClass} backdrop-blur-xl rounded-2xl px-4 py-3.5 shadow-2xl shadow-black/15 flex items-center justify-between gap-2 pointer-events-auto animate-in slide-in-from-bottom-4 fade-in duration-300`}>
 <span className="text-sm font-medium">{toast.message}</span>
 <button onClick={() => onRemove(toast.id)} className="flex-shrink-0 opacity-70 hover:opacity-100">
 <X className="h-4 w-4" />
 </button>
 </div>
 )
}
