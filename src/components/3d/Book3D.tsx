'use client'

import { useRef, useState, useEffect, startTransition } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

interface Book3DProps {
 position?: [number, number, number]
 rotation?: [number, number, number]
 scale?: number
 isHovered?: boolean
 autoRotate?: boolean
 useGLBModel?: boolean // Toggle between GLB and procedural model
 title?: string
 author?: string
}

/**
 * Creates a canvas texture with the book title/author for the spine.
 * The canvas is rendered vertically (rotated 90°) to match the spine orientation.
 */
function createSpineTexture(title: string, author?: string): THREE.CanvasTexture {
 const canvas = document.createElement('canvas')
 // Spine is tall and narrow → canvas: 512px tall, 128px wide
 canvas.width = 128
 canvas.height = 512
 const ctx = canvas.getContext('2d')!

 // Premium dark background gradient
 const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, 0)
 bgGradient.addColorStop(0, '#0f172a')
 bgGradient.addColorStop(0.5, '#1e293b')
 bgGradient.addColorStop(1, '#0f172a')
 ctx.fillStyle = bgGradient
 ctx.fillRect(0, 0, canvas.width, canvas.height)

 // Subtle texture overlay (top-to-bottom vignette)
 const vigGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
 vigGradient.addColorStop(0, 'rgba(255,255,255,0.04)')
 vigGradient.addColorStop(0.3, 'transparent')
 vigGradient.addColorStop(0.7, 'transparent')
 vigGradient.addColorStop(1, 'rgba(0,0,0,0.2)')
 ctx.fillStyle = vigGradient
 ctx.fillRect(0, 0, canvas.width, canvas.height)

 // Gold decorative bands — top
 const goldTop = ctx.createLinearGradient(0, 0, canvas.width, 0)
 goldTop.addColorStop(0, 'transparent')
 goldTop.addColorStop(0.5, '#d4af37')
 goldTop.addColorStop(1, 'transparent')
 ctx.fillStyle = goldTop
 ctx.fillRect(0, 30, canvas.width, 2)
 const goldTop2 = ctx.createLinearGradient(0, 0, canvas.width, 0)
 goldTop2.addColorStop(0, 'transparent')
 goldTop2.addColorStop(0.5, 'rgba(240,192,64,0.5)')
 goldTop2.addColorStop(1, 'transparent')
 ctx.fillStyle = goldTop2
 ctx.fillRect(10, 36, canvas.width - 20, 1)

 // Gold decorative bands — bottom
 const goldBot = ctx.createLinearGradient(0, 0, canvas.width, 0)
 goldBot.addColorStop(0, 'transparent')
 goldBot.addColorStop(0.5, '#d4af37')
 goldBot.addColorStop(1, 'transparent')
 ctx.fillStyle = goldBot
 ctx.fillRect(0, canvas.height - 32, canvas.width, 2)
 const goldBot2 = ctx.createLinearGradient(0, 0, canvas.width, 0)
 goldBot2.addColorStop(0, 'transparent')
 goldBot2.addColorStop(0.5, 'rgba(240,192,64,0.5)')
 goldBot2.addColorStop(1, 'transparent')
 ctx.fillStyle = goldBot2
 ctx.fillRect(10, canvas.height - 37, canvas.width - 20, 1)

 // Title text — rotated to read bottom-to-top
 ctx.save()
 ctx.translate(canvas.width / 2, canvas.height / 2)
 ctx.rotate(-Math.PI / 2)

 // Title
 const displayTitle = title
 const maxTitleWidth = canvas.height * 0.6
 const titleFontSize = 30
 ctx.font = `800 ${titleFontSize}px Arial, sans-serif`
 // Text shadow
 ctx.shadowColor = 'rgba(0,0,0,0.9)'
 ctx.shadowBlur = 8
 ctx.shadowOffsetX = 0
 ctx.shadowOffsetY = 2
 ctx.fillStyle = '#ffffff'
 ctx.textAlign = 'center'
 ctx.textBaseline = 'middle'
 const titleY = author ? -20 : 0
 ctx.fillText(displayTitle, 0, titleY, maxTitleWidth)
 ctx.shadowBlur = 0

 // Author — italic, gold
 if (author) {
  const displayAuthor = author.length > 20 ? author.slice(0, 20) + '…' : author
  ctx.font = `italic 16px Arial, sans-serif`
  ctx.fillStyle = '#d4af37'
  ctx.fillText(displayAuthor, 0, titleY + titleFontSize + 8, maxTitleWidth)
 }

 ctx.restore()

 // BOOKCRAFT label near bottom
 ctx.save()
 ctx.translate(canvas.width / 2, canvas.height - 16)
 ctx.rotate(-Math.PI / 2)
 ctx.font = '800 9px Arial, sans-serif'
 ctx.fillStyle = '#d4af37'
 ctx.globalAlpha = 0.85
 ctx.textAlign = 'center'
 ctx.textBaseline = 'middle'
 ctx.letterSpacing = '4px'
 ctx.fillText('BOOKCRAFT', 0, 0)
 ctx.restore()

 const texture = new THREE.CanvasTexture(canvas)
 texture.needsUpdate = true
 return texture
}

