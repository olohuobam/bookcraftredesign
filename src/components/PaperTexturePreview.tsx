'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Slider } from './ui/slider'
import {
 FileText,
 Palette,
 Layers,
 Eye,
 Zap,
 Star,
 Info
} from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

interface PaperType {
 id: string
 name: string
 description: string
 color: string
 texture: string
 opacity: number
 roughness: number
 price_diff: number
 ideal_for: string[]
 preview_text: string
}

interface PaperTexturePreviewProps {
 selectedPaper: string
 onPaperSelect: (paperId: string) => void
 bookType: 'text' | 'picture'
 sampleText?: string
}

const PAPER_TYPES: PaperType[] = [
 {
 id: 'white',
 name: 'White Paper (60# Uncoated)',
 description: 'High-quality white paper with natural texture. Optimal for clear contrast and vibrant colors.',
 color: '#ffffff',
 texture: 'fine-grain',
 opacity: 95,
 roughness: 0.3,
 price_diff: 0,
 ideal_for: ['Picture Books', 'Color Illustrations', 'Modern Designs'],
 preview_text: 'This white paper offers the best contrast for text and images. Ideal for modern books with vibrant colors and sharp details.'
 },
 {
 id: 'cream',
 name: 'Cream Paper (60# Uncoated)',
 description: 'Warm cream-colored paper with elegant appearance. Reduces eye strain while reading.',
 color: '#f5f5dc',
 texture: 'linen',
 opacity: 92,
 roughness: 0.4,
 price_diff: 0.50,
 ideal_for: ['Novels', 'Classic Literature', 'Longer Texts'],
 preview_text: 'The cream paper gives your book a classic, warm appearance. Especially pleasant for longer reading sessions and reduces glare.'
 },
 {
 id: 'natural',
 name: 'Natural White Paper (70# Uncoated)',
 description: 'Slightly off-white paper with natural feel. Premium option for high-quality books.',
 color: '#faf7f0',
 texture: 'natural',
 opacity: 94,
 roughness: 0.35,
 price_diff: 1.00,
 ideal_for: ['Premium Editions', 'Art Books', 'Limited Editions'],
 preview_text: 'Natural white paper combines the advantages of white and cream paper. An elegant choice for special projects.'
 }
]

const TEXTURE_PATTERNS = {
 'fine-grain': {
 background: `radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
 radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
 radial-gradient(circle at 40% 40%, rgba(120, 119, 198, 0.05) 0%, transparent 50%)`,
 backgroundSize: '15px 15px, 20px 20px, 25px 25px'
 },
 'linen': {
 background: `linear-gradient(90deg, rgba(0,0,0,0.02) 50%, transparent 50%),
 linear-gradient(rgba(0,0,0,0.02) 50%, transparent 50%)`,
 backgroundSize: '3px 3px'
 },
 'natural': {
 background: `radial-gradient(circle at 25% 25%, rgba(139, 69, 19, 0.03) 0%, transparent 50%),
 radial-gradient(circle at 75% 75%, rgba(139, 69, 19, 0.02) 0%, transparent 50%)`,
 backgroundSize: '12px 12px, 18px 18px'
 }
}

