'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

import { ASSETS } from '@/lib/demo/assets';

// ---- Types ----
type Asset = {
  id: string;
  title: string;
  description?: string;
  keywords?: string[];
  image?: string;
  [key: string]: any;
};

// ---- Helpers ----
function getImage(asset: Asset) {
  return (
    asset.image ||
    `https://picsum.photos/seed/${asset.id}/600/450`
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}

export default function StockSearchPage() {
  const searchParams = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return ASSETS as Asset[];

    return (ASSETS as Asset[]).filter((asset) => {
      const haystack = [asset.title, asset.description, ...(asset.keywords ?? [])]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [q]);

  return (
    <div className="w-full px-4 py-6">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {q ? `Results for “${q}”` : 'Browse stock images'}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {q
            ? `Showing ${results.length} matching assets from the stock library.`
            : 'Explore curated stock images ready for campaigns, websites, and social media.'}
        </p>
      </header>

      {/* Meta row */}
      <div className="mb-5 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {results.length} asset{results.length === 1 ? '' : 's'}
        </span>
        <span className="hidden sm:inline">Sorted by relevance</span>
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <h2 className="text-sm font-medium">No results found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a different keyword or browse popular categories from the Stock page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {results.slice(0, 40).map((asset) => (
            <Link
              key={asset.id}
              href={`/stock/assets/${asset.id}`}
              className="group overflow-hidden rounded-xl border bg-background transition hover:border-foreground/20"
            >
              {/* Image */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                <Image
                  src={getImage(asset)}
                  alt={asset.title}
                  fill
                  sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Meta */}
              <div className="p-3">
                <div className="line-clamp-1 text-sm font-medium">{asset.title}</div>
                <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  {(asset.keywords ?? []).slice(0, 3).join(' · ') || 'Stock image'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Footer hint */}
      <div className="mt-8 text-xs text-muted-foreground">
        {q
          ? `Showing ${Math.min(results.length, 40)} of ${results.length} results`
          : `Showing ${Math.min(results.length, 40)} of ${results.length} assets`}
      </div>
    </div>
  );
}