// Preload the GLB model
useGLTF.preload('/models/book.glb')

export function Book3D({
 position = [0, 0, 0],
 rotation = [0, 0, 0],
 scale = 1,
 isHovered = false,
 autoRotate = false,
 useGLBModel = true,
 title = 'Bookcraft',
 author,
}: Book3DProps) {
 const groupRef = useRef<THREE.Group>(null)
 const [hovered, setHovered] = useState(false)

 const [spineTexture, setSpineTexture] = useState<THREE.CanvasTexture | null>(null)
 useEffect(() => {
 if (useGLBModel || typeof window === 'undefined') return
 const texture = createSpineTexture(title, author)
 startTransition(() => { setSpineTexture(texture) })
 return () => {
 texture.dispose()
 }
 }, [useGLBModel, title, author])

  // Load the GLB model
 const { scene } = useGLTF('/models/book.glb')

  // Auto-rotation animation
 useFrame((state, delta) => {
 if (groupRef.current) {
 if (autoRotate && !hovered) {
 groupRef.current.rotation.y += delta * 0.2
 }

      // Smooth hover effect with bounce
 const targetScale = hovered || isHovered ? 1.15 : 1
 groupRef.current.scale.lerp(
 new THREE.Vector3(targetScale * scale, targetScale * scale, targetScale * scale),
 0.15
 )

      // Gentle floating animation
 groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.8) * 0.1
 }
 })

  // If using GLB model, render it
 if (useGLBModel) {
 return (
 <group
 ref={groupRef}
 position={position}
 rotation={rotation}
 onPointerOver={() => setHovered(true)}
 onPointerOut={() => setHovered(false)}
 >
 <primitive
 object={scene.clone()}
 scale={[3, 3, 3]}
 castShadow
 receiveShadow
 />
 </group>
 )
 }

  // Otherwise, render procedural book (original code)
 return (
 <group
 ref={groupRef}
 position={position}
 rotation={rotation}
 onPointerOver={() => setHovered(true)}
 onPointerOut={() => setHovered(false)}
 >
 {/* Main Book Cover - Front */}
 <RoundedBox
 args={[2.2, 3, 0.08]}
 position={[0.12, 0, 0]}
 radius={0.03}
 smoothness={8}
 castShadow
 receiveShadow
 >
 <meshStandardMaterial
 color="#1e3a8a"
 metalness={0.2}
 roughness={0.4}
 envMapIntensity={1.5}
 />
 </RoundedBox>

 {/* Book Cover - Back */}
 <RoundedBox
 args={[2.2, 3, 0.08]}
 position={[-0.12, 0, 0]}
 radius={0.03}
 smoothness={8}
 castShadow
 receiveShadow
 >
 <meshStandardMaterial
 color="#1e40af"
 metalness={0.2}
 roughness={0.4}
 envMapIntensity={1.5}
 />
 </RoundedBox>

 {/* Book Spine with title texture */}
 <RoundedBox
 args={[0.3, 3, 0.08]}
 position={[0, 0, 0]}
 radius={0.03}
 smoothness={8}
 castShadow
 >
 {spineTexture ? (
 <meshStandardMaterial
 map={spineTexture}
 metalness={0.2}
 roughness={0.4}
 envMapIntensity={1.0}
 />
 ) : (
 <meshStandardMaterial
 color="#172554"
 metalness={0.3}
 roughness={0.3}
 envMapIntensity={1.2}
 />
 )}
 </RoundedBox>

 {/* Pages stack - realistic layering */}
 <group position={[0, 0, 0.04]}>
 {Array.from({ length: 12 }).map((_, i) => {
 const offset = i * 0.008
 return (
 <mesh
 key={i}
 position={[0.08 - offset, 0, 0]}
 castShadow
 >
 <boxGeometry args={[2.1, 2.9, 0.015]} />
 <meshStandardMaterial
 color={new THREE.Color().setHSL(0.1, 0.05, 0.95 - i * 0.02)}
 metalness={0}
 roughness={0.9}
 />
 </mesh>
 )
 })}
 </group>

 {/* Gold decorative frame on cover */}
 <mesh position={[0.13, 0, 0]}>
 <boxGeometry args={[1.8, 2.6, 0.02]} />
 <meshStandardMaterial
 color="#d97706"
 metalness={0.95}
 roughness={0.05}
 emissive="#d97706"
 emissiveIntensity={0.3}
 />
 </mesh>

 {/* Inner decorative frame */}
 <mesh position={[0.135, 0, 0]}>
 <boxGeometry args={[1.6, 2.4, 0.025]} />
 <meshStandardMaterial
 color="#1e3a8a"
 metalness={0.2}
 roughness={0.4}
 />
 </mesh>

 {/* Title plate - embossed gold */}
 <mesh position={[0.14, 0.5, 0]}>
 <boxGeometry args={[1.4, 0.5, 0.03]} />
 <meshStandardMaterial
 color="#fbbf24"
 metalness={0.95}
 roughness={0.08}
 emissive="#fbbf24"
 emissiveIntensity={0.25}
 />
 </mesh>

 {/* Subtitle decoration */}
 <mesh position={[0.14, -0.7, 0]}>
 <boxGeometry args={[1, 0.2, 0.03]} />
 <meshStandardMaterial
 color="#fbbf24"
 metalness={0.95}
 roughness={0.08}
 emissive="#fbbf24"
 emissiveIntensity={0.25}
 />
 </mesh>

 {/* Corner decorations - 4 corners */}
 {[
 [-0.7, 1.1], [0.7, 1.1], [-0.7, -1.1], [0.7, -1.1]
 ].map(([x, y], idx) => (
 <mesh key={idx} position={[0.14, y, x]}>
 <boxGeometry args={[0.08, 0.08, 0.03]} />
 <meshStandardMaterial
 color="#f59e0b"
 metalness={0.9}
 roughness={0.1}
 emissive="#f59e0b"
 emissiveIntensity={0.2}
 />
 </mesh>
 ))}

 {/* Bookmark ribbon - luxurious silk look */}
 <mesh position={[0, -1.6, 0.05]} rotation={[0.15, 0, 0]}>
 <boxGeometry args={[0.2, 1.2, 0.01]} />
 <meshStandardMaterial
 color="#dc2626"
 metalness={0.4}
 roughness={0.6}
 emissive="#dc2626"
 emissiveIntensity={0.1}
 />
 </mesh>

 {/* Bottom of bookmark - pointed */}
 <mesh position={[0, -2.3, 0.05]} rotation={[0.15, 0, 0]}>
 <coneGeometry args={[0.1, 0.2, 4]} />
 <meshStandardMaterial
 color="#dc2626"
 metalness={0.4}
 roughness={0.6}
 />
 </mesh>

 {/* Decorative gems on spine - 3 vertical */}
 {[-0.8, 0, 0.8].map((y, idx) => (
 <mesh key={`gem-${idx}`} position={[0, y, 0]}>
 <sphereGeometry args={[0.08, 16, 16]} />
 <meshStandardMaterial
 color="#3b82f6"
 metalness={0.9}
 roughness={0.1}
 emissive="#3b82f6"
 emissiveIntensity={0.5}
 transparent
 opacity={0.9}
 />
 </mesh>
 ))}
 </group>
 )
}

