'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

import { STOCK_ASSETS as ASSETS } from '@/lib/demo/stock-assets';

const fallbackImage = '/default-preview.png';

type Asset = {
  id: string;
  title: string;
  preview: string;
  category: string;
};

export default function AssetPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const assets = ASSETS;
  const asset = assets.find((a) => a.id === params.id);

  if (!asset) {
    return <div>Asset not found</div>;
  }

  return (
    <main className="p-4">
      <h1>{asset.title}</h1>
      <Image src={asset.preview || fallbackImage} alt={asset.title} width={600} height={400} />

      <section className="mt-8">
        <h2>Related / Similar images</h2>
        <div className="grid grid-cols-4 gap-4 mt-4">
          {(() => {
            const sameCategory = assets.filter(
              (a) => a.id !== asset.id && a.category === asset.category
            );

            const fallback = assets.filter((a) => a.id !== asset.id);

            const combined = [...sameCategory, ...fallback];

            const unique: Asset[] = [];
            const seen = new Set<string>();

            for (const a of combined) {
              if (seen.has(a.id)) continue;
              seen.add(a.id);
              unique.push(a);
              if (unique.length === 4) break;
            }

            return unique;
          })().map((a) => (
            <Link key={a.id} href={`/stock/assets/${a.id}`} className="block">
              <Image src={a.preview || fallbackImage} alt={a.title} width={150} height={100} />
              <p>{a.title}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}