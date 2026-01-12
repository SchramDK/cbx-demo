'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Search, X } from 'lucide-react';

import { ASSETS } from '@/lib/demo/assets';
import { useProtoAuth } from '@/lib/proto-auth';

type Asset = {
  id: string;
  title: string;
  description?: string;
  keywords?: string[];
  [key: string]: any;
};

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop';

function getImage(asset: Asset) {
  return asset.preview ?? asset.src ?? asset.image ?? asset.url ?? FALLBACK_IMAGE;
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex select-none items-center rounded-full border bg-background px-3 py-1 text-xs transition hover:bg-muted hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20">
      {children}
    </span>
  );
}

export default function StockPage() {
  const router = useRouter();
  const { isReady, isLoggedIn } = useProtoAuth();
  const loggedIn = isReady && isLoggedIn;
  const [q, setQ] = useState('');

  const featured = useMemo(() => (ASSETS as Asset[]).slice(0, 10), []);
  const newest = useMemo(() => (ASSETS as Asset[]).slice(0, 12), []);

  const heroImages = useMemo(() => {
    const list = (featured as Asset[]).slice(0, 6).map(getImage);
    // Ensure we have at least 2 images to cycle
    return list.length > 1 ? list : [FALLBACK_IMAGE, FALLBACK_IMAGE];
  }, [featured]);

  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const id = window.setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroImages.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [heroImages.length]);

  const pushOrLogin = (href: string) => {
    router.push(loggedIn ? href : `/login?returnTo=${encodeURIComponent(href)}`);
  };

  const buildSearchHref = (query: string) => {
    const trimmed = query.trim();
    return trimmed ? `/stock/search?q=${encodeURIComponent(trimmed)}` : '/stock/search';
  };

  return (
    <div className="w-full">
      {/* Hero */}
      <section className="relative mb-12 min-h-[60vh] overflow-hidden border-b flex items-center">
        <div className="absolute inset-0">
          {heroImages.map((src, idx) => (
            <Image
              key={`${src}-${idx}`}
              src={src}
              alt="Stock hero"
              fill
              sizes="100vw"
              className={
                "object-cover transition-opacity duration-1000 " +
                (idx === heroIndex ? "opacity-100" : "opacity-0")
              }
              priority={idx === 0}
            />
          ))}
          <div className="absolute inset-0 bg-black/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/55 to-transparent" />
        </div>

        <div className="relative w-full px-4 py-20 sm:px-6 sm:py-28 lg:px-10">
          <div className="max-w-2xl rounded-2xl border bg-background/65 p-5 backdrop-blur sm:p-7">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Stock library</h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              {loggedIn
                ? 'Search and license assets in seconds.'
                : 'Browse a preview of the Stock library. Log in to license, download, and save to collections.'}
            </p>

            {/* Search */}
            <form
              role="search"
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                router.push(buildSearchHref(q));
              }}
            >
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative sm:flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    autoFocus
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search images, keywords…"
                    className="h-11 w-full rounded-md border bg-background/80 pl-9 pr-20 text-sm outline-none backdrop-blur transition focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10"
                    autoComplete="off"
                  />
                  {q.trim().length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setQ('')}
                      className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded border bg-background text-muted-foreground hover:bg-muted"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={!q.trim()}
                  className="h-11 rounded-md border bg-foreground px-5 text-sm font-medium text-background hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Search
                </button>
              </div>
            </form>

            {!loggedIn ? (
              <p className="mt-4 text-xs text-muted-foreground">
                You can browse and add items to your cart. Log in when you’re ready to license or checkout.
              </p>
            ) : null}

            {/* Quick actions */}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => router.push('/stock/search')}
                className="rounded-md border bg-background/70 px-3 py-2 text-xs backdrop-blur transition hover:bg-background hover:border-foreground/20"
              >
                Browse all
              </button>
              <button
                type="button"
                onClick={() => pushOrLogin('/stock/collections')}
                className="rounded-md border bg-background/70 px-3 py-2 text-xs backdrop-blur transition hover:bg-background hover:border-foreground/20"
              >
                Collections
              </button>
            </div>


          </div>
        </div>
      </section>

      {/* Browse helpers */}
      <section className="mb-12 px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="rounded-2xl border bg-background p-5 sm:p-6">
              <div className="text-sm font-semibold">Discover faster</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Explore popular categories and trending searches.
              </p>

              <div className="mt-5 space-y-5">
                <div>
                  <div className="mb-2 text-xs font-medium text-muted-foreground">Popular categories</div>
                  <div className="flex flex-wrap gap-2">
                    {['campaign', 'office', 'summer', 'family', 'travel', 'abstract'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => router.push(buildSearchHref(t))}
                        className="rounded-full focus:outline-none"
                      >
                        <Pill>{t}</Pill>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium text-muted-foreground">Trending</div>
                  <div className="flex flex-wrap gap-2">
                    {['winter', 'lifestyle', 'business', 'nature', 'food', 'portrait'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => router.push(buildSearchHref(t))}
                        className="rounded-full focus:outline-none"
                      >
                        <Pill>{t}</Pill>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-2xl border bg-background p-5">
                <div className="text-xs font-medium">Fast licensing</div>
                <div className="mt-1 text-xs text-muted-foreground">Clear rights and instant download options.</div>
              </div>
              <div className="rounded-2xl border bg-background p-5">
                <div className="text-xs font-medium">Brand-safe search</div>
                <div className="mt-1 text-xs text-muted-foreground">Find the right look with keywords and filters.</div>
              </div>
              <div className="rounded-2xl border bg-background p-5">
                <div className="text-xs font-medium">Team-ready</div>
                <div className="mt-1 text-xs text-muted-foreground">Share, save, and reuse across projects.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-10 h-px w-full bg-border" />

      {/* Featured (wireframe) */}
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
          {featured.map((a) => (
            <Link
              key={a.id}
              href={`/stock/assets/${a.id}`}
              className="group block overflow-hidden rounded-xl border bg-background transition hover:bg-muted/30 hover:border-foreground/20 focus:outline-none focus:ring-2 focus:ring-foreground/10"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <Image
                  src={getImage(a)}
                  alt={a.title}
                  fill
                  sizes="(min-width: 1024px) 220px, (min-width: 640px) 30vw, 45vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="line-clamp-1 text-sm font-medium">{a.title}</div>
                  <span className="shrink-0 rounded-md border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                    Featured
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(a.keywords ?? []).slice(0, 3).map((k: string) => (
                    <span key={k} className="rounded-full border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-10 h-px w-full bg-border" />

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
          {[{
            title: 'Winter campaign',
            q: 'winter',
          }, {
            title: 'Food & lifestyle',
            q: 'food',
          }, {
            title: 'Business portraits',
            q: 'portrait',
          }].map((c) => (
            <Link
              key={c.title}
              href={`/stock/search?q=${encodeURIComponent(c.q)}`}
              className="group overflow-hidden rounded-xl border bg-background transition hover:bg-muted/30 hover:border-foreground/20 focus:outline-none focus:ring-2 focus:ring-foreground/10"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden">
                <Image
                  src={getImage((ASSETS as Asset[]).find((a) => (a.keywords ?? []).includes(c.q)) ?? (featured[0] as Asset))}
                  alt={c.title}
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="text-sm font-medium">{c.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Explore →</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-10 h-px w-full bg-border" />

      {/* New this week (wireframe) */}
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
          {newest.map((a) => (
            <Link
              key={a.id}
              href={`/stock/assets/${a.id}`}
              className="group block overflow-hidden rounded-xl border bg-background transition hover:bg-muted/30 hover:border-foreground/20 focus:outline-none focus:ring-2 focus:ring-foreground/10"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <Image
                  src={getImage(a)}
                  alt={a.title}
                  fill
                  sizes="(min-width: 1024px) 260px, (min-width: 768px) 33vw, 100vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="line-clamp-1 text-sm font-medium">{a.title}</div>
                  <span className="shrink-0 rounded-md border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                    New
                  </span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
                  {a.description ?? 'Ready to license and use across channels.'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Minimal debug */}
      <div className="px-4 pb-8 text-xs text-muted-foreground sm:px-6 lg:px-10">
        Prototype • Assets: {(ASSETS as Asset[]).length}
      </div>
    </div>
  );
}