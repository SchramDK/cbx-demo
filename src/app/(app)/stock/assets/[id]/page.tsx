'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ASSETS } from '@/lib/demo/assets';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/cart/cart-context';
import { useProtoAuth } from '@/lib/proto-auth';

type Asset = {
  id: string;
  title: string;
  description?: string;
  keywords?: string[];
  tags?: string[];
  preview?: string;
  src?: string;
  image?: string;
  url?: string;
};

const getAssetImage = (asset?: Asset) =>
  asset?.preview ?? asset?.src ?? asset?.image ?? asset?.url ?? '';

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

  const fallbackImage = useMemo(() => getAssetImage(assets[0]) ?? '', [assets]);
  const imageSrc = asset ? getAssetImage(asset) ?? fallbackImage : fallbackImage;
  const title = asset?.title ?? 'Asset';
  const tags = pickTags(asset);

  const assetId = asset?.id ?? id;
  const returnTo = `/stock/assets/${assetId}`;

  const priceStandard = 9;
  const priceExtended = 29;
  const [license, setLicense] = useState<'standard' | 'extended'>('standard');
  const [added, setAdded] = useState(false);

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
        <div className="relative max-h-[calc(100vh-180px)] overflow-hidden rounded-2xl border border-border bg-muted/20">
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
        </div>

        <Card className="p-4 lg:sticky lg:top-24 h-fit">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Royalty-free · Instant download</span>
            <span className="font-medium text-foreground/80">From €{priceStandard}</span>
          </div>
          <h1 className="text-xl font-semibold leading-tight sm:text-2xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">by Colourbox / Demo Photographer</p>
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
            const idx = Math.max(0, assets.findIndex((a) => a.id === assetId));
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
                src={getAssetImage(a) ?? fallbackImage}
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
    </main>
  );
}