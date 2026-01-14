"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { getOrder } from "@/lib/stock/commerce";
import { Button } from "@/components/ui/button";

type DemoUser = { id: string; name: string; org: string };

function safeFilename(name: string) {
  const cleaned = name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-zA-Z0-9._\- ]/g, "")
    .slice(0, 80);
  return cleaned || "download";
}

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const parts = document.cookie.split(";").map((p) => p.trim());
  const prefix = `${name}=`;
  const hit = parts.find((p) => p.startsWith(prefix));
  if (!hit) return undefined;
  return decodeURIComponent(hit.slice(prefix.length));
}

function FullscreenLoader({ hint }: { hint?: string }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-background text-foreground"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4 px-6">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-transparent" />
          <p className="text-sm font-medium">Loading…</p>
        </div>
        <p className="max-w-md text-center text-xs text-muted-foreground">
          {hint ?? "Preparing your account and downloads."}
        </p>
      </div>
    </div>,
    document.body
  );
}

export default function StockDownloadPage() {
  return (
    <Suspense fallback={<FullscreenLoader hint="Loading download page…" />}>
      <StockDownloadInner />
    </Suspense>
  );
}

function StockDownloadInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const didNotifyReadyRef = useRef(false);
  const meFetchInFlightRef = useRef<Promise<void> | null>(null);
  const didRefetchAfterDelayRef = useRef(false);

  const syncAuthUI = useCallback(() => {
    // Notify menus/layout listeners that auth state may have changed, then refresh server components.
    try {
      const ev = new CustomEvent("cbx:auth-changed");
      window.dispatchEvent(ev);
      document.dispatchEvent(ev);

      // Repeat shortly after to avoid timing issues with listeners mounting.
      window.setTimeout(() => {
        try {
          const ev2 = new CustomEvent("cbx:auth-changed");
          window.dispatchEvent(ev2);
          document.dispatchEvent(ev2);
        } catch {
          // ignore
        }
      }, 250);
    } catch {
      // ignore
    }

    router.refresh();
  }, [router]);

  const fetchDemoMe = useCallback(async (signal?: AbortSignal) => {
    if (meFetchInFlightRef.current) {
      await meFetchInFlightRef.current;
      return;
    }

    const p = (async () => {
      try {
        const res = await fetch("/api/demo-auth/me", { cache: "no-store", signal });
        if (!res.ok) {
          // If the endpoint errors, treat as signed-out.
          throw new Error(`ME_FETCH_${res.status}`);
        }
        const text = await res.text().catch(() => "");
        const json = (() => {
          try {
            return text ? JSON.parse(text) : null;
          } catch {
            return null;
          }
        })();
        setDemoUser(json?.user ?? null);
      } catch {
        setDemoUser(null);
      } finally {
        // Always allow the UI to continue; abort/unmount should not leave a permanent loader.
        setMeLoaded(true);
      }
    })();

    meFetchInFlightRef.current = p.then(() => undefined);
    try {
      await meFetchInFlightRef.current;
    } finally {
      meFetchInFlightRef.current = null;
    }
  }, []);

  const [demoUser, setDemoUser] = useState<DemoUser | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [didAutoReload, setDidAutoReload] = useState(false);
  const [minDelayDone, setMinDelayDone] = useState(false);