function PaperSample({
 paper,
 isSelected,
 onClick,
 sampleText,
 showDetails = false
}: {
 paper: PaperType
 isSelected: boolean
 onClick: () => void
 sampleText?: string
 showDetails?: boolean
}) {
 const textureStyle = TEXTURE_PATTERNS[paper.texture as keyof typeof TEXTURE_PATTERNS]

 return (
 <div
 className={`border-2 rounded-lg cursor-pointer transition-all duration-300 hover:shadow-md ${
 isSelected ? 'border-bookcraft-blue shadow-lg' : 'border-gray-200'
 }`}
 onClick={onClick}
 >
 <div className="p-4">
 <div className="flex items-start justify-between mb-3">
 <div className="flex-1">
 <h3 className="font-medium text-sm mb-1">{paper.name}</h3>
 <p className="text-xs text-gray-600 mb-2">{paper.description}</p>
 {paper.price_diff > 0 && (
 <Badge variant="secondary" className="text-xs">
 +€{paper.price_diff.toFixed(2)}
 </Badge>
 )}
 </div>
 {isSelected && (
 <div className="ml-2">
 <Star className="h-4 w-4 text-bookcraft-blue fill-current" />
 </div>
 )}
 </div>

 {/* Paper Sample */}
 <div
 className="w-full h-32 rounded border shadow-inner relative overflow-hidden mb-3"
 style={{
 backgroundColor: paper.color,
 ...textureStyle,
 opacity: paper.opacity / 100
 }}
 >
 <div className="absolute inset-2 text-xs leading-relaxed text-gray-800 font-serif">
 {sampleText || paper.preview_text}
 </div>

 {/* Shine effect for gloss */}
 <div
 className="absolute inset-0 opacity-10"
 style={{
 background: `linear-gradient(135deg, transparent 30%, rgba(255,255,255,${1 - paper.roughness}) 50%, transparent 70%)`
 }}
 />
 </div>

 {/* Paper Properties */}
 {showDetails && (
 <div className="space-y-2 text-xs">
 <div className="flex justify-between">
 <span className="text-gray-600">Opacity:</span>
 <span>{paper.opacity}%</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-600">Roughness:</span>
 <span>{Math.round(paper.roughness * 10)}/10</span>
 </div>
 </div>
 )}

 {/* Ideal For Tags */}
 <div className="mt-3">
 <p className="text-xs text-gray-500 mb-1">Ideal for:</p>
 <div className="flex flex-wrap gap-1">
 {paper.ideal_for.slice(0, 2).map((use, index) => (
 <Badge key={index} variant="outline" className="text-xs px-2 py-0">
 {use}
 </Badge>
 ))}
 </div>
 </div>
 </div>
 </div>
 )
}

