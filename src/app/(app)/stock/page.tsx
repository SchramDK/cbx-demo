'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCart, useCartUI } from '@/lib/cart/cart';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, Search, Sparkles, X } from 'lucide-react';

import { STOCK_ASSETS as ASSETS, STOCK_FEATURED_IDS } from '@/lib/demo/stock-assets';
import { useProtoAuth } from '@/lib/proto-auth';

import ImageCard from '@/components/stock/ImageCard';

type Asset = {
  id: string;
  title: string;
  description?: string;
  keywords?: string[];
  preview?: string;
  src?: string;
  image?: string;
  url?: string;
};

type LastSeenItem = { id: string; title: string; img: string; ts: number };
const LAST_SEEN_KEY = 'CBX_STOCK_LAST_SEEN_V1';

function safeParseLastSeen(raw: string | null): LastSeenItem[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v
      .map((x) => ({
        id: String(x?.id ?? ''),
        title: String(x?.title ?? ''),
        img: String(x?.img ?? ''),
        ts: Number(x?.ts ?? 0),
      }))
      .filter((x) => x.id && x.img)
      .sort((a, b) => b.ts - a.ts);
  } catch {
    return [];
  }
}

const getAssetImage = (asset?: Asset) => asset?.preview ?? asset?.src ?? asset?.image ?? asset?.url ?? '';
const getImage = (asset: Asset, fallback: string) => getAssetImage(asset) || fallback;
const isLocalDemoImage = (src: string) => src.startsWith('/demo/');

// --- Seeded RNG and shuffle helpers for per-visit randomization ---
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(input: T[], seed: number): T[] {
  if (input.length <= 1) return input.slice();
  const rand = mulberry32(seed);
  const arr = input.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex select-none items-center rounded-full bg-muted/20 px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border/15 transition hover:bg-muted/35 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/25">
      {children}
    </span>
  );
}

function AddToCartOverlayButton({
  onClick,
  disabled,
  label,
}: {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`absolute right-2 top-2 z-10 inline-flex items-center rounded-full bg-background/90 px-3 py-1 text-[11px] font-medium text-foreground ring-1 ring-black/5 shadow-sm backdrop-blur transition dark:ring-white/10 ${
        disabled
          ? 'opacity-60 cursor-default'
          : 'hover:bg-background focus:outline-none focus:ring-2 focus:ring-foreground/25'
      }`}
      aria-label={label ?? 'Add to cart'}
    >
      {label ?? 'Add'}
    </button>
  );
}

type AssetCardVariant = 'compact' | 'grid';

type AssetCardProps = {
  asset: Asset;
  href: string;
  imageSrc: string;
  variant?: AssetCardVariant;
  badge?: string;
  onAdd: () => void;
  inCart?: boolean;
};

