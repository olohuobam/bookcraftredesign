'use client'

import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SafeImage from '@/components/SafeImage'
import { useLanguage } from '@/context/LanguageContext'

interface ImageStripProps {
  images: Array<{ url: string; imageIndex: number }>
  onImageClick: (idx: number) => void
  newImageIndices?: Set<string>
}

export default function ImageStrip({ images, onImageClick, newImageIndices }: ImageStripProps) {
  const stripRef = useRef<HTMLDivElement>(null)
  const { t } = useLanguage()

  if (images.length === 0) return null

  return (
    <div
      ref={stripRef}
      className="w-full flex gap-2 overflow-x-auto py-2 px-1"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <AnimatePresence initial={false}>
        {images.map((img, idx) => {
          const isNew = newImageIndices?.has(`image-${idx}`) ?? false
          return (
            <motion.button
              key={`strip-img-${img.imageIndex}-${idx}`}
              type="button"
              className="flex-shrink-0 relative rounded-xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-bookcraft-blue"
              style={{ width: 80, height: 80 }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              onClick={() => onImageClick(idx)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <SafeImage
                src={img.url}
                alt={`${t('image')} ${img.imageIndex + 1}`}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
              {/* New badge */}
              {isNew && (
                <motion.div
                  className="absolute inset-0 ring-2 ring-green-400 rounded-xl pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              )}
            </motion.button>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
