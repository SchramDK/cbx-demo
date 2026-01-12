'use client';

import { useRouter } from 'next/navigation';
import { useProtoAuth } from '@/lib/proto-auth';
import { AuthGate } from '@/components/auth-gate';
import { LayoutGrid, Image, ArrowRight, Sparkles, UploadCloud, Search } from 'lucide-react';

import NextImage from 'next/image';
import { ASSETS } from '@/lib/demo/assets';

const newsItems = [
  {
    date: '2026-01-12',
    title: 'New Home & navigation',
    description: 'A new Home experience plus a simplified left navigation to switch between Share and Stock.',
    badge: 'UI',
  },
  {
    date: '2026-01-10',
    title: 'Prototype login flow',
    description: 'You can now log in/out in the prototype and keep your place with return-to routing.',
    badge: 'Auth',
  },
];

const quickActions = [
  { label: 'Upload files', href: '/drive', hint: 'Start in Share', icon: UploadCloud },
  { label: 'Find images', href: '/stock', hint: 'Search Stock', icon: Search },
];

export default function HomePage() {
  const router = useRouter();
  const { user } = useProtoAuth();

  // Demo images from the existing demo asset list
  const heroSrcs = ASSETS.slice(0, 4)
    .map((a) => (a as any).preview ?? (a as any).src ?? (a as any).url)
    .filter(Boolean) as string[];

  const shareThumb = heroSrcs[0] ?? '/placeholders/stock_1.jpg';
  const stockThumb = heroSrcs[1] ?? '/placeholders/stock_2.jpg';

  return (
    <AuthGate requireAuth redirectTo="/login">
      <div className="w-full space-y-8 overflow-x-clip">
      <section className="relative w-full overflow-hidden border bg-muted/20 py-10 sm:py-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-foreground/5 blur-3xl" />
          <div className="absolute -bottom-28 -left-28 h-80 w-80 rounded-full bg-foreground/5 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background/60 to-transparent" />
        </div>

        <div className="relative px-4 sm:px-6 lg:px-10">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Home</span>
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Welcome{user?.name ? `, ${user.name}` : ''}
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Your workspace for files and visuals. Jump into Share to collect uploads and organize files, or explore Stock to find the right visuals.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => router.push('/drive')}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition hover:bg-foreground/90 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
                >
                  Open Share <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => router.push('/stock')}
                  className="inline-flex h-11 items-center gap-2 rounded-full border bg-background px-5 text-sm font-medium transition hover:bg-muted hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                >
                  Browse Stock <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border bg-background/70 px-3 py-1">Fast upload links</span>
                <span className="rounded-full border bg-background/70 px-3 py-1">Clear approvals</span>
                <span className="rounded-full border bg-background/70 px-3 py-1">Cart works logged-out</span>
              </div>
            </div>

          {/* Image mosaic */}
          <div className="hidden md:block">
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="group relative aspect-[4/3] overflow-hidden rounded-xl border bg-muted">
                  {heroSrcs[i] ? (
                    <NextImage
                      src={heroSrcs[i]}
                      alt="Preview"
                      fill
                      sizes="(min-width: 768px) 40vw, 100vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      priority={i === 0}
                    />
                  ) : null}
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Recent visuals from Stock
            </div>
          </div>
        </div>
        </div>
      </section>
      <div className="px-4 sm:px-6 lg:px-10 space-y-8">

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <button
          onClick={() => router.push('/drive')}
          className="group relative overflow-hidden rounded-xl border p-5 text-left transition hover:border-foreground/20 hover:bg-muted/50"
        >
          <div className="group relative mb-4 aspect-[16/9] overflow-hidden rounded-lg border bg-muted">
            <NextImage
              src={shareThumb}
              alt="Share preview"
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-medium">Share</h2>

          <p className="mt-3 text-sm text-muted-foreground">
            Collect uploads, structure folders, and share approved files with your team.
          </p>

          <div className="mt-5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Continue</span>
            <span className="font-medium text-foreground">Open Share →</span>
          </div>
        </button>

        <button
          onClick={() => router.push('/stock')}
          className="group relative overflow-hidden rounded-xl border p-5 text-left transition hover:border-foreground/20 hover:bg-muted/50"
        >
          <div className="group relative mb-4 aspect-[16/9] overflow-hidden rounded-lg border bg-muted">
            <NextImage
              src={stockThumb}
              alt="Stock preview"
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
            <Image className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-medium">Stock</h2>

          <p className="mt-3 text-sm text-muted-foreground">
            Browse, search, and manage stock images and visual assets.
          </p>

          <div className="mt-5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Continue</span>
            <span className="font-medium text-foreground">Open Stock →</span>
          </div>
        </button>
      </div>

      <section className="w-full rounded-xl border p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold">Quick actions</h2>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={() => router.push(a.href)}
              className="rounded-full border bg-background px-4 py-2 text-sm transition hover:bg-muted"
            >
              <span className="inline-flex items-center gap-2 font-medium">
                {a.icon ? <a.icon className="h-4 w-4" /> : null}
                {a.label}
              </span>
              <span className="ml-2 text-xs text-muted-foreground">{a.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="w-full rounded-xl border p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          <div className="text-xs text-muted-foreground">Demo</div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-background p-4">
            <div className="text-xs text-muted-foreground">Share</div>
            <div className="mt-1 font-medium">2 folders updated</div>
            <div className="mt-1 text-sm text-muted-foreground">“Campaign uploads” • “Press kit”</div>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <div className="text-xs text-muted-foreground">Stock</div>
            <div className="mt-1 font-medium">3 assets added to cart</div>
            <div className="mt-1 text-sm text-muted-foreground">Ready to license when you are</div>
          </div>
        </div>
      </section>

      <section id="news" className="w-full rounded-xl border p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">What’s new</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Updates and changes across Share and Stock.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">Short updates from the prototype</div>
        </div>

        <div className="mt-5 space-y-4">
          {newsItems.map((item) => (
            <article key={`${item.date}-${item.title}`} className="rounded-xl border bg-background p-4 transition hover:bg-muted/20">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <time className="text-xs text-muted-foreground">{item.date}</time>
                {item.badge ? (
                  <span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <h3 className="mt-2 font-medium">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </article>
          ))}
        </div>
        <div className="mt-5 border-t pt-4">
          <button
            onClick={() => router.push('/home#news')}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all updates →
          </button>
        </div>
      </section>
      </div>
    </div>
    </AuthGate>
  );
}