function PaperComparison({ papers, selectedPaper }: { papers: PaperType[], selectedPaper: string }) {
 const { t } = useLanguage()
 const selected = papers.find(p => p.id === selectedPaper)
 const others = papers.filter(p => p.id !== selectedPaper)

 if (!selected) return null

 return (
 <div className="space-y-4">
 <h3 className="font-medium flex items-center gap-2">
 <Eye className="h-4 w-4" />
 Paper Comparison
 </h3>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {/* Selected Paper (Highlighted) */}
 <div className="border-2 border-bookcraft-blue rounded-lg bg-blue-50 p-4">
 <div className="flex items-center gap-2 mb-2">
 <Star className="h-4 w-4 text-bookcraft-blue fill-current" />
 <span className="font-medium text-sm">{t('paperYourSelection')}</span>
 </div>
 <PaperSample
 paper={selected}
 isSelected={true}
 onClick={() => {}}
 showDetails={true}
 />
 </div>

 {/* Other Papers */}
 {others.map(paper => (
 <div key={paper.id} className="opacity-70">
 <PaperSample
 paper={paper}
 isSelected={false}
 onClick={() => {}}
 showDetails={true}
 />
 </div>
 ))}
 </div>

 {/* Comparison Table */}
 <div className="overflow-x-auto">
 <table className="w-full text-sm border-collapse">
 <thead>
 <tr className="border-b">
 <th className="text-left p-2">{t('paperProperty')}</th>
 {papers.map(paper => (
 <th key={paper.id} className={`text-center p-2 ${paper.id === selectedPaper ? 'bg-blue-50' : ''}`}>
 {paper.name.split(' ')[0]}
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 <tr className="border-b">
 <td className="p-2 font-medium">{t('paperAdditionalCost')}</td>
 {papers.map(paper => (
 <td key={paper.id} className={`text-center p-2 ${paper.id === selectedPaper ? 'bg-blue-50' : ''}`}>
 {paper.price_diff > 0 ? `+€${paper.price_diff.toFixed(2)}` : 'Free'}
 </td>
 ))}
 </tr>
 <tr className="border-b">
 <td className="p-2 font-medium">{t('paperOpacity')}</td>
 {papers.map(paper => (
 <td key={paper.id} className={`text-center p-2 ${paper.id === selectedPaper ? 'bg-blue-50' : ''}`}>
 {paper.opacity}%
 </td>
 ))}
 </tr>
 <tr className="border-b">
 <td className="p-2 font-medium">{t('paperTexture')}</td>
 {papers.map(paper => (
 <td key={paper.id} className={`text-center p-2 ${paper.id === selectedPaper ? 'bg-blue-50' : ''}`}>
 {paper.texture === 'fine-grain' ? 'Fine' : paper.texture === 'linen' ? 'Linen' : 'Natural'}
 </td>
 ))}
 </tr>
 </tbody>
 </table>
 </div>
 </div>
 )
}

function InteractivePaperTest({ paper }: { paper: PaperType }) {
 const { t } = useLanguage()
 const [lightAngle, setLightAngle] = useState(45)
 const [zoom, setZoom] = useState(100)

 return (
 <div className="space-y-4">
 <h3 className="font-medium flex items-center gap-2">
 <Zap className="h-4 w-4" />
 Interactive Paper Test
 </h3>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Interactive Preview */}
 <div className="space-y-4">
 <div
 className="w-full h-64 rounded-lg border shadow-inner relative overflow-hidden"
 style={{
 backgroundColor: paper.color,
 transform: `scale(${zoom / 100})`,
 transformOrigin: 'top left',
 ...TEXTURE_PATTERNS[paper.texture as keyof typeof TEXTURE_PATTERNS]
 }}
 >
 {/* Sample text with different styles */}
 <div className="absolute inset-4 space-y-3">
 <h4 className="font-bold text-lg text-gray-900">Chapter 1</h4>
 <p className="text-sm text-gray-800 leading-relaxed font-serif">
 Once upon a time in a far, far away era, when books were still made of real paper...
 </p>
 <p className="text-xs text-gray-700">
 Small print text is also easily readable on this paper.
 </p>
 </div>

 {/* Dynamic lighting effect */}
 <div
 className="absolute inset-0"
 style={{
 background: `linear-gradient(${lightAngle}deg, transparent 30%, rgba(255,255,255,${(1 - paper.roughness) * 0.3}) 50%, transparent 70%)`,
 pointerEvents: 'none'
 }}
 />
 </div>

 {/* Controls */}
 <div className="space-y-3">
 <div>
 <label className="text-sm font-medium mb-1 block">
 Light Angle: {lightAngle}°
 </label>
 <Slider
 value={[lightAngle]}
 onValueChange={([value]) => setLightAngle(value)}
 max={180}
 min={0}
 step={5}
 className="w-full"
 />
 </div>

 <div>
 <label className="text-sm font-medium mb-1 block">
 Zoom: {zoom}%
 </label>
 <Slider
 value={[zoom]}
 onValueChange={([value]) => setZoom(value)}
 max={200}
 min={50}
 step={10}
 className="w-full"
 />
 </div>
 </div>
 </div>

 {/* Paper Details */}
 <div className="space-y-4">
 <div className="bg-gray-50 rounded-lg p-4">
 <h4 className="font-medium mb-3">{t('paperProperties')}</h4>

 <div className="space-y-3">
 <div className="flex justify-between items-center">
 <span className="text-sm text-gray-600">Base Color:</span>
 <div className="flex items-center gap-2">
 <div
 className="w-6 h-6 rounded border"
 style={{ backgroundColor: paper.color }}
 />
 <span className="text-sm font-mono">{paper.color}</span>
 </div>
 </div>

 <div className="flex justify-between">
 <span className="text-sm text-gray-600">Opacity:</span>
 <span className="text-sm font-medium">{paper.opacity}%</span>
 </div>

 <div className="flex justify-between">
 <span className="text-sm text-gray-600">Texture Intensity:</span>
 <span className="text-sm font-medium">{Math.round(paper.roughness * 10)}/10</span>
 </div>

 <div className="flex justify-between">
 <span className="text-sm text-gray-600">Price Difference:</span>
 <span className="text-sm font-medium">
 {paper.price_diff > 0 ? `+€${paper.price_diff.toFixed(2)}` : 'Free'}
 </span>
 </div>
 </div>
 </div>

 <div className="bg-blue-50 rounded-lg p-4">
 <h4 className="font-medium mb-2 flex items-center gap-2">
 <Info className="h-4 w-4" />
 Recommendation
 </h4>
 <p className="text-sm text-gray-700 mb-3">
 {paper.description}
 </p>
 <div className="flex flex-wrap gap-1">
 {paper.ideal_for.map((use, index) => (
 <Badge key={index} variant="secondary" className="text-xs">
 {use}
 </Badge>
 ))}
 </div>
 </div>
 </div>
 </div>
 </div>
 )
}

export default function PaperTexturePreview({
 selectedPaper,
 onPaperSelect,
 bookType,
 sampleText
}: PaperTexturePreviewProps) {
 const { t } = useLanguage()
 const [activeTab, setActiveTab] = useState('selection')

 const selectedPaperData = PAPER_TYPES.find(p => p.id === selectedPaper) || PAPER_TYPES[0]

 const recommendedPapers = PAPER_TYPES.filter(paper => {
 if (bookType === 'picture') {
 return paper.ideal_for.some(use =>
 use.includes('Bild') || use.includes('Illustration') || use.includes('Farb')
 )
 } else {
 return paper.ideal_for.some(use =>
 use.includes('Roman') || use.includes('Text') || use.includes('Literatur')
 )
 }
 })

 return (
 <Card className="w-full">
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <FileText className="h-5 w-5" />
 Paper Preview & Selection
 {recommendedPapers.some(p => p.id === selectedPaper) && (
 <Badge variant="secondary">Recommended for {bookType === 'picture' ? 'Picture Book' : 'Text Book'}</Badge>
 )}
 </CardTitle>
 </CardHeader>

 <CardContent>
 <Tabs value={activeTab} onValueChange={setActiveTab}>
 <TabsList className="grid w-full grid-cols-4">
 <TabsTrigger value="selection">{t('tabSelection')}</TabsTrigger>
 <TabsTrigger value="comparison">{t('tabComparison')}</TabsTrigger>
 <TabsTrigger value="interactive">{t('tabInteractive')}</TabsTrigger>
 <TabsTrigger value="recommendations">{t('tabTips')}</TabsTrigger>
 </TabsList>

 <TabsContent value="selection" className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {PAPER_TYPES.map(paper => (
 <PaperSample
 key={paper.id}
 paper={paper}
 isSelected={selectedPaper === paper.id}
 onClick={() => onPaperSelect(paper.id)}
 sampleText={sampleText}
 />
 ))}
 </div>
 </TabsContent>

 <TabsContent value="comparison">
 <PaperComparison papers={PAPER_TYPES} selectedPaper={selectedPaper} />
 </TabsContent>

 <TabsContent value="interactive">
 <InteractivePaperTest paper={selectedPaperData} />
 </TabsContent>

 <TabsContent value="recommendations" className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-4">
 <h3 className="font-medium"> Recommended for Picture Books</h3>
 {PAPER_TYPES.filter(p => p.ideal_for.some(use => use.includes('Picture') || use.includes('Illustration'))).map(paper => (
 <div key={paper.id} className="border rounded-lg p-3">
 <h4 className="font-medium text-sm">{paper.name}</h4>
 <p className="text-xs text-gray-600 mt-1">{paper.description}</p>
 <Button
 size="sm"
 variant={selectedPaper === paper.id ? "default" : "outline"}
 className="mt-2"
 onClick={() => onPaperSelect(paper.id)}
 >
 {selectedPaper === paper.id ? 'Selected' : 'Select'}
 </Button>
 </div>
 ))}
 </div>

 <div className="space-y-4">
 <h3 className="font-medium"> Recommended for Text Books</h3>
 {PAPER_TYPES.filter(p => p.ideal_for.some(use => use.includes('Novel') || use.includes('Text') || use.includes('Literature'))).map(paper => (
 <div key={paper.id} className="border rounded-lg p-3">
 <h4 className="font-medium text-sm">{paper.name}</h4>
 <p className="text-xs text-gray-600 mt-1">{paper.description}</p>
 <Button
 size="sm"
 variant={selectedPaper === paper.id ? "default" : "outline"}
 className="mt-2"
 onClick={() => onPaperSelect(paper.id)}
 >
 {selectedPaper === paper.id ? 'Selected' : 'Select'}
 </Button>
 </div>
 ))}
 </div>
 </div>

 <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
 <h4 className="font-medium mb-2 text-amber-800"> Pro Tip</h4>
 <p className="text-sm text-amber-700">
 {bookType === 'picture'
 ? 'For picture books with many colors, we recommend white paper for maximum contrast and vibrant colors.'
 : 'For longer texts, cream paper is more pleasant for the eyes and reduces reading fatigue.'
 }
 </p>
 </div>
 </TabsContent>
 </Tabs>
 </CardContent>
 </Card>
 )
}