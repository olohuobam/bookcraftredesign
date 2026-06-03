'use client'

import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ParticleFieldProps {
 count?: number
 radius?: number
 colors?: string[]
}

export function ParticleField({
 count = 100,
 radius = 8,
 colors = ['#3b82f6', '#3b82f6', '#3E86D7', '#60a5fa']
}: ParticleFieldProps) {
 const particlesRef = useRef<THREE.Points>(null)

  // Generate random positions and colors
 // eslint-disable-next-line react-hooks/exhaustive-deps
 const particles = useMemo(() => {
 const positions = new Float32Array(count * 3)
 const particleColors = new Float32Array(count * 3)
 const velocities: THREE.Vector3[] = []

 for (let i = 0; i < count; i++) {
 const theta = Math.random() * Math.PI * 2
 const phi = Math.acos(Math.random() * 2 - 1)
 const r = radius * (0.5 + Math.random() * 0.5)

 positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
 positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
 positions[i * 3 + 2] = r * Math.cos(phi)

 const color = new THREE.Color(colors[Math.floor(Math.random() * colors.length)])
 particleColors[i * 3] = color.r
 particleColors[i * 3 + 1] = color.g
 particleColors[i * 3 + 2] = color.b

 velocities.push(
 new THREE.Vector3(
 (Math.random() - 0.5) * 0.02,
 (Math.random() - 0.5) * 0.02,
 (Math.random() - 0.5) * 0.02
 )
 )
 }

 return { positions, particleColors, velocities }
 }, [count, radius, colors])

  // Animate particles
 useFrame((state) => {
 if (particlesRef.current && particlesRef.current.geometry) {
 const positionAttribute = particlesRef.current.geometry.getAttribute('position')
 if (positionAttribute) {
 const positions = positionAttribute.array as Float32Array

 for (let i = 0; i < count; i++) {
 const i3 = i * 3

          // Float animation
 positions[i3] += Math.sin(state.clock.elapsedTime + i) * 0.002
 positions[i3 + 1] += Math.cos(state.clock.elapsedTime + i) * 0.002
 positions[i3 + 2] += Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.002

          // Boundary check - keep particles in sphere
 const distance = Math.sqrt(
 positions[i3] ** 2 + positions[i3 + 1] ** 2 + positions[i3 + 2] ** 2
 )

 if (distance > radius) {
 positions[i3] *= 0.95
 positions[i3 + 1] *= 0.95
 positions[i3 + 2] *= 0.95
 }
 }

 positionAttribute.needsUpdate = true
 }

      // Rotate entire particle field slowly
 particlesRef.current.rotation.y = state.clock.elapsedTime * 0.05
 }
 })

 const geometry = useMemo(() => {
 const geo = new THREE.BufferGeometry()
 geo.setAttribute('position', new THREE.Float32BufferAttribute(particles.positions, 3))
 geo.setAttribute('color', new THREE.Float32BufferAttribute(particles.particleColors, 3))
 return geo
 }, [particles])

 return (
 <points ref={particlesRef} geometry={geometry}>
 <pointsMaterial
 size={0.05}
 vertexColors
 transparent
 opacity={0.6}
 sizeAttenuation
 blending={THREE.AdditiveBlending}
 depthWrite={false}
 />
 </points>
 )
}

// Floating geometric shapes around the book
export function FloatingShapes() {
 const groupRef = useRef<THREE.Group>(null)

 const [randomValues] = useState(() => ({
 cubeY: Array.from({ length: 6 }, () => (Math.random() - 0.5) * 2),
 ringY: Array.from({ length: 4 }, () => (Math.random() - 0.5) * 3),
 ringRotX: Array.from({ length: 4 }, () => Math.random() * Math.PI),
 ringRotY: Array.from({ length: 4 }, () => Math.random() * Math.PI),
 }))

 useFrame((state) => {
 if (groupRef.current) {
 groupRef.current.rotation.y = state.clock.elapsedTime * 0.1

 groupRef.current.children.forEach((child, i) => {
 child.position.y = Math.sin(state.clock.elapsedTime + i) * 0.5
 child.rotation.x = state.clock.elapsedTime * 0.3 + i
 child.rotation.z = state.clock.elapsedTime * 0.2 + i
 })
 }
 })

 return (
 <group ref={groupRef}>
 {[...Array(6)].map((_, i) => {
 const angle = (i / 6) * Math.PI * 2
 const distance = 5

 return (
 <mesh
 key={i}
 position={[
 Math.cos(angle) * distance,
 randomValues.cubeY[i],
 Math.sin(angle) * distance
 ]}
 >
 <boxGeometry args={[0.2, 0.2, 0.2]} />
 <meshStandardMaterial
 color={['#3b82f6', '#3b82f6', '#3E86D7'][i % 3]}
 transparent
 opacity={0.3}
 metalness={0.8}
 roughness={0.2}
 />
 </mesh>
 )
 })}

 {[...Array(4)].map((_, i) => {
 const angle = (i / 4) * Math.PI * 2
 const distance = 6

 return (
 <mesh
 key={`ring-${i}`}
 position={[
 Math.cos(angle + Math.PI / 4) * distance,
 randomValues.ringY[i],
 Math.sin(angle + Math.PI / 4) * distance
 ]}
 rotation={[randomValues.ringRotX[i], randomValues.ringRotY[i], 0]}
 >
 <torusGeometry args={[0.3, 0.05, 16, 32]} />
 <meshStandardMaterial
 color={['#60a5fa', '#3E86D7'][i % 2]}
 transparent
 opacity={0.4}
 metalness={0.9}
 roughness={0.1}
 />
 </mesh>
 )
 })}
 </group>
 )
}
