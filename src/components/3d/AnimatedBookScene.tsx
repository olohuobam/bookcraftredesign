'use client'

import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, PerspectiveCamera, Float } from '@react-three/drei'
import { Book3D } from './Book3D'
import * as THREE from 'three'
import { EffectComposer, Bloom } from '@react-three/postprocessing'

interface AnimatedBookSceneProps {
 className?: string
 animationMode?: 'float' | 'rotate' | 'spotlight' | 'magical'
}

// Animated Book with advanced effects
function AnimatedBookWithEffects({ mode = 'magical' }: { mode: string }) {
 const groupRef = useRef<THREE.Group>(null)
 const lightRef = useRef<THREE.SpotLight>(null)

 useFrame((state) => {
 const time = state.clock.elapsedTime

 if (groupRef.current) {
 switch (mode) {
 case 'float':
          // Gentle floating
 groupRef.current.position.y = Math.sin(time * 0.5) * 0.5
 groupRef.current.rotation.y = time * 0.2
 break

 case 'rotate':
          // Continuous rotation
 groupRef.current.rotation.y = time * 0.5
 groupRef.current.rotation.x = Math.sin(time * 0.3) * 0.1
 break

 case 'spotlight':
          // Dramatic spotlight effect
 groupRef.current.rotation.y = Math.sin(time * 0.3) * 0.5
 if (lightRef.current) {
 lightRef.current.intensity = 2 + Math.sin(time * 2) * 0.5
 }
 break

 case 'magical':
          // Magical floating with rotation
 groupRef.current.position.y = Math.sin(time * 0.6) * 0.8
 groupRef.current.rotation.y = time * 0.3
 groupRef.current.rotation.x = Math.sin(time * 0.4) * 0.15
 groupRef.current.rotation.z = Math.sin(time * 0.5) * 0.05
 break
 }
 }
 })

 return (
 <group ref={groupRef}>
 <Book3D
 position={[0, 0, 0]}
 scale={1.5}
 autoRotate={false}
 useGLBModel={true}
 />

 {/* Magical particles removed */}

 {/* Dramatic spotlight */}
 {mode === 'spotlight' && (
 <spotLight
 ref={lightRef}
 position={[5, 8, 5]}
 angle={0.3}
 penumbra={1}
 intensity={2}
 castShadow
 shadow-mapSize-width={2048}
 shadow-mapSize-height={2048}
 />
 )}
 </group>
 )
}

// Rotating camera rig for cinematic effect
function CinematicCamera({ enabled = false }: { enabled: boolean }) {
 const cameraRef = useRef<THREE.Group>(null)

 useFrame((state) => {
 if (cameraRef.current && enabled) {
 const time = state.clock.elapsedTime
 cameraRef.current.position.x = Math.sin(time * 0.2) * 8
 cameraRef.current.position.z = Math.cos(time * 0.2) * 8
 cameraRef.current.lookAt(0, 0, 0)
 }
 })

 return (
 <group ref={cameraRef}>
 <PerspectiveCamera makeDefault position={[0, 2, 8]} fov={50} />
 </group>
 )
}

