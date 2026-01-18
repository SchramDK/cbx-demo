'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Check, Trash2, X } from 'lucide-react';

import { LeftNavigation } from '@/components/left-navigation';
import { Topbar } from '@/components/topbar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { CartProvider, CartUIProvider, useCart, useCartUI } from '@/lib/cart/cart';
import { useProtoAuth } from '@/lib/proto-auth';
import { PROMOS, PROMO_STORAGE_KEYS } from '@/lib/promos/promos';

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
          <PromosHost mounted={mounted} pathname={pathname ?? ''} isLoggedIn={Boolean(isLoggedIn)} />

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

type PromoCandidate = {
  id: string;
  title: string;
  description?: string;
  ctaLabel: string;
  ctaHref: string;
  afterMs: number;
  priority: number;
  once: boolean;
  cooldownHours?: number;
  imageSrc?: string;
  imageAlt?: string;
  highlights?: string[];
  secondaryLabel?: string;
};

function getPlacementFromPath(pathname: string) {
  if (!pathname) return 'global' as const;
  if (pathname.startsWith('/team')) return 'team' as const;
  if (pathname.startsWith('/drive')) return 'drive' as const;
  if (pathname.startsWith('/stock')) return 'stock' as const;
  return 'global' as const;
}

function readNumberSafe(key: string) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function PromosHost({
  mounted,
  pathname,
  isLoggedIn,
}: {
  mounted: boolean;
  pathname: string;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = useState<PromoCandidate | null>(null);
  const timerRef = useRef<number | null>(null);

  const placement = useMemo(() => getPlacementFromPath(pathname), [pathname]);

  useEffect(() => {
    if (!mounted) return;
    try {
      const key = PROMO_STORAGE_KEYS.visits(placement);
      const current = readNumberSafe(key);
      window.localStorage.setItem(key, String(current + 1));
    } catch {
      // ignore
    }
  }, [mounted, placement, pathname]);

  const candidate = useMemo<PromoCandidate | null>(() => {
    if (!mounted) return null;

    const now = Date.now();

    const matches = PROMOS.filter((p) => {
      // placement gating
      if (p.placement !== 'global' && p.placement !== placement) return false;

      // route gating
      if (p.when?.onRoute && !p.when.onRoute.test(pathname)) return false;

      // targeting
      if (typeof p.target?.loggedIn === 'boolean' && p.target.loggedIn !== isLoggedIn) return false;

      // visits gating
      if (p.when?.minVisits && p.when.minVisits > 1) {
        const v = readNumberSafe(PROMO_STORAGE_KEYS.visits(placement));
        if (v < p.when.minVisits) return false;
      }

      // caps
      const seenKey = PROMO_STORAGE_KEYS.seen(p.id);
      const lastKey = PROMO_STORAGE_KEYS.lastShown(p.id);

      if (p.cap?.once) {
        try {
          if (window.localStorage.getItem(seenKey) === '1') return false;
        } catch {
          // ignore
        }
      }

      if (p.cap?.cooldownHours) {
        const last = readNumberSafe(lastKey);
        if (last > 0) {
          const cooldownMs = p.cap.cooldownHours * 60 * 60 * 1000;
          if (now - last < cooldownMs) return false;
        }
      }

      return true;
    })
      .map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        ctaLabel: p.ctaLabel,
        ctaHref: p.ctaHref,
        afterMs: p.when?.afterMs ?? 0,
        priority: p.priority ?? 0,
        once: Boolean(p.cap?.once),
        cooldownHours: p.cap?.cooldownHours,
        imageSrc: (p as any).imageSrc,
        imageAlt: (p as any).imageAlt,
        highlights: (p as any).highlights,
        secondaryLabel: (p as any).secondaryLabel,
      }))
      .sort((a, b) => b.priority - a.priority);

    return matches[0] ?? null;
  }, [mounted, placement, pathname, isLoggedIn]);

  useEffect(() => {
    if (!mounted) return;

    // Clear any pending timer when route/candidate changes
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setActive(null);

    if (!candidate) return;

    timerRef.current = window.setTimeout(() => {
      setActive(candidate);
      timerRef.current = null;
      try {
        window.localStorage.setItem(PROMO_STORAGE_KEYS.lastShown(candidate.id), String(Date.now()));
      } catch {
        // ignore
      }
    }, Math.max(0, candidate.afterMs));

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [mounted, candidate]);

  const dismiss = useCallback(
    (id: string) => {
      setActive(null);
      try {
        window.localStorage.setItem(PROMO_STORAGE_KEYS.seen(id), '1');
        window.localStorage.setItem(PROMO_STORAGE_KEYS.lastShown(id), String(Date.now()));
      } catch {
        // ignore
      }
    },
    [setActive]
  );

  if (!active) return null;

  return (
    <PromoModal
      title={active.title}
      description={active.description}
      ctaLabel={active.ctaLabel}
      imageSrc={active.imageSrc}
      imageAlt={active.imageAlt}
      highlights={active.highlights}
      secondaryLabel={active.secondaryLabel}
      onClose={() => dismiss(active.id)}
      onCTA={() => {
        dismiss(active.id);
        router.push(active.ctaHref);
      }}
    />
  );
}

function PromoModal({
  title,
  description,
  ctaLabel,
  imageSrc,
  imageAlt,
  highlights,
  secondaryLabel,
  onCTA,
  onClose,
}: {
  title: string;
  description?: string;
  ctaLabel: string;
  imageSrc?: string;
  imageAlt?: string;
  highlights?: string[];
  secondaryLabel?: string;
  onCTA: () => void;
  onClose: () => void;
}) {
  // Minimal, consistent modal styling (uses same visual language as Team modals)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-background ring-1 ring-border"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {imageSrc ? (
          <div className="relative h-44 w-full">
            <Image src={imageSrc} alt={imageAlt || ''} fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
          </div>
        ) : null}

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold">{title}</div>
              {description ? (
                <div className="mt-1 text-sm text-muted-foreground">{description}</div>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {highlights && highlights.length ? (
            <ul className="mt-4 space-y-2 text-sm">
              {highlights.map((h) => (
                <li key={h} className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted/40 ring-1 ring-border/60">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-foreground/90">{h}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-6 flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              {secondaryLabel || 'Not now'}
            </Button>
            <Button onClick={onCTA}>{ctaLabel}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatMoneyEUR(v: number) {
  return new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'EUR' }).format(v || 0);
}
