'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';
import { useProtoAuth } from '@/lib/proto-auth';
import { AuthGate } from '@/components/auth-gate';
import {
  ArrowRight,
  Sparkles,
  UploadCloud,
  Search,
  Clock,
  ShoppingCart,
  History,
  TrendingUp,
  Folder,
  Images,
} from 'lucide-react';

import NextImage from 'next/image';
import { ASSETS } from '@/lib/demo/assets';

const newsItems = [
  {
    date: '2026-01-13',
    title: 'Your dashboard is getting smarter',
    description: 'Home now remembers what you do (locally) so it can surface quick ways back to your work.',
    badge: 'Home',
  },
  {
    date: '2026-01-12',
    title: 'New Home & navigation',
    description: 'A new Home experience plus a simplified left navigation to switch between Share and Stock.',
    badge: 'UI',
  },
  {
    date: '2026-01-10',
    title: 'Prototype login flow',
    description: 'You can now log in/out in the prototype and keep your place with return-to routing.',
    badge: 'Auth',
  },
];

const suggestions = [
  {
    key: 'organize',
    title: 'Organize uploads',
    description: 'Keep “Campaign uploads” tidy with a folder + naming routine.',
    href: '/drive',
    icon: Folder,
  },
  {
    key: 'search',
    title: 'Find your next visual',
    description: 'Run a quick Stock search and save your query for later.',
    href: '/stock',
    icon: Images,
  },
];

const quickActions = [
  { label: 'Upload files', href: '/drive', hint: 'Start in Share', icon: UploadCloud },
  { label: 'Find images', href: '/stock', hint: 'Search Stock', icon: Search },
];

