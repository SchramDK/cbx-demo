'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, FolderOpen, Link2, ShieldCheck, UploadCloud, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function DriveLanding() {
  const LOGO_SRC = 'https://upload.wikimedia.org/wikipedia/commons/8/82/Nordea.svg';
  const trustedLogos = Array.from({ length: 6 }, () => ({
    name: 'Nordea',
    src: LOGO_SRC,
  }));
  return (
    <div className="min-h-[calc(100vh-4rem)] w-full">
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
          <div className="absolute inset-0 opacity-35">
            <Image
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=2200&q=60"
              alt="Team collaborating"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-4 py-28 sm:px-6 sm:py-40 lg:px-10">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <span className="font-medium text-foreground">Share</span>
              <span>— secure workspace for files and approvals</span>
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Share files with your team —
              <span className="text-muted-foreground"> without losing control</span>
            </h1>

            <p className="mt-7 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Colourbox Share is a secure workspace for collecting uploads, organizing files,
              and sharing approved content — with full visibility, status and traceability.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="gap-2">
                <Link href={`/login?returnTo=${encodeURIComponent('/drive')}`}>
                  Log in to Share <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/stock">Browse Stock</Link>
              </Button>
            </div>
        </div>
      </section>

      {/* Trusted by */}
      <section className="border-b bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Trusted by teams who work with content
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Marketing teams, agencies and communications departments.
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Case studies →</div>
          </div>

          <div className="relative mt-6 overflow-hidden rounded-2xl bg-muted/10">
            {/* Edge fade */}
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent" />

            <div className="flex w-full items-center gap-10 py-6 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
              <div className="flex min-w-full items-center gap-16 animate-[marquee_28s_linear_infinite]">
                {trustedLogos.map((l, i) => (
                  <div key={`${l.name}-${i}`} className="flex items-center opacity-80">
                    <div className="relative h-8 w-28">
                      <Image
                        src={l.src}
                        alt={l.name}
                        fill
                        className="object-contain opacity-60 brightness-0 dark:invert"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex min-w-full items-center gap-16 animate-[marquee_28s_linear_infinite]" aria-hidden="true">
                {trustedLogos.map((l, i) => (
                  <div key={`dup-${l.name}-${i}`} className="flex items-center opacity-80">
                    <div className="relative h-8 w-28">
                      <Image
                        src={l.src}
                        alt={l.name}
                        fill
                        className="object-contain opacity-60 brightness-0 dark:invert"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <style jsx>{`
            @keyframes marquee {
              0% { transform: translateX(0); }
              100% { transform: translateX(-100%); }
            }
          `}</style>
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            icon={<UploadCloud className="h-5 w-5" />}
            title="Collect uploads"
            desc="Invite contributors with a link and get files in the right place from day one."
          />
          <Card
            icon={<FolderOpen className="h-5 w-5" />}
            title="Stay organized"
            desc="Folders, clear naming, and consistent structure — so your library doesn’t turn into chaos."
          />
          <Card
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Keep control"
            desc="Know what’s approved, what’s pending, and what’s safe to use — all in one view."
          />
        </div>
      </section>

      <section className="border-t">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-10">
          <h2 className="text-xl font-semibold tracking-tight">Share vs Stock</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Share is built for internal collaboration on your own files — Stock is for finding ready-to-use visuals.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border bg-background p-5">
              <div className="text-sm font-semibold">Stock</div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• Find licensed images</li>
                <li>• Ready-to-use visuals</li>
                <li>• External marketplace</li>
              </ul>
            </div>
            <div className="rounded-2xl border bg-background p-5">
              <div className="text-sm font-semibold">Share</div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• Collect your own files</li>
                <li>• Internal collaboration</li>
                <li>• Uploads, approvals and structure</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <h2 className="text-xl font-semibold tracking-tight">What teams use Share for</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Built for marketing, comms and content teams that need a simple, reliable way to collaborate on files.
              </p>

              <ul className="mt-6 space-y-4">
                <Li icon={<Users className="h-4 w-4" />}>
                  Photoshoots & campaigns — collect files from photographers and keep selects and approvals in one place.
                </Li>
                <Li icon={<Link2 className="h-4 w-4" />}>
                  Agency collaboration — let agencies upload deliverables without access to your entire library.
                </Li>
                <Li icon={<ShieldCheck className="h-4 w-4" />}>
                  Internal sharing — share approved files with marketing and comms without email chaos.
                </Li>
              </ul>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button asChild className="gap-2">
                  <Link href={`/login?returnTo=${encodeURIComponent('/drive')}`}>
                    Get access <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/stock/search">Search Stock</Link>
                </Button>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-2xl border bg-background p-5 sm:p-6">
                <div className="text-sm font-semibold">How it works</div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Step
                    n="1"
                    title="Create a space"
                    desc="Set up a folder for a campaign, shoot or project."
                  />
                  <Step
                    n="2"
                    title="Invite uploads"
                    desc="Share a link and let contributors upload directly."
                  />
                  <Step
                    n="3"
                    title="Approve & share"
                    desc="Review, approve and share the right files with the team."
                  />
                </div>

                <div className="mt-6 rounded-xl border bg-muted/20 p-4">
                  <div className="text-xs font-medium text-muted-foreground">Pro tip</div>
                  <div className="mt-1 text-sm">
                    Use Share together with Stock: find the right visuals in Stock and store the final selects in Share.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/10">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-10">
          <h3 className="text-sm font-semibold">Built for teams who work with content every day</h3>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Marketing teams, communication departments, agencies and in-house creatives use Share to stay organized.
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-10">
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border bg-background p-6 sm:flex-row sm:items-center">
            <div>
              <div className="text-sm font-semibold">Ready to get started with Share?</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Log in to access Share and start organizing your team’s content.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild className="gap-2">
                <Link href={`/login?returnTo=${encodeURIComponent('/drive')}`}>
                  Log in <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/stock">Browse Stock</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Card({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border bg-background p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-muted/30">
          {icon}
        </span>
        {title}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Li({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg border bg-background">
        {icon}
      </span>
      <span className="text-sm text-muted-foreground">{children}</span>
    </li>
  );
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border bg-muted/30 text-xs font-semibold">
          {n}
        </span>
        <div className="text-sm font-semibold">{title}</div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{desc}</div>
    </div>
  );
}
