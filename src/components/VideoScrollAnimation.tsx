'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP ScrollTrigger plugin
if (typeof window !== 'undefined') {
 gsap.registerPlugin(ScrollTrigger);
}

interface VideoScrollAnimationProps {
 videoSrc?: string;
 height?: string;
 overlayContent?: React.ReactNode;
 className?: string;
}

export default function VideoScrollAnimation({
 videoSrc = '/Videohero.mp4',
 height = '300vh',
 overlayContent,
 className = '',
}: VideoScrollAnimationProps) {
 const containerRef = useRef<HTMLDivElement>(null);
 const videoRef = useRef<HTMLVideoElement>(null);
 const canvasRef = useRef<HTMLCanvasElement>(null);

 useEffect(() => {
 const video = videoRef.current;
 const canvas = canvasRef.current;
 const container = containerRef.current;

 if (!video || !canvas || !container) return;

 const ctx = canvas.getContext('2d', {
 alpha: false,
 desynchronized: true // Optimize for canvas animations
 });
 if (!ctx) return;

    // Set canvas size with device pixel ratio for sharper rendering
 const setCanvasSize = () => {
 const dpr = window.devicePixelRatio || 1;
 canvas.width = window.innerWidth * dpr;
 canvas.height = window.innerHeight * dpr;
 canvas.style.width = `${window.innerWidth}px`;
 canvas.style.height = `${window.innerHeight}px`;
 ctx.scale(dpr, dpr);
 };
 setCanvasSize();
 window.addEventListener('resize', setCanvasSize);

    // Wait for video metadata to load
 const handleLoadedMetadata = () => {
 const duration = video.duration;
 let animationFrameId: number;

      // Create scroll-linked animation with immediate response
 const scrollTrigger = ScrollTrigger.create({
 trigger: container,
 start: 'top top',
 end: 'bottom bottom',
 scrub: 0, // Immediate response, no delay
 pin: canvas,
 onUpdate: (self) => {
          // Calculate which frame to show based on scroll progress
 const progress = self.progress;
 const targetTime = progress * duration;

          // Update video time immediately for smoothest playback
 if (Math.abs(video.currentTime - targetTime) > 0.01) {
 video.currentTime = targetTime;
 }
 },
 });

      // Draw video frame to canvas with optimal performance
 const drawFrame = () => {
 if (ctx && video.readyState >= 2) {
          // Calculate dimensions to maintain aspect ratio
 const videoAspect = video.videoWidth / video.videoHeight;
 const canvasAspect = window.innerWidth / window.innerHeight;

 let drawWidth = window.innerWidth;
 let drawHeight = window.innerHeight;
 let offsetX = 0;
 let offsetY = 0;

 if (videoAspect > canvasAspect) {
            // Video is wider - fit height
 drawHeight = window.innerHeight;
 drawWidth = drawHeight * videoAspect;
 offsetX = (window.innerWidth - drawWidth) / 2;
 } else {
            // Video is taller - fit width
 drawWidth = window.innerWidth;
 drawHeight = drawWidth / videoAspect;
 offsetY = (window.innerHeight - drawHeight) / 2;
 }

 ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
 ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
 }
 animationFrameId = requestAnimationFrame(drawFrame);
 };
 animationFrameId = requestAnimationFrame(drawFrame);

 return () => {
 scrollTrigger.kill();
 if (animationFrameId) {
 cancelAnimationFrame(animationFrameId);
 }
 };
 };

    // Load video with metadata preloading
 video.addEventListener('loadedmetadata', handleLoadedMetadata);
 video.preload = 'metadata';
 video.load();

 return () => {
 video.removeEventListener('loadedmetadata', handleLoadedMetadata);
 window.removeEventListener('resize', setCanvasSize);
 ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
 };
 }, []);

 return (
 <div
 ref={containerRef}
 className={`relative w-full ${className}`}
 style={{ height }}
 >
 {/* Hidden video element - used for frame extraction */}
 <video
 ref={videoRef}
 src={videoSrc}
 preload="auto"
 muted
 playsInline
 crossOrigin="anonymous"
 className="hidden"
 style={{ pointerEvents: 'none' }}
 />

 {/* Canvas for displaying video frames */}
 <canvas
 ref={canvasRef}
 className="fixed top-0 left-0 w-full h-screen object-cover"
 style={{ willChange: 'contents' }}
 />

 {/* Overlay content */}
 {overlayContent && (
 <div className="fixed top-0 left-0 w-full h-screen flex items-center justify-center pointer-events-none z-10">
 <div className="pointer-events-auto">
 {overlayContent}
 </div>
 </div>
 )}
 </div>
 );
}
