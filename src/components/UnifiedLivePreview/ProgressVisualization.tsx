'use client'

import { motion } from 'framer-motion'
import { Wifi, WifiOff, Clock, Zap, CheckCircle2 } from 'lucide-react'
import { progressFillVariants, progressPanelVariants } from './animations'
import { ProgressVisualizationProps } from './types'

export default function ProgressVisualization({
 progress,
 totalItems,
 completedItems,
 currentStep,
 eta,
 isConnected,
 connectionType
}: ProgressVisualizationProps) {
 const getConnectionColor = () => {
 switch (connectionType) {
 case 'realtime':
 return 'text-green-400'
 case 'sse':
 return 'text-bookcraft-blue'
 case 'polling':
 return 'text-yellow-400'
 default:
 return 'text-red-400'
 }
 }

 const getConnectionLabel = () => {
 switch (connectionType) {
 case 'realtime':
 return 'Realtime'
 case 'sse':
 return 'Live'
 case 'polling':
 return 'Polling'
 default:
 return 'Offline'
 }
 }

 const isComplete = progress >= 100

 return (
 <motion.div
 variants={progressPanelVariants}
 initial="hidden"
 animate="visible"
 className="fixed bottom-0 left-0 right-0 z-50"
 >
 <div className="bg-black/40 backdrop-blur-xl border-t border-white/10">
 <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
 {/* Mobile Layout (< 768px) - Stacked */}
 <div className="md:hidden space-y-3">
 {/* Top Row: Progress % and Item Count */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 {isComplete ? (
 <motion.div
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 transition={{ type: 'spring', stiffness: 400, damping: 20 }}
 >
 <CheckCircle2 className="w-5 h-5 text-green-400" />
 </motion.div>
 ) : (
 <Zap className="w-5 h-5 text-bookcraft-blue" />
 )}
 <span className="text-xl sm:text-2xl font-bold text-white">
 {Math.round(progress)}%
 </span>
 </div>

 <div className="flex items-center gap-3">
 {/* Item count */}
 <span className="text-xs sm:text-sm text-white/50">
 {completedItems}/{totalItems}
 </span>

 {/* Connection status */}
 <div className={`flex items-center gap-1 ${getConnectionColor()}`}>
 {isConnected ? (
 <Wifi className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
 ) : (
 <WifiOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
 )}
 <span className="text-xs font-medium hidden sm:inline">{getConnectionLabel()}</span>
 </div>
 </div>
 </div>

 {/* Progress bar */}
 <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
 <motion.div
 className="absolute inset-y-0 left-0 rounded-full"
 style={{
 background: isComplete
 ? 'linear-gradient(90deg, #22c55e, #4ade80)'
 : 'linear-gradient(90deg, #3b82f6, #60a5fa, #d946ef)',
 originX: 0
 }}
 variants={progressFillVariants}
 initial="empty"
 animate="fill"
 custom={progress}
 />

 {/* Shimmer effect while in progress */}
 {!isComplete && (
 <motion.div
 className="absolute inset-0"
 style={{
 background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
 width: '30%'
 }}
 animate={{
 x: ['0%', '400%']
 }}
 transition={{
 duration: 1.5,
 repeat: Infinity,
 ease: 'linear'
 }}
 />
 )}
 </div>

 {/* Bottom Row: Current step / Complete message + ETA */}
 <div className="flex items-center justify-between gap-2">
 <div className="flex-1 min-w-0">
 {currentStep && !isComplete && (
 <motion.p
 key={currentStep}
 initial={{ opacity: 0, y: 5 }}
 animate={{ opacity: 1, y: 0 }}
 className="text-xs sm:text-sm text-white/60 truncate"
 >
 {currentStep}
 </motion.p>
 )}

 {isComplete && (
 <motion.p
 initial={{ opacity: 0, y: 5 }}
 animate={{ opacity: 1, y: 0 }}
 className="text-xs sm:text-sm text-green-400"
 >
 Complete! 
 </motion.p>
 )}
 </div>

 {/* ETA */}
 {eta && !isComplete && (
 <div className="flex items-center gap-1.5 text-white/50 flex-shrink-0">
 <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
 <span className="text-xs sm:text-sm">{eta}</span>
 </div>
 )}
 </div>
 </div>

 {/* Desktop Layout (>= 768px) - Original Horizontal */}
 <div className="hidden md:flex items-center justify-between gap-6">
 {/* Left: Progress info */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-3 mb-2">
 {/* Progress percentage */}
 <div className="flex items-center gap-2">
 {isComplete ? (
 <motion.div
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 transition={{ type: 'spring', stiffness: 400, damping: 20 }}
 >
 <CheckCircle2 className="w-5 h-5 text-green-400" />
 </motion.div>
 ) : (
 <Zap className="w-5 h-5 text-bookcraft-blue" />
 )}
 <span className="text-2xl font-bold text-white">
 {Math.round(progress)}%
 </span>
 </div>

 {/* Item count */}
 <span className="text-sm text-white/50">
 {completedItems} / {totalItems} items
 </span>
 </div>

 {/* Progress bar */}
 <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
 <motion.div
 className="absolute inset-y-0 left-0 rounded-full"
 style={{
 background: isComplete
 ? 'linear-gradient(90deg, #22c55e, #4ade80)'
 : 'linear-gradient(90deg, #3b82f6, #60a5fa, #d946ef)',
 originX: 0
 }}
 variants={progressFillVariants}
 initial="empty"
 animate="fill"
 custom={progress}
 />

 {/* Shimmer effect while in progress */}
 {!isComplete && (
 <motion.div
 className="absolute inset-0"
 style={{
 background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
 width: '30%'
 }}
 animate={{
 x: ['0%', '400%']
 }}
 transition={{
 duration: 1.5,
 repeat: Infinity,
 ease: 'linear'
 }}
 />
 )}
 </div>

 {/* Current step */}
 {currentStep && !isComplete && (
 <motion.p
 key={currentStep}
 initial={{ opacity: 0, y: 5 }}
 animate={{ opacity: 1, y: 0 }}
 className="mt-2 text-sm text-white/60 truncate"
 >
 {currentStep}
 </motion.p>
 )}

 {isComplete && (
 <motion.p
 initial={{ opacity: 0, y: 5 }}
 animate={{ opacity: 1, y: 0 }}
 className="mt-2 text-sm text-green-400"
 >
 Generation complete! Your content is ready.
 </motion.p>
 )}
 </div>

 {/* Right: Connection & ETA */}
 <div className="flex items-center gap-4">
 {/* ETA */}
 {eta && !isComplete && (
 <div className="flex items-center gap-2 text-white/50">
 <Clock className="w-4 h-4" />
 <span className="text-sm">{eta}</span>
 </div>
 )}

 {/* Connection status */}
 <div className={`flex items-center gap-1.5 ${getConnectionColor()}`}>
 {isConnected ? (
 <Wifi className="w-4 h-4" />
 ) : (
 <WifiOff className="w-4 h-4" />
 )}
 <span className="text-xs font-medium">{getConnectionLabel()}</span>
 </div>

 {/* Item indicators */}
 <div className="flex gap-1">
 {Array.from({ length: Math.min(totalItems, 10) }).map((_, i) => (
 <motion.div
 key={i}
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 transition={{ delay: i * 0.05 }}
 className={`w-2 h-2 rounded-full ${
 i < completedItems
 ? 'bg-green-400'
 : i === completedItems
 ? 'bg-bookcraft-blue animate-pulse'
 : 'bg-white/20'
 }`}
 />
 ))}
 {totalItems > 10 && (
 <span className="text-xs text-white/40 ml-1">+{totalItems - 10}</span>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 </motion.div>
 )
}