// Main Scene Component
export function AnimatedBookScene({
 className = '',
 animationMode = 'magical'
}: AnimatedBookSceneProps) {
 return (
 <div className={`w-full h-full ${className}`}>
 <Canvas shadows dpr={[1, 2]}>
 <Suspense fallback={null}>
 {/* Camera */}
 <CinematicCamera enabled={animationMode === 'magical'} />

 {/* Lighting Setup */}
 <ambientLight intensity={0.3} />
 <directionalLight
 position={[10, 10, 5]}
 intensity={1}
 castShadow
 shadow-mapSize-width={2048}
 shadow-mapSize-height={2048}
 />
 <pointLight position={[-10, 0, -5]} intensity={0.5} color="#60a5fa" />
 <pointLight position={[10, 0, -5]} intensity={0.5} color="#fbbf24" />

 {/* Environment */}
 <Environment preset="city" />

 {/* Animated Book */}
 <AnimatedBookWithEffects mode={animationMode} />

 {/* Ground plane with shadow */}
 <mesh
 rotation={[-Math.PI / 2, 0, 0]}
 position={[0, -3, 0]}
 receiveShadow
 >
 <planeGeometry args={[50, 50]} />
 <shadowMaterial transparent opacity={0.2} />
 </mesh>

 {/* Post-processing effects */}
 <EffectComposer>
 <Bloom
 intensity={0.5}
 luminanceThreshold={0.9}
 luminanceSmoothing={0.9}
 />
 </EffectComposer>

 {/* Controls - allow user interaction */}
 <OrbitControls
 enableZoom={true}
 enablePan={false}
 minDistance={5}
 maxDistance={15}
 maxPolarAngle={Math.PI / 2}
 />
 </Suspense>
 </Canvas>
 </div>
 )
}

// Floating Book Scene (Simple version)
export function FloatingBookScene({ className = '' }: { className?: string }) {
 return (
 <div className={`w-full h-full ${className}`}>
 <Canvas shadows dpr={[1, 2]}>
 <Suspense fallback={null}>
 <PerspectiveCamera makeDefault position={[0, 2, 8]} fov={50} />

 {/* Lighting */}
 <ambientLight intensity={0.4} />
 <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />

 {/* Environment */}
 <Environment preset="sunset" />

 {/* Floating Book with automatic animation */}
 <Float
 speed={2}
 rotationIntensity={0.5}
 floatIntensity={1}
 floatingRange={[-0.5, 0.5]}
 >
 <Book3D
 position={[0, 0, 0]}
 scale={1.5}
 autoRotate={true}
 useGLBModel={true}
 />
 </Float>



 {/* Ground shadow */}
 <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]} receiveShadow>
 <planeGeometry args={[50, 50]} />
 <shadowMaterial transparent opacity={0.15} />
 </mesh>

 <OrbitControls enableZoom={true} enablePan={false} />
 </Suspense>
 </Canvas>
 </div>
 )
}

// Showcase Scene with multiple books
export function BookShowcaseScene({ className = '' }: { className?: string }) {
 return (
 <div className={`w-full h-full ${className}`}>
 <Canvas shadows dpr={[1, 2]}>
 <Suspense fallback={null}>
 <PerspectiveCamera makeDefault position={[0, 3, 12]} fov={60} />

 {/* Lighting */}
 <ambientLight intensity={0.3} />
 <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
 <pointLight position={[-5, 5, -5]} intensity={0.8} color="#60a5fa" />
 <pointLight position={[5, 5, -5]} intensity={0.8} color="#fbbf24" />

 {/* Environment */}
 <Environment preset="warehouse" />

 {/* Multiple books in a circle */}
 {[0, 1, 2, 3, 4].map((i) => {
 const angle = (i / 5) * Math.PI * 2
 const radius = 5
 const x = Math.sin(angle) * radius
 const z = Math.cos(angle) * radius

 return (
 <Float
 key={i}
 speed={1.5 + i * 0.2}
 rotationIntensity={0.5}
 floatIntensity={0.8}
 >
 <Book3D
 position={[x, 0, z]}
 rotation={[0, -angle, 0]}
 scale={1.2}
 useGLBModel={true}
 />
 </Float>
 )
 })}



 {/* Ground */}
 <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]} receiveShadow>
 <circleGeometry args={[20, 64]} />
 <meshStandardMaterial
 color="#1a1a2e"
 metalness={0.8}
 roughness={0.2}
 />
 </mesh>

 {/* Post-processing */}
 <EffectComposer>
 <Bloom
 intensity={0.4}
 luminanceThreshold={0.9}
 luminanceSmoothing={0.9}
 />
 </EffectComposer>

 <OrbitControls
 enableZoom={true}
 enablePan={false}
 autoRotate
 autoRotateSpeed={0.5}
 />
 </Suspense>
 </Canvas>
 </div>
 )
}
