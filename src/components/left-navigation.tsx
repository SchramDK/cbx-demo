'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Home,
  Folder,
  Image,
  MoreHorizontal,
  ShieldCheck,
  Workflow,
  Sparkles,
  Users,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  X,
  GripVertical,
} from 'lucide-react';
import ImageNext from 'next/image';

type PrimaryKey = 'home' | 'stock' | 'files';
type MoreKey = 'team' | 'consent' | 'workflows' | 'apps';

type NavConfig = {
  primaryOrder: PrimaryKey[];
  moreOrder: MoreKey[];
  moreHidden: MoreKey[];
};

const NAV_CONFIG_KEY = 'CBX_NAV_CONFIG_V1';


const DEFAULT_NAV_CONFIG: NavConfig = {
  primaryOrder: ['home', 'stock', 'files'],
  moreOrder: ['team', 'consent', 'workflows', 'apps'],
  moreHidden: [],
};

// Purchases notification dot constants and helpers
const DRIVE_IMPORTED_ASSETS_KEY = 'CBX_DRIVE_IMPORTED_ASSETS_V1';
const PURCHASES_LAST_SEEN_KEY = 'CBX_PURCHASES_LAST_SEEN_V1';
const DRIVE_PURCHASES_IMPORTED_EVENT = 'CBX_PURCHASES_IMPORTED';

function readPurchasesCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(DRIVE_IMPORTED_ASSETS_KEY);
    const parsed = raw ? (JSON.parse(raw) as any[]) : [];
    if (!Array.isArray(parsed) || parsed.length === 0) return 0;

    let count = 0;
    for (const a of parsed) {
      const fid = typeof a?.folderId === 'string' && a.folderId.trim().length ? a.folderId : 'purchases';
      if (fid === 'purchases') count += 1;
    }
    return count;
  } catch {
    return 0;
  }
}

function readPurchasesLastSeen(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(PURCHASES_LAST_SEEN_KEY) ?? '0';
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writePurchasesLastSeen(n: number) {
  try {
    window.localStorage.setItem(PURCHASES_LAST_SEEN_KEY, String(Math.max(0, n)));
  } catch {
    // ignore
  }
}

function readStoredNavConfig(): NavConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(NAV_CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NavConfig>;
    if (!parsed) return null;

    const primaryAllowed: PrimaryKey[] = ['home', 'stock', 'files'];
    const moreAllowed: MoreKey[] = ['team', 'consent', 'workflows', 'apps'];

    const primaryOrder = Array.isArray(parsed.primaryOrder)
      ? (parsed.primaryOrder.filter((x): x is PrimaryKey => primaryAllowed.includes(x as PrimaryKey)) as PrimaryKey[])
      : [];
    const moreOrder = Array.isArray(parsed.moreOrder)
      ? (parsed.moreOrder.filter((x): x is MoreKey => moreAllowed.includes(x as MoreKey)) as MoreKey[])
      : [];
    const moreHidden = Array.isArray(parsed.moreHidden)
      ? (parsed.moreHidden.filter((x): x is MoreKey => moreAllowed.includes(x as MoreKey)) as MoreKey[])
      : [];

    // Ensure all keys exist exactly once
    const primaryNormalized = Array.from(new Set([...primaryOrder, ...primaryAllowed])).filter((x) =>
      primaryAllowed.includes(x)
    );
    const moreNormalized = Array.from(new Set([...moreOrder, ...moreAllowed])).filter((x) => moreAllowed.includes(x));

    return {
      primaryOrder: primaryNormalized,
      moreOrder: moreNormalized,
      moreHidden,
    };
  } catch {
    return null;
  }
}

