'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

// Dynamic import to avoid SSR issues
const VideoScrollAnimation = dynamic(
 () => import('@/components/VideoScrollAnimation'),
 { ssr: false }
);

export default function VideoDemoPage() {
 const { t } = useLanguage();
 return (
 <div className="min-h-screen bg-black">
 {/* Minimal Navigation */}
 <Link
 href="/"
 className="fixed top-6 left-6 z-50 inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
 >
 <ArrowLeft className="w-5 h-5" />
 <span className="text-sm">{t('back')}</span>
 </Link>

 {/* Video Scroll - Clean, no overlays */}
 <VideoScrollAnimation
 videoSrc="/Videohero.mp4"
 height="300vh"
 />

 {/* Simple footer */}
 <section className="py-20 px-4 bg-black text-white">
 <div className="container mx-auto max-w-2xl text-center">
 <h2 className="text-3xl font-bold mb-4">
 Video Scroll Animation
 </h2>
 <p className="text-muted-foreground mb-8">
 Smooth scroll-gesteuerte Video-Wiedergabe
 </p>
 <Link
 href="/"
 className="inline-block bg-bookcraft-blue hover:brightness-110 text-white font-semibold py-3 px-8 rounded-full transition-all"
 >
 To Main Page
 </Link>
 </div>
 </section>
 </div>
 );
}
