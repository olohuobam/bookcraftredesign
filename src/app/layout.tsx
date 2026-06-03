import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import CookieBanner from "@/components/CookieBanner";
import OfflineOverlay from "@/components/OfflineOverlay";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import CordovaBridge from "@/components/CordovaBridge";
import { Analytics } from "@vercel/analytics/next";
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";

export const viewport: Viewport = {
 width: 'device-width',
 initialScale: 1,
 maximumScale: 1,
 userScalable: false,
 viewportFit: 'cover',
 themeColor: [
 { media: '(prefers-color-scheme: light)', color: '#ffffff' },
 { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
 ],
};

export const metadata: Metadata = {
 title: "bookcraft.dev - AI-Powered Book Generation",
 description: "Create professional books with AI. Generate unique stories, novels, and picture books in minutes — for free.",
 manifest: '/manifest.json',
 appleWebApp: {
 capable: true,
 statusBarStyle: 'black-translucent',
 title: 'bookcraft.dev',
 },
 formatDetection: {
 telephone: false,
 },
 openGraph: {
 title: 'bookcraft.dev - AI-Powered Book Generation',
 description: 'Create professional books with AI. Generate unique stories, novels, and picture books in minutes — for free.',
 url: 'https://bookcraft.dev',
 siteName: 'bookcraft.dev',
 images: [
 {
 url: 'https://bookcraft.dev/icons/icon-512x512.png',
 width: 512,
 height: 512,
 alt: 'bookcraft.dev Logo',
 },
 ],
 locale: 'en_US',
 type: 'website',
 },
 twitter: {
 card: 'summary_large_image',
 title: 'bookcraft.dev - AI-Powered Book Generation',
 description: 'Create professional books with AI. Generate unique stories, novels, and picture books in minutes — for free.',
 images: ['https://bookcraft.dev/icons/icon-512x512.png'],
 },
};

export default function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
}>) {
 return (
 <html lang="en" suppressHydrationWarning>
 <head>
 {/* Mobile-specific meta tags */}
 <meta name="mobile-web-app-capable" content="yes" />
 <meta name="apple-mobile-web-app-capable" content="yes" />
 <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
 <meta name="apple-mobile-web-app-title" content="bookcraft.dev" />

 {/* iOS Icons */}
 <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
 <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
 <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
 <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-192x192.png" />

 {/* Favicon */}
 <link rel="icon" href="/favicon.ico" sizes="32x32" />
 <link rel="icon" type="image/png" href="/icons/icon-192x192.png" sizes="192x192" />

 </head>
 <body className="antialiased font-sans">
 <Providers>
 <main className="min-h-screen">
 {children}
 </main>
 <CookieBanner />
 <OfflineOverlay />
 <ServiceWorkerRegistration />
 <CordovaBridge />
 </Providers>
 <Analytics />
 </body>
 </html>
 );
}