export default function HomePage() {
  const router = useRouter();
  const { user } = useProtoAuth();

  const [visitCount, setVisitCount] = useState<number>(0);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentViews, setRecentViews] = useState<string[]>([]);
  const [cartCount, setCartCount] = useState<number>(0);

  const [dailySeed, setDailySeed] = useState<string>('');

  const todayLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
    } catch {
      return new Date().toDateString();
    }
  }, []);

  const lastSeenLabel = useMemo(() => {
    if (!lastSeen) return null;
    try {
      return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(lastSeen));
    } catch {
      return lastSeen;
    }
  }, [lastSeen]);

  const LS_KEYS = useMemo(() => {
    return {
      visits: 'CBX_HOME_VISITS_V1',
      lastSeen: 'CBX_HOME_LAST_SEEN_V1',
      recentSearches: 'CBX_STOCK_RECENT_SEARCHES_V1',
      recentViews: 'CBX_RECENT_VIEWS_V1',
      cart: 'CBX_CART_COUNT_V1',
      daily: 'CBX_HOME_DAILY_SEED_V1',
    } as const;
  }, []);

  const lsGet = useCallback((key: string) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }, []);

  const lsSet = useCallback((key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }, []);

  const clampList = useCallback((items: string[], max = 6) => {
    return items.filter(Boolean).slice(0, max);
  }, []);

  useEffect(() => {
    // Visits + last seen
    const prevVisits = Number(lsGet(LS_KEYS.visits) ?? '0');
    const nextVisits = Number.isFinite(prevVisits) ? prevVisits + 1 : 1;
    lsSet(LS_KEYS.visits, String(nextVisits));
    setVisitCount(nextVisits);

    const prevSeen = lsGet(LS_KEYS.lastSeen);
    if (prevSeen) setLastSeen(prevSeen);
    lsSet(LS_KEYS.lastSeen, new Date().toISOString());

    // Recent searches
    const rsRaw = lsGet(LS_KEYS.recentSearches);
    const rs = rsRaw ? (JSON.parse(rsRaw) as string[]) : [];
    setRecentSearches(clampList(Array.isArray(rs) ? rs : []));

    // Recent views
    const rvRaw = lsGet(LS_KEYS.recentViews);
    const rv = rvRaw ? (JSON.parse(rvRaw) as string[]) : [];
    setRecentViews(clampList(Array.isArray(rv) ? rv : []));

    // Cart count
    const cc = Number(lsGet(LS_KEYS.cart) ?? '0');
    setCartCount(Number.isFinite(cc) ? cc : 0);

    // Daily seed (changes once per day)
    const today = new Date();
    const dayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`;
    const prevDaily = lsGet(LS_KEYS.daily);
    if (prevDaily !== dayKey) {
      lsSet(LS_KEYS.daily, dayKey);
      setDailySeed(dayKey);
    } else {
      setDailySeed(prevDaily ?? dayKey);
    }
  }, [LS_KEYS, clampList, lsGet, lsSet]);

  // Demo images from the existing demo asset list
  const heroSrcs = ASSETS.slice(0, 12)
    .map((a) => (a as any).preview ?? (a as any).src ?? (a as any).url)
    .filter(Boolean) as string[];

  const shareThumb = heroSrcs[0] ?? '/placeholders/stock_1.jpg';
  const stockThumb = heroSrcs[1] ?? '/placeholders/stock_2.jpg';
  const driveMarquee = useMemo(() => heroSrcs.slice(0, 10), [heroSrcs]);

  // Thumbnail helpers
  const thumbPool = useMemo(() => heroSrcs.slice(0, 10), [heroSrcs]);

  const getThumb = useCallback(
    (seed: string, offset = 0) => {
      if (!thumbPool.length) return null;
      let h = 0;
      const s = `${seed}:${offset}`;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return thumbPool[h % thumbPool.length] ?? null;
    },
    [thumbPool]
  );

  const ThumbStack = useCallback(
    ({ seed, count = 3 }: { seed: string; count?: number }) => {
      const items = Array.from({ length: count }).map((_, i) => getThumb(seed, i)).filter(Boolean) as string[];
      if (!items.length) return null;
      return (
        <div className="flex -space-x-2">
          {items.map((src, i) => (
            <div
              key={`${seed}-${i}`}
              className="relative h-7 w-7 overflow-hidden rounded-full ring-2 ring-background bg-muted"
              style={{ zIndex: 10 - i }}
            >
              <NextImage src={src} alt="" fill sizes="28px" className="object-cover" />
            </div>
          ))}
        </div>
      );
    },
    [getThumb]
  );

  const isReturning = visitCount >= 2;

  const greetingLine = useMemo(() => {
    if (!isReturning) return 'Let’s set up your flow — Share for uploads, Stock for visuals.';
    if (cartCount > 0) return `You’ve got ${cartCount} item${cartCount === 1 ? '' : 's'} waiting in your cart.`;
    if (recentSearches.length > 0) return `Pick up where you left off — your recent searches are ready.`;
    return 'Welcome back — here’s your quick way into today’s work.';
  }, [cartCount, isReturning, recentSearches.length]);

  const dailyNudge = useMemo(() => {
    if (!dailySeed) return null;
    // Deterministic “daily” hint without randomness
    const code = dailySeed.split('-').join('');
    const n = Number(code.slice(-2)) || 0;
    const pick = n % 3;
    if (pick === 0) return 'Daily tip: Name folders by campaign + date to keep Share clean.';
    if (pick === 1) return 'Daily tip: Save your best Stock search query as a habit.';
    return 'Daily tip: Add to cart as you browse — license when you’re ready.';
  }, [dailySeed]);

  const pushRecentSearch = useCallback(
    (q: string) => {
      const cleaned = q.trim();
      if (!cleaned) return;
      const next = clampList([cleaned, ...recentSearches.filter((s) => s !== cleaned)], 6);
      setRecentSearches(next);
      lsSet(LS_KEYS.recentSearches, JSON.stringify(next));
    },
    [LS_KEYS.recentSearches, clampList, lsSet, recentSearches]
  );

  const simulateDemoActivity = useCallback(() => {
    // Optional: seed the dashboard for demos if nothing exists yet
    const hasAny = recentSearches.length > 0 || recentViews.length > 0 || cartCount > 0;
    if (hasAny) return;

    const seededSearches = ['winter campaign', 'team portrait', 'minimal workspace'];
    const seededViews = ['COLOURBOX69824938', 'COLOURBOX34454367'];

    setRecentSearches(clampList(seededSearches));
    setRecentViews(clampList(seededViews));
    setCartCount(2);

    lsSet(LS_KEYS.recentSearches, JSON.stringify(clampList(seededSearches)));
    lsSet(LS_KEYS.recentViews, JSON.stringify(clampList(seededViews)));
    lsSet(LS_KEYS.cart, '2');
  }, [
    LS_KEYS.cart,
    LS_KEYS.recentSearches,
    LS_KEYS.recentViews,
    cartCount,
    clampList,
    lsSet,
    recentSearches.length,
    recentViews.length,
  ]);

  useEffect(() => {
    simulateDemoActivity();
  }, [simulateDemoActivity]);

  return (
    <AuthGate requireAuth redirectTo="/login">
      <div className="w-full space-y-8 overflow-x-clip">
        <section className="relative w-full overflow-hidden bg-background">
          {/* Soft background accents */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-foreground/5 blur-3xl" />
            <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-foreground/5 blur-3xl" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
          </div>

          <div className="relative px-4 py-5 sm:px-6 sm:py-6 lg:px-10">
            <div className="grid items-center gap-8 md:grid-cols-2">
              {/* Copy */}
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-muted/30 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Your dashboard</span>
                </div>

                <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Welcome{user?.name ? `, ${user.name}` : ''}
                </h1>

                <p className="mt-2 text-sm text-muted-foreground sm:text-base">{greetingLine}</p>

                <p className="mt-2 text-xs text-muted-foreground">
                  {todayLabel}
                  {visitCount ? ` • Visit #${visitCount}` : ''}
                  {lastSeenLabel ? ` • Last seen ${lastSeenLabel}` : ''}
                </p>

                {dailyNudge ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-muted/20 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>{dailyNudge}</span>
                  </div>
                ) : null}

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => router.push('/drive')}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition hover:bg-foreground/90 sm:w-auto"
                  >
                    Open Share <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => router.push('/stock')}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-muted/30 px-5 text-sm font-medium transition hover:bg-muted/40 sm:w-auto"
                  >
                    Open Stock <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Image previews */}
              <div className="md:block">
                {/* Mobile: horizontal preview strip */}
                <div className="md:hidden">
                  <div className="relative -mx-4 mt-8">
                    {/* Edge fades */}
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent" />

                    <div className="overflow-x-auto px-4">
                      <div className="flex snap-x snap-mandatory gap-3 pr-6">
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                          <div key={i} className="relative h-28 w-40 shrink-0 snap-start overflow-hidden rounded-xl bg-muted">
                            {heroSrcs[i] ? (
                              <NextImage
                                src={heroSrcs[i]}
                                alt="Preview"
                                fill
                                sizes="176px"
                                className="object-cover"
                                priority={i === 0}
                              />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 px-4 text-xs text-muted-foreground">Recent visuals from Stock — swipe to browse</div>
                </div>

                {/* Desktop: 3-column “masonry-ish” grid */}
                <div className="hidden md:block">
                  <div className="grid grid-cols-3 gap-3">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <div
                        key={i}
                        className={
                          i === 0
                            ? 'relative col-span-2 row-span-2 aspect-[4/3] overflow-hidden rounded-xl bg-muted'
                            : i === 1
                              ? 'relative aspect-[4/3] overflow-hidden rounded-xl bg-muted'
                              : 'relative aspect-[4/3] overflow-hidden rounded-xl bg-muted'
                        }
                      >
                        {heroSrcs[i] ? (
                          <NextImage
                            src={heroSrcs[i]}
                            alt="Preview"
                            fill
                            sizes="(min-width: 1024px) 34vw, (min-width: 768px) 45vw, 100vw"
                            className="object-cover"
                            priority={i === 0}
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">Recent visuals from Stock</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Newest uploads marquee */}
        <section className="mx-4 sm:mx-6 lg:mx-10">
          <div className="rounded-2xl bg-muted/10 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">Newest uploads in Drive</h2>
                <p className="mt-1 text-xs text-muted-foreground">A quick scroll of your latest files</p>
              </div>
              <button
                onClick={() => router.push('/drive')}
                className="inline-flex items-center gap-2 rounded-full bg-background/60 px-4 py-2 text-sm font-medium transition hover:bg-background/80"
              >
                Open Drive <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="relative mt-4 overflow-hidden">
              {/* Edge fades */}
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent" />

              <div className="cbx-marquee">
                <div className="cbx-marquee__track">
                  {[...driveMarquee, ...driveMarquee].map((src, idx) => (
                    <button
                      key={`${idx}-${src}`}
                      onClick={() => router.push('/drive')}
                      className="group relative flex shrink-0 items-center gap-3 rounded-2xl bg-background/60 p-2 pr-4 transition hover:bg-background/80"
                    >
                      <div className="relative h-12 w-16 overflow-hidden rounded-xl bg-muted">
                        <NextImage src={src} alt="" fill sizes="64px" className="object-cover" />
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="truncate text-sm font-medium">Upload {idx + 1}</div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">Drive • just now</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <style jsx>{`
                .cbx-marquee {
                  width: 100%;
                }
                .cbx-marquee__track {
                  display: flex;
                  gap: 12px;
                  width: max-content;
                  animation: cbx-marquee 28s linear infinite;
                  will-change: transform;
                }
                @keyframes cbx-marquee {
                  0% {
                    transform: translateX(0);
                  }
                  100% {
                    transform: translateX(-50%);
                  }
                }
                @media (prefers-reduced-motion: reduce) {
                  .cbx-marquee__track {
                    animation: none;
                  }
                }
              `}</style>
            </div>
          </div>
        </section>

        <div className="mx-4 sm:mx-6 lg:mx-10 h-px bg-border/60" />

        <div className="px-4 sm:px-6 lg:px-10 space-y-8">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Get started</h2>
            <p className="mt-1 text-xs text-muted-foreground">Choose where you want to begin</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <button
              onClick={() => router.push('/drive')}
              className="group relative overflow-hidden rounded-2xl bg-muted/20 p-6 ring-1 ring-border/60 text-left transition will-change-transform hover:-translate-y-0.5 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/70">
                  <Folder className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold leading-tight">Share</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Your folders, uploads and shared links</p>
                </div>
              </div>

              <div className="group relative my-5 aspect-[16/9] overflow-hidden rounded-xl bg-muted">
                <NextImage
                  src={shareThumb}
                  alt="Share preview"
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                Continue in Share — jump back to folders, uploads and team handoff.
              </p>

              <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-foreground">
                Continue <ArrowRight className="h-4 w-4" />
              </div>
            </button>

            <button
              onClick={() => router.push('/stock')}
              className="group relative overflow-hidden rounded-2xl bg-muted/20 p-6 ring-1 ring-border/60 text-left transition will-change-transform hover:-translate-y-0.5 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/70">
                  <Images className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold leading-tight">Stock</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Search, license and manage your cart</p>
                </div>
              </div>

              <div className="group relative my-5 aspect-[16/9] overflow-hidden rounded-xl bg-muted">
                <NextImage
                  src={stockThumb}
                  alt="Stock preview"
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                Continue in Stock — search fast, compare, add to cart, license when ready.
              </p>

              <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-foreground">
                Continue <ArrowRight className="h-4 w-4" />
              </div>
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Quick actions */}
            <section className="w-full rounded-2xl bg-muted/10 p-5">
              <div>
                <h2 className="text-sm font-semibold">Quick actions</h2>
                <p className="mt-1 text-xs text-muted-foreground">Jump to common tasks</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {quickActions.map((a) => (
                  <button
                    key={a.label}
                    onClick={() => router.push(a.href)}
                    className="group rounded-full bg-background/60 px-4 py-2 text-sm transition hover:bg-background/80"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-2 font-medium">
                          {a.icon ? <a.icon className="h-4 w-4" /> : null}
                          {a.label}
                        </span>
                        <div className="mt-0.5 text-xs text-muted-foreground">{a.hint}</div>
                      </div>
                      <ThumbStack seed={`qa:${a.label}`} />
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Recent activity */}
            <section className="w-full rounded-2xl bg-muted/10 p-5">
              <div>
                <h2 className="text-sm font-semibold">Recent activity</h2>
                <p className="mt-1 text-xs text-muted-foreground">A quick snapshot from your local prototype</p>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-background/60 p-4 transition hover:bg-background/80">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground">Last seen</div>
                      <ThumbStack seed="last-seen" />
                    </div>
                    <div className="mt-1 font-medium">{lastSeenLabel ? lastSeenLabel : 'First visit today'}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{visitCount ? `Visit #${visitCount}` : '—'}</div>
                  </div>

                  <div className="rounded-xl bg-background/60 p-4 transition hover:bg-background/80">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground">Cart</div>
                      <ThumbStack seed="cart" />
                    </div>
                    <div className="mt-1 font-medium">
                      {cartCount ? `${cartCount} item${cartCount === 1 ? '' : 's'}` : 'Empty'}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">Add as you browse — license when ready</div>
                  </div>
                </div>

                <div className="rounded-xl bg-background/60 p-4 transition hover:bg-background/80">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground">Recent Stock searches</div>
                    <span className="text-xs text-muted-foreground">Local</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Visual inspiration</span>
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                      <span>based on your activity</span>
                    </div>
                    <div className="flex -space-x-2">
                      {[0, 1, 2, 3, 4].map((i) => {
                        const src = getThumb('searches', i);
                        if (!src) return null;
                        return (
                          <div key={i} className="relative h-6 w-6 overflow-hidden rounded-full ring-2 ring-background bg-muted">
                            <NextImage src={src} alt="" fill sizes="24px" className="object-cover" />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {recentSearches.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {recentSearches.map((q) => (
                        <button
                          key={q}
                          onClick={() => {
                            pushRecentSearch(q);
                            router.push(`/stock?q=${encodeURIComponent(q)}`);
                          }}
                          className="rounded-full bg-muted/30 px-3 py-1 text-xs text-foreground transition hover:bg-muted/40"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-muted-foreground">
                      No searches yet — open Stock and try a query like “winter campaign”.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <section className="w-full rounded-2xl bg-muted/10 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">Suggested next</h2>
                <p className="mt-1 text-xs text-muted-foreground">Small steps that keep your workspace clean</p>
              </div>
              <div className="text-xs text-muted-foreground">For you</div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {suggestions.map((s) => (
                <button
                  key={s.key}
                  onClick={() => router.push(s.href)}
                  className="group rounded-xl bg-background/60 p-4 text-left transition hover:bg-background/80"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/30">
                        <s.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium">{s.title}</div>
                        <div className="mt-0.5 text-sm text-muted-foreground">{s.description}</div>
                      </div>
                    </div>
                    <ThumbStack seed={`suggest:${s.key}`} />
                  </div>
                  <div className="mt-3 inline-flex items-center gap-2 text-sm font-medium">
                    Open <ArrowRight className="h-4 w-4" />
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="w-full rounded-2xl bg-muted/10 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">Recently viewed</h2>
                <p className="mt-1 text-xs text-muted-foreground">A quick way back to visuals you opened</p>
              </div>
              <div className="text-xs text-muted-foreground">Local history</div>
            </div>

            {recentViews.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {recentViews.map((id) => (
                  <button
                    key={id}
                    onClick={() => router.push(`/stock?q=${encodeURIComponent(id)}`)}
                    className="inline-flex items-center gap-2 rounded-full bg-background/60 px-4 py-2 text-sm transition hover:bg-background/80"
                  >
                    {(() => {
                      const src = getThumb(`view:${id}`, 0);
                      return src ? (
                        <span className="relative h-6 w-6 overflow-hidden rounded-full bg-muted ring-2 ring-background">
                          <NextImage src={src} alt="" fill sizes="24px" className="object-cover" />
                        </span>
                      ) : null;
                    })()}
                    <Images className="h-4 w-4" />
                    <span className="font-medium">{id}</span>
                    <span className="text-xs text-muted-foreground">Open in Stock</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-xl bg-background/60 p-4 text-sm text-muted-foreground">
                Nothing viewed yet. Browse Stock and this area will start to fill up.
              </div>
            )}
          </section>

          <section id="news" className="w-full rounded-2xl bg-muted/10 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">What’s new</h2>
                <p className="mt-1 text-sm text-muted-foreground">Updates and changes across Share and Stock.</p>
              </div>
              <div className="text-xs text-muted-foreground">Latest updates</div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {newsItems.map((item) => (
                <article
                  key={`${item.date}-${item.title}`}
                  className="rounded-xl bg-background/60 p-4 transition hover:bg-background/80"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <time className="text-xs text-muted-foreground">{item.date}</time>
                      {item.badge ? (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{item.badge}</span>
                      ) : null}
                    </div>
                    <div className="hidden sm:block">
                      <ThumbStack seed={`news:${item.title}`} />
                    </div>
                  </div>
                  <h3 className="mt-2 font-medium">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AuthGate>
  );
}