function AssetCard({ asset, href, imageSrc, variant = 'grid', badge, onAdd, inCart = false }: AssetCardProps) {
  const frameClass =
    variant === 'compact'
      ? 'h-28 w-44'
      : 'block';

  const mediaClass = variant === 'compact' ? '' : 'relative';

  const aspectClass =
    variant === 'compact'
      ? 'absolute inset-0'
      : 'relative aspect-[4/3] w-full overflow-hidden';

  const imageSizes = variant === 'compact' ? '176px' : '(min-width: 1024px) 220px, (min-width: 640px) 30vw, 45vw';

  return (
    <Link
      href={href}
      className={
        variant === 'compact'
          ? `group relative ${frameClass} shrink-0 snap-start overflow-hidden rounded-xl bg-muted/20 ring-1 ring-black/5 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-muted/30 hover:ring-black/10 focus:outline-none focus:ring-2 focus:ring-foreground/25 dark:ring-white/10 dark:hover:ring-white/20`
          : `group relative ${frameClass} overflow-hidden rounded-xl bg-muted/10 transition hover:bg-muted/20 focus:outline-none focus:ring-2 focus:ring-foreground/20`
      }
    >
      <AddToCartOverlayButton
        disabled={inCart}
        label={inCart ? 'In cart' : 'Add'}
        onClick={(e) => {
          if (inCart) return;
          e.preventDefault();
          e.stopPropagation();
          onAdd();
        }}
      />

      <div className={variant === 'compact' ? 'absolute inset-0' : ''}>
        {variant === 'compact' ? (
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              <div className="line-clamp-1 text-xs font-medium text-white/95">{asset.title}</div>
              <div className="ml-2 shrink-0 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-black">
                View
              </div>
            </div>
          </div>
        ) : null}

        {variant === 'compact' ? null : (
          <div className={aspectClass}>
            <Image
              src={imageSrc}
              alt={asset.title}
              fill
              sizes={imageSizes}
              unoptimized={isLocalDemoImage(imageSrc)}
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        )}

        {variant === 'compact' ? (
          <Image
            src={imageSrc}
            alt={asset.title}
            fill
            sizes={imageSizes}
            unoptimized={isLocalDemoImage(imageSrc)}
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.06]"
          />
        ) : null}
      </div>

      {variant === 'grid' ? (
        <div className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="line-clamp-1 text-sm font-medium">{asset.title}</div>
            {badge ? (
              <span className="shrink-0 rounded-md bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">{badge}</span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {(asset.keywords ?? []).slice(0, 3).map((k) => (
              <span key={k} className="rounded-full bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">
                {k}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </Link>
  );
}

export default function StockPage() {
  const router = useRouter();
  const { isReady, isLoggedIn } = useProtoAuth();
  const loggedIn = isReady && isLoggedIn;

  const cart = useCart() as any;
  const { open: openCart } = useCartUI();

  const assets = useMemo(() => ASSETS as Asset[], []);

  // Per-visit seed for shuffling.
  // IMPORTANT: set after mount to avoid SSR/CSR hydration mismatches.
  const [visitSeed, setVisitSeed] = useState<number | null>(null);
  const shuffleReady = visitSeed !== null;

  useEffect(() => {
    try {
      const buf = new Uint32Array(1);
      window.crypto.getRandomValues(buf);
      setVisitSeed(buf[0] || Math.floor(Math.random() * 1e9));
    } catch {
      setVisitSeed(Math.floor(Math.random() * 1e9));
    }
  }, []);

  const shuffledAssets = useMemo(
    () => (visitSeed == null ? assets : shuffleWithSeed(assets, visitSeed)),
    [assets, visitSeed]
  );

  const fallbackImage = useMemo(() => {
    const first = assets[0];
    return getAssetImage(first) ?? '';
  }, [assets]);

  const cartIds = useMemo(() => {
    const ids = new Set<string>();
    const items = (cart?.items ?? []) as any[];
    for (const it of items) {
      const id = (it?.id ?? it?.assetId ?? it?.asset?.id ?? '').toString();
      if (id) ids.add(id);
    }
    return ids;
  }, [cart?.items]);

  const addToCart = useCallback(
    (asset: Asset) => {
      if (cartIds.has(asset.id)) {
        // Already in cart — just open cart UI.
        if (typeof openCart === 'function') openCart();
        return;
      }

      const img = getImage(asset, fallbackImage);

      const payload: any = {
        id: asset.id,
        assetId: asset.id,
        title: asset.title,
        name: asset.title,
        license: 'single',
        price: 7.99,
        image: img,
        preview: img,
        qty: 1,
        quantity: 1,
        asset,
      };

      const fn = cart?.addItem ?? cart?.addAsset ?? cart?.add;
      if (typeof fn === 'function') fn(payload);

      if (typeof openCart === 'function') openCart();
    },
    [cart, cartIds, openCart, fallbackImage]
  );

  const [q, setQ] = useState('');
  const [heroIndex, setHeroIndex] = useState(0);
  const [lastSeen, setLastSeen] = useState<LastSeenItem[]>([]);

  const featured = useMemo(() => {
    // If we have configured featured ids, keep them on top but vary the remainder per visit.
    const byId = new Map(assets.map((a) => [a.id, a] as const));
    const picked = STOCK_FEATURED_IDS.map((id) => byId.get(id)).filter(Boolean) as Asset[];

    const base = shuffleReady ? shuffledAssets : assets;
    const pickedIds = new Set(picked.map((p) => p.id));
    const rest = base.filter((a) => !pickedIds.has(a.id));

    return [...picked, ...rest].slice(0, 10);
  }, [assets, shuffledAssets, shuffleReady]);

  const newest = useMemo(() => (shuffleReady ? shuffledAssets : assets).slice(0, 12), [assets, shuffledAssets, shuffleReady]);

  const heroImages = useMemo(() => {
    // Use a wider pool (shuffled) so the hero varies per visit, but keep it stable while on page.
    const pool = shuffleReady ? shuffledAssets : assets;
    const list = pool.slice(0, 8).map((a) => getImage(a, fallbackImage)).filter(Boolean);
    return list.length > 1 ? list : fallbackImage ? [fallbackImage, fallbackImage] : [];
  }, [assets, shuffledAssets, shuffleReady, fallbackImage]);

  const heroSources = useMemo(() => {
    const fallback = featured.slice(0, 1).map((a) => getImage(a, fallbackImage));
    return (heroImages.length ? heroImages : fallback).filter(Boolean);
  }, [featured, fallbackImage, heroImages]);

  useEffect(() => {
    setHeroIndex(0);
  }, [heroImages.join('|')]);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const id = window.setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroImages.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [heroImages.length]);

  useEffect(() => {
    if (!loggedIn) {
      setLastSeen([]);
      return;
    }
    try {
      const raw = window.localStorage.getItem(LAST_SEEN_KEY);
      setLastSeen(safeParseLastSeen(raw).slice(0, 10));
    } catch {
      setLastSeen([]);
    }
  }, [loggedIn]);

  const pushOrLogin = useCallback(
    (href: string) => {
      router.push(loggedIn ? href : `/login?returnTo=${encodeURIComponent(href)}`);
    },
    [router, loggedIn]
  );

  const buildSearchHref = useCallback((query: string) => {
    const trimmed = query.trim();
    return trimmed ? `/stock/search?q=${encodeURIComponent(trimmed)}` : '/stock/search';
  }, []);

  return (
    <div className="w-full">
      {/* Hero */}
      <section className="relative mb-10 flex min-h-[60vh] items-center overflow-hidden">
        <div className="absolute inset-0">
          {heroSources.map((src, idx) => (
            <Image
              key={`${src}-${idx}`}
              src={src}
              alt="Stock hero"
              fill
              sizes="100vw"
              unoptimized={isLocalDemoImage(String(src))}
              className={`object-cover transition-opacity duration-[1400ms] ease-out ${
                idx === heroIndex ? 'opacity-100' : 'opacity-0'
              }`}
              priority={idx === 0}
            />
          ))}
          <div className="absolute inset-0 bg-black/25" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/55 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>

        <div className="relative w-full px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto max-w-3xl rounded-3xl border border-border/20 bg-background/55 p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.45)] backdrop-blur sm:p-8">
              <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/20 bg-background/60 px-3 py-1 text-xs font-medium text-foreground/80 backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5" />
                  Curated stock library
                </span>
                <span className="inline-flex items-center rounded-full border border-border/20 bg-background/60 px-3 py-1 text-xs font-medium text-foreground/80 backdrop-blur">
                  Royalty-free
                </span>
                <span className="inline-flex items-center rounded-full border border-border/20 bg-background/60 px-3 py-1 text-xs font-medium text-foreground/80 backdrop-blur">
                  From €7.99
                </span>
              </div>

              <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
                Find the right visual
              </h1>

              <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-[15px]">
                {loggedIn
                  ? 'Search, preview, and license assets in seconds.'
                  : 'Browse a preview of our Stock library. Add to cart now — log in when you’re ready to license or checkout.'}
              </p>

              {/* Big search */}
              <form
                role="search"
                className="mx-auto mt-8 max-w-2xl"
                onSubmit={(e) => {
                  e.preventDefault();
                  router.push(buildSearchHref(q));
                }}
              >
                <div className="relative rounded-full bg-background/95 shadow-sm ring-1 ring-border/25 backdrop-blur transition hover:ring-border/35 focus-within:ring-2 focus-within:ring-foreground/25 dark:bg-background/70 overflow-hidden">
                  <div className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-muted/10 ring-1 ring-border/15">
                      <Search className="h-5 w-5 text-foreground" />
                    </div>
                  </div>

                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search images, people, places, concepts…"
                    className="relative z-0 h-14 w-full bg-transparent pl-[3.25rem] pr-[7.25rem] text-sm text-foreground placeholder:text-muted-foreground/80 outline-none"
                    autoComplete="off"
                  />

                  {q.trim().length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setQ('')}
                      className="absolute right-[5.5rem] top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-muted/25 text-muted-foreground ring-1 ring-border/15 transition hover:bg-muted/40 hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}

                  <button
                    type="submit"
                    disabled={!q.trim()}
                    className="absolute right-2 top-1/2 z-10 h-10 -translate-y-1/2 rounded-full bg-foreground px-5 text-sm font-medium text-background shadow-sm transition hover:-translate-y-[calc(50%+1px)] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Search
                  </button>
                </div>
              </form>

              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push('/stock/search')}
                  className="rounded-full bg-muted/25 px-4 py-2 text-xs font-medium text-muted-foreground ring-1 ring-border/15 transition hover:bg-muted/40 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/25"
                >
                  Browse all
                </button>
                <button
                  type="button"
                  onClick={() => pushOrLogin('/stock/collections')}
                  className="rounded-full bg-muted/25 px-4 py-2 text-xs font-medium text-muted-foreground ring-1 ring-border/15 transition hover:bg-muted/40 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/25"
                >
                  Collections
                </button>
              </div>

              {/* Trending */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                <span className="mr-1">Trending:</span>
                {['business', 'portrait', 'nature'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => router.push(buildSearchHref(t))}
                    className="rounded-full bg-muted/20 px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border/15 transition hover:bg-muted/35 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/25"
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Popular today */}
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs font-medium text-muted-foreground">Popular today</div>
                  <button
                    type="button"
                    onClick={() => router.push('/stock/search')}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    View more
                  </button>
                </div>

                <div className="relative -mx-4">
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background/60 to-transparent" />
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background/60 to-transparent" />
                  <div className="overflow-x-auto px-4">
                <div className="flex snap-x snap-mandatory gap-3 pr-6">
                  {featured.slice(0, 12).map((a) => {
                    const img = getImage(a, fallbackImage);
                    return (
                      <AssetCard
                        key={a.id}
                        asset={a}
                        href={`/stock/assets/${a.id}`}
                        imageSrc={img}
                        variant="compact"
                        onAdd={() => addToCart(a)}
                        inCart={cartIds.has(a.id)}
                      />
                    );
                  })}
                </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Continue browsing (logged in) */}
      {loggedIn && lastSeen.length > 0 ? (
        <section className="mb-10 px-4 sm:px-6 lg:px-10">
          <div className="rounded-2xl bg-muted/10 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-muted/20 ring-1 ring-border/15">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Continue browsing</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">Your last viewed assets</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  try {
                    window.localStorage.removeItem(LAST_SEEN_KEY);
                  } catch {}
                  setLastSeen([]);
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>

            <div className="relative mt-4 -mx-4 sm:-mx-6">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background/70 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background/70 to-transparent" />
              <div className="overflow-x-auto px-4 sm:px-6">
                <div className="flex snap-x snap-mandatory gap-3 pr-6">
                  {lastSeen.map((it) => (
                    <Link
                      key={it.id}
                      href={`/stock/assets/${it.id}`}
                      className="group relative h-28 w-44 shrink-0 snap-start overflow-hidden rounded-xl bg-muted/20 ring-1 ring-black/5 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-muted/30 hover:ring-black/10 focus:outline-none focus:ring-2 focus:ring-foreground/25 dark:ring-white/10"
                    >
                      <div className="absolute inset-0">
                        <Image
                          src={it.img}
                          alt={it.title}
                          fill
                          sizes="176px"
                          unoptimized={isLocalDemoImage(it.img)}
                          className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.06]"
                        />
                      </div>
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="line-clamp-1 text-xs font-medium text-white/95">{it.title}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Promo (logged out) */}
      {!loggedIn ? (
        <section className="mb-12 px-4 sm:px-6 lg:px-10">
          <Link
            href="/drive/landing"
            className="group relative block overflow-hidden rounded-3xl border border-black/5 bg-muted/10 p-6 transition hover:bg-muted/15 focus:outline-none focus:ring-2 focus:ring-foreground/20 dark:border-white/10 sm:p-8"
          >
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-foreground/5 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-foreground/5 blur-3xl" />
            </div>

            <div className="relative grid gap-6 sm:grid-cols-[1.2fr_0.8fr] sm:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-background/60 px-3 py-1 text-xs text-muted-foreground ring-1 ring-border/10 backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
                  New: Files
                </div>

                <h2 className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl">
                  Collect files from anyone — without the mess
                </h2>

                <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                  Create a share link, let people upload in seconds, and keep everything organized in one place.
                  Perfect for campaigns, events, and agencies working with many contributors.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
                    Upload links
                  </span>
                  <span className="inline-flex items-center rounded-full bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
                    Folders & structure
                  </span>
                  <span className="inline-flex items-center rounded-full bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
                    Brand-safe sharing
                  </span>
                </div>

                <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium">
                  Explore Files
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-background/60 ring-1 ring-border/10 backdrop-blur">
                <div className="p-4">
                  <div className="text-xs font-medium text-muted-foreground">What you get</div>
                  <ul className="mt-3 space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-foreground/60" />
                      <span>One link for uploads — no accounts needed</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-foreground/60" />
                      <span>Files land in folders, ready for your workflow</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-foreground/60" />
                      <span>Share safely with clear visibility & control</span>
                    </li>
                  </ul>
                </div>

                <div className="border-t border-black/5 p-4 text-xs text-muted-foreground dark:border-white/10">
                  Click to see the Files landing page
                </div>
              </div>
            </div>
          </Link>
        </section>
      ) : null}

      <div className="mb-12 h-px w-full bg-border/50" />

      {/* Featured */}
      <div id="featured" className="mb-12 px-4 sm:px-6 lg:px-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-sm font-semibold">Featured</h2>
            <p className="mt-1 text-xs text-muted-foreground">Hand-picked assets for common use cases.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/stock/search')}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            View all
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {featured.map((a) => {
            const img = getImage(a, fallbackImage);
            return (
              <ImageCard
                key={a.id}
                asset={{
                  id: a.id,
                  title: a.title,
                  preview: img,
                  category: 'Featured',
                }}
                href={`/stock/assets/${a.id}`}
                aspect="photo"
                onAddToCart={() => {
                  if (cartIds.has(a.id)) {
                    if (typeof openCart === 'function') openCart();
                    return;
                  }
                  addToCart(a);
                }}
                inCart={cartIds.has(a.id)}
              />
            );
          })}
        </div>
      </div>

      <div className="mb-12 h-px w-full bg-border/50" />

      {/* Collections preview */}
      <div id="collections" className="mb-12 px-4 sm:px-6 lg:px-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-sm font-semibold">Collections</h2>
            <p className="mt-1 text-xs text-muted-foreground">Curated sets to speed up your workflow.</p>
          </div>
          <button
            type="button"
            onClick={() => pushOrLogin('/stock/collections')}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            View all
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { title: 'Winter campaign', q: 'winter' },
            { title: 'Food & lifestyle', q: 'food' },
            { title: 'Business portraits', q: 'portrait' },
          ].map((c) => {
            const pick = assets.find((a) => (a.keywords ?? []).includes(c.q)) ?? featured[0];
            return (
              <Link
                key={c.title}
                href={`/stock/search?q=${encodeURIComponent(c.q)}`}
                className="group relative overflow-hidden rounded-xl bg-muted/10 transition hover:bg-muted/20 focus:outline-none focus:ring-2 focus:ring-foreground/20"
              >
                <AddToCartOverlayButton
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addToCart(pick);
                  }}
                />
                <div className="relative aspect-[16/9] w-full overflow-hidden">
                  {(() => {
                    const img = getImage(pick, fallbackImage);
                    return (
                      <Image
                        src={img}
                        alt={c.title}
                        fill
                        sizes="(min-width: 640px) 33vw, 100vw"
                        unoptimized={isLocalDemoImage(img)}
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    );
                  })()}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="text-sm font-medium">{c.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">Explore →</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mb-12 h-px w-full bg-border/50" />

      {/* New this week */}
      <div id="new" className="mb-12 px-4 sm:px-6 lg:px-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-sm font-semibold">New this week</h2>
            <p className="mt-1 text-xs text-muted-foreground">Fresh uploads, ready to license.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/stock/search')}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Browse
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {newest.map((a) => {
            const img = getImage(a, fallbackImage);
            return (
              <ImageCard
                key={a.id}
                asset={{
                  id: a.id,
                  title: a.title,
                  preview: img,
                  category: 'New',
                }}
                href={`/stock/assets/${a.id}`}
                aspect="wide"
                onAddToCart={() => {
                  if (cartIds.has(a.id)) {
                    if (typeof openCart === 'function') openCart();
                    return;
                  }
                  addToCart(a);
                }}
                inCart={cartIds.has(a.id)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}