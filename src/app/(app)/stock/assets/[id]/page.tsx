'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STOCK_ASSETS as ASSETS } from '@/lib/demo/stock-assets';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { useCart, useCartUI } from '@/lib/cart/cart';
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

type TabKey = 'info' | 'keywords' | 'similar' | 'shoot' | 'related';

const getAssetImage = (asset?: Asset) => asset?.preview ?? '';

const normalizeToken = (s?: string) => (s ?? '').trim().toLowerCase();

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const pickTags = (asset?: Asset, limit = 10) => {
  const fromTags = asset?.tags ?? [];
  const fromKeywords = asset?.keywords ?? [];
  const fromCategory = asset?.category ? [asset.category] : [];
  const merged = [...fromTags, ...fromKeywords, ...fromCategory]
    .filter(isNonEmptyString)
    .map(normalizeToken);

  const unique = Array.from(new Set(merged));
  return unique.slice(0, limit);
};

// Helper: pick "meaningful" tokens (tags+keywords only, no category)
const pickMeaningful = (asset?: Asset, limit = 12) => {
  const fromTags = asset?.tags ?? [];
  const fromKeywords = asset?.keywords ?? [];
  const merged = [...fromTags, ...fromKeywords].filter(isNonEmptyString).map(normalizeToken);
  const unique = Array.from(new Set(merged));
  return unique.slice(0, limit);
};

// --- Similarity helpers for better "Similar images" picks ---
const tokenSet = (a?: Asset) => {
  const parts = [a?.category, ...(a?.tags ?? []), ...(a?.keywords ?? [])]
    .filter(isNonEmptyString)
    .map(normalizeToken);
  return new Set(parts);
};

const jaccard = (a: Set<string>, b: Set<string>) => {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
};

const signature = (a?: Asset) => {
  // coarse signature to avoid near-duplicates when demo assets share very similar metadata
  const cat = normalizeToken(a?.category ?? '');
  const t = pickMeaningful(a, 6).sort().join('|');
  return `${cat}::${t}`;
};

