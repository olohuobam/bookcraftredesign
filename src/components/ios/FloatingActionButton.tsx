'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { useHaptics } from '@/hooks/useHaptics'

interface FABAction {
 id: string
 label: string
 icon: React.ReactNode
 color?: string
 onClick: () => void
}

interface FloatingActionButtonProps {
 actions?: FABAction[]
 mainAction?: () => void
 mainIcon?: React.ReactNode
 className?: string
 position?: 'bottom-right' | 'bottom-left' | 'bottom-center'
 size?: 'normal' | 'large'
}

export function FloatingActionButton({
 actions = [],
 mainAction,
 mainIcon = <Plus className="w-6 h-6" />,
 className = '',
 position = 'bottom-right',
 size = 'normal'
}: FloatingActionButtonProps) {
 const { impact } = useHaptics()
 const [isExpanded, setIsExpanded] = useState(false)
 const [isPressed, setIsPressed] = useState(false)
 const longPressTimer = useRef<NodeJS.Timeout | null>(null)

 const fabSize = size === 'large' ? 'w-16 h-16' : 'w-14 h-14'
 
  // Account for bottom navigation (h-16 = 4rem) + safe-area-inset-bottom + spacing
 const positionClasses = {
 'bottom-right': 'right-5 sm:right-6',
 'bottom-left': 'left-5 sm:left-6', 
 'bottom-center': 'left-1/2 -translate-x-1/2'
 }
 
  // Dynamic bottom position accounting for nav and safe area
 const bottomStyle = { 
 bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' 
 }

 const handleMainPress = () => {
 impact('medium')
 
 if (actions.length > 0) {
 setIsExpanded(!isExpanded)
 } else if (mainAction) {
 mainAction()
 }
 }

 const handleActionPress = (action: FABAction) => {
 impact('light')
 setIsExpanded(false)
 setTimeout(() => action.onClick(), 150) // Delay for animation
 }

 const handlePointerDown = () => {
 setIsPressed(true)
 
 if (actions.length > 0) {
 longPressTimer.current = setTimeout(() => {
 setIsExpanded(true)
 impact('heavy')
 }, 300)
 }
 }

 const handlePointerUp = () => {
 setIsPressed(false)
 
 if (longPressTimer.current) {
 clearTimeout(longPressTimer.current)
 }
 
 if (!isExpanded) {
 handleMainPress()
 }
 }

 const handlePointerLeave = () => {
 setIsPressed(false)
 
 if (longPressTimer.current) {
 clearTimeout(longPressTimer.current)
 }
 }

 return (
 <>
 {/* Backdrop when expanded */}
 <AnimatePresence>
 {isExpanded && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.2 }}
 className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[45]"
 onClick={() => setIsExpanded(false)}
 />
 )}
 </AnimatePresence>

 <div className={`fixed ${positionClasses[position]} z-50 ${className}`} style={bottomStyle}>
 {/* Action Items */}
 <AnimatePresence>
 {isExpanded && actions.map((action, index) => (
 <motion.div
 key={action.id}
 initial={{ 
 scale: 0,
 opacity: 0,
 y: 0
 }}
 animate={{ 
 scale: 1,
 opacity: 1,
 y: -(70 + (index * 60))
 }}
 exit={{ 
 scale: 0,
 opacity: 0,
 y: 0
 }}
 transition={{
 type: 'spring',
 damping: 20,
 stiffness: 300,
 delay: index * 0.05
 }}
 className="absolute bottom-0 right-0"
 >
 {/* Action Label */}
 <div className="absolute bottom-1/2 right-full translate-y-1/2 mr-4">
 <div className="bg-background/90 backdrop-blur-sm px-3 py-2 rounded-xl shadow-lg border border-border whitespace-nowrap">
 <span className="text-sm font-medium text-foreground">
 {action.label}
 </span>
 </div>
 </div>

 {/* Action Button */}
 <motion.button
 whileTap={{ scale: 0.9 }}
 onClick={() => handleActionPress(action)}
 className={`
 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg
 ${action.color || 'bg-bookcraft-blue hover:brightness-110'}
 ios-touch
 `}
 >
 {action.icon}
 </motion.button>
 </motion.div>
 ))}
 </AnimatePresence>

 {/* Main FAB */}
 <motion.button
 onPointerDown={handlePointerDown}
 onPointerUp={handlePointerUp}
 onPointerLeave={handlePointerLeave}
 animate={{
 scale: isPressed ? 0.9 : 1,
 rotate: isExpanded ? 45 : 0
 }}
 transition={{
 type: 'spring',
 damping: 20,
 stiffness: 300
 }}
 className={`
 fab-ios ${fabSize} flex items-center justify-center relative
 ${isPressed ? 'shadow-md' : 'shadow-xl'}
 transition-shadow duration-150
 `}
 >
 {/* Ripple Effect */}
 {isPressed && (
 <motion.div
 initial={{ scale: 0, opacity: 0.5 }}
 animate={{ scale: 2, opacity: 0 }}
 transition={{ duration: 0.6 }}
 className="absolute inset-0 bg-white/30 rounded-full"
 />
 )}

 {/* Icon */}
 <motion.div
 animate={{ rotate: isExpanded ? 45 : 0 }}
 transition={{ duration: 0.2 }}
 >
 {isExpanded && actions.length > 0 ? (
 <X className="w-6 h-6" />
 ) : (
 mainIcon
 )}
 </motion.div>
 </motion.button>

 {/* Pulse Animation for Attention */}
 <AnimatePresence>
 {!isExpanded && (
 <motion.div
 initial={{ scale: 1, opacity: 0 }}
 animate={{ scale: 1.5, opacity: 0.3 }}
 exit={{ opacity: 0 }}
 transition={{
 duration: 2,
 repeat: Infinity,
 repeatType: 'loop'
 }}
 className={`absolute top-0 left-0 ${fabSize} bg-bookcraft-blue/60 rounded-full -z-10`}
 />
 )}
 </AnimatePresence>
 </div>
 </>
 )
}

export default FloatingActionButton