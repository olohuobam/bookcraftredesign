'use client'

import { useState, useEffect, startTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface ActionItem {
 id: string
 label: string
 icon?: React.ReactNode
 destructive?: boolean
 disabled?: boolean
 onClick: () => void
}

interface ActionSheetProps {
 isOpen: boolean
 onClose: () => void
 title?: string
 message?: string
 actions: ActionItem[]
}

export function ActionSheet({ 
 isOpen, 
 onClose, 
 title, 
 message, 
 actions 
}: ActionSheetProps) {
 const [isVisible, setIsVisible] = useState(false)

 useEffect(() => {
 if (isOpen) {
 startTransition(() => { setIsVisible(true) })
 document.body.style.overflow = 'hidden'
 } else {
 document.body.style.overflow = ''
 }

 return () => {
 document.body.style.overflow = ''
 }
 }, [isOpen])

 const handleClose = () => {
 setIsVisible(false)
 setTimeout(onClose, 250) // Wait for exit animation
 }

 const handleAction = (action: ActionItem) => {
 if (!action.disabled) {
 handleClose()
 setTimeout(action.onClick, 100) // Small delay for better UX
 }
 }

 return (
 <AnimatePresence>
 {isVisible && (
 <>
 {/* Backdrop */}
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.3 }}
 className="fixed inset-0 bg-black/50 z-[60]"
 onClick={handleClose}
 />

 {/* Action Sheet */}
 <motion.div
 initial={{ y: '100%' }}
 animate={{ y: 0 }}
 exit={{ y: '100%' }}
 transition={{ 
 type: 'spring', 
 damping: 30, 
 stiffness: 300,
 mass: 0.8
 }}
 className="fixed bottom-0 left-0 right-0 z-[61] bg-background rounded-t-3xl shadow-2xl border-t border-border mx-2 mb-2"
 style={{
 paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)'
 }}
 >
 {/* Handle bar */}
 <div className="flex justify-center pt-3 pb-2">
 <div className="w-10 h-1 bg-border rounded-full" />
 </div>

 {/* Header */}
 {(title || message) && (
 <div className="px-6 pb-4">
 {title && (
 <h3 className="text-lg font-semibold text-foreground text-center mb-1">
 {title}
 </h3>
 )}
 {message && (
 <p className="text-sm text-muted-foreground text-center leading-relaxed">
 {message}
 </p>
 )}
 </div>
 )}

 {/* Actions */}
 <div className="px-2">
 {actions.map((action, index) => (
 <button
 key={action.id}
 onClick={() => handleAction(action)}
 disabled={action.disabled}
 className={`
 w-full flex items-center gap-4 px-6 py-4 text-left transition-all duration-150
 ${action.disabled 
 ? 'opacity-50 cursor-not-allowed' 
 : 'active:bg-accent/50 ios-touch'
 }
 ${index === 0 ? 'rounded-t-2xl' : ''}
 ${index === actions.length - 1 ? 'rounded-b-2xl' : ''}
 ${action.destructive 
 ? 'text-red-600 dark:text-red-400' 
 : 'text-foreground'
 }
 `}
 >
 {action.icon && (
 <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
 {action.icon}
 </div>
 )}
 <span className="text-base font-medium">
 {action.label}
 </span>
 </button>
 ))}
 </div>

 {/* Cancel Button */}
 <div className="px-2 pt-2">
 <button
 onClick={handleClose}
 className="w-full bg-secondary/50 rounded-2xl py-4 text-base font-semibold text-foreground ios-touch"
 >
 Cancel
 </button>
 </div>
 </motion.div>
 </>
 )}
 </AnimatePresence>
 )
}

export default ActionSheet