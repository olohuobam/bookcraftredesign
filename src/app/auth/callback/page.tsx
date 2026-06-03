"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";

/**
 * OAuth / Magic-Link callback handler.
 *
 * Uses onAuthStateChange to reliably detect when the session is ready,
 * instead of polling getSession() which can miss the timing.
 */
export default function AuthCallback() {
  const router = useRouter();
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get redirect target from sessionStorage (set by DashboardLayout before redirecting to '/')
    // Read and clear once here so all code paths share the same value (prevents race where
    // the first router.push consumes the entry and subsequent calls fall back to /dashboard).
    const storedRedirect = typeof window !== 'undefined' ? sessionStorage.getItem('auth_redirect') : null;
    if (storedRedirect) sessionStorage.removeItem('auth_redirect');

    // Validate: accept only same-origin relative paths starting with /dashboard to prevent open redirect.
    const redirectTarget =
      storedRedirect && /^\/dashboard(\/|$)/.test(storedRedirect)
        ? storedRedirect
        : '/dashboard';

    // Listen for auth state changes — this fires when supabase-js
    // finishes processing the OAuth callback (PKCE or implicit)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === "SIGNED_IN" && session) {
        router.push(redirectTarget);
      }
    });

    // Also try PKCE exchange explicitly + fallback check
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error("PKCE exchange failed:", exchangeError.message);
          // Don't bail — onAuthStateChange or getSession may still work
        }
      }

      // Fallback: check if session is already available
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.push(redirectTarget);
        return;
      }

      // Give onAuthStateChange 5s to fire, then show error
      setTimeout(async () => {
        const { data: retry } = await supabase.auth.getSession();
        if (retry.session) {
          router.push(redirectTarget);
        } else {
          setError(t('loginFailedRetry'));
        }
      }, 5000);
    })();

    return () => subscription.unsubscribe();
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-4">
        <p className="text-destructive">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          {t('backToHomepage')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="text-muted-foreground">Logging in…</p>
      </div>
    </div>
  );
}
