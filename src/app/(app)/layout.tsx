'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
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
    try {
      window.localStorage.removeItem('CBX_AUTH_V1');
      window.sessionStorage.removeItem('CBX_AUTH_V1');
    } catch {}
    logout();
  };

  const title = useMemo(() => {
    if (!pathname) return 'CBX';
    if (pathname.startsWith('/home')) return 'Home';
    if (pathname.startsWith('/stock')) return 'Stock';
    if (pathname.startsWith('/drive')) return 'Share';
    return 'CBX';
  }, [pathname]);

  return (
    <CartProvider>
      <CartUIProvider>
        <div className="min-h-screen bg-background text-foreground">
          <CartDrawerMount />
          {/* App shell header (Topbar). Section-level heroes live inside pages, not here. */}
          <header
            className={`sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm ${withLeftNav}`}
          >
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

          {/* Fixed left rail (md+ & logged in) */}
          {mounted && showLeftNavigation ? <LeftNavigation /> : null}

          {/* Content */}
          <div className={`w-full ${withLeftNav}`}>
            <main className="min-w-0 w-full">
              <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300">
                {children}
              </div>
            </main>
          </div>
        </div>
      </CartUIProvider>
    </CartProvider>
  );
}

// Right‑side cart drawer mounted once for the entire app
function CartDrawerMount() {
  const { isOpen, close } = useCartUI();
  const { items, total, removeItem, clear } = useCart();

  // Import moved here to keep it local to this component
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Link = require('next/link').default;

  return (
    <Sheet open={isOpen} onOpenChange={(v) => (v ? null : close())}>
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
            <div className="text-sm text-muted-foreground">Your cart is empty.</div>
          ) : (
            <div className="space-y-3">
              {items.map((it) => (
                <div key={`${it.id}:${it.license ?? ''}`} className="flex gap-3 rounded-xl border p-3">
                  <div className="relative h-14 w-20 overflow-hidden rounded-lg bg-muted">
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
            <span className="font-semibold tabular-nums">{formatMoneyEUR(total)}</span>
          </div>

          <div className="mt-3 grid gap-2">
            <Button asChild disabled={items.length === 0}>
              <Link href="/stock/cart">View cart</Link>
            </Button>
            <Button variant="secondary" disabled>
              Checkout (prototype)
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function formatMoneyEUR(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(v || 0);
}
