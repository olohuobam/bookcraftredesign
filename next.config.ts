import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  // Fix workspace root detection — prevents Next.js from picking up /root/package-lock.json
  outputFileTracingRoot: __dirname,
  /* config options here */

  // Capacitor Integration: We use a hybrid approach
  // - Web version runs with SSR and API routes
  // - Mobile app (Capacitor) loads the web version in a webview
  // This preserves all API functionality while allowing native app packaging

  // Webpack configuration to handle server-only packages
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // pdfjs-dist is server-only (API route); prevent it from being bundled on the client
      config.resolve.alias = {
        ...config.resolve.alias,
        'pdfjs-dist': false,
      }
    }
    return config
  },

  // Optimized caching headers for Vercel CDN
  async headers() {
    return [
      // Service Worker — must NOT be cached by browser (always fetch fresh)
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      // Offline fallback page
      {
        source: '/offline.html',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=86400',
          },
        ],
      },
      // Static assets - cache for 1 year (immutable)
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Next.js Image Optimization - cache for 1 month
      {
        source: '/_next/image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      // Public static files (fonts, icons, etc.) - cache for 1 week
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/:path*.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800',
          },
        ],
      },
      {
        source: '/:path*.svg',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400',
          },
        ],
      },
      // API routes - no caching (dynamic data)
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
      // Webhook routes - no caching
      {
        source: '/api/webhooks/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
        ],
      },
      // Dashboard pages - short cache with revalidation
      {
        source: '/dashboard/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
      // Marketing/static pages - cache for 1 hour with revalidation
      {
        source: '/(agb|datenschutz|impressum|kontakt|features|pricing)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
      // Default security headers for all routes
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // HSTS — only meaningful over HTTPS; harmless on HTTP.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(), payment=(self)',
          },
          // Reporting endpoint group for the Reporting API (report-to).
          {
            key: 'Reporting-Endpoints',
            value: 'csp-endpoint="/api/csp-report"',
          },
          // CSP in Report-Only first to surface violations without breaking
          // existing inline scripts/styles used by Next.js + Stripe + Supabase.
          // Tighten and switch to Content-Security-Policy after monitoring.
          {
            key: 'Content-Security-Policy-Report-Only',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.paypal.com https://www.paypalobjects.com https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://api.openai.com https://www.paypal.com",
              "frame-src 'self' https://js.stripe.com https://www.paypal.com https://hooks.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://checkout.stripe.com https://www.paypal.com",
              "frame-ancestors 'self'",
              "upgrade-insecure-requests",
              // report-uri: legacy directive (Firefox/Safari + older Chrome).
              // report-to: Reporting API, paired with Reporting-Endpoints above.
              "report-uri /api/csp-report",
              "report-to csp-endpoint",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // Ensure proper handling of external images and assets
  images: {
    // Enable image optimization (reduces bandwidth significantly)
    formats: ['image/avif', 'image/webp'],
    // Reduce quality slightly for smaller file sizes
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 2592000, // Cache optimized images for 30 days
    remotePatterns: [
      // Supabase Storage
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      // OpenAI / DALL-E image storage
      {
        protocol: 'https',
        hostname: 'oaidalleapiprodscus.blob.core.windows.net',
      },
      // AWS CloudFront (CDN for generated images)
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
      },
      // Google Profile Pictures
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      // Cloudflare CDN / R2 public buckets
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      // Custom CDN domains (configured via NEXT_PUBLIC_CDN_URL)
      // Add your specific CDN hostname here if it does not match the wildcard patterns above,
      // e.g. { protocol: 'https', hostname: 'cdn.yourdomain.com' }
      // Dev: localhost
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      // Dev: 127.0.0.1
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
    ],
  },

  // Enable compression
  compress: true,

  // Essential for Replit: Server configuration handled via CLI args in package.json
  // Cross-origin warning is informational only - app works correctly
};

export default nextConfig;
