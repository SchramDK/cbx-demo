"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getOrder } from "@/lib/stock/commerce";

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

export default function StockDownloadPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const didNotifyReadyRef = useRef(false);

  const notifyAuthChanged = () => {
    try {
      window.dispatchEvent(new CustomEvent("cbx:auth-changed"));
    } catch {
      // ignore
    }
  };

  const [demoUser, setDemoUser] = useState<DemoUser | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [cookiesReady, setCookiesReady] = useState(false);
  const [minDelayDone, setMinDelayDone] = useState(false);
  const [didAutoReload, setDidAutoReload] = useState(false);

  // Load current demo user (client-side)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/demo-auth/me", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        setDemoUser(json?.user ?? null);
      } catch {
        if (!cancelled) setDemoUser(null);
      } finally {
        if (!cancelled) {
          setMeLoaded(true);
          // Let menus/layout listeners know auth state may have changed
          notifyAuthChanged();
          // Force App Router to re-render server components/layouts that read auth cookies
          router.refresh();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Mark cookies as readable after mount, ensure loader is visible for 5s, and optionally reload ONCE to pick up late-set cookies after checkout
  useEffect(() => {
    setCookiesReady(true);

    // Ensure the fullscreen loader is visible for at least 5 seconds.
    const t = window.setTimeout(() => {
      setMinDelayDone(true);
      // When loader finishes, refresh app shell so top/left menus update
      notifyAuthChanged();
      router.refresh();

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
            setDidAutoReload(true);
            window.location.reload();
          }
        }
      } catch {
        // ignore
      }
    }, 5000);

    return () => {
      window.clearTimeout(t);
    };
  }, [router]);

  const assetId = (sp.get("assetId") ?? sp.get("id") ?? "").trim() || undefined;
  const title = (sp.get("title") ?? sp.get("name") ?? "").trim() || undefined;
  const orderId = (sp.get("orderId") ?? "").trim() || undefined;
  const format = ((sp.get("format") ?? "JPG").trim() || "JPG").toUpperCase();
  const size = ((sp.get("size") ?? "XL").trim() || "XL").toUpperCase();
  const license = (sp.get("license") ?? "Standard").trim();
  const next = (sp.get("next") ?? "").trim() || undefined;


  const resolvedOrderId = useMemo(() => {
    if (orderId) return orderId;
    if (!cookiesReady) return undefined;
    const c = getCookie("cbx_demo_last_order_id");
    return c || undefined;
  }, [orderId, cookiesReady]);

  const showAccountCreatedBanner = useMemo(() => {
    if (!cookiesReady) return false;
    if (!demoUser) return false;
    const tsRaw = getCookie("cbx_demo_last_order_ts");
    const ts = tsRaw ? Number(tsRaw) : NaN;
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < 2 * 60 * 1000;
  }, [cookiesReady, demoUser]);

  const purchased = useMemo(() => {
    if (!resolvedOrderId) return [] as any[];
    try {
      const order = getOrder(resolvedOrderId) as any;
      return (order?.items ?? []) as any[];
    } catch {
      return [] as any[];
    }
  }, [resolvedOrderId]);

  const isBootstrapping = !cookiesReady || !meLoaded || !minDelayDone || didAutoReload;

  useEffect(() => {
    if (isBootstrapping) return;
    if (didNotifyReadyRef.current) return;
    didNotifyReadyRef.current = true;

    notifyAuthChanged();
    router.refresh();
  }, [isBootstrapping, router]);
  if (isBootstrapping) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background text-foreground" aria-busy="true" aria-live="polite">
        <div className="flex flex-col items-center gap-4 px-6">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-transparent" />
            <p className="text-sm font-medium">Loading…</p>
          </div>
          <p className="max-w-md text-center text-xs text-muted-foreground">Preparing your account and downloads.</p>
        </div>
      </div>
    );
  }

  // If we arrive from checkout, we might not have an assetId.
  if (!assetId) {
    const orderDownloadHref = resolvedOrderId
      ? `/api/stock/download?orderId=${encodeURIComponent(resolvedOrderId)}`
      : undefined;

    return (
      <main className="mx-auto w-full max-w-3xl bg-background px-4 py-10 text-foreground">
        {showAccountCreatedBanner ? (
          <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Account created</p>
            <p className="mt-1 text-sm text-emerald-700/90 dark:text-emerald-200">
              You’re now signed in as <span className="font-semibold">{demoUser?.name}</span> • {demoUser?.org}. Your purchases will be available in Drive.
            </p>
          </div>
        ) : null}

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Welcome</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Welcome to Colourbox</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your account is ready and your downloads are collected here. You can always find everything in Drive.
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            {demoUser ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                <span className="text-muted-foreground">Signed in as</span>
                <span className="font-semibold text-foreground">{demoUser.name}</span>
                <span className="text-muted-foreground/60">•</span>
                <span className="text-muted-foreground">{demoUser.org}</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                <span className="text-muted-foreground">Not signed in</span>
                <span className="text-muted-foreground/60">•</span>
                <Link href="/stock/checkout" className="font-medium text-foreground hover:underline">
                  Complete checkout
                </Link>
              </div>
            )}

            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">1</span>
              <span>Cart</span>
              <span className="text-muted-foreground/60">→</span>
              <span className="font-semibold text-foreground">2</span>
              <span>Checkout</span>
              <span className="text-muted-foreground/60">→</span>
              <span className="font-semibold text-foreground">3</span>
              <span>Download</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow">
          <div className="grid gap-3 rounded-2xl border border-border bg-muted/40 p-4 sm:grid-cols-3">
            <div className="rounded-xl bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">1</p>
              <p className="mt-1 text-sm font-semibold text-foreground">Download your files</p>
              <p className="mt-2 text-xs text-muted-foreground">Download each file below or grab the full order as a bundle.</p>
            </div>
            <div className="rounded-xl bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">2</p>
              <p className="mt-1 text-sm font-semibold text-foreground">Find it in Drive</p>
              <p className="mt-2 text-xs text-muted-foreground">Your purchases are saved to your account so you can access them later.</p>
            </div>
            <div className="rounded-xl bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">3</p>
              <p className="mt-1 text-sm font-semibold text-foreground">Keep browsing</p>
              <p className="mt-2 text-xs text-muted-foreground">Explore more images and add them to your cart anytime.</p>
            </div>
          </div>

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
                  const thumb = it.thumbUrl ?? it.thumbnailUrl ?? it.previewUrl ?? null;
                  const perAssetHref = id
                    ? `/api/stock/download?assetId=${encodeURIComponent(id)}&size=${encodeURIComponent(size)}&format=${encodeURIComponent(format)}`
                    : null;

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
                        <p className="mt-0.5 text-xs text-muted-foreground">#{id}</p>
                      </div>

                      {perAssetHref ? (
                        <a
                          href={perAssetHref}
                          download
                          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary/90"
                        >
                          Download
                        </a>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Tip:</span> Open Drive to manage downloads, folders and future purchases.
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/stock"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/60"
              >
                Browse Stock
              </Link>
              <Link
                href="/drive"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/60"
              >
                Go to Drive
              </Link>
              {orderDownloadHref ? (
                <a
                  href={orderDownloadHref}
                  download
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
                >
                  Download
                </a>
              ) : (
                <div className="inline-flex items-center justify-center rounded-xl bg-muted px-4 py-2.5 text-sm font-medium text-muted-foreground">
                  No completed order found
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-4">
            <Link href="/stock/cart" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to cart
            </Link>
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
    <main className="mx-auto w-full max-w-3xl bg-background px-4 py-10 text-foreground">
      {showAccountCreatedBanner ? (
        <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Account created</p>
          <p className="mt-1 text-sm text-emerald-700/90 dark:text-emerald-200">
            You’re now signed in as <span className="font-semibold">{demoUser?.name}</span> • {demoUser?.org}. Your purchases will be available in Drive.
          </p>
        </div>
      ) : null}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Welcome</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Welcome to Colourbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">Download this file now — and find all your purchases in Drive.</p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          {demoUser ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="text-muted-foreground">Signed in as</span>
              <span className="font-semibold text-foreground">{demoUser.name}</span>
              <span className="text-muted-foreground/60">•</span>
              <span className="text-muted-foreground">{demoUser.org}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="text-muted-foreground">Not signed in</span>
              <span className="text-muted-foreground/60">•</span>
              <Link href="/stock/checkout" className="font-medium text-foreground hover:underline">
                Complete checkout
              </Link>
            </div>
          )}

          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">1</span>
            <span>Cart</span>
            <span className="text-muted-foreground/60">→</span>
            <span className="font-semibold text-foreground">2</span>
            <span>Checkout</span>
            <span className="text-muted-foreground/60">→</span>
            <span className="font-semibold text-foreground">3</span>
            <span>Download</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Download details</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{displayTitle}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Choose size and format, then download the file.</p>
          </div>

          <div className="flex gap-2">
            <Link
              href={next ?? "/stock"}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/60"
            >
              Back
            </Link>
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

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Tip:</span> Open Drive to manage downloads, folders and future purchases.
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/stock"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/60"
            >
              Browse Stock
            </Link>
            <Link
              href="/drive"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/60"
            >
              Go to Drive
            </Link>
            <a
              href={downloadHref}
              download
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
            >
              Download
            </a>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">Continue</p>
          <p className="mt-1 text-xs text-muted-foreground">After downloading, you can browse more images in Stock.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Link
              href={"/stock"}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/60"
            >
              Browse more
            </Link>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-4 max-w-3xl text-center text-xs text-muted-foreground">
        If you link to this page from an asset view, you can pass:
        <span className="font-mono"> ?assetId=…&title=…&size=…&format=…</span>.
      </p>
    </main>
  );
}

