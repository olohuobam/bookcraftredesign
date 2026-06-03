'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

/**
 * ServiceWorkerRegistration
 *
 * Registers the Bookcraft Service Worker in production builds.
 * Shows a subtle "Update available" banner when a new SW version is detected.
 * Compatible with Capacitor WebView.
 */
export default function ServiceWorkerRegistration() {
  const { t } = useLanguage();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    // Only register in production and when SW is supported
    if (
      process.env.NODE_ENV !== 'production' ||
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }

    let registration: ServiceWorkerRegistration | undefined;

    const registerSW = async () => {
      try {
        registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        // Check for updates immediately
        registration.update().catch((e) => console.warn('[SW] Update check failed:', e));

        // Handle update found
        registration.addEventListener('updatefound', () => {
          const newWorker = registration?.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // New SW is installed and waiting — show update banner
              setWaitingWorker(newWorker);
              setUpdateAvailable(true);
            }
          });
        });

        // Check for already-waiting worker (e.g. after page reload)
        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(registration.waiting);
          setUpdateAvailable(true);
        }

        // Listen for controller change (SW took over)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });

        console.log('[SW] Service Worker registered');
      } catch (err) {
        console.warn('[SW] Registration failed:', err);
      }
    };

    registerSW();

    // Check for updates periodically (every 60 min)
    const interval = setInterval(() => {
      registration?.update().catch((e) => console.warn('[SW] Periodic update check failed:', e));
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    setUpdateAvailable(false);
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
  };

  if (!updateAvailable) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'max(1rem, env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        backgroundColor: '#1a1a2e',
        border: '1px solid rgba(62,134,215,0.4)',
        borderRadius: '14px',
        padding: '0.75rem 1rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)',
        maxWidth: 'calc(100vw - 2rem)',
        whiteSpace: 'nowrap',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
      role="alert"
      aria-live="polite"
    >
      <span style={{ fontSize: '1rem' }}>✨</span>
      <span
        style={{
          fontSize: '0.875rem',
          color: 'rgba(255,255,255,0.85)',
          fontWeight: 500,
        }}
      >
        {t('updateAvailable')}
      </span>
      <button
        onClick={handleUpdate}
        style={{
          background: 'linear-gradient(135deg, #3E86D7, #60a5fa)',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          padding: '0.4rem 0.875rem',
          fontSize: '0.8rem',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {t('applyUpdate')}
      </button>
      <button
        onClick={handleDismiss}
        aria-label={t('close')}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.4)',
          cursor: 'pointer',
          padding: '0.25rem',
          fontSize: '1rem',
          lineHeight: 1,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        ✕
      </button>
    </div>
  );
}
