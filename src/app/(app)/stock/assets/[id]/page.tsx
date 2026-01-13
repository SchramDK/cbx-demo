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

const pickTags = (asset?: Asset) => {
  const fromTags = asset?.tags ?? [];
  const fromKeywords = asset?.keywords ?? [];
  const merged = [...fromTags, ...fromKeywords].filter(Boolean);
  // unique
  return Array.from(new Set(merged)).slice(0, 8);
};

export default function StockAssetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isReady, isLoggedIn } = useProtoAuth();
  const loggedIn = isReady && isLoggedIn;
  const { addItem } = useCart();

  const assets = useMemo(() => ASSETS as Asset[], []);

  const asset = useMemo(() => assets.find((a) => a.id === id), [assets, id]);

  const fallbackImage = useMemo(() => {
    const firstValid = assets.find((a) => Boolean(getAssetImage(a)));
    return firstValid ? getAssetImage(firstValid) : '/demo/stock/COLOURBOX69824938.jpg';
  }, [assets]);
  const imageSrc = asset && getAssetImage(asset) ? getAssetImage(asset) : fallbackImage;
  const title = asset?.title ?? 'Asset';
  const tags = pickTags(asset);

  const assetId = asset?.id ?? id;
  const returnTo = `/stock/assets/${assetId}`;

  const priceStandard = 9;
  const priceExtended = 29;
  const [license, setLicense] = useState<'standard' | 'extended'>('standard');
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

  const price = license === 'standard' ? priceStandard : priceExtended;

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

        <Card className="p-4 lg:sticky lg:top-24 h-fit">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Royalty-free · Instant download</span>
            <span className="font-medium text-foreground/80">From €{priceStandard}</span>
          </div>
          <h1 className="text-xl font-semibold leading-tight sm:text-2xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">by Colourbox / Demo Photographer</p>
          {asset?.description ? (
  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
    {asset.description}
  </p>
) : null}
          {!loggedIn ? (
            <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="font-medium">Preview mode</div>
              <div className="mt-1 text-xs text-muted-foreground">
                You can add items to your cart in preview mode. Log in when you want to download or checkout.
              </div>
              <Button className="mt-3 w-full" onClick={goLogin}>
                Log in to continue
              </Button>
            </div>
          ) : null}

<div className="mt-3 flex flex-wrap gap-2">
  {asset?.category ? <Badge variant="outline">{asset.category}</Badge> : null}
  {tags.map((t) => (
    <Badge key={t} variant="secondary">
      {t}
    </Badge>
  ))}
</div>

          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={() => setLicense('standard')}
              className={`w-full rounded-lg border p-3 text-left transition ${
                license === 'standard'
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                  : 'border-border hover:bg-muted'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">Standard license</span>
                <span className="font-semibold">€{priceStandard}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Web, social, marketing</p>
            </button>

            <button
              type="button"
              onClick={() => setLicense('extended')}
              className={`w-full rounded-lg border p-3 text-left transition ${
                license === 'extended'
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                  : 'border-border hover:bg-muted'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">Extended license</span>
                <span className="font-semibold">€{priceExtended}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Print, ads, large distribution</p>
            </button>
          </div>

          <Button
            className="mt-4 w-full gap-2"
            variant={added ? 'secondary' : 'default'}
            onClick={() => {
              addItem({
                id: assetId,
                title,
                license,
                price,
                image: imageSrc,
              });
              setAdded(true);
              window.setTimeout(() => setAdded(false), 2000);
            }}
          >
            <ShoppingCart className="h-4 w-4" /> {added ? 'Added to cart' : 'Add to cart'} · €{price}
          </Button>

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
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-sm font-semibold">Similar images</h2>
          <button
            type="button"
            onClick={() => router.push('/stock/search')}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Browse more
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(() => {
            const idx = currentIndex;
            const picks: Asset[] = [];
            for (let i = 1; i <= 4; i++) {
              const a = assets[(idx + i) % assets.length];
              if (a) picks.push(a);
            }
            return picks;
          })().map((a) => (
            <Link
              key={a.id}
              href={`/stock/assets/${a.id}`}
              className="group relative overflow-hidden rounded-lg bg-muted/20 ring-1 ring-black/5 transition hover:ring-black/10 dark:ring-white/10 dark:hover:ring-white/20"
            >
              <Image
                src={getAssetImage(a) || fallbackImage}
                alt={a.title}
                width={800}
                height={800}
                className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </Link>
          ))}
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