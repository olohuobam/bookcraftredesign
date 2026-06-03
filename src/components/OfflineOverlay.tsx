'use client';

import { useEffect, useState, useCallback, startTransition } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { useLanguage } from '@/context/LanguageContext';

type OfflineMode = 'none' | 'banner' | 'fullscreen';

export default function OfflineOverlay() {
  const { t } = useLanguage();
  const [isOffline, setIsOffline] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isAppShellCached, setIsAppShellCached] = useState(false);
  const [showOnlineBanner, setShowOnlineBanner] = useState(false);

  // Check if App Shell is cached in Service Worker cache
  const checkAppShellCached = useCallback(async (): Promise<boolean> => {
    if (!('caches' in window)) return false;
    try {
      const cacheNames = await caches.keys();
      const appShellCache = cacheNames.find((n) => n.startsWith('bookcraft-app-shell'));
      if (!appShellCache) return false;
      const cache = await caches.open(appShellCache);
      const response = await cache.match('/');
      return !!response;
    } catch {
      return false;
    }
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const status = await Network.getStatus();
        startTransition(() => { setIsOffline(!status.connected) });
      } else {
        startTransition(() => { setIsOffline(!navigator.onLine) });
      }
    } catch {
      startTransition(() => { setIsOffline(!navigator.onLine) });
    }
  }, []);

  useEffect(() => {
    checkStatus();
    checkAppShellCached().then(v => startTransition(() => { setIsAppShellCached(v) }));

    let networkListenerCleanup: (() => void) | undefined;
    let wasOffline = false;

    const setupListeners = async () => {
      if (Capacitor.isNativePlatform()) {
        const handle = await Network.addListener('networkStatusChange', async (status) => {
          const nowOffline = !status.connected;
          if (!nowOffline && wasOffline) {
            // Came back online — show online banner, auto-dismiss after 3s
            setShowOnlineBanner(true);
            setTimeout(() => setShowOnlineBanner(false), 3000);
          }
          wasOffline = nowOffline;
          setIsOffline(nowOffline);

          if (nowOffline) {
            const cached = await checkAppShellCached();
            setIsAppShellCached(cached);
          }
        });
        networkListenerCleanup = () => handle.remove();
      } else {
        const handleOnline = async () => {
          if (wasOffline) {
            setShowOnlineBanner(true);
            setTimeout(() => setShowOnlineBanner(false), 3000);
          }
          wasOffline = false;
          setIsOffline(false);
        };

        const handleOffline = async () => {
          wasOffline = true;
          setIsOffline(true);
          const cached = await checkAppShellCached();
          setIsAppShellCached(cached);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        networkListenerCleanup = () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        };
      }
    };

    setupListeners();

    return () => {
      networkListenerCleanup?.();
    };
  }, [checkStatus, checkAppShellCached]);

  const handleRetry = async () => {
    setIsChecking(true);
    await checkStatus();
    const cached = await checkAppShellCached();
    setIsAppShellCached(cached);
    setTimeout(() => setIsChecking(false), 800);
  };

  // Determine display mode
  const mode: OfflineMode = isOffline
    ? isAppShellCached
      ? 'banner'
      : 'fullscreen'
    : 'none';

  // ─── Online restored banner ───────────────────────────────────────────────
  if (showOnlineBanner && !isOffline) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 'max(1rem, env(safe-area-inset-top))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: 'rgba(16,185,129,0.95)',
          borderRadius: '12px',
          padding: '0.625rem 1.25rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: '#fff',
          whiteSpace: 'nowrap',
          backdropFilter: 'blur(8px)',
          animation: 'slideDown 0.3s ease',
        }}
        role="status"
        aria-live="polite"
      >
        <style>{`
          @keyframes slideDown {
            from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
          }
        `}</style>
        ✓ {t('backOnline')}
      </div>
    );
  }

  // ─── Subtle offline banner (App Shell cached) ─────────────────────────────
  if (mode === 'banner') {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          paddingTop: 'env(safe-area-inset-top)',
          backgroundColor: 'rgba(17,17,17,0.95)',
          borderBottom: '1px solid rgba(62,134,215,0.3)',
          backdropFilter: 'blur(8px)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
        role="status"
        aria-live="polite"
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            fontSize: '0.8rem',
            color: 'rgba(255,255,255,0.7)',
            textAlign: 'center',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(62,134,215,0.9)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ flexShrink: 0 }}
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <circle cx="12" cy="20" r="1" fill="rgba(62,134,215,0.9)" stroke="none" />
          </svg>
          <span>
            <strong style={{ color: 'rgba(62,134,215,0.9)' }}>{t('offlineMode')}</strong>
            {' — '}{t('offlineModeDownloadedOnly')}
          </span>
        </div>
      </div>
    );
  }

  // ─── Full-screen offline overlay (App Shell NOT cached) ───────────────────
  if (mode === 'fullscreen') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(10, 10, 10, 0.97)',
          backdropFilter: 'blur(8px)',
          padding: '2rem',
          textAlign: 'center',
        }}
        role="alert"
        aria-live="assertive"
      >
        {/* WiFi-off Icon */}
        <div style={{ marginBottom: '1.5rem' }}>
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="12" fill="rgba(239,68,68,0.15)" />
            <path
              d="M5 12.55a11 11 0 0 1 14.08 0"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M1.42 9A16 16 0 0 1 22.58 9"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M8.53 16.11a6 6 0 0 1 6.95 0"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="12" cy="20" r="1" fill="rgba(255,255,255,0.3)" />
            <line
              x1="3"
              y1="3"
              x2="21"
              y2="21"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#ffffff',
            marginBottom: '0.75rem',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {t('offlineNoConnection')}
        </h1>

        <p
          style={{
            fontSize: '0.95rem',
            color: 'rgba(255,255,255,0.55)',
            marginBottom: '2rem',
            maxWidth: '280px',
            lineHeight: 1.6,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {t('offlineConnectionRequired')}
        </p>

        <button
          onClick={handleRetry}
          disabled={isChecking}
          style={{
            backgroundColor: isChecking ? 'rgba(62,134,215,0.6)' : '#3E86D7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '0.85rem 2rem',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: isChecking ? 'default' : 'pointer',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'background-color 0.2s ease, transform 0.1s ease',
            transform: isChecking ? 'scale(0.97)' : 'scale(1)',
            minWidth: '180px',
            justifyContent: 'center',
          }}
        >
          {isChecking ? (
            <>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ animation: 'spin 0.8s linear infinite' }}
                aria-hidden="true"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Verbinde…
            </>
          ) : (
            <>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-5.5" />
              </svg>
              {t('retry')}
            </>
          )}
        </button>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return null;
}