function persistNavConfig(next: NavConfig) {
  try {
    localStorage.setItem(NAV_CONFIG_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function moveItem<T>(arr: T[], from: number, to: number) {
  if (from === to) return arr;
  if (from < 0 || from >= arr.length) return arr;
  if (to < 0 || to >= arr.length) return arr;
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function MoreMenuPortal({
  open,
  anchorRef,
  onClose,
  pathname,
  items,
  navConfig,
  setNavConfig,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  pathname: string | null;
  items: {
    href?: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
  navConfig: NavConfig;
  setNavConfig: (next: NavConfig) => void;
}) {
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const [size, setSize] = React.useState<{ w: number; h: number } | null>(null);
  const [customizeOpen, setCustomizeOpen] = React.useState(false);

  const [draft, setDraft] = React.useState<NavConfig>(navConfig);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const dialogRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    // keep draft in sync when opening
    if (customizeOpen) setDraft(navConfig);
  }, [customizeOpen, navConfig]);

  React.useEffect(() => {
    if (!open) return;

    const update = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // Position to the right of the button, vertically centered. Flip/clamp to stay on-screen.
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const menuW = size?.w ?? 360;
      const menuH = size?.h ?? 320;

      const idealTop = r.top + r.height / 2;
      const clampedTop = Math.min(Math.max(idealTop, 16 + menuH / 2), vh - 16 - menuH / 2);

      const rightLeft = r.right + 10;
      const leftLeft = r.left - 10 - menuW;
      const useLeft = rightLeft + menuW <= vw - 16 ? rightLeft : Math.max(16, leftLeft);

      setPos({ top: Math.round(clampedTop), left: Math.round(useLeft) });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, anchorRef, size]);

  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (customizeOpen) {
        setCustomizeOpen(false);
        return;
      }
      onClose();
    };

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      const menu = document.getElementById('cbx-more-menu');
      const modal = document.getElementById('cbx-more-customize');
      const anchor = anchorRef.current;
      if (!menu || !target) return;
      if (menu.contains(target)) return;
      if (modal && modal.contains(target)) return;
      if (anchor && anchor.contains(target)) return;
      onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, onClose, anchorRef, customizeOpen]);

  React.useEffect(() => {
    if (!open) setCustomizeOpen(false);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    // focus the first actionable element for keyboard users
    const t = window.setTimeout(() => {
      const root = menuRef.current;
      if (!root) return;
      const first = root.querySelector<HTMLElement>('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])');
      first?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  React.useEffect(() => {
    if (!customizeOpen) return;
    const t = window.setTimeout(() => {
      const root = dialogRef.current;
      if (!root) return;
      const first = root.querySelector<HTMLElement>('button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])');
      first?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [customizeOpen]);

  if (!open || !pos) return null;

  // Ensure we only portal on the client
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      id="cbx-more-menu"
      ref={(node) => {
        menuRef.current = node;
        if (!node) return;
        const r = node.getBoundingClientRect();
        const next = { w: Math.round(r.width), h: Math.round(r.height) };
        setSize((prev) => (prev && prev.w === next.w && prev.h === next.h ? prev : next));
      }}
      className="fixed z-[1000] w-[360px] -translate-y-1/2 overflow-hidden rounded-2xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/80"
      style={{ top: pos.top, left: pos.left }}
      role="menu"
      aria-label="More"
    >
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div>
          <div className="text-sm font-semibold">More</div>
          <div className="mt-0.5 text-xs text-muted-foreground">Switch to other products and tools.</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="divide-y divide-border/60">
        {items.map(({ href, label, description, icon: Icon }) => {
          const isActive = href ? pathname === href : false;
          const row = (
            <div
              className={
                'group flex items-start gap-3 px-5 py-4 transition-colors outline-none focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40 ' +
                (isActive ? 'bg-muted/60' : 'hover:bg-muted/40')
              }
            >
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50 ring-1 ring-border/40 transition group-hover:bg-muted/70">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-foreground">{label}</div>
                  {!href ? (
                    <span className="rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Coming soon
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
              </div>
            </div>
          );

          if (!href) {
            return (
              <button
                key={label}
                type="button"
                disabled
                className="block w-full cursor-not-allowed text-left"
              >
                {row}
              </button>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="block"
            >
              {row}
            </Link>
          );
        })}
      </div>

      <div className="border-t border-border/60 bg-background/60">
        <button
          type="button"
          onClick={() => setCustomizeOpen(true)}
          className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left text-xs text-muted-foreground transition hover:bg-muted/30 hover:text-foreground"
        >
          <span>Customize…</span>
          <span className="text-[11px] text-muted-foreground/80">Show/hide items</span>
        </button>
      </div>

      {customizeOpen ? (
        <div
          id="cbx-more-customize"
          className="fixed inset-0 z-[1100] flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Customize navigation bar"
        >
          <div className="absolute inset-0 bg-background/40 backdrop-blur-sm" />

          <div
            ref={dialogRef}
            className="relative w-[520px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-border/60 bg-background/95 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-4">
              <div>
                <div className="text-sm font-semibold">Customize navigation</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Choose what shows up in the left navigation.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCustomizeOpen(false)}
                className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="text-xs font-semibold text-muted-foreground">PRIMARY</div>
              <div className="mt-2 overflow-hidden rounded-xl border border-border/60">
                {draft.primaryOrder.map((key, idx) => {
                  const label = key === 'home' ? 'Home' : key === 'stock' ? 'Stock' : 'Files';
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3 border-b border-border/60 bg-background/70 px-4 py-3 last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground/70" />
                        <div className="text-sm font-medium">{label}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDraft((d) => ({ ...d, primaryOrder: moveItem(d.primaryOrder, idx, idx - 1) }))}
                          disabled={idx === 0}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted/40 hover:text-foreground disabled:opacity-40"
                          aria-label="Move up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDraft((d) => ({ ...d, primaryOrder: moveItem(d.primaryOrder, idx, idx + 1) }))}
                          disabled={idx === draft.primaryOrder.length - 1}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted/40 hover:text-foreground disabled:opacity-40"
                          aria-label="Move down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground">MORE</div>
                  <div className="mt-1 text-xs text-muted-foreground">Show/hide and reorder additional products.</div>
                </div>

                <button
                  type="button"
                  onClick={() => setDraft({ ...DEFAULT_NAV_CONFIG, moreHidden: [] })}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
              </div>

              <div className="mt-2 overflow-hidden rounded-xl border border-border/60">
                {draft.moreOrder.map((key, idx) => {
                  const meta =
                    key === 'consent'
                      ? { label: 'Consent', desc: 'Manage consent flows, guardians and usage rights.' }
                      : key === 'workflows'
                        ? { label: 'Workflows', desc: 'Create automations and approvals across your assets.' }
                        : { label: 'Apps', desc: 'Connect tools and extensions to your workspace.' };

                  const checked = !draft.moreHidden.includes(key);

                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3 border-b border-border/60 bg-background/70 px-4 py-3 last:border-b-0"
                    >
                      <label className="flex min-w-0 flex-1 items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setDraft((d) => {
                              const show = e.target.checked;
                              return {
                                ...d,
                                moreHidden: show
                                  ? d.moreHidden.filter((x) => x !== key)
                                  : Array.from(new Set([...d.moreHidden, key])),
                              };
                            })
                          }
                          className="mt-1 h-4 w-4 rounded border-border/60"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground/70" />
                            <div className="text-sm font-medium">{meta.label}</div>
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">{meta.desc}</div>
                        </div>
                      </label>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDraft((d) => ({ ...d, moreOrder: moveItem(d.moreOrder, idx, idx - 1) }))}
                          disabled={idx === 0}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted/40 hover:text-foreground disabled:opacity-40"
                          aria-label="Move up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDraft((d) => ({ ...d, moreOrder: moveItem(d.moreOrder, idx, idx + 1) }))}
                          disabled={idx === draft.moreOrder.length - 1}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted/40 hover:text-foreground disabled:opacity-40"
                          aria-label="Move down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-border/60 bg-background/60 px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCustomizeOpen(false)}
                  className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNavConfig(draft);
                    persistNavConfig(draft);
                    setCustomizeOpen(false);
                    onClose();
                  }}
                  className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>,
    document.body
  );
}

export function LeftNavigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const driveFolderParam = (searchParams?.get('folder') ?? '').trim();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreAnchorRef = React.useRef<HTMLButtonElement | null>(null);

  // Unread dot on Files when new purchases arrive
  const [purchasesCount, setPurchasesCount] = React.useState(0);
  const [purchasesLastSeen, setPurchasesLastSeen] = React.useState(0);

  React.useEffect(() => {
    // initial load
    setPurchasesCount(readPurchasesCount());
    setPurchasesLastSeen(readPurchasesLastSeen());
  }, []);

  React.useEffect(() => {
    const refresh = () => {
      setPurchasesCount(readPurchasesCount());
      setPurchasesLastSeen(readPurchasesLastSeen());
    };

    const onImported = () => refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === DRIVE_IMPORTED_ASSETS_KEY || e.key === PURCHASES_LAST_SEEN_KEY) {
        refresh();
      }
    };

    window.addEventListener(DRIVE_PURCHASES_IMPORTED_EVENT, onImported as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(DRIVE_PURCHASES_IMPORTED_EVENT, onImported as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const hasNewPurchases = purchasesCount > purchasesLastSeen;

  React.useEffect(() => {
    // Mark as seen ONLY when entering Purchases (the folder that has the dot)
    if (!pathname) return;
    if (!pathname.startsWith('/drive')) return;

    const inPurchases = driveFolderParam === 'purchases';
    if (!inPurchases) return;

    const current = readPurchasesCount();
    setPurchasesCount(current);
    setPurchasesLastSeen(current);
    writePurchasesLastSeen(current);
  }, [pathname, driveFolderParam]);

  React.useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const [navConfig, setNavConfig] = React.useState<NavConfig>(DEFAULT_NAV_CONFIG);

  React.useEffect(() => {
    const stored = readStoredNavConfig();
    if (stored) setNavConfig(stored);
  }, []);

  const [meLoaded, setMeLoaded] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/demo-auth/me', { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        setIsLoggedIn(Boolean(json?.user));
      } catch {
        if (!cancelled) setIsLoggedIn(false);
      } finally {
        if (!cancelled) setMeLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Avoid flicker before auth is ready
  if (!meLoaded || !isLoggedIn) return null;

  const primaryMeta: Record<PrimaryKey, { href: string; label: string; icon: any }> = {
    home: { href: '/home', label: 'Home', icon: Home },
    stock: { href: '/stock', label: 'Stock', icon: Image },
    files: { href: '/drive', label: 'Files', icon: Folder },
  };

  const productItems = navConfig.primaryOrder.map((k) => primaryMeta[k]);

  const moreMeta: Record<MoreKey, { href?: string; label: string; description: string; icon: any }> = {
    team: {
      href: '/team',
      label: 'Team',
      description: 'Invite members, manage roles and access.',
      icon: Users,
    },
    consent: {
      href: undefined,
      label: 'Consent',
      description: 'Manage consent flows, guardians and usage rights.',
      icon: ShieldCheck,
    },
    workflows: {
      href: undefined,
      label: 'Workflows',
      description: 'Create automations and approvals across your assets.',
      icon: Workflow,
    },
    apps: {
      href: undefined,
      label: 'Apps',
      description: 'Connect tools and extensions to your workspace.',
      icon: Sparkles,
    },
  };

  const moreItems = navConfig.moreOrder
    .filter((k) => !navConfig.moreHidden.includes(k))
    .map((k) => moreMeta[k]);

  return (
    <aside className="relative hidden h-full w-full overflow-visible border-r bg-background md:block">
      <nav className="flex h-full flex-col items-center px-2 pb-4 pt-6">
        <div className="flex flex-col items-center gap-4">
          {/* Box logo */}
          <Link href="/home" className="mb-2 flex items-center justify-center rounded-md hover:bg-muted/60">
            {/* Light theme */}
            <ImageNext
              src="/logo_box_dark.svg"
              alt="Colourbox"
              width={28}
              height={28}
              className="dark:hidden"
              priority
            />

            {/* Dark theme */}
            <ImageNext
              src="/logo_box.svg"
              alt="Colourbox"
              width={28}
              height={28}
              className="hidden dark:block"
              priority
            />
          </Link>
          {/* Product switch */}
          <div className="mt-1 space-y-1">
            {productItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname?.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={
                    'flex w-full flex-col items-center gap-1 rounded-lg px-2 py-3 text-[11px] transition-colors ' +
                    (active
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground')
                  }
                >
                  <span className="relative">
                    <Icon className="h-5 w-5" />
                    {href === '/drive' && hasNewPurchases ? (
                      <span
                        className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 shadow"
                        aria-label="New purchases"
                        title="New purchases"
                      />
                    ) : null}
                  </span>
                  <span className="leading-none">{label}</span>
                </Link>
              );
            })}

            <div className="relative pt-2">
              <button
                ref={moreAnchorRef}
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
                aria-controls="cbx-more-menu"
                className={
                  'flex w-full flex-col items-center gap-1 rounded-lg px-2 py-3 text-[11px] transition-colors ' +
                  (moreOpen
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground')
                }
              >
                <MoreHorizontal className="h-5 w-5" />
                <span className="leading-none">More</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
      <MoreMenuPortal
        open={moreOpen}
        anchorRef={moreAnchorRef}
        onClose={() => setMoreOpen(false)}
        pathname={pathname}
        items={moreItems}
        navConfig={navConfig}
        setNavConfig={(next) => {
          setNavConfig(next);
          persistNavConfig(next);
        }}
      />
    </aside>
  );
}
