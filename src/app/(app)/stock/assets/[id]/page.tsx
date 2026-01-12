'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/cart/cart-context';
import { useProtoAuth } from '@/lib/proto-auth';

const UNSPLASH_IDS = [
  '1542291026-7eec264c27ff',
  '1520975869018-5b8b4f87e4b4',
  '1519681393784-d120267933ba',
  '1482192596544-9eb780fc7f66',
  '1500530855697-b586d89ba3ee',
  '1520975916090-3105956dac38',
  '1516455207990-7a41ce80f7ee',
  '1519996529931-28324d5a630e',
  '1489515217757-5fd1be406fef',
  '1517487881594-2787fef5ebf7',
] as const;

function getDemoAsset(id: string) {
  const n = Math.max(1, Number(id) || 1);
  const photoId = UNSPLASH_IDS[(n - 1) % UNSPLASH_IDS.length];

  return {
    id: String(n),
    title: `Winter Lifestyle ${n}`,
    src: `https://images.unsplash.com/photo-${photoId}?q=80&w=2000&auto=format&fit=crop`,
    photographer: 'Colourbox / Demo Photographer',
    tags: ['winter', 'people', 'lifestyle'],
    priceStandard: 9,
    priceExtended: 29,
  };
}

export default function StockAssetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isReady, isLoggedIn } = useProtoAuth();
  const loggedIn = isReady && isLoggedIn;
  const { addItem } = useCart();

  const asset = useMemo(() => getDemoAsset(id), [id]);
  const [license, setLicense] = useState<'standard' | 'extended'>('standard');
  const [added, setAdded] = useState(false);

  const price = license === 'standard' ? asset.priceStandard : asset.priceExtended;

  const returnTo = `/stock/assets/${asset.id}`;
  const goLogin = () => router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);

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
        <div className="relative overflow-hidden rounded-2xl border border-border bg-black">
          <Image
            src={asset.src}
            alt={asset.title}
            width={2000}
            height={1400}
            priority
            className="w-full object-contain motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-300"
          />
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
        </div>

        <Card className="p-4">
          <h1 className="text-xl font-semibold leading-tight">{asset.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">by {asset.photographer}</p>
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
            {asset.tags.map((t) => (
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
                <span className="font-semibold">€{asset.priceStandard}</span>
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
                <span className="font-semibold">€{asset.priceExtended}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Print, ads, large distribution</p>
            </button>
          </div>

          <Button
            className="mt-4 w-full gap-2"
            onClick={() => {
              addItem({
                id: asset.id,
                title: asset.title,
                license,
                price,
                image: asset.src,
              });
              setAdded(true);
              window.setTimeout(() => setAdded(false), 2000);
            }}
          >
            <ShoppingCart className="h-4 w-4" /> {added ? 'Added' : 'Add to cart'} · €{price}
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
          {[1, 2, 3, 4].map((n) => {
            const idx = (Number(asset.id) + n - 1) % UNSPLASH_IDS.length;
            const src = `https://images.unsplash.com/photo-${UNSPLASH_IDS[idx]}?q=80&w=800&auto=format&fit=crop`;

            return (
              <Link
                key={n}
                href={`/stock/assets/${Number(asset.id) + n}`}
                className="group overflow-hidden rounded-lg border border-border"
              >
                <Image
                  src={src}
                  alt={`Similar image ${n}`}
                  width={800}
                  height={800}
                  className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                />
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}