'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Trash2, X } from 'lucide-react';

import { LeftNavigation } from '@/components/left-navigation';
import { Topbar } from '@/components/topbar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { CartProvider, CartUIProvider, useCart, useCartUI } from '@/lib/cart/cart';
import { useProtoAuth } from '@/lib/proto-auth';

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isReady, isLoggedIn, user, logout } = useProtoAuth();

  // Avoid hydration mismatch for auth‑dependent UI
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Never show Files landing to logged-in users (avoid routing during render)
  useEffect(() => {
    if (!isReady || !pathname) return;
    if (isLoggedIn && pathname === '/drive/landing') {
      router.replace('/drive');
    }
  }, [isReady, isLoggedIn, pathname, router]);

  // Guard Team routes for logged-out users
  useEffect(() => {
    if (!isReady || !pathname) return;
    if (!isLoggedIn && pathname.startsWith('/team')) {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [isReady, isLoggedIn, pathname, router]);

  const showLeftNavigation = mounted && isReady && isLoggedIn;

  // Left rail width (use rem so it scales with root font-size)
  const leftRailWidth = '4.5rem'; // ~72px
  const shellStyle = (showLeftNavigation
    ? ({ ['--app-left-rail' as any]: leftRailWidth } as CSSProperties)
    : undefined);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
      // ignore
    }

    router.replace('/drive/landing');
  }, [logout, router]);

  const title = useMemo(() => {
    if (!pathname) return 'CBX';
    if (pathname.startsWith('/home')) return 'Home';
    if (pathname.startsWith('/stock')) return 'Stock';
    if (pathname.startsWith('/drive')) return 'Files';
    if (pathname.startsWith('/team')) return 'Team';
    return 'CBX';
  }, [pathname]);

  return (
    <CartProvider>
      <CartUIProvider>
        <div className="min-h-screen bg-background text-foreground" style={shellStyle}>
          <script
            dangerouslySetInnerHTML={{
              __html: `(() => {
  try {
    const stored = localStorage.getItem('theme');
    const theme = stored || 'dark';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    }
  } catch {}
})();`,
            }}
          />
          <CartDrawerMount />

          <div className="md:flex md:min-h-screen">
            {/* Left rail */}
            {mounted && showLeftNavigation ? (
              <aside className="cbx-left-rail hidden md:block w-[var(--app-left-rail)] shrink-0 bg-background">
                <div className="sticky top-0 h-screen overflow-y-auto">
                  <LeftNavigation />
                </div>
              </aside>
            ) : null}

            {/* Right column: Topbar + content */}
            <div className="min-w-0 flex-1 bg-background">
              {/* App shell header (Topbar). Section-level heroes live inside pages, not here. */}
              <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50">
                {mounted ? (
                  <Topbar
                    title={title}
                    showProductSwitcher
                    isLoggedIn={isLoggedIn}
                    user={user ?? undefined}
                    onLogin={() =>
                      router.push(`/login?returnTo=${encodeURIComponent(pathname ?? '/home')}`)
                    }
                    onLogout={handleLogout}
                  />
                ) : (
                  <div className="h-14" aria-hidden="true" />
                )}
              </header>

              <main className="min-w-0 w-full">
                <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200">
                  {children}
                </div>
              </main>
            </div>
          </div>

          <style jsx global>{`
            /* Ensure LeftNavigation can live in normal flow so it pushes the right column */
            .cbx-left-rail > * > * {
              position: static !important;
              inset: auto !important;
            }
          `}</style>
        </div>
      </CartUIProvider>
    </CartProvider>
  );
}

// Right‑side cart drawer mounted once for the entire app
function CartDrawerMount() {
  const router = useRouter();
  const { isOpen, close } = useCartUI();
  const { items, total, removeItem, clear } = useCart();

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      <SheetContent side="right" className="w-[380px] sm:w-[420px] p-0">
        <SheetTitle className="sr-only">Cart</SheetTitle>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-semibold">Cart</div>
          <div className="flex items-center gap-2">
            {items.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={clear}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            ) : null}
            <Button variant="ghost" size="icon" onClick={close} aria-label="Close cart">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="px-4 py-4">
          {items.length === 0 ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Your cart is empty.</div>
              <Button
                onClick={() => {
                  close();
                  router.push('/stock');
                }}
              >
                Browse Stock
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((it) => (
                <div
                  key={`${it.id}:${it.license ?? ''}`}
                  className="flex gap-3 rounded-xl border border-border/60 bg-background/40 p-3"
                >
                  <div className="relative h-14 w-20 overflow-hidden rounded-lg bg-muted ring-1 ring-border/30">
                    {it.image ? (
                      <Image src={it.image} alt={it.title} fill className="object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{it.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {it.license === 'paygo10' ? 'Pay & Go 10' : 'Single image'} · Qty {it.qty} ·{' '}
                      {formatMoneyEUR(it.price)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(it.id, it.license)}
                    aria-label="Remove item"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-auto border-t px-4 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold tabular-nums" aria-live="polite">
              {formatMoneyEUR(total)}
            </span>
          </div>

          <div className="mt-3 grid gap-2">
            <Button
              disabled={items.length === 0}
              onClick={() => {
                if (items.length === 0) return;
                close();
                router.push('/stock/cart');
              }}
            >
              View cart
            </Button>

            <Button
              variant="secondary"
              disabled={items.length === 0}
              onClick={() => {
                if (items.length === 0) return;
                close();
                router.push('/stock/checkout');
              }}
            >
              Checkout
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function formatMoneyEUR(v: number) {
  return new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'EUR' }).format(v || 0);
}