// Load current demo user (client-side)
useEffect(() => {
    const ac = new AbortController();
  
    void (async () => {
      await fetchDemoMe(ac.signal);
    })();
  
    return () => {
      ac.abort();
    };
  }, [fetchDemoMe]);

  // Keep the fullscreen loader visible for at least 2 seconds for a smoother experience.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setMinDelayDone(true);
    }, 2000);

    return () => {
      window.clearTimeout(t);
    };
  }, []);

  // Mark cookies as readable after mount, then do a short delayed refresh to pick up late-set cookies after checkout.
  // (Avoid a second full 5s loader delay — Suspense already covers the first paint.)
  useEffect(() => {
    const t = window.setTimeout(() => {
      void (async () => {
        let didRefetch = false;

        // Cookies can be set slightly late after checkout; re-fetch /me once shortly after mount
        // Only do this if the initial fetch finished and we still have no user.
        if (meLoaded && !demoUser && !didRefetchAfterDelayRef.current) {
          didRefetchAfterDelayRef.current = true;
          try {
            await fetchDemoMe();
            didRefetch = true;
          } catch {
            // ignore
          }
        }
        
        let willReload = false;

        // Some redirects set cookies slightly late; reload once to ensure state is up-to-date.
        try {
          const key = "cbx_demo_download_reloaded_v1";
          const already = sessionStorage.getItem(key) === "1";
          if (!already) {
            sessionStorage.setItem(key, "1");

            const url = new URL(window.location.href);
            const hasOrderId = (url.searchParams.get("orderId") ?? "").trim().length > 0;
            const hasAssetId = (url.searchParams.get("assetId") ?? url.searchParams.get("id") ?? "").trim().length > 0;

            // Only reload when we are on the order-download overview and orderId is missing.
            if (!hasOrderId && !hasAssetId) {
                willReload = true;
                setDidAutoReload(true);
                window.location.reload();
              }
          }
        } catch {
          // ignore
        }

        // Refresh the shell only if we actually refetched (late cookies) and we are not reloading.
        if (didRefetch && !willReload) {
          syncAuthUI();
        }
      })();
    }, 500);

    return () => {
      window.clearTimeout(t);
    };
  }, [fetchDemoMe, syncAuthUI, meLoaded, demoUser]);

  const assetId = (sp.get("assetId") ?? sp.get("id") ?? "").trim() || undefined;
  const title = (sp.get("title") ?? sp.get("name") ?? "").trim() || undefined;
  const orderId = (sp.get("orderId") ?? "").trim() || undefined;
  const format = ((sp.get("format") ?? "JPG").trim() || "JPG").toUpperCase();
  const size = ((sp.get("size") ?? "XL").trim() || "XL").toUpperCase();
  const license = (sp.get("license") ?? "Standard").trim();
  const next = (sp.get("next") ?? "").trim() || undefined;


  const resolvedOrderId = useMemo(() => {
    if (orderId) return orderId;
    const c = getCookie("cbx_demo_last_order_id");
    return c || undefined;
  }, [orderId]);

  const showAccountCreatedBanner = useMemo(() => {
    if (!demoUser) return false;
    const tsRaw = getCookie("cbx_demo_last_order_ts");
    const ts = tsRaw ? Number(tsRaw) : NaN;
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < 2 * 60 * 1000;
  }, [demoUser]);

  const purchased = useMemo(() => {
    if (!resolvedOrderId) return [] as any[];
    try {
      const order = getOrder(resolvedOrderId) as any;
      return (order?.items ?? []) as any[];
    } catch {
      return [] as any[];
    }
  }, [resolvedOrderId]);


  const isBootstrapping = !meLoaded || !minDelayDone || didAutoReload;

  useEffect(() => {
    if (isBootstrapping) return;
    if (didNotifyReadyRef.current) return;
    didNotifyReadyRef.current = true;

    syncAuthUI();
  }, [isBootstrapping, demoUser, syncAuthUI]);
  if (isBootstrapping) {
    return <FullscreenLoader />;
  }

  // Landing page: can be reached from checkout OR as a first-time user welcome.
  if (!assetId) {
    const orderDownloadHref = resolvedOrderId
      ? `/api/stock/download?orderId=${encodeURIComponent(resolvedOrderId)}`
      : undefined;

    return (
      <main className="mx-auto w-full max-w-6xl bg-background px-4 pb-10 pt-[calc(var(--cbx-topbar)+24px)] text-foreground sm:pt-[calc(var(--cbx-topbar-sm)+24px)]">
        {showAccountCreatedBanner ? (
          <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Account created</p>
            <p className="mt-1 text-sm text-emerald-700/90 dark:text-emerald-200">
              You’re now signed in as <span className="font-semibold">{demoUser?.name}</span> • {demoUser?.org}. Your purchases will be available in Drive.
            </p>
          </div>
        ) : null}

        <section className="mb-6 overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-primary/10 to-transparent p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Welcome to Colourbox + Drive</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Your account is ready 🎉</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                You’re signed in and ready to work. Upload your own files to Drive, or browse Stock to download your first images —
                everything stays organised and saved.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/drive">Open Drive</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/stock">Browse Stock</Link>
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">Step 1</p>
              <p className="mt-1 text-sm font-semibold text-foreground">Upload to Drive</p>
              <p className="mt-1 text-xs text-muted-foreground">Drag & drop your own files and keep everything in one place.</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">Step 2</p>
              <p className="mt-1 text-sm font-semibold text-foreground">Find Stock images</p>
              <p className="mt-1 text-xs text-muted-foreground">Search and download assets — they’re saved to Drive automatically.</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">Step 3</p>
              <p className="mt-1 text-sm font-semibold text-foreground">Share & collaborate</p>
              <p className="mt-1 text-xs text-muted-foreground">Send links, keep rights info, and stay organised.</p>
            </div>
          </div>
        </section>


        <div className="rounded-2xl border border-border bg-card p-6">

          {purchased.length ? (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Your downloads</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Everything you just purchased — ready to download.</p>
                </div>
                <span className="text-xs text-muted-foreground">{purchased.length} item{purchased.length === 1 ? "" : "s"}</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {purchased.map((it: any) => {
                  const id = String(it.assetId ?? it.id ?? "");
                  const t = String(it.title ?? it.name ?? `Asset #${id}`);
                  const thumb =
                    it.thumbUrl ??
                    it.thumbnailUrl ??
                    it.previewUrl ??
                    it.image ??
                    it.preview ??
                    it.thumbnail ??
                    it.asset?.thumbUrl ??
                    it.asset?.thumbnailUrl ??
                    it.asset?.previewUrl ??
                    it.asset?.image ??
                    it.asset?.preview ??
                    it.asset?.thumbnail ??
                    null;
                  const perAssetHref = id
                    ? `/api/stock/download?assetId=${encodeURIComponent(id)}&size=${encodeURIComponent(size)}&format=${encodeURIComponent(format)}`
                    : null;
                  // For badge values, use the current size/format as in the query string
                  return (
                    <div key={id || t} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                      <div className="h-16 w-16 overflow-hidden rounded-xl bg-muted">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt={t} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">No preview</div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{t}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground">#{id}</span>
                          <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground">{size} • {format}</span>
                        </div>
                      </div>

                      {perAssetHref ? (
                        <Button asChild variant="secondary" size="sm" className="shrink-0">
                          <a href={perAssetHref} download>
                            Download
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-2 rounded-2xl border border-border bg-muted/20 p-6">
              <p className="text-sm font-semibold text-foreground">No downloads yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                If you just completed checkout, give it a moment — or open Drive to manage your files and find any downloads.
              </p>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button asChild>
                  <Link href="/drive">Open Drive</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/stock">Browse Stock</Link>
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">✅ Files saved in Drive</span>
                <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">⚡ Fast downloads</span>
                <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">🔒 Rights info included</span>
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-border pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Everything is saved in <span className="font-medium text-foreground">Drive</span>.
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild>
                  <Link href="/drive">Open Drive</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/stock">Browse Stock</Link>
                </Button>
              </div>
            </div>
            {orderDownloadHref ? (
              <div className="mt-5">
                <Button asChild variant="secondary" className="w-full">
                  <a href={orderDownloadHref} download>
                    Download all files
                  </a>
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">Downloads everything from this order in one file</p>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  const displayTitle = title ?? `Asset #${assetId}`;
  const filename = safeFilename(displayTitle);

  const downloadHref = `/api/stock/download?assetId=${encodeURIComponent(assetId)}&size=${encodeURIComponent(
    size
  )}&format=${encodeURIComponent(format)}`;

  return (
    <main className="mx-auto w-full max-w-6xl bg-background px-4 pb-10 pt-[calc(var(--cbx-topbar)+24px)] text-foreground sm:pt-[calc(var(--cbx-topbar-sm)+24px)]">
      {showAccountCreatedBanner ? (
        <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Account created</p>
          <p className="mt-1 text-sm text-emerald-700/90 dark:text-emerald-200">
            You’re now signed in as <span className="font-semibold">{demoUser?.name}</span> • {demoUser?.org}. Your purchases will be available in Drive.
          </p>
        </div>
      ) : null}

      <header className="mb-8">
        <p className="text-xs font-medium text-muted-foreground">Download</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Download file</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">Download this file now — and find all your purchases in Drive.</p>

        {demoUser ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="text-muted-foreground">Signed in as</span>
            <span className="font-semibold text-foreground">{demoUser.name}</span>
            <span className="text-muted-foreground/60">•</span>
            <span className="text-muted-foreground">{demoUser.org}</span>
          </div>
        ) : null}
      </header>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Your download</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{displayTitle}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Choose size and format, then download the file.</p>
          </div>

          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <Link href={next ?? "/stock"}>Back</Link>
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl border border-border bg-muted/40 p-4 sm:grid-cols-2">
          <div className="rounded-xl bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Asset</p>
            <p className="mt-1 text-sm font-semibold text-foreground">#{assetId}</p>
            <p className="mt-2 text-xs text-muted-foreground">Filename: {filename}.{format.toLowerCase()}</p>
          </div>

          <div className="rounded-xl bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">License</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{license}</p>
            <p className="mt-2 text-xs text-muted-foreground">Always verify usage rights before publishing.</p>
          </div>

          <div className="rounded-xl bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Size</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{size}</p>
            <p className="mt-2 text-xs text-muted-foreground">Use M for web and XL for print.</p>
          </div>

          <div className="rounded-xl bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Format</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{format}</p>
            <p className="mt-2 text-xs text-muted-foreground">JPG is usually best for photos.</p>
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Everything is saved in <span className="font-medium text-foreground">Drive</span>.
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild>
                <Link href="/drive">Open Drive</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/stock">Browse Stock</Link>
              </Button>
            </div>
          </div>
          <div className="mt-5">
            <Button asChild variant="secondary" className="w-full">
              <a href={downloadHref} download>
                Download file
              </a>
            </Button>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-4 max-w-6xl text-center text-xs text-muted-foreground">
        If you link to this page from an asset view, you can pass:
        <span className="font-mono"> ?assetId=…&title=…&size=…&format=…</span>.
      </p>
    </main>
  );
}

