'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import NextImage from 'next/image'
import { ChromePicker } from 'react-color'
import html2canvas from 'html2canvas'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Slider } from './ui/slider'
import {
 Type, Image as ImageIcon, Palette, Download, Plus, Upload,
 AlignCenter, AlignLeft, AlignRight, Trash2, X, Check, ChevronDown
} from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { ActionSheet } from '@/components/ios/ActionSheet'

interface CoverElement {
 id: string
 type: 'text' | 'image' | 'shape'
 content: string
 x: number
 y: number
 width: number
 height: number
 fontSize?: number
 fontFamily?: string
 color?: string
 backgroundColor?: string
 rotation?: number
 opacity?: number
 textAlign?: 'left' | 'center' | 'right'
 bold?: boolean
 italic?: boolean
}

interface CoverDesignerProps {
 bookTitle: string
 bookAuthor?: string
 bookFormat: string
 onCoverGenerated: (coverImageUrl: string) => void
}

const FONT_FAMILIES = [
 'Georgia, serif',
 'Times New Roman, serif',
 'Helvetica, sans-serif',
 'Playfair Display, serif',
 'Merriweather, serif',
 'Lato, sans-serif'
]

const COVER_TEMPLATES = [
 {
 id: 'minimal',
 name: 'Minimalistisch',
 emoji: '',
 backgroundColor: '#ffffff',
 elements: [
 { id: 'title', type: 'text' as const, content: '{title}', x: 50, y: 40, width: 80, height: 20, fontSize: 32, fontFamily: 'Georgia, serif', color: '#1f2937', textAlign: 'center' as const, bold: true },
 { id: 'author', type: 'text' as const, content: '{author}', x: 50, y: 75, width: 60, height: 8, fontSize: 18, fontFamily: 'Helvetica, sans-serif', color: '#6b7280', textAlign: 'center' as const }
 ]
 },
 {
 id: 'modern',
 name: 'Modern',
 emoji: '',
 backgroundColor: '#1f2937',
 elements: [
 { id: 'accent', type: 'shape' as const, content: '', x: 0, y: 0, width: 100, height: 25, backgroundColor: '#3b82f6' },
 { id: 'title', type: 'text' as const, content: '{title}', x: 10, y: 35, width: 80, height: 25, fontSize: 28, fontFamily: 'Helvetica, sans-serif', color: '#ffffff', textAlign: 'left' as const, bold: true },
 { id: 'author', type: 'text' as const, content: '{author}', x: 10, y: 85, width: 60, height: 8, fontSize: 16, fontFamily: 'Helvetica, sans-serif', color: '#e5e7eb', textAlign: 'left' as const }
 ]
 },
 {
 id: 'classic',
 name: 'Klassisch',
 emoji: '',
 backgroundColor: '#f3f4f6',
 elements: [
 { id: 'border', type: 'shape' as const, content: '', x: 5, y: 5, width: 90, height: 90, backgroundColor: 'transparent', color: '#3b82f6' },
 { id: 'title', type: 'text' as const, content: '{title}', x: 50, y: 35, width: 70, height: 20, fontSize: 26, fontFamily: 'Times New Roman, serif', color: '#374151', textAlign: 'center' as const, bold: true },
 { id: 'divider', type: 'shape' as const, content: '', x: 30, y: 55, width: 40, height: 1, backgroundColor: '#3b82f6' },
 { id: 'author', type: 'text' as const, content: '{author}', x: 50, y: 65, width: 60, height: 8, fontSize: 18, fontFamily: 'Times New Roman, serif', color: '#6b7280', textAlign: 'center' as const, italic: true }
 ]
 },
 {
 id: 'bold',
 name: 'Bold',
 emoji: '',
 backgroundColor: '#3E86D7',
 elements: [
 { id: 'title', type: 'text' as const, content: '{title}', x: 50, y: 45, width: 85, height: 25, fontSize: 36, fontFamily: 'Helvetica, sans-serif', color: '#ffffff', textAlign: 'center' as const, bold: true },
 { id: 'author', type: 'text' as const, content: '{author}', x: 50, y: 80, width: 60, height: 8, fontSize: 16, fontFamily: 'Helvetica, sans-serif', color: '#dbeafe', textAlign: 'center' as const }
 ]
 },
 {
 id: 'nature',
 name: 'Natur',
 emoji: '',
 backgroundColor: '#064e3b',
 elements: [
 { id: 'title', type: 'text' as const, content: '{title}', x: 50, y: 50, width: 75, height: 20, fontSize: 30, fontFamily: 'Playfair Display, serif', color: '#ecfdf5', textAlign: 'center' as const, bold: true },
 { id: 'author', type: 'text' as const, content: '{author}', x: 50, y: 80, width: 60, height: 8, fontSize: 16, fontFamily: 'Lato, sans-serif', color: '#6ee7b7', textAlign: 'center' as const }
 ]
 },
 {
 id: 'romantic',
 name: 'Romantisch',
 emoji: '',
 backgroundColor: '#831843',
 elements: [
 { id: 'title', type: 'text' as const, content: '{title}', x: 50, y: 45, width: 80, height: 20, fontSize: 28, fontFamily: 'Playfair Display, serif', color: '#fdf2f8', textAlign: 'center' as const, bold: true, italic: true },
 { id: 'author', type: 'text' as const, content: '{author}', x: 50, y: 78, width: 60, height: 8, fontSize: 16, fontFamily: 'Georgia, serif', color: '#fbcfe8', textAlign: 'center' as const }
 ]
 }
]

