'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues with Three.js
const AnimatedBookScene = dynamic(
 () => import('@/components/3d/AnimatedBookScene').then(mod => mod.AnimatedBookScene),
 { ssr: false }
)

const FloatingBookScene = dynamic(
 () => import('@/components/3d/AnimatedBookScene').then(mod => mod.FloatingBookScene),
 { ssr: false }
)

const BookShowcaseScene = dynamic(
 () => import('@/components/3d/AnimatedBookScene').then(mod => mod.BookShowcaseScene),
 { ssr: false }
)

type AnimationMode = 'float' | 'rotate' | 'spotlight' | 'magical'
type SceneType = 'single' | 'floating' | 'showcase'

export default function DemoBookScenePage() {
 const [animationMode, setAnimationMode] = useState<AnimationMode>('magical')
 const [sceneType, setSceneType] = useState<SceneType>('single')

 return (
 <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
 {/* Header */}
 <div className="absolute top-0 left-0 right-0 z-10 p-6">
 <div className="max-w-7xl mx-auto">
 <h1 className="text-4xl font-bold text-white mb-2">
 Animated Book Scenes
 </h1>
 <p className="text-foreground/80 dark:text-slate-300">
 Interactive 3D book animations with various effects
 </p>
 </div>
 </div>

 {/* Controls Panel */}
 <div className="absolute top-32 left-6 z-10 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl max-w-xs">
 <h2 className="text-xl font-bold text-white mb-4"> Scene Control</h2>

 {/* Scene Type Selection */}
 <div className="mb-6">
 <label className="block text-sm font-semibold text-white mb-2">
 Scene Type
 </label>
 <div className="space-y-2">
 {[
 { value: 'single', label: ' Single Book', desc: 'One book with effects' },
 { value: 'floating', label: ' Floating Book', desc: 'Gently floating' },
 { value: 'showcase', label: ' Showcase', desc: '5 books in a circle' },
 ].map(({ value, label, desc }) => (
 <button
 key={value}
 onClick={() => setSceneType(value as SceneType)}
 className={`w-full text-left p-3 rounded-lg transition-all ${
 sceneType === value
 ? 'bg-bookcraft-blue text-white shadow-lg scale-105'
 : 'bg-white/5 text-foreground/80 dark:text-slate-300 hover:bg-white/10'
 }`}
 >
 <div className="font-semibold">{label}</div>
 <div className="text-xs opacity-75">{desc}</div>
 </button>
 ))}
 </div>
 </div>

 {/* Animation Mode (only for single scene) */}
 {sceneType === 'single' && (
 <div>
 <label className="block text-sm font-semibold text-white mb-2">
 Animation Mode
 </label>
 <div className="space-y-2">
 {[
 { value: 'magical', label: ' Magical', desc: 'With particles' },
 { value: 'float', label: ' Float', desc: 'Gentle floating' },
 { value: 'rotate', label: ' Rotation', desc: 'Continuous' },
 { value: 'spotlight', label: ' Spotlight', desc: 'Dramatic' },
 ].map(({ value, label, desc }) => (
 <button
 key={value}
 onClick={() => setAnimationMode(value as AnimationMode)}
 className={`w-full text-left p-3 rounded-lg transition-all ${
 animationMode === value
 ? 'bg-bookcraft-blue text-white shadow-lg scale-105'
 : 'bg-white/5 text-foreground/80 dark:text-slate-300 hover:bg-white/10'
 }`}
 >
 <div className="font-semibold">{label}</div>
 <div className="text-xs opacity-75">{desc}</div>
 </button>
 ))}
 </div>
 </div>
 )}

 {/* Info */}
 <div className="mt-6 p-3 bg-blue-500/20 rounded-lg border border-blue-400/30">
 <p className="text-xs text-blue-100">
 <strong>Tip:</strong> Use your mouse to rotate and zoom!
 </p>
 </div>
 </div>

 {/* Scene Features Info */}
 <div className="absolute top-32 right-6 z-10 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl max-w-xs">
 <h2 className="text-xl font-bold text-white mb-4"> Features</h2>
 <ul className="space-y-3 text-sm text-foreground/90 dark:text-slate-200">
 <li className="flex items-start gap-2">
 <span className="text-green-400"></span>
 <span><strong>GLB Model</strong> - Your uploaded 3D book</span>
 </li>
 <li className="flex items-start gap-2">
 <span className="text-green-400"></span>
 <span><strong>3x larger</strong> - Clearly visible</span>
 </li>
 <li className="flex items-start gap-2">
 <span className="text-green-400"></span>
 <span><strong>Shadows</strong> - Realistic lighting</span>
 </li>
 <li className="flex items-start gap-2">
 <span className="text-green-400"></span>
 <span><strong>Particles</strong> - Magical effects</span>
 </li>
 <li className="flex items-start gap-2">
 <span className="text-green-400"></span>
 <span><strong>Bloom</strong> - Glowing highlights</span>
 </li>
 <li className="flex items-start gap-2">
 <span className="text-green-400"></span>
 <span><strong>Interactive</strong> - Mouse control</span>
 </li>
 </ul>

 <div className="mt-4 p-3 bg-blue-500/20 rounded-lg border border-blue-400/30">
 <p className="text-xs text-blue-100">
 The scenes use different lighting and effects systems
 </p>
 </div>
 </div>

 {/* 3D Scene */}
 <div className="w-full h-screen">
 {sceneType === 'single' && (
 <AnimatedBookScene
 className="w-full h-full"
 animationMode={animationMode}
 />
 )}
 {sceneType === 'floating' && (
 <FloatingBookScene className="w-full h-full" />
 )}
 {sceneType === 'showcase' && (
 <BookShowcaseScene className="w-full h-full" />
 )}
 </div>

 {/* Footer */}
 <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
 <div className="bg-white/10 backdrop-blur-lg rounded-full px-6 py-3 border border-white/20">
 <p className="text-sm text-white font-medium">
 Drag to Rotate • Scroll to Zoom
 </p>
 </div>
 </div>
 </div>
 )
}
