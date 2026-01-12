'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';

import { ASSETS } from '@/lib/demo/assets';
import { useProtoAuth } from '@/lib/proto-auth';

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

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop';

const getImage = (asset: Asset) =>
  asset.preview ?? asset.src ?? asset.image ?? asset.url ?? FALLBACK_IMAGE;

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex select-none items-center rounded-full bg-muted/30 px-3 py-1 text-xs text-muted-foreground transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20">
      {children}
    </span>
  );
}

export default function StockPage() {
  const router = useRouter();
  const { isReady, isLoggedIn } = useProtoAuth();
  const loggedIn = isReady && isLoggedIn;

  const [q, setQ] = useState('');
  const [heroIndex, setHeroIndex] = useState(0);

  const featured = useMemo(() => (ASSETS as Asset[]).slice(0, 10), []);
  const newest = useMemo(() => (ASSETS as Asset[]).slice(0, 12), []);

  const heroImages = useMemo(() => {
    const list = featured.slice(0, 6).map(getImage);
    return list.length > 1 ? list : [FALLBACK_IMAGE, FALLBACK_IMAGE];
  }, [featured]);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const id = window.setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroImages.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [heroImages.length]);

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
      <section className="relative mb-12 flex min-h-[70vh] items-center overflow-hidden">
        <div className="absolute inset-0">
          {heroImages.map((src, idx) => (
            <Image
              key={`${src}-${idx}`}
              src={src}
              alt="Stock hero"
              fill
              sizes="100vw"
              className={`object-cover transition-opacity duration-1000 ${
                idx === heroIndex ? 'opacity-100' : 'opacity-0'
              }`}
              priority={idx === 0}
            />
          ))}
          <div className="absolute inset-0 bg-black/15" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/45 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="relative w-full px-4 py-20 sm:px-6 sm:py-28 lg:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto max-w-3xl rounded-3xl bg-background/55 p-5 backdrop-blur sm:p-7">
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
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />

                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search images, people, places, concepts…"
                    className="h-14 w-full rounded-full bg-background/85 pl-12 pr-28 text-sm outline-none backdrop-blur ring-1 ring-border/10 transition focus:ring-2 focus:ring-foreground/20"
                    autoComplete="off"
                  />

                  {q.trim().length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setQ('')}
                      className="absolute right-[5.25rem] top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-muted/30 text-muted-foreground transition hover:bg-muted/40"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}

                  <button
                    type="submit"
                    disabled={!q.trim()}
                    className="absolute right-2 top-1/2 h-10 -translate-y-1/2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Search
                  </button>
                </div>
              </form>

              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push('/stock/search')}
                  className="rounded-full bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
                >
                  Browse all
                </button>
                <button
                  type="button"
                  onClick={() => pushOrLogin('/stock/collections')}
                  className="rounded-full bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
                >
                  Collections
                </button>
              </div>

              {/* Trending */}
              <div className="mt-4 text-xs text-muted-foreground">
                Trending:{' '}
                <button
                  type="button"
                  onClick={() => router.push(buildSearchHref('business'))}
                  className="underline decoration-muted-foreground/30 underline-offset-4 hover:text-foreground"
                >
                  business
                </button>
                <span className="mx-2 text-muted-foreground/60">•</span>
                <button
                  type="button"
                  onClick={() => router.push(buildSearchHref('portrait'))}
                  className="underline decoration-muted-foreground/30 underline-offset-4 hover:text-foreground"
                >
                  portrait
                </button>
                <span className="mx-2 text-muted-foreground/60">•</span>
                <button
                  type="button"
                  onClick={() => router.push(buildSearchHref('nature'))}
                  className="underline decoration-muted-foreground/30 underline-offset-4 hover:text-foreground"
                >
                  nature
                </button>
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
                      {featured.slice(0, 12).map((a) => (
                        <Link
                          key={a.id}
                          href={`/stock/assets/${a.id}`}
                          className="group relative h-28 w-44 shrink-0 snap-start overflow-hidden rounded-xl bg-muted/20 transition hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-foreground/25"
                        >
                          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                              <div className="line-clamp-1 text-xs font-medium text-white/95">
                                {a.title}
                              </div>
                              <div className="ml-2 shrink-0 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-black">
                                View
                              </div>
                            </div>
                          </div>

                          <Image
                            src={getImage(a)}
                            alt={a.title}
                            fill
                            sizes="176px"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Browse helpers */}
      <section className="mb-12 px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="rounded-2xl bg-muted/10 p-5 sm:p-6">
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
              <div className="rounded-2xl bg-muted/10 p-5">
                <div className="text-xs font-medium">Fast licensing</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Clear rights and instant download options.
                </div>
              </div>
              <div className="rounded-2xl bg-muted/10 p-5">
                <div className="text-xs font-medium">Brand-safe search</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Find the right look with keywords and filters.
                </div>
              </div>
              <div className="rounded-2xl bg-muted/10 p-5">
                <div className="text-xs font-medium">Team-ready</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Share, save, and reuse across projects.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
          {featured.map((a) => (
            <Link
              key={a.id}
              href={`/stock/assets/${a.id}`}
              className="group block overflow-hidden rounded-xl bg-muted/10 transition hover:bg-muted/20 focus:outline-none focus:ring-2 focus:ring-foreground/20"
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
                  <span className="shrink-0 rounded-md bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">
                    Featured
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(a.keywords ?? []).slice(0, 3).map((k) => (
                    <span
                      key={k}
                      className="rounded-full bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
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
          ].map((c) => (
            <Link
              key={c.title}
              href={`/stock/search?q=${encodeURIComponent(c.q)}`}
              className="group overflow-hidden rounded-xl bg-muted/10 transition hover:bg-muted/20 focus:outline-none focus:ring-2 focus:ring-foreground/20"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden">
                <Image
                  src={getImage(
                    (ASSETS as Asset[]).find((a) => (a.keywords ?? []).includes(c.q)) ??
                      (featured[0] as Asset)
                  )}
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
          {newest.map((a) => (
            <Link
              key={a.id}
              href={`/stock/assets/${a.id}`}
              className="group block overflow-hidden rounded-xl bg-muted/10 transition hover:bg-muted/20 focus:outline-none focus:ring-2 focus:ring-foreground/20"
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
                  <span className="shrink-0 rounded-md bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">
                    New
                  </span>
                </div>
                <div className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                  {a.description ?? 'Ready to license and use across channels.'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}