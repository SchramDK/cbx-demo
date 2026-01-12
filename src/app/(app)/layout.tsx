'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Topbar } from '@/components/topbar';
import { LeftNavigation } from '@/components/left-navigation';
import { useProtoAuth } from '@/lib/proto-auth';
import { CartProvider } from '@/lib/cart/cart-context';

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isReady, isLoggedIn, user, logout } = useProtoAuth();

  // Never show Share landing to logged-in users (avoid routing during render)
  useEffect(() => {
    if (!isReady || !pathname) return;
    if (isLoggedIn && pathname === '/drive/landing') {
      router.replace('/drive');
    }
  }, [isReady, isLoggedIn, pathname, router]);

  const showLeftNavigation = isReady && isLoggedIn;
  const withLeftNav = showLeftNavigation ? 'md:pl-20' : '';

  const handleLogout = () => {
    // Clear demo auth flag used by some routes/components
    try {
      window.localStorage.removeItem('CBX_AUTH_V1');
      window.sessionStorage.removeItem('CBX_AUTH_V1');
    } catch {
      // ignore
    }

    logout();
  };

  const title = (() => {
    if (!pathname) return 'CBX';
    if (pathname.startsWith('/home')) return 'Home';
    if (pathname.startsWith('/stock')) return 'Stock';
    if (pathname.startsWith('/drive')) return 'Share';
    return 'CBX';
  })();

  return (
    <CartProvider>
      <div className="min-h-screen bg-background text-foreground">
        {/* App shell header (Topbar). Section-level heroes live inside pages, not here. */}
        <header
          className={`sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm ${withLeftNav}`}
        >
          <Topbar
            title={title}
            showProductSwitcher
            isLoggedIn={isLoggedIn}
            user={user ?? undefined}
            onLogin={() => router.push(`/login?returnTo=${encodeURIComponent(pathname ?? '/home')}`)}
            onLogout={handleLogout}
          />
        </header>

        {/* Fixed left rail (md+ & logged in) */}
        {showLeftNavigation ? <LeftNavigation /> : null}

        {/* Content */}
        <div className={`w-full ${withLeftNav}`}>
          <main className="min-w-0 w-full">
            <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300">
              {children}
            </div>
          </main>
        </div>
      </div>
    </CartProvider>
  );
}