export default function StockAssetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isReady, isLoggedIn } = useProtoAuth();
  const loggedIn = isReady && isLoggedIn;
  const { addItem, items } = useCart();
  const { open: openCart } = useCartUI();

  const assets = useMemo(() => ASSETS as Asset[], []);

  const asset = useMemo(() => assets.find((a) => a.id === id), [assets, id]);

  const assetTokens = useMemo(() => {
    const raw: string[] = [];
    if (asset?.category) raw.push(asset.category);
    if (asset?.tags?.length) raw.push(...asset.tags);
    if (asset?.keywords?.length) raw.push(...asset.keywords);
    return new Set(raw.filter(isNonEmptyString).map(normalizeToken));
  }, [asset]);

  const relatedPicks = useMemo(() => {
    if (!assets.length) return [] as Asset[];

    const currentId = asset?.id ?? id;
    const baseMeaningful = new Set(pickMeaningful(asset, 24));
    const baseAll = tokenSet(asset);

    const scored = assets
      .filter((a) => a.id !== currentId)
      .map((a) => {
        const meaningful = pickMeaningful(a, 24);
        let hits = 0;
        for (const t of meaningful) if (baseMeaningful.has(t)) hits += 1;

        const sameCat = asset?.category && a.category && a.category === asset.category;
        const sim = jaccard(baseAll, tokenSet(a));
        const hasPreview = Boolean(getAssetImage(a));

        // Penalize category-only matches (no meaningful overlap)
        const categoryOnly = sameCat && hits === 0;

        let score = 0;
        score += Math.min(hits, 8) * 2.4; // strong overlap on meaningful tokens
        score += sim * 6; // softer semantic similarity
        if (sameCat) score += 4; // category matters for related
        if (hasPreview) score += 0.5;
        if (categoryOnly) score -= 3;

        return {
          a,
          score,
          sig: signature(a),
          cat: (a.category ?? '').trim(),
        };
      })
      .sort((x, y) => y.score - x.score);

    // Pool: top unique signatures
    const pool: typeof scored = [];
    const seenSig = new Set<string>();
    for (const item of scored) {
      if (pool.length >= 20) break;
      if (seenSig.has(item.sig)) continue;
      seenSig.add(item.sig);
      pool.push(item);
    }

    // Diversity after first 3
    const result: Asset[] = [];
    const seenCats = new Set<string>();
    for (const item of pool) {
      if (result.length >= 8) break;
      const cat = item.cat;

      if (result.length >= 3 && cat && seenCats.has(cat)) continue;

      if (cat) seenCats.add(cat);
      result.push(item.a);
    }

    // Fill remaining slots
    if (result.length < 8) {
      for (const item of pool) {
        if (result.length >= 8) break;
        if (result.some((r) => r.id === item.a.id)) continue;
        result.push(item.a);
      }
    }

    return result;
  }, [assets, asset, id]);

  const sameShootPicks = useMemo(() => {
    if (!assets.length) return [] as Asset[];
    const currentId = asset?.id ?? id;

    return assets
      .filter((a) => a.id !== currentId && a.category === asset?.category)
      .map((a) => {
        const tokens = new Set(
          [a.category, ...(a.tags ?? []), ...(a.keywords ?? [])]
            .filter(isNonEmptyString)
            .map(normalizeToken)
        );
        let overlap = 0;
        for (const t of tokens) if (assetTokens.has(t)) overlap += 1;
        return { a, score: overlap + (getAssetImage(a) ? 0.5 : 0) };
      })
      .sort((x, y) => y.score - x.score)
      .slice(0, 12)
      .map((x) => x.a);
  }, [assets, asset, id, assetTokens]);

  const similarPicks = useMemo(() => {
    if (!assets.length) return [] as Asset[];
    const currentId = asset?.id ?? id;

    const base = tokenSet(asset);
    const baseTags = new Set(pickMeaningful(asset, 16));

    const scored = assets
      .filter((a) => a.id !== currentId)
      .map((a) => {
        const t = tokenSet(a);
        const sim = jaccard(base, t);

        // Stronger overlap count on “meaningful” tokens (tags/keywords), category less important.
        const aTags = pickMeaningful(a, 16);
        let tagHits = 0;
        for (const tok of aTags) if (baseTags.has(tok)) tagHits += 1;

        const sameCat = asset?.category && a.category && a.category === asset.category;

        // Penalize category-only matches. (Stricter: no meaningful overlap)
        const categoryOnly = sameCat && tagHits === 0;

        // Slight preference for assets with previews
        const hasPreview = Boolean(getAssetImage(a));

        let score = 0;
        score += sim * 10; // semantic similarity
        score += Math.min(tagHits, 6) * 2.2; // strong tag/keyword overlap
        if (sameCat) score += 2.5;
        if (hasPreview) score += 0.5;
        if (categoryOnly) score -= 3.5;

        return {
          a,
          score,
          sig: signature(a),
          cat: (a.category ?? '').trim(),
        };
      })
      .sort((x, y) => y.score - x.score);

    // First pass: take best, but avoid near-duplicates by signature
    const first: typeof scored = [];
    const seenSig = new Set<string>();
    for (const item of scored) {
      if (first.length >= 18) break; // gather a pool
      if (seenSig.has(item.sig)) continue;
      seenSig.add(item.sig);
      first.push(item);
    }

    // Second pass: diversify by category after top 4
    const result: Asset[] = [];
    const seenCats = new Set<string>();
    for (const item of first) {
      if (result.length >= 12) break;
      const cat = item.cat;

      if (result.length >= 4 && cat && seenCats.has(cat)) {
        // after the first few, encourage diversity
        continue;
      }

      if (cat) seenCats.add(cat);
      result.push(item.a);
    }

    // Fill remainder if diversity filtered too much
    if (result.length < 12) {
      for (const item of first) {
        if (result.length >= 12) break;
        if (result.some((r) => r.id === item.a.id)) continue;
        result.push(item.a);
      }
    }

    return result;
  }, [assets, asset, id]);

  const fallbackImage = useMemo(() => {
    const firstValid = assets.find((a) => Boolean(getAssetImage(a)));
    const src = firstValid ? getAssetImage(firstValid) : '';
    return src || '/demo/stock/COLOURBOX69824938.jpg';
  }, [assets]);
  const assetPreview = asset ? getAssetImage(asset) : '';
  const imageSrc = assetPreview ? assetPreview : fallbackImage;
  const title = asset?.title ?? 'Asset';
  const tags = pickTags(asset, 10);
  const displayTags = useMemo(() => {
    // Try to show original tag casing when available
    const original = [
      ...(asset?.tags ?? []),
      ...(asset?.keywords ?? []),
      ...(asset?.category ? [asset.category] : []),
    ].filter(isNonEmptyString);

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
  const [isSmUp, setIsSmUp] = useState(false);
  const topbarOffset = isSmUp ? 64 : 56;
  const stickyMenuOffset = isSmUp ? 48 : 44; // compact sticky menu height

  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const infoRef = useRef<HTMLDivElement | null>(null);
  const keywordsRef = useRef<HTMLDivElement | null>(null);
  const similarRef = useRef<HTMLElement | null>(null);
  const shootRef = useRef<HTMLElement | null>(null);
  const relatedRef = useRef<HTMLElement | null>(null);
  // Removed purchaseTopRef and dynamicStickyExtra, see sticky offset logic below.
  const [showStickyMenu, setShowStickyMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const showStickyMenuRef = useRef(false);
  const stickyRafRef = useRef<number | null>(null);
  const activeTabRef = useRef<TabKey>('info');
  const tabRafRef = useRef<number | null>(null);
  const scrollTo = useCallback(
    (ref: React.RefObject<HTMLElement | null>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const targetLine = topbarOffset + (showStickyMenu ? stickyMenuOffset : 0) + 8;
      const y = window.scrollY + rect.top - targetLine;

      // If we are already close to the target line, don't restart a smooth scroll (feels like a hitch).
      if (Math.abs(rect.top - targetLine) < 12) {
        window.scrollTo({ top: y, behavior: 'auto' });
        return;
      }

      window.scrollTo({ top: y, behavior: 'smooth' });
    },
    [topbarOffset, stickyMenuOffset, showStickyMenu]
  );
  // Removed dynamicStickyExtra measurement effect.

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 640px)');
    const onChange = () => setIsSmUp(mq.matches);
    onChange();
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        // Stable trigger: show sticky menu when the hero has scrolled past the topbar line.
        const next = entry.boundingClientRect.bottom <= topbarOffset + 8;

        if (stickyRafRef.current !== null) cancelAnimationFrame(stickyRafRef.current);
        stickyRafRef.current = requestAnimationFrame(() => {
          if (showStickyMenuRef.current === next) return;
          showStickyMenuRef.current = next;
          setShowStickyMenu(next);
        });
      },
      {
        root: null,
        // Trigger updates around the topbar line to avoid oscillation.
        rootMargin: `-${topbarOffset + 8}px 0px 0px 0px`,
        threshold: 0,
      }
    );

    obs.observe(el);
    return () => {
      if (stickyRafRef.current !== null) cancelAnimationFrame(stickyRafRef.current);
      obs.disconnect();
    };
  }, [topbarOffset]);

  useEffect(() => {
    const infoEl = infoRef.current;
    const keywordsEl = keywordsRef.current;
    const similarEl = similarRef.current;
    const shootEl = shootRef.current;
    const relatedEl = relatedRef.current;

    const targets: Array<{ key: TabKey; el: HTMLElement | null }> = [
      { key: 'info', el: infoEl },
      { key: 'keywords', el: keywordsEl },
      { key: 'similar', el: similarEl },
      { key: 'shoot', el: shootEl },
      { key: 'related', el: relatedEl },
    ];

    const existing = targets.filter((t) => t.el) as Array<{ key: TabKey; el: HTMLElement }>;
    if (!existing.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top that is intersecting.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0));

        if (!visible.length) return;

        const el = visible[0].target as HTMLElement;
        const found = existing.find((t) => t.el === el);
        if (!found) return;

        const nextKey = found.key;
        if (tabRafRef.current !== null) cancelAnimationFrame(tabRafRef.current);
        tabRafRef.current = requestAnimationFrame(() => {
          if (activeTabRef.current === nextKey) return;
          activeTabRef.current = nextKey;
          setActiveTab(nextKey);
        });
      },
      {
        root: null,
        // Account for topbar + sticky menu height, only when sticky menu is visible.
        rootMargin: `-${topbarOffset + (showStickyMenu ? stickyMenuOffset : 0) + 24}px 0px -65% 0px`,
        threshold: 0.01,
      }
    );

    for (const t of existing) obs.observe(t.el);
    return () => {
      if (tabRafRef.current !== null) cancelAnimationFrame(tabRafRef.current);
      obs.disconnect();
    };
  }, [topbarOffset, stickyMenuOffset, showStickyMenu]);

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
  const selectedLicense = purchaseOption === 'single' ? 'single' : 'paygo10';
  const isInCart = useMemo(() => {
    const list = (items as any[]) ?? [];
    return list.some((it) => it && it.id === assetId && (it.license ? it.license === selectedLicense : true));
  }, [items, assetId, selectedLicense]);

  useEffect(() => {
    if (isInCart) setAdded(false);
  }, [isInCart]);

  const handleAddToCart = useCallback(() => {
    if (isInCart) {
      openCart();
      return;
    }

    addItem({
      id: assetId,
      title,
      license: selectedLicense,
      price,
      image: imageSrc,
      qty: 1,
    });

    openCart();
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  }, [addItem, assetId, title, selectedLicense, price, imageSrc, openCart, isInCart]);

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
    <main className="w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8 [--cbx-topbar:56px] sm:[--cbx-topbar:64px] [--cbx-sticky:44px] sm:[--cbx-sticky:48px]">
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

      <div
        className={`fixed top-[var(--cbx-topbar)] left-0 right-0 ${
          loggedIn ? 'md:left-[var(--app-left-rail)]' : 'md:left-0'
        } z-30 transition-all duration-200 ${
          showStickyMenu
            ? 'opacity-100 translate-y-0'
            : 'pointer-events-none opacity-0 -translate-y-2'
        }`}
        aria-hidden={!showStickyMenu}
      >
        <div className="border-b border-border bg-background/90 backdrop-blur">
          <div className="w-full px-4 py-2 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('info');
                    activeTabRef.current = 'info';
                    scrollTo(infoRef);
                  }}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ring-1 ${
                    activeTab === 'info'
                      ? 'bg-muted/50 text-foreground ring-black/10 dark:ring-white/20'
                      : 'text-muted-foreground ring-transparent hover:bg-muted/40 hover:text-foreground'
                  }`}
                >
                  Info
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('keywords');
                    activeTabRef.current = 'keywords';
                    scrollTo(keywordsRef);
                  }}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ring-1 ${
                    activeTab === 'keywords'
                      ? 'bg-muted/50 text-foreground ring-black/10 dark:ring-white/20'
                      : 'text-muted-foreground ring-transparent hover:bg-muted/40 hover:text-foreground'
                  }`}
                >
                  Keywords
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('similar');
                    activeTabRef.current = 'similar';
                    scrollTo(similarRef);
                  }}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ring-1 ${
                    activeTab === 'similar'
                      ? 'bg-muted/50 text-foreground ring-black/10 dark:ring-white/20'
                      : 'text-muted-foreground ring-transparent hover:bg-muted/40 hover:text-foreground'
                  }`}
                >
                  Similar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('shoot');
                    activeTabRef.current = 'shoot';
                    scrollTo(shootRef);
                  }}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ring-1 ${
                    activeTab === 'shoot'
                      ? 'bg-muted/50 text-foreground ring-black/10 dark:ring-white/20'
                      : 'text-muted-foreground ring-transparent hover:bg-muted/40 hover:text-foreground'
                  }`}
                >
                  Shoot
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('related');
                    activeTabRef.current = 'related';
                    scrollTo(relatedRef);
                  }}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ring-1 ${
                    activeTab === 'related'
                      ? 'bg-muted/50 text-foreground ring-black/10 dark:ring-white/20'
                      : 'text-muted-foreground ring-transparent hover:bg-muted/40 hover:text-foreground'
                  }`}
                >
                  Related
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 sm:flex">
                  <div className="relative h-9 w-9 overflow-hidden rounded-lg ring-1 ring-black/5 dark:ring-white/10">
                    <Image src={imageSrc} alt={title} fill sizes="36px" className="object-cover" />
                  </div>
                  <div className="max-w-[200px]">
                    <div className="line-clamp-1 text-sm font-semibold">{title}</div>
                    <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      Image #{assetId}
                    </div>
                  </div>
                </div>

                <div className="hidden h-6 w-px bg-border sm:block" aria-hidden />

                <Button
                  size="default"
                  variant={isInCart ? 'secondary' : 'default'}
                  className="gap-2"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="h-4 w-4" />
                  {isInCart ? 'Show cart' : added ? 'Added' : `Add to cart · €${price}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] pt-2">
        <div className="space-y-3">
          <button
            type="button"
            onClick={openLightbox}
            className="group relative w-full rounded-2xl bg-muted/20 text-left"
            aria-label="Open image preview"
          >
            <div
              ref={heroRef}
              id="asset-preview"
              className="relative h-[calc(100vh-260px)] min-h-[320px] w-full overflow-hidden rounded-2xl ring-1 ring-black/5 dark:ring-white/10"
            >
              <Image
                src={imageSrc}
                alt={title}
                fill
                priority
                sizes="(min-width: 1024px) calc(100vw - 420px), 100vw"
                className="object-contain motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-300"
              />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/10" />
            {/* ring overlay removed */}
            <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-background/70 px-2 py-1 text-[11px] text-foreground/80 backdrop-blur-sm ring-1 ring-black/5 dark:ring-white/10">
              <span className="sm:hidden">Tap to zoom</span>
              <span className="hidden sm:inline">Click to zoom · Esc to close</span>
            </div>
          </button>

          <div
            ref={infoRef}
            id="info"
            className="scroll-mt-[calc(var(--cbx-topbar)+var(--cbx-sticky)+44px)] rounded-2xl bg-background p-4 ring-1 ring-black/5 dark:ring-white/10"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl font-semibold leading-tight sm:text-2xl">{title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">by Colourbox / Demo Photographer</p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="cursor-default">Royalty-free</Badge>
                <Badge variant="secondary" className="cursor-default">Instant download</Badge>
              </div>
            </div>

            {asset?.description ? (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{asset.description}</p>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                High-quality stock image ready to license and use across channels.
              </p>
            )}

            <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 ring-1 ring-black/5 dark:ring-white/10">
                <span>Image ID</span>
                <span className="font-medium text-foreground/80">#{assetId}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 ring-1 ring-black/5 dark:ring-white/10">
                <span>Starting at</span>
                <span className="font-medium text-foreground/80">€{priceSingle.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div
            ref={keywordsRef}
            id="keywords"
            className="scroll-mt-[calc(var(--cbx-topbar)+var(--cbx-sticky)+44px)] flex flex-wrap items-center gap-2 px-1"
          >
            {asset?.category ? (
              <Badge variant="secondary" className="cursor-default">{asset.category}</Badge>
            ) : null}
            {displayTags
              .filter((t) => t && t.toLowerCase() !== (asset?.category ?? '').toLowerCase())
              .slice(0, 10)
              .map((t) => (
                <Badge key={t} variant="secondary" className="cursor-default">
                  {t}
                </Badge>
              ))}
            <button
              type="button"
              onClick={() => router.push('/stock/search')}
              className="ml-auto inline-flex items-center gap-1 rounded-full bg-muted/30 px-3 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-black/5 transition hover:bg-muted/50 hover:text-foreground dark:ring-white/10"
            >
              Explore
              <span aria-hidden>→</span>
            </button>
          </div>
        </div>

        <Card className="h-fit p-4 lg:sticky lg:top-[calc(var(--cbx-topbar)+var(--cbx-sticky)+44px)] ring-1 ring-black/5 dark:ring-white/10">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Buy license</div>
              <div className="mt-0.5 text-xs text-muted-foreground">Choose an option below</div>
            </div>
            <div className="text-xs text-muted-foreground">
              From <span className="font-medium text-foreground/80">€{priceSingle.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={() => setPurchaseOption('single')}
              className={`w-full rounded-lg p-3 text-left transition ring-1 ${
                purchaseOption === 'single'
                  ? 'bg-primary/10 ring-primary/40'
                  : 'bg-background ring-black/5 hover:bg-muted/40 dark:ring-white/10'
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
              className={`w-full rounded-lg p-3 text-left transition ring-1 ${
                purchaseOption === 'paygo10'
                  ? 'bg-primary/10 ring-primary/40'
                  : 'bg-background ring-black/5 hover:bg-muted/40 dark:ring-white/10'
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
                  <div className="text-[11px] text-muted-foreground line-through">
                    €{payGo10Was.toFixed(2)}
                  </div>
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                10 downloads incl. this one · 1 year to use · free re-downloads
              </p>
            </button>
          </div>

          <Button
            className="mt-4 w-full gap-2"
            variant={isInCart || added ? 'secondary' : 'default'}
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-4 w-4" />
            {isInCart ? 'Show cart' : added ? 'Added to cart' : `Add to cart · €${price}`}
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
            className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-muted/20 px-4 py-2 text-sm font-medium text-foreground ring-1 ring-black/5 transition hover:bg-muted/30 dark:ring-white/10"
          >
            View cart
          </Link>

          <p className="mt-3 text-xs text-muted-foreground">
            Demo only · Items are stored locally in your browser.
          </p>
        </Card>
      </div>

      <section ref={shootRef} id="shoot" className="scroll-mt-[calc(var(--cbx-topbar)+var(--cbx-sticky)+44px)] mt-10">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">From the same shoot</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              More from the same series — based on category and keyword overlap.
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

        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {(sameShootPicks.length ? sameShootPicks : relatedPicks)
            .slice(0, 12)
            .map((a) => (
              <Link
                key={`shoot-${a.id}`}
                href={`/stock/assets/${a.id}`}
                className="group relative h-40 w-56 shrink-0 overflow-hidden rounded-xl bg-muted/10 ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:bg-muted/20 hover:ring-black/10 dark:ring-white/10 dark:hover:ring-white/20"
              >
                <Image
                  src={getAssetImage(a) || fallbackImage}
                  alt={a.title}
                  fill
                  sizes="224px"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent opacity-80" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <div className="line-clamp-1 text-xs font-semibold text-white">{a.title}</div>
                  <div className="mt-0.5 line-clamp-1 text-[11px] text-white/75">
                    {asset?.category ?? 'Shoot'}
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </section>

      <section ref={similarRef} id="similar" className="scroll-mt-[calc(var(--cbx-topbar)+var(--cbx-sticky)+44px)] mt-10">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Similar images</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Same vibe, subject or style — based on tags and keywords.
            </p>
          </div>
          <button
            type="button"
            onClick={() => scrollTo(relatedRef)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            See related
          </button>
        </div>

        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {similarPicks.slice(0, 12).map((a) => {
            const aTags = pickMeaningful(a, 8);
            const baseMeaningfulSet = new Set(pickMeaningful(asset, 24));
            const overlapMeaningful = aTags.filter((t) => baseMeaningfulSet.has(t)).slice(0, 2);
            const hint = overlapMeaningful.length
              ? overlapMeaningful.join(' · ')
              : a.category ?? 'Similar';

            return (
              <Link
                key={`similar-${a.id}`}
                href={`/stock/assets/${a.id}`}
                className="group relative h-40 w-56 shrink-0 overflow-hidden rounded-xl bg-muted/10 ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:bg-muted/20 hover:ring-black/10 dark:ring-white/10 dark:hover:ring-white/20"
              >
                <Image
                  src={getAssetImage(a) || fallbackImage}
                  alt={a.title}
                  fill
                  sizes="224px"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent opacity-80" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <div className="line-clamp-1 text-xs font-semibold text-white">{a.title}</div>
                  <div className="mt-0.5 line-clamp-1 text-[11px] text-white/75">{hint}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section ref={relatedRef} id="related" className="scroll-mt-[calc(var(--cbx-topbar)+var(--cbx-sticky)+44px)] mt-10">
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
                className="group relative overflow-hidden rounded-xl bg-muted/10 ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:bg-muted/20 hover:ring-black/10 dark:ring-white/10 dark:hover:ring-white/20"
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