// Animated Book with opening animation
export function AnimatedBook({
 position = [0, 0, 0],
 isOpen = false
}: {
 position?: [number, number, number]
 isOpen?: boolean
}) {
 const leftCoverRef = useRef<THREE.Group>(null)
 const rightCoverRef = useRef<THREE.Group>(null)

 useFrame(() => {
 const targetRotation = isOpen ? Math.PI / 2.5 : 0

 if (leftCoverRef.current) {
 leftCoverRef.current.rotation.y = THREE.MathUtils.lerp(
 leftCoverRef.current.rotation.y,
 -targetRotation,
 0.08
 )
 }

 if (rightCoverRef.current) {
 rightCoverRef.current.rotation.y = THREE.MathUtils.lerp(
 rightCoverRef.current.rotation.y,
 targetRotation,
 0.08
 )
 }
 })

 return (
 <group position={position}>
 {/* Left Cover */}
 <group ref={leftCoverRef} position={[-1.1, 0, 0]}>
 <RoundedBox
 args={[2.2, 3, 0.08]}
 position={[1.1, 0, 0]}
 radius={0.03}
 smoothness={8}
 castShadow
 >
 <meshStandardMaterial
 color="#1e40af"
 metalness={0.2}
 roughness={0.4}
 />
 </RoundedBox>
 </group>

 {/* Right Cover */}
 <group ref={rightCoverRef} position={[1.1, 0, 0]}>
 <RoundedBox
 args={[2.2, 3, 0.08]}
 position={[-1.1, 0, 0]}
 radius={0.03}
 smoothness={8}
 castShadow
 >
 <meshStandardMaterial
 color="#2563eb"
 metalness={0.2}
 roughness={0.4}
 />
 </RoundedBox>
 </group>

 {/* Pages in the middle - thick stack */}
 <mesh castShadow>
 <boxGeometry args={[2.1, 2.9, 0.3]} />
 <meshStandardMaterial
 color="#f5f5f5"
 metalness={0}
 roughness={0.9}
 />
 </mesh>

 {/* Page edges - yellowish tint */}
 <mesh position={[1.05, 0, 0]}>
 <boxGeometry args={[0.01, 2.9, 0.3]} />
 <meshStandardMaterial
 color="#fef3c7"
 metalness={0}
 roughness={1}
 />
 </mesh>
 <mesh position={[-1.05, 0, 0]}>
 <boxGeometry args={[0.01, 2.9, 0.3]} />
 <meshStandardMaterial
 color="#fef3c7"
 metalness={0}
 roughness={1}
 />
 </mesh>
 </group>
 )
}
