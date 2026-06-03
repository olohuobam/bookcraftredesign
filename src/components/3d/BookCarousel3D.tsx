'use client'

import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Book3D } from './Book3D'
import * as THREE from 'three'
import { gsap } from 'gsap'

interface BookCarousel3DProps {
 bookCount?: number
 radius?: number
}

// Individual book with enhanced animations
function CarouselBook({
 index,
 totalBooks,
 radius,
 isActive,
 onClick
}: {
 index: number
 totalBooks: number
 radius: number
 isActive: boolean
 onClick: () => void
}) {
 const bookRef = useRef<THREE.Group>(null)
 const spotlightRef = useRef<THREE.SpotLight>(null)
 const [hovered, setHovered] = useState(false)

 const angle = (index / totalBooks) * Math.PI * 2
 const x = Math.cos(angle) * radius
 const z = Math.sin(angle) * radius
 const rotation: [number, number, number] = [0, -angle + Math.PI / 2, 0]

  // Animate book on mount
 useEffect(() => {
 if (bookRef.current) {
 gsap.from(bookRef.current.position, {
 y: 10,
 duration: 1 + index * 0.1,
 ease: 'bounce.out',
 delay: index * 0.1,
 })
 }
 }, [index])

  // Floating animation
 useFrame((state) => {
 if (bookRef.current) {
 const offset = Math.sin(state.clock.elapsedTime + index) * 0.1
 bookRef.current.position.y = offset

      // Spotlight follows active book
 if (spotlightRef.current && isActive) {
 spotlightRef.current.intensity = THREE.MathUtils.lerp(
 spotlightRef.current.intensity,
 3,
 0.1
 )
 } else if (spotlightRef.current) {
 spotlightRef.current.intensity = THREE.MathUtils.lerp(
 spotlightRef.current.intensity,
 0,
 0.1
 )
 }
 }
 })

 return (
 <group
 ref={bookRef}
 position={[x, 0, z]}
 onClick={onClick}
 onPointerOver={() => setHovered(true)}
 onPointerOut={() => setHovered(false)}
 >
 {/* Spotlight for active book */}
 <spotLight
 ref={spotlightRef}
 position={[0, 5, 0]}
 angle={0.5}
 penumbra={1}
 intensity={0}
 castShadow
 color={isActive ? '#3b82f6' : '#3b82f6'}
 />

 {/* Glow ring for active book */}
 {isActive && (
 <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
 <ringGeometry args={[1.8, 2, 32]} />
 <meshBasicMaterial
 color="#3b82f6"
 transparent
 opacity={0.5}
 blending={THREE.AdditiveBlending}
 />
 </mesh>
 )}

 <Book3D
 rotation={rotation}
 scale={isActive ? 1.4 : hovered ? 1.1 : 0.9}
 isHovered={isActive || hovered}
 autoRotate={false}
 />
 </group>
 )
}

export function BookCarousel3D({ bookCount = 8, radius = 6 }: BookCarousel3DProps) {
 const groupRef = useRef<THREE.Group>(null)
 const [currentIndex, setCurrentIndex] = useState(0)
 const [isAutoRotating, setIsAutoRotating] = useState(true)
 const targetRotation = useRef(0)

  // Enhanced smooth rotation with easing
 useFrame((state, delta) => {
 if (groupRef.current) {
 const currentRotation = groupRef.current.rotation.y
 const diff = targetRotation.current - currentRotation

      // Smoother easing
 groupRef.current.rotation.y += diff * 0.08

      // Auto-rotate when enabled
 if (isAutoRotating) {
 targetRotation.current += delta * 0.15
 }
 }
 })

 const handleBookClick = (index: number) => {
 setIsAutoRotating(false)
 setCurrentIndex(index)

    // Animate to target rotation
 const newRotation = -(index / bookCount) * Math.PI * 2
 gsap.to(targetRotation, {
 current: newRotation,
 duration: 1,
 ease: 'power2.inOut',
 })

    // Resume auto-rotation after 5 seconds
 setTimeout(() => {
 setIsAutoRotating(true)
 }, 5000)
 }

 return (
 <group ref={groupRef}>
 {Array.from({ length: bookCount }).map((_, index) => (
 <CarouselBook
 key={index}
 index={index}
 totalBooks={bookCount}
 radius={radius}
 isActive={index === currentIndex}
 onClick={() => handleBookClick(index)}
 />
 ))}
 </group>
 )
}
