'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { textFadeVariants, cursorVariants } from './animations'
import { StreamingContentProps } from './types'
import { useLanguage } from '@/context/LanguageContext'

export default function StreamingContent({
  content,
  isStreaming,
  isComplete,
  title,
  subtitle
}: StreamingContentProps) {
  const { t } = useLanguage()
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const textQueueRef = useRef<string>('')
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lastContentRef = useRef<string>('')

  // Flush entire queue instantly
  const flushQueue = useCallback(() => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current)
      typingIntervalRef.current = null
    }
    if (textQueueRef.current.length > 0) {
      setDisplayedText(prev => prev + textQueueRef.current)
      textQueueRef.current = ''
    }
    setIsTyping(false)
  }, [])

  // Queue new text for typing animation
  useEffect(() => {
    if (content && content !== lastContentRef.current) {
      const newText = content.slice(lastContentRef.current.length)
      textQueueRef.current += newText
      lastContentRef.current = content

      // Instant flush if queue is massive
      if (textQueueRef.current.length > 5000) {
        flushQueue()
        return
      }

      if (!isTyping && textQueueRef.current.length > 0) {
        startTypingAnimation()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, isTyping])

  const startTypingAnimation = useCallback(() => {
    if (typingIntervalRef.current) return
    setIsTyping(true)

    typingIntervalRef.current = setInterval(() => {
      if (textQueueRef.current.length === 0) {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current)
          typingIntervalRef.current = null
        }
        setIsTyping(false)
        return
      }

      const queueLen = textQueueRef.current.length

      // Adaptive speed based on queue length
      let charsToAdd: number
      if (queueLen > 5000) {
        // Instant flush
        flushQueue()
        return
      } else if (queueLen > 2000) {
        charsToAdd = 80
      } else if (queueLen > 500) {
        charsToAdd = 30
      } else {
        // Normal variable speed: 2-5 chars per tick
        charsToAdd = Math.floor(Math.random() * 4) + 2
      }

      charsToAdd = Math.min(charsToAdd, textQueueRef.current.length)
      const nextChars = textQueueRef.current.slice(0, charsToAdd)
      textQueueRef.current = textQueueRef.current.slice(charsToAdd)

      setDisplayedText(prev => prev + nextChars)

      // Auto-scroll to bottom
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
      }
    }, 35) // ~28fps for smooth typing
  }, [flushQueue])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current)
      }
    }
  }, [])

  // If complete and not typing, show full content
  useEffect(() => {
    if (isComplete && !isTyping && textQueueRef.current.length === 0) {
      setDisplayedText(content)
    }
  }, [isComplete, isTyping, content])

  // Split text into paragraphs for better rendering
  const paragraphs = displayedText.split('\n\n').filter(p => p.trim())
  const hasQueuedContent = textQueueRef.current.length > 0

  return (
    <div className="space-y-4">
      {/* Chapter Title */}
      {title && (
        <motion.div
          variants={textFadeVariants}
          initial="hidden"
          animate="visible"
          className="mb-6"
        >
          <h2 className="text-2xl font-serif font-semibold text-white mb-1">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-white/60 font-medium">
              {subtitle}
            </p>
          )}
        </motion.div>
      )}

      {/* Skip animation button */}
      {isTyping && hasQueuedContent && (
        <div className="flex justify-end mb-1">
          <button
            onClick={flushQueue}
            className="text-xs text-white/40 hover:text-white/70 transition-colors underline underline-offset-2"
          >
            Skip animation
          </button>
        </div>
      )}

      {/* Content Area */}
      <div
        ref={scrollContainerRef}
        className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar"
      >
        <AnimatePresence mode="sync">
          {paragraphs.map((paragraph, index) => (
            <motion.p
              key={index}
              variants={textFadeVariants}
              initial="hidden"
              animate="visible"
              className="text-white/90 font-serif text-base leading-relaxed mb-4"
            >
              {paragraph}
              {/* Show cursor at the end of last paragraph while typing */}
              {index === paragraphs.length - 1 && isTyping && (
                <motion.span
                  variants={cursorVariants}
                  animate="blink"
                  className="inline-block w-0.5 h-5 bg-bookcraft-blue ml-0.5 align-middle"
                />
              )}
            </motion.p>
          ))}
        </AnimatePresence>

        {/* Empty state with cursor */}
        {paragraphs.length === 0 && isStreaming && (
          <div className="flex items-center text-white/60">
            <span className="font-serif">{t('generatingContent')}</span>
            <motion.span
              variants={cursorVariants}
              animate="blink"
              className="inline-block w-0.5 h-5 bg-bookcraft-blue ml-1"
            />
          </div>
        )}
      </div>

      {/* Word count indicator */}
      {isComplete && displayedText && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2 text-xs text-white/50"
        >
          <span>{displayedText.split(/\s+/).length.toLocaleString()} words</span>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span>{t('complete')}</span>
        </motion.div>
      )}
    </div>
  )
}
