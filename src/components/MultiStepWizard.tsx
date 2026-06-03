'use client'

import { ReactNode, useState, useCallback, useRef, TouchEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ChevronLeft } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

export interface Step {
 id: string
 title: string
 description?: string
 content: ReactNode | (() => ReactNode)
 validation?: () => boolean | string
}

interface MultiStepWizardProps {
 steps: Step[]
 onComplete: () => void
 onStepChange?: (stepIndex: number) => void
 className?: string
 backButton?: { text?: string; onClick?: () => void }
 nextButton?: { text?: string }
 finishButton?: { text?: string; disabled?: boolean; loading?: boolean }
 showProgress?: boolean
  /** @deprecated ignored — kept for API compat */
 progressStyle?: string
 allowSkipValidation?: boolean
}

const spring = { type: 'spring' as const, stiffness: 400, damping: 32, mass: 0.8 }

export default function MultiStepWizard({
 steps,
 onComplete,
 onStepChange,
 className,
 backButton: backButtonProp,
 nextButton: nextButtonProp,
 finishButton: finishButtonProp,
 showProgress = true,
 allowSkipValidation = false,
}: MultiStepWizardProps) {
 const { t } = useLanguage()
 const _backButton = backButtonProp ?? { text: t('wizardBack') }
 const _nextButton = nextButtonProp ?? { text: t('wizardNext') }
 const _finishButton = { text: t('wizardFinish'), disabled: false, loading: false, ...finishButtonProp }
 const [idx, setIdx] = useState(0)
 const [dir, setDir] = useState(1)
 const [error, setError] = useState('')
 const touchX = useRef<number | null>(null)
 const touchY = useRef<number | null>(null)
 const [hasInteracted, setHasInteracted] = useState(false)

 const step = steps[idx]
 const isFirst = idx === 0
 const isLast = idx === steps.length - 1

 const validate = useCallback(() => {
 if (allowSkipValidation || !step.validation) return { ok: true, msg: '' }
 const r = step.validation()
 if (r === true) return { ok: true, msg: '' }
 return { ok: false, msg: typeof r === 'string' ? r : '' }
 }, [step, allowSkipValidation])

 const goNext = useCallback(() => {
 const { ok, msg } = validate()
 if (!ok) { setError(msg); return }
 setError('')
 if (isLast) { onComplete(); return }
 setDir(1)
 setHasInteracted(true)
 const n = idx + 1
 setIdx(n)
 onStepChange?.(n)
 }, [idx, isLast, validate, onComplete, onStepChange])

 const goBack = useCallback(() => {
 if (isFirst) { _backButton.onClick?.(); return }
 setDir(-1)
 setError('')
 setHasInteracted(true)
 const n = idx - 1
 setIdx(n)
 onStepChange?.(n)
 }, [idx, isFirst, _backButton, onStepChange])

 const onTouchStart = useCallback((e: TouchEvent) => {
 touchX.current = e.touches[0].clientX
 touchY.current = e.touches[0].clientY
 }, [])
 const onTouchEnd = useCallback((e: TouchEvent) => {
 if (touchX.current == null || touchY.current == null) return
 const dx = e.changedTouches[0].clientX - touchX.current
 const dy = Math.abs(e.changedTouches[0].clientY - touchY.current)
 touchX.current = null
 touchY.current = null
 if (Math.abs(dx) > 60 && dy < 100) { dx < 0 ? goNext() : goBack() }
 }, [goNext, goBack])

 const variants = {
 enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
 center: { x: 0, opacity: 1 },
 exit: (d: number) => ({ x: d < 0 ? '100%' : '-100%', opacity: 0 }),
 }

 const canProceed = allowSkipValidation || !step.validation || step.validation() === true

 // Resolve content directly — the key={step.id} on motion.div ensures
 // inputs only remount when the STEP changes, not on every re-render
 const resolvedContent = typeof step.content === 'function' ? step.content() : step.content

 return (
 <div
 className={cn('w-full max-w-lg mx-auto', className)}
 onTouchStart={onTouchStart}
 onTouchEnd={onTouchEnd}
 >
 {/* Top bar: back + counter */}
 <div className="flex items-center justify-between mb-4 min-h-[44px]">
 <button
 onClick={goBack}
 className="flex items-center gap-0.5 text-bookcraft-blue dark:text-bookcraft-blue/80 min-w-[44px] min-h-[44px] active:opacity-50 transition-opacity"
 disabled={_finishButton.loading}
 >
 <ChevronLeft className="h-5 w-5" />
 <span className="text-[15px]">{isFirst ? _backButton.text : t('previous')}</span>
 </button>
 <span className="text-sm text-muted-foreground">{idx + 1} / {steps.length}</span>
 </div>

 {/* Progress dots — compact on mobile */}
 {showProgress && (
 <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-6">
 {steps.map((_, i) => (
 <motion.div
 key={i}
 className="rounded-full"
 style={{
 background: i === idx
 ? 'linear-gradient(to right, #2563eb, #3E86D7)'
 : i < idx ? '#2563eb' : 'hsl(var(--border))',
 }}
 animate={{ width: i === idx ? (steps.length > 4 ? 16 : 24) : (steps.length > 4 ? 6 : 8), height: steps.length > 4 ? 6 : 8 }}
 transition={spring}
 />
 ))}
 </div>
 )}

 {/* Slide content */}
 <div className="relative overflow-hidden mb-6 safe-area-bottom">
 <AnimatePresence mode="wait" custom={dir}>
 <motion.div
 key={step.id}
 custom={dir}
 variants={variants}
 initial={hasInteracted ? "enter" : false}
 animate="center"
 exit="exit"
 transition={spring}
 >
 <div className="bg-card rounded-2xl border border-border p-6">
 <h1 className="text-2xl font-bold font-display mb-1">{step.title}</h1>
 {step.description && (
 <p className="text-muted-foreground mb-4">{step.description}</p>
 )}
 {resolvedContent}
 </div>
 </motion.div>
 </AnimatePresence>
 </div>

 {/* Validation error */}
 <AnimatePresence>
 {error && (
 <motion.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 className="mb-4 overflow-hidden"
 >
 <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-600 dark:text-red-400 text-sm">
 {error}
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Continue button — sticky on mobile */}
 <div className="sticky bottom-0 pt-2 safe-area-bottom bg-background sm:static sm:pb-0">
 <motion.button
 onClick={goNext}
 disabled={(!canProceed && !allowSkipValidation) || _finishButton.loading || _finishButton.disabled}
 className={cn(
 'w-full bg-bookcraft-blue text-white rounded-xl h-12 text-base font-semibold',
 'disabled:opacity-40 disabled:cursor-not-allowed',
 'active:brightness-90 transition-all',
 'min-h-[44px]',
 )}
 whileTap={{ scale: 0.98 }}
 >
 {_finishButton.loading ? (
 <span className="flex items-center justify-center gap-2">
 <motion.span
 className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
 animate={{ rotate: 360 }}
 transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
 />
 {isLast ? _finishButton.text : _nextButton.text}
 </span>
 ) : isLast ? _finishButton.text : _nextButton.text}
 </motion.button>
 </div>
 </div>
 )
}
