// components/auth-gate.tsx
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useProtoAuth } from '@/lib/proto-auth';
import { useEffect } from 'react';

export function AuthGate({
  children,
  requireAuth,
  redirectTo,
  whenAuthenticatedRedirectTo,
}: {
  children: React.ReactNode;
  requireAuth: boolean;
  redirectTo: string;
  whenAuthenticatedRedirectTo?: string;
}) {
  const { isReady, isLoggedIn } = useProtoAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isReady) return;

    // Private page: user must be logged in
    if (requireAuth && !isLoggedIn) {
      if (pathname !== redirectTo) {
        router.replace(redirectTo);
      }
      return;
    }

    // Public page: redirect logged-in users away (e.g. landing → app)
    if (!requireAuth && isLoggedIn && whenAuthenticatedRedirectTo) {
      if (pathname !== whenAuthenticatedRedirectTo) {
        router.replace(whenAuthenticatedRedirectTo);
      }
    }
  }, [isReady, isLoggedIn, requireAuth, redirectTo, whenAuthenticatedRedirectTo, pathname, router]);

  if (!isReady) return null;
  if (requireAuth && !isLoggedIn) return null;
  if (!requireAuth && isLoggedIn && whenAuthenticatedRedirectTo) return null;

  return <>{children}</>;
}