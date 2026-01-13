'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { STOCK_ASSETS as ASSETS } from '@/lib/demo/stock-assets';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/cart/cart-context';
import { useProtoAuth } from '@/lib/proto-auth';

type Asset = {
  id: string;
  title: string;
  preview: string;
  category: string;
  description?: string;
  keywords?: string[];
  tags?: string[];
};

const getAssetImage = (asset?: Asset) => asset?.preview ?? '';

const normalizeToken = (s: string) => s.trim().toLowerCase();

const pickTags = (asset?: Asset, limit = 10) => {
  const fromTags = asset?.tags ?? [];
  const fromKeywords = asset?.keywords ?? [];
  const fromCategory = asset?.category ? [asset.category] : [];
  const merged = [...fromTags, ...fromKeywords, ...fromCategory]
    .filter(Boolean)
    .map(normalizeToken);

  const unique = Array.from(new Set(merged));
  // keep original casing for display where possible later; for matching we use normalized tokens
  return unique.slice(0, limit);
};

export default function StockAssetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isReady, isLoggedIn } = useProtoAuth();
  const loggedIn = isReady && isLoggedIn;
  const { addItem } = useCart();

  const assets = useMemo(() => ASSETS as Asset[], []);

  const asset = useMemo(() => assets.find((a) => a.id === id), [assets, id]);

  const assetTokens = useMemo(() => {
    const raw: string[] = [];
    if (asset?.category) raw.push(asset.category);
    if (asset?.tags?.length) raw.push(...asset.tags);
    if (asset?.keywords?.length) raw.push(...asset.keywords);
    return new Set(raw.filter(Boolean).map((t) => t.trim().toLowerCase()));
  }, [asset]);

  const relatedPicks = useMemo(() => {
    if (!assets.length) return [] as Asset[];

    const current = assets.find((a) => a.id === (asset?.id ?? id));
    const currentId = current?.id ?? (asset?.id ?? id);

    // Score by shared tokens + category, then diversify a bit.
    const scored = assets
      .filter((a) => a.id !== currentId)
      .map((a) => {
        let score = 0;
        const aTokens = new Set(
          [a.category, ...(a.tags ?? []), ...(a.keywords ?? [])]
            .filter(Boolean)
            .map((t) => t.trim().toLowerCase())
        );

        // category boost
        if (asset?.category && a.category && a.category === asset.category) score += 8;

        // shared tags/keywords/category tokens
        for (const tok of aTokens) {
          if (assetTokens.has(tok)) score += 3;
        }

        // slight preference for assets with previews
        if (getAssetImage(a)) score += 1;

        return { a, score };
      })
      .sort((x, y) => y.score - x.score);

    // Diversify by category: take top results but avoid all being same category.
    const result: Asset[] = [];
    const seenCats = new Set<string>();

    for (const { a } of scored) {
      if (result.length >= 8) break;
      const cat = (a.category ?? '').trim();
      if (cat && seenCats.has(cat) && result.length < 4) {
        // first half: encourage diversity
        continue;
      }
      if (cat) seenCats.add(cat);
      result.push(a);
    }

    // If not enough due to diversity constraints, fill remaining
    if (result.length < 8) {
      for (const { a } of scored) {
        if (result.length >= 8) break;
        if (result.some((r) => r.id === a.id)) continue;
        result.push(a);
      }
    }

    return result;
  }, [assets, asset, id, assetTokens]);

  const fallbackImage = useMemo(() => {
    const firstValid = assets.find((a) => Boolean(getAssetImage(a)));
    return firstValid ? getAssetImage(firstValid) : '/demo/stock/COLOURBOX69824938.jpg';
  }, [assets]);
  const imageSrc = asset && getAssetImage(asset) ? getAssetImage(asset) : fallbackImage;
  const title = asset?.title ?? 'Asset';
  const tags = pickTags(asset, 10);
  const displayTags = useMemo(() => {
    // Try to show original tag casing when available
    const original = [
      ...(asset?.tags ?? []),
      ...(asset?.keywords ?? []),
      ...(asset?.category ? [asset.category] : []),
    ].filter(Boolean);

    const map = new Map<string, string>();
    for (const t of original) map.set(t.trim().toLowerCase(), t.trim());

    return tags.map((t) => map.get(t) ?? t);
  }, [asset, tags]);

  const assetId = asset?.id ?? id;
  const returnTo = `/stock/assets/${assetId}`;

  // Demo pricing (mirrors Colourbox example)
  const priceSingle = 7.99;
  const payGo10Price = 69.0;
  const payGo10Was = 79.9;
  const payGo10SavePct = 14;

  const [purchaseOption, setPurchaseOption] = useState<'single' | 'paygo10'>('single');
  const [added, setAdded] = useState(false);

  const [lightboxOpen, setLightboxOpen] = useState(false);

  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    const p = e.touches[0];
    if (!p) return;
    touchStart.current = { x: p.clientX, y: p.clientY, t: Date.now() };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;

    const p = e.changedTouches[0];
    if (!p) return;

    const dx = p.clientX - start.x;
    const dy = p.clientY - start.y;
    const dt = Date.now() - start.t;

    // fast-ish horizontal swipe
    if (dt > 800) return;
    if (Math.abs(dx) < 60) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.2) return;

    if (dx > 0) goPrev();
    else goNext();
  };

  const currentIndex = useMemo(() => {
    const idx = assets.findIndex((a) => a.id === assetId);
    return idx >= 0 ? idx : 0;
  }, [assets, assetId]);

  const openLightbox = () => setLightboxOpen(true);
  const closeLightbox = () => setLightboxOpen(false);

  const goPrev = () => {
    if (!assets.length) return;
    const prev = assets[(currentIndex - 1 + assets.length) % assets.length];
    if (prev) router.push(`/stock/assets/${prev.id}`);
  };

  const goNext = () => {
    if (!assets.length) return;
    const next = assets[(currentIndex + 1) % assets.length];
    if (next) router.push(`/stock/assets/${next.id}`);
  };

  useEffect(() => {
    if (!lightboxOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [lightboxOpen, currentIndex, assets.length]);

  const price = purchaseOption === 'single' ? priceSingle : payGo10Price;

  const goLogin = () => router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);

  if (!assets.length) {
    return (
      <main className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border bg-muted/20 p-6 text-sm">
          No demo assets available.
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => router.push('/stock')}
            className="hover:text-foreground"
          >
            Stock
          </button>
          <span>›</span>
          <span className="text-foreground/80">Asset</span>
        </div>

        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <button
          type="button"
          onClick={openLightbox}
          className="group relative max-h-[calc(100vh-180px)] w-full overflow-hidden rounded-2xl border border-border bg-muted/20 text-left"
          aria-label="Open image preview"
        >
          <Image
            src={imageSrc}
            alt={title}
            width={2000}
            height={1400}
            priority
            className="h-full w-full object-contain motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-300"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/10" />
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5 dark:ring-white/10" />
          <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-background/70 px-2 py-1 text-[11px] text-foreground/80 backdrop-blur-sm ring-1 ring-black/5 dark:ring-white/10">
            <span className="sm:hidden">Tap to zoom</span>
            <span className="hidden sm:inline">Click to zoom · Esc to close</span>
          </div>
        </button>

        <Card className="h-fit p-4 lg:sticky lg:top-24">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Royalty-free · Instant download</span>
            <span className="font-medium text-foreground/80">From €{priceSingle.toFixed(2)}</span>
          </div>
          <h1 className="text-xl font-semibold leading-tight sm:text-2xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">by Colourbox / Demo Photographer</p>
          {asset?.description ? (
  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
    {asset.description}
  </p>
) : null}

          <div className="mt-2 flex flex-wrap gap-2">
            {asset?.category ? <Badge variant="outline">{asset.category}</Badge> : null}
            {displayTags
              .filter((t) => t && t.toLowerCase() !== (asset?.category ?? '').toLowerCase())
              .slice(0, 8)
              .map((t) => (
                <Badge key={t} variant="secondary" className="cursor-default">
                  {t}
                </Badge>
              ))}
            <button
              type="button"
              onClick={() => router.push('/stock/search')}
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Explore
              <span aria-hidden>→</span>
            </button>
          </div>

          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={() => setPurchaseOption('single')}
              className={`w-full rounded-lg border p-3 text-left transition ${
                purchaseOption === 'single'
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                  : 'border-border hover:bg-muted'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">€{priceSingle.toFixed(2)} for this image</span>
                <span className="font-semibold">€{priceSingle.toFixed(2)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">One download · JPG · royalty-free</p>
            </button>

            <button
              type="button"
              onClick={() => setPurchaseOption('paygo10')}
              className={`w-full rounded-lg border p-3 text-left transition ${
                purchaseOption === 'paygo10'
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                  : 'border-border hover:bg-muted'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Pay &amp; Go 10</span>
                  <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-medium text-foreground/80">
                    Save {payGo10SavePct}%
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">€{payGo10Price.toFixed(2)}</div>
                  <div className="text-[11px] text-muted-foreground line-through">€{payGo10Was.toFixed(2)}</div>
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                10 downloads incl. this one · 1 year to use · free re-downloads
              </p>
            </button>
          </div>

          <Button
            className="mt-4 w-full gap-2"
            variant={added ? 'secondary' : 'default'}
            onClick={() => {
              addItem({
                id: assetId,
                title,
                license: purchaseOption === 'single' ? 'single' : 'paygo10',
                price,
                image: imageSrc,
              });
              setAdded(true);
              window.setTimeout(() => setAdded(false), 2000);
            }}
          >
            <ShoppingCart className="h-4 w-4" /> {added ? 'Added to cart' : 'Add to cart'} · €{price}
          </Button>

          {!loggedIn ? (
            <div className="mt-2 rounded-lg border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">Log in</span> to download or checkout.
              <button
                type="button"
                onClick={goLogin}
                className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-foreground hover:underline"
              >
                Continue
                <span aria-hidden>→</span>
              </button>
            </div>
          ) : null}

          <Link
            href="/stock/cart"
            className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            View cart
          </Link>

          <p className="mt-3 text-xs text-muted-foreground">
            Demo only · Items are stored locally in your browser.
          </p>
        </Card>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Related images</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Picked by category and shared tags.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/stock/search')}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Browse more
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {relatedPicks.slice(0, 8).map((a) => {
            const aTags = pickTags(a, 6);
            const overlap = aTags.filter((t) => assetTokens.has(t)).slice(0, 2);
            const hint = overlap.length
              ? overlap.join(' · ')
              : a.category
                ? a.category
                : 'Related';

            return (
              <Link
                key={a.id}
                href={`/stock/assets/${a.id}`}
                className="group relative overflow-hidden rounded-xl bg-muted/20 ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-black/10 dark:ring-white/10 dark:hover:ring-white/20"
              >
                <Image
                  src={getAssetImage(a) || fallbackImage}
                  alt={a.title}
                  width={900}
                  height={900}
                  className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent opacity-80" />

                <div className="absolute inset-x-0 bottom-0 p-3">
                  <div className="line-clamp-1 text-xs font-semibold text-white">
                    {a.title}
                  </div>
                  <div className="mt-0.5 line-clamp-1 text-[11px] text-white/75">
                    {hint}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {lightboxOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={closeLightbox}
        >
          <div
            className="relative z-10 w-full max-w-6xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 pb-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">{title}</div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-white/70">
                  <span>Use ← → to navigate · Esc to close</span>
                  <span className="hidden sm:inline">·</span>
                  <span className="hidden sm:inline">{currentIndex + 1} / {assets.length}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  className="hidden rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-white ring-1 ring-white/15 hover:bg-white/15 sm:inline-flex"
                >
                  ← Prev
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="hidden rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-white ring-1 ring-white/15 hover:bg-white/15 sm:inline-flex"
                >
                  Next →
                </button>
                <button
                  type="button"
                  onClick={closeLightbox}
                  className="ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15"
                  aria-label="Close"
                >
                  <span className="text-lg leading-none">×</span>
                </button>
              </div>
            </div>
            <div
              className="relative max-h-[calc(100vh-140px)] overflow-hidden rounded-2xl bg-black/30 ring-1 ring-white/10"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              <Image
                src={imageSrc}
                alt={title}
                width={2400}
                height={1600}
                className="h-full w-full object-contain"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 sm:px-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    goPrev();
                  }}
                  aria-label="Previous image"
                  className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-white/15 sm:h-11 sm:w-11"
                >
                  <span className="text-lg">←</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    goNext();
                  }}
                  aria-label="Next image"
                  className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-white/15 sm:h-11 sm:w-11"
                >
                  <span className="text-lg">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}