export default function CoverDesigner({
 bookTitle, bookAuthor = '', bookFormat, onCoverGenerated
}: CoverDesignerProps) {
 const { t } = useLanguage()
 const [elements, setElements] = useState<CoverElement[]>([])
 const [selectedElement, setSelectedElement] = useState<string | null>(null)
 const [backgroundColor, setBackgroundColor] = useState('#ffffff')
 const [draggedElement, setDraggedElement] = useState<string | null>(null)
 const [showColorPicker, setShowColorPicker] = useState<string | null>(null)
 const [isGenerating, setIsGenerating] = useState(false)
 const [activeTab, setActiveTab] = useState<'presets' | 'customize'>('presets')
 const [showAddSheet, setShowAddSheet] = useState(false)

 const canvasRef = useRef<HTMLDivElement>(null)
 const fileInputRef = useRef<HTMLInputElement>(null)

 const getCanvasDimensions = () => {
 const formats: Record<string, { width: number; height: number }> = {
 '6x9': { width: 400, height: 600 },
 '5.5x8.5': { width: 367, height: 567 },
 '8.5x11': { width: 567, height: 733 },
 '7.5x7.5': { width: 500, height: 500 }
 }
 return formats[bookFormat] || formats['6x9']
 }

 const canvasDimensions = getCanvasDimensions()

 const applyTemplate = (template: typeof COVER_TEMPLATES[0]) => {
 setBackgroundColor(template.backgroundColor)
 const newElements = template.elements.map(el => ({
 ...el,
 id: `${el.id}_${Date.now()}`,
 content: el.content.replace('{title}', bookTitle).replace('{author}', bookAuthor || 'Autor')
 }))
 setElements(newElements)
 setSelectedElement(null)
 setActiveTab('customize')
 }

 const addElement = (type: CoverElement['type']) => {
 const newElement: CoverElement = {
 id: `${type}_${Date.now()}`,
 type,
 content: type === 'text' ? 'Neuer Text' : '',
 x: 50, y: 50,
 width: type === 'text' ? 60 : 30,
 height: type === 'text' ? 15 : 20,
 fontSize: 24,
 fontFamily: 'Helvetica, sans-serif',
 color: '#000000',
 backgroundColor: type === 'shape' ? '#3b82f6' : 'transparent',
 rotation: 0,
 opacity: 100,
 textAlign: 'center',
 bold: false,
 italic: false
 }
 setElements([...elements, newElement])
 setSelectedElement(newElement.id)
 }

 const updateElement = (id: string, updates: Partial<CoverElement>) => {
 setElements(elements.map(el => el.id === id ? { ...el, ...updates } : el))
 }

 const deleteElement = (id: string) => {
 setElements(elements.filter(el => el.id !== id))
 setSelectedElement(null)
 }

 const handleMouseDown = (elementId: string, e: React.MouseEvent) => {
 setSelectedElement(elementId)
 setDraggedElement(elementId)
 }

 const handleMouseMove = useCallback((e: MouseEvent) => {
 if (!draggedElement || !canvasRef.current) return
 const rect = canvasRef.current.getBoundingClientRect()
 const x = ((e.clientX - rect.left) / rect.width) * 100
 const y = ((e.clientY - rect.top) / rect.height) * 100
 updateElement(draggedElement, {
 x: Math.max(0, Math.min(100, x)),
 y: Math.max(0, Math.min(100, y))
 })
 }, [draggedElement])

 const handleMouseUp = useCallback(() => { setDraggedElement(null) }, [])

 useEffect(() => {
 if (draggedElement) {
 document.addEventListener('mousemove', handleMouseMove)
 document.addEventListener('mouseup', handleMouseUp)
 return () => {
 document.removeEventListener('mousemove', handleMouseMove)
 document.removeEventListener('mouseup', handleMouseUp)
 }
 }
 }, [draggedElement, handleMouseMove, handleMouseUp])

 const generateCover = async () => {
 if (!canvasRef.current) return
 setIsGenerating(true)
 try {
 const canvas = await html2canvas(canvasRef.current, {
 width: canvasDimensions.width * 2,
 height: canvasDimensions.height * 2,
 scale: 2,
 backgroundColor,
 logging: false
 })
 canvas.toBlob((blob) => {
 if (blob) {
 const url = URL.createObjectURL(blob)
 onCoverGenerated(url)
 }
 }, 'image/png')
 } catch (error) {
      console.error('Error generating cover:', error)
 } finally {
 setIsGenerating(false)
 }
 }

 const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0]
 if (file) {
 const reader = new FileReader()
 reader.onload = (e) => {
 const newElement: CoverElement = {
 id: `image_${Date.now()}`,
 type: 'image',
 content: e.target?.result as string,
 x: 25, y: 25, width: 50, height: 50,
 rotation: 0, opacity: 100
 }
 setElements([...elements, newElement])
 setSelectedElement(newElement.id)
 }
 reader.readAsDataURL(file)
 }
 }

 const selectedEl = elements.find(el => el.id === selectedElement)

 const addActions = [
 { id: 'text', label: t('addText'), icon: <Type className="w-5 h-5 text-bookcraft-blue" />, onClick: () => addElement('text') },
 { id: 'image', label: t('uploadImage'), icon: <ImageIcon className="w-5 h-5 text-green-500" />, onClick: () => fileInputRef.current?.click() },
 { id: 'shape', label: t('addShape'), icon: <Palette className="w-5 h-5 text-blue-500" />, onClick: () => addElement('shape') }
 ]

 return (
 <div className="w-full" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
 {/* Header */}
 <div className="flex items-center gap-3 mb-6">
 <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-md">
 <Palette className="h-6 w-6 text-white" />
 </div>
 <div>
 <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif" }}>
 {t('coverDesigner')}
 </h2>
 <p className="text-sm text-muted-foreground">Beta</p>
 </div>
 </div>

 {/* Segmented Control */}
 <div className="bg-muted/40 rounded-xl p-1 flex mb-6">
 <button
 onClick={() => setActiveTab('presets')}
 className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
 activeTab === 'presets' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
 }`}
 >
 {t('templates')}
 </button>
 <button
 onClick={() => setActiveTab('customize')}
 className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
 activeTab === 'customize' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
 }`}
 >
 {t('design')}
 </button>
 </div>

 <AnimatePresence mode="wait">
 {activeTab === 'presets' ? (
 <motion.div
 key="presets"
 initial={{ opacity: 0, x: -20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: 20 }}
 transition={{ type: 'spring', damping: 25, stiffness: 300 }}
 >
 {/* Preset Gallery - iOS-style grid */}
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
 {COVER_TEMPLATES.map((template) => (
 <button
 key={template.id}
 onClick={() => applyTemplate(template)}
 className="group relative rounded-2xl overflow-hidden border-2 border-border/30 hover:border-primary/50 transition-all active:scale-[0.97] ios-spring shadow-sm hover:shadow-lg"
 >
 <div
 className="aspect-[3/4] flex flex-col items-center justify-center p-4"
 style={{ backgroundColor: template.backgroundColor }}
 >
 <span className="text-3xl mb-2">{template.emoji}</span>
 {template.elements.filter(el => el.type === 'text').map(el => (
 <div
 key={el.id}
 className="text-center"
 style={{
 color: el.color,
 fontSize: Math.max(el.fontSize! * 0.25, 8),
 fontFamily: el.fontFamily,
 fontWeight: el.bold ? 'bold' : 'normal',
 fontStyle: (el as any).italic ? 'italic' : 'normal'
 }}
 >
 {el.content.replace('{title}', 'Titel').replace('{author}', 'Autor')}
 </div>
 ))}
 </div>
 <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3">
 <span className="text-white text-sm font-semibold">{template.name}</span>
 </div>
 </button>
 ))}
 </div>
 </motion.div>
 ) : (
 <motion.div
 key="customize"
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 transition={{ type: 'spring', damping: 25, stiffness: 300 }}
 className="space-y-6"
 >
 {/* Add Element Button */}
 <button
 onClick={() => setShowAddSheet(true)}
 className="w-full py-3 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
 >
 <Plus className="h-5 w-5" />
 <span className="font-medium">{t('elements')}</span>
 </button>

 {/* Element Properties - iOS Card Style */}
 {selectedEl && (
 <div className="bg-muted/30 rounded-2xl p-5 space-y-5">
 <div className="flex items-center justify-between">
 <h3 className="font-semibold text-foreground">{t('editElement')}</h3>
 <button
 onClick={() => deleteElement(selectedEl.id)}
 className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center active:scale-90 transition-transform"
 >
 <Trash2 className="h-4 w-4 text-red-500" />
 </button>
 </div>

 {selectedEl.type === 'text' && (
 <div className="space-y-4">
 <Input
 value={selectedEl.content}
 onChange={(e) => updateElement(selectedEl.id, { content: e.target.value })}
 className="rounded-xl h-12 bg-background border-border/50"
 placeholder={t('coverTextPlaceholder')}
 />

 <div className="flex items-center gap-3">
 <div className="flex-1">
 <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('fontSize')}</label>
 <Slider
 value={[selectedEl.fontSize || 24]}
 onValueChange={([value]) => updateElement(selectedEl.id, { fontSize: value })}
 max={72} min={8} step={1}
 />
 <span className="text-xs text-muted-foreground">{selectedEl.fontSize}px</span>
 </div>
 </div>

 <div>
 <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('fontFamily')}</label>
 <select
 value={selectedEl.fontFamily}
 onChange={(e) => updateElement(selectedEl.id, { fontFamily: e.target.value })}
 className="w-full p-3 rounded-xl bg-background border border-border/50 text-sm"
 >
 {FONT_FAMILIES.map(font => (
 <option key={font} value={font}>{font.split(',')[0]}</option>
 ))}
 </select>
 </div>

 {/* Style toggles - iOS segmented */}
 <div className="flex gap-2">
 <div className="flex bg-muted/50 rounded-lg p-0.5 gap-0.5">
 <button
 onClick={() => updateElement(selectedEl.id, { bold: !selectedEl.bold })}
 className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${selectedEl.bold ? 'bg-background shadow-sm' : ''}`}
 >B</button>
 <button
 onClick={() => updateElement(selectedEl.id, { italic: !selectedEl.italic })}
 className={`w-10 h-10 rounded-lg italic text-sm transition-all ${selectedEl.italic ? 'bg-background shadow-sm' : ''}`}
 >I</button>
 </div>
 <div className="flex bg-muted/50 rounded-lg p-0.5 gap-0.5">
 {(['left', 'center', 'right'] as const).map(align => (
 <button
 key={align}
 onClick={() => updateElement(selectedEl.id, { textAlign: align })}
 className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${selectedEl.textAlign === align ? 'bg-background shadow-sm' : ''}`}
 >
 {align === 'left' && <AlignLeft className="h-4 w-4" />}
 {align === 'center' && <AlignCenter className="h-4 w-4" />}
 {align === 'right' && <AlignRight className="h-4 w-4" />}
 </button>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* Color */}
 <div className="flex items-center gap-4">
 <div>
 <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('color')}</label>
 <button
 className="w-10 h-10 rounded-xl border-2 border-border/50 shadow-sm"
 style={{ backgroundColor: selectedEl.color }}
 onClick={() => setShowColorPicker(showColorPicker === 'color' ? null : 'color')}
 />
 {showColorPicker === 'color' && (
 <div className="absolute z-10 mt-2">
 <ChromePicker color={selectedEl.color} onChange={(c) => updateElement(selectedEl.id, { color: c.hex })} />
 </div>
 )}
 </div>
 <div className="flex-1">
 <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('paperOpacity')}</label>
 <Slider
 value={[selectedEl.opacity || 100]}
 onValueChange={([value]) => updateElement(selectedEl.id, { opacity: value })}
 max={100} min={0} step={5}
 />
 <span className="text-xs text-muted-foreground">{selectedEl.opacity}%</span>
 </div>
 </div>
 </div>
 )}

 {/* Background Color */}
 <div className="bg-muted/30 rounded-2xl p-5">
 <label className="text-sm font-semibold text-foreground mb-3 block">{t('backgroundColor')}</label>
 <div className="flex items-center gap-3">
 <button
 className="w-12 h-12 rounded-xl border-2 border-border/50 shadow-sm"
 style={{ backgroundColor }}
 onClick={() => setShowColorPicker(showColorPicker === 'bg' ? null : 'bg')}
 />
 {showColorPicker === 'bg' && (
 <div className="absolute z-10 mt-14">
 <ChromePicker color={backgroundColor} onChange={(c) => setBackgroundColor(c.hex)} />
 </div>
 )}
 <span className="text-sm text-muted-foreground font-mono">{backgroundColor}</span>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Canvas Preview */}
 <div className="mt-8">
 <h3 className="text-sm font-semibold text-foreground mb-4">{t('preview')}</h3>
 <div className="flex justify-center">
 <div
 ref={canvasRef}
 className="relative shadow-2xl rounded-lg overflow-hidden"
 style={{
 width: canvasDimensions.width / 2,
 height: canvasDimensions.height / 2,
 backgroundColor
 }}
 >
 {elements.map((element) => (
 <div
 key={element.id}
 className={`absolute cursor-move select-none ${
 selectedElement === element.id ? 'ring-2 ring-bookcraft-blue ring-offset-2' : ''
 }`}
 style={{
 left: `${element.x}%`, top: `${element.y}%`,
 width: `${element.width}%`, height: `${element.height}%`,
 transform: `translate(-50%, -50%) rotate(${element.rotation || 0}deg)`,
 opacity: (element.opacity || 100) / 100,
 color: element.color, backgroundColor: element.backgroundColor,
 fontSize: (element.fontSize || 24) / 2,
 fontFamily: element.fontFamily, textAlign: element.textAlign,
 fontWeight: element.bold ? 'bold' : 'normal',
 fontStyle: element.italic ? 'italic' : 'normal',
 display: 'flex', alignItems: 'center',
 justifyContent: element.textAlign === 'center' ? 'center' : element.textAlign === 'right' ? 'flex-end' : 'flex-start',
 padding: element.type === 'text' ? '4px' : '0',
 borderRadius: element.type === 'shape' ? '4px' : '0'
 }}
 onMouseDown={(e) => handleMouseDown(element.id, e)}
 onClick={() => setSelectedElement(element.id)}
 >
 {element.type === 'text' && element.content}
 {element.type === 'image' && (
 <NextImage src={element.content} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover rounded" draggable={false} />
 )}
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Generate Button - iOS Primary */}
 <div className="mt-8">
 <button
 onClick={generateCover}
 disabled={isGenerating || elements.length === 0}
 className="w-full btn-ios-primary btn-ios-large flex items-center justify-center gap-2 disabled:opacity-50"
 >
 {isGenerating ? (
 <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t('generatingCover')}</>
 ) : (
 <><Download className="h-5 w-5" /> {t('generateCover')}</>
 )}
 </button>
 </div>

 {/* Hidden file input */}
 <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

 {/* Add Element Action Sheet */}
 <ActionSheet
 isOpen={showAddSheet}
 onClose={() => setShowAddSheet(false)}
 title={t('elements')}
 message="Element zum Cover hinzufügen"
 actions={addActions}
 />
 </div>
 )
}
