'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';
import { useProtoAuth } from '@/lib/proto-auth';
import { AuthGate } from '@/components/auth-gate';
import {
  ArrowRight,
  Sparkles,
  UploadCloud,
  Search,
  ShoppingCart,
  History,
  TrendingUp,
  Folder,
  Images,
  CheckCircle2,
  Receipt,
} from 'lucide-react';

import NextImage from 'next/image';
import { ASSETS } from '@/lib/demo/assets';
import { STOCK_ASSETS } from '@/lib/demo/stock-assets';

const newsItems = [
  {
    date: '2026-01-13',
    title: 'Your dashboard is getting smarter',
    description: 'Home now remembers what you do (locally) so it can surface quick ways back to your work.',
    badge: 'Home',
  },
  {
    date: '2026-01-12',
    title: 'New Home & navigation',
    description: 'A new Home experience plus a simplified left navigation to switch between Files and Stock.',
    badge: 'UI',
  },
  {
    date: '2026-01-10',
    title: 'Sign-in improvements',
    description: 'Sign in and out while keeping your place with smooth return-to routing.',
    badge: 'Auth',
  },
];

const suggestions = [
  {
    key: 'organize',
    title: 'Organize uploads',
    description: 'Keep “Campaign uploads” tidy with folders + a naming routine.',
    href: '/drive',
    icon: Folder,
  },
  {
    key: 'search',
    title: 'Find your next visual',
    description: 'Run a quick Stock search and save your query for later.',
    href: '/stock',
    icon: Images,
  },
  {
    key: 'purchases',
    title: 'Review purchases',
    description: 'Your bought images — automatically available in Files.',
    href: '/drive?folder=purchases',
    icon: Receipt,
  },
];

const quickActions = [
  { label: 'Upload files', href: '/drive', hint: 'Start in Files', icon: UploadCloud },
  { label: 'Find images', href: '/stock', hint: 'Search Stock', icon: Search },
  { label: 'Open purchases', href: '/drive?folder=purchases', hint: 'In Files', icon: Receipt },
];

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

function hasTeamDemoFilled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem('cbx_team_demo_filled_v1') === '1';
  } catch {
    return false;
  }
}

// Lightweight semantic similarity (char 3-grams TF-IDF)
function charNgrams(text: string, n = 3): string[] {
  const s = (text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!s) return [];
  const padded = `  ${s}  `;
  const out: string[] = [];
  for (let i = 0; i <= padded.length - n; i++) out.push(padded.slice(i, i + n));
  return out;
}

function toTfidf(grams: string[], idf: Map<string, number>): Map<string, number> {
  const tf = new Map<string, number>();
  for (const g of grams) tf.set(g, (tf.get(g) ?? 0) + 1);
  const vec = new Map<string, number>();
  let norm = 0;
  for (const [g, c] of tf) {
    const w = (c as number) * (idf.get(g) ?? 0);
    if (w === 0) continue;
    vec.set(g, w);
    norm += w * w;
  }
  norm = Math.sqrt(norm) || 1;
  for (const [g, w] of vec) vec.set(g, w / norm);
  return vec;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  if (!a.size || !b.size) return 0;
  let dot = 0;
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  for (const [k, v] of small) {
    const w = big.get(k);
    if (w) dot += v * w;
  }
  return dot;
}

function buildStockDocText(a: any): string {
  const parts: string[] = [];
  if (a?.title) parts.push(String(a.title));
  if (a?.description) parts.push(String(a.description));
  const kws = Array.isArray(a?.keywords) ? a.keywords : [];
  if (kws.length) parts.push(kws.map(String).join(' '));
  const tags = Array.isArray(a?.tags) ? a.tags : [];
  if (tags.length) parts.push(tags.map(String).join(' '));
  if (a?.category) parts.push(String(a.category));
  return parts.join(' ');
}

function getStockColourboxId(a: any): string {
  const direct = String(a?.colourboxId ?? a?.cbxId ?? a?.externalId ?? '').trim();
  if (direct) return direct;

  const p = String(a?.preview ?? a?.src ?? a?.image ?? a?.url ?? '').trim();
  // matches "/demo/stock/COLOURBOX123.jpg" or similar
  const m = p.match(/(COLOURBOX\d+)/i);
  return m ? m[1].toUpperCase() : '';
}
// Lightweight seeded PRNG and shuffle (mulberry32)
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function HomePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useProtoAuth();
  const isDemo = searchParams?.get('demo') === '1';

  const [visitCount, setVisitCount] = useState<number>(0);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentViews, setRecentViews] = useState<string[]>([]);
  const [cartCount, setCartCount] = useState<number>(0);

  const [purchasesCount, setPurchasesCount] = useState<number>(0);
  const [purchasesLastSeen, setPurchasesLastSeen] = useState<number>(0);
  const [hasTeam, setHasTeam] = useState<boolean>(false);

  const [dailySeed, setDailySeed] = useState<string>('');
  const [heroSeed] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    try {
      const baseKey = 'CBX_HOME_HERO_SEED_V1';
      const counterKey = 'CBX_HOME_HERO_SEED_COUNTER_V1';

      // Stable base seed per tab session
      const existingBase = window.sessionStorage.getItem(baseKey);
      const base = (() => {
        if (existingBase) {
          const n = Number(existingBase);
          if (Number.isFinite(n) && n > 0) return n;
        }
        const next = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
        window.sessionStorage.setItem(baseKey, String(next));
        return next;
      })();

      // Increment per mount/visit to Home
      const prevC = Number(window.sessionStorage.getItem(counterKey) ?? '0');
      const c = Number.isFinite(prevC) ? prevC + 1 : 1;
      window.sessionStorage.setItem(counterKey, String(c));

      return (base ^ (c * 2654435761)) >>> 0;
    } catch {
      return (Date.now() >>> 0) || 1;
    }
  });
  const [showAllNews, setShowAllNews] = useState(false);

  const todayLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
    } catch {
      return new Date().toDateString();
    }
  }, []);

  const lastSeenLabel = useMemo(() => {
    if (!lastSeen) return null;
    try {
      return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(lastSeen));
    } catch {
      return lastSeen;
    }
  }, [lastSeen]);

  const LS_KEYS = useMemo(() => {
    return {
      visits: 'CBX_HOME_VISITS_V1',
      lastSeen: 'CBX_HOME_LAST_SEEN_V1',
      recentSearches: 'CBX_STOCK_RECENT_SEARCHES_V1',
      recentViews: 'CBX_RECENT_VIEWS_V1',
      cart: 'CBX_CART_COUNT_V1',
      daily: 'CBX_HOME_DAILY_SEED_V1',
    } as const;
  }, []);

  const lsGet = useCallback((key: string) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }, []);

  const lsSet = useCallback((key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }, []);

  const clampList = useCallback((items: string[], max = 6) => {
    return items.filter(Boolean).slice(0, max);
  }, []);

  useEffect(() => {
    // Visits + last seen
    const prevVisits = Number(lsGet(LS_KEYS.visits) ?? '0');
    const nextVisits = Number.isFinite(prevVisits) ? prevVisits + 1 : 1;
    lsSet(LS_KEYS.visits, String(nextVisits));
    setVisitCount(nextVisits);

    const prevSeen = lsGet(LS_KEYS.lastSeen);
    if (prevSeen) setLastSeen(prevSeen);
    lsSet(LS_KEYS.lastSeen, new Date().toISOString());

    // Recent searches
    const rsRaw = lsGet(LS_KEYS.recentSearches);
    const rs = rsRaw ? (JSON.parse(rsRaw) as string[]) : [];
    setRecentSearches(clampList(Array.isArray(rs) ? rs : []));

    // Recent views
    const rvRaw = lsGet(LS_KEYS.recentViews);
    const rv = rvRaw ? (JSON.parse(rvRaw) as string[]) : [];
    setRecentViews(clampList(Array.isArray(rv) ? rv : []));

    // Cart count
    const cc = Number(lsGet(LS_KEYS.cart) ?? '0');
    setCartCount(Number.isFinite(cc) ? cc : 0);

    // Daily seed (changes once per day)
    const today = new Date();
    const dayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`;
    const prevDaily = lsGet(LS_KEYS.daily);
    if (prevDaily !== dayKey) {
      lsSet(LS_KEYS.daily, dayKey);
      setDailySeed(dayKey);
    } else {
      setDailySeed(prevDaily ?? dayKey);
    }

    // Purchases unread (shared with Files/Purchases)
    setPurchasesCount(readPurchasesCount());
    setPurchasesLastSeen(readPurchasesLastSeen());

    setHasTeam(hasTeamDemoFilled());
  }, [LS_KEYS, clampList, lsGet, lsSet]);

  // Hero previews should come from Stock assets (same source as the Stock section)
  const heroItems = useMemo(() => {
    const pool = (STOCK_ASSETS as any[]) ?? [];
    const shuffled = shuffleWithSeed(pool, heroSeed);

    const seen = new Set<string>();
    const items = shuffled
      .map((a) => {
        const id = String(a?.id ?? a?.assetId ?? a?.colourboxId ?? a?.cbxId ?? '').trim();
        if (!id) return null;
        if (seen.has(id)) return null;
        seen.add(id);

        const rawSrc = a?.preview ?? a?.src ?? a?.image ?? a?.url ?? '';
        const src = rawSrc ? String(rawSrc) : `/demo/stock/${id}.jpg`;

        return { id, src };
      })
      .filter(Boolean)
      .slice(0, 12) as { id: string; src: string }[];

    // Safety fallback (should rarely happen)
    if (items.length) return items;
    const fallbackIds = ['COLOURBOX69824938', 'COLOURBOX34454367'];
    return fallbackIds.map((id) => ({ id, src: `/demo/stock/${id}.jpg` }));
  }, [heroSeed]);
  // Build a lightweight semantic model for Stock assets (client-only usage)
  const stockSemanticModel = useMemo(() => {
    const pool = (STOCK_ASSETS as any[]) ?? [];
    const docs = pool
      .map((a) => {
        const id = String(a?.id ?? '').trim();
        if (!id) return null;
        return { id, text: buildStockDocText(a) };
      })
      .filter(Boolean) as { id: string; text: string }[];

    if (!docs.length) return null;

    const df = new Map<string, number>();
    const docGrams = new Map<string, string[]>();

    for (const d of docs) {
      const grams = charNgrams(d.text, 3);
      docGrams.set(d.id, grams);
      const set = new Set(grams);
      for (const g of set) df.set(g, (df.get(g) ?? 0) + 1);
    }

    const N = Math.max(1, docs.length);
    const idf = new Map<string, number>();
    for (const [g, c] of df) idf.set(g, Math.log(1 + N / (1 + c)));

    const docVecs = new Map<string, Map<string, number>>();
    for (const d of docs) {
      const grams = docGrams.get(d.id) ?? [];
      docVecs.set(d.id, toTfidf(grams, idf));
    }

    return { idf, docVecs, docs };
  }, []);

  const purchasedStockIds = useMemo(() => {
    if (typeof window === 'undefined') return [] as string[];
    try {
      const raw = window.localStorage.getItem(DRIVE_IMPORTED_ASSETS_KEY);
      const parsed = raw ? (JSON.parse(raw) as any[]) : [];
      if (!Array.isArray(parsed) || parsed.length === 0) return [] as string[];

      const out: string[] = [];
      for (const a of parsed) {
        const fid = typeof a?.folderId === 'string' && a.folderId.trim().length ? a.folderId : 'purchases';
        if (fid !== 'purchases') continue;

        const raw = String(a?.id ?? a?.assetId ?? a?.stockId ?? a?.cbxId ?? a?.colourboxId ?? '').trim();
        // Normalize to COLOURBOX ids when possible
        const m = raw.match(/(COLOURBOX\d+)/i);
        const id = m ? m[1].toUpperCase() : raw;
        if (!id) continue;
        out.push(id);
      }

      // unique
      return Array.from(new Set(out));
    } catch {
      return [] as string[];
    }
  }, [purchasesCount]);

  const recommendedBasedOnPurchases = useMemo(() => {
    const pool = (STOCK_ASSETS as any[]) ?? [];
    if (!pool.length) return [] as any[];
    if (!stockSemanticModel) return [] as any[];
    if (!purchasedStockIds.length) return [] as any[];

    // Build query text from the purchased stock assets we can match in our pool
    const purchasedSet = new Set(purchasedStockIds);

    const byColourboxId = new Map<string, any>();
    const byId = new Map<string, any>();
    for (const a of pool) {
      const sid = String(a?.id ?? '').trim();
      if (sid && !byId.has(sid)) byId.set(sid, a);

      const cbx = getStockColourboxId(a);
      if (cbx && !byColourboxId.has(cbx)) byColourboxId.set(cbx, a);
    }

    const purchasedDocs: string[] = [];
    for (const id of purchasedStockIds) {
      const hit = byColourboxId.get(id) ?? byId.get(id);
      if (hit) purchasedDocs.push(buildStockDocText(hit));
    }

    // Fallback: if we can't match, just use ids as weak tokens
    const queryText = purchasedDocs.length ? purchasedDocs.join(' ') : purchasedStockIds.join(' ');

    const qVec = toTfidf(charNgrams(queryText, 3), stockSemanticModel.idf);

    const scores: { id: string; score: number }[] = [];
    for (const [docId, dVec] of stockSemanticModel.docVecs) {
      // Exclude anything the user already bought (match by COLOURBOX id)
      const asset = byColourboxId.get(docId) ?? byId.get(docId);
      const cbx = asset ? getStockColourboxId(asset) : '';

      if (purchasedSet.has(docId) || (cbx && purchasedSet.has(cbx))) continue;

      const s = cosine(qVec, dVec);
      if (s > 0) scores.push({ id: docId, score: s });
    }

    scores.sort((a, b) => b.score - a.score);

    // Take top and add slight daily shuffle to avoid looking static
    const seedBase = (() => {
      let h = 0;
      const s = `${dailySeed || ''}:${purchasedStockIds.join(',')}`;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return h || heroSeed || 1;
    })();

    const topIds = scores.slice(0, 24).map((x) => x.id);
    const shuffledTop = shuffleWithSeed(topIds, seedBase);

    const isPurchased = (a: any) => {
      if (!a) return false;
      const sid = String(a?.id ?? '').trim();
      const cbx = getStockColourboxId(a);
      return (sid && purchasedSet.has(sid)) || (cbx && purchasedSet.has(cbx));
    };

    const picked = new Map<string, any>();

    // 1) Primary: semantic picks
    for (const id of shuffledTop) {
      const a = byColourboxId.get(id) ?? byId.get(id);
      if (!a) continue;
      if (isPurchased(a)) continue;
      const key = String(a?.id ?? getStockColourboxId(a) ?? id);
      if (key && !picked.has(key)) picked.set(key, a);
      if (picked.size >= 12) break;
    }

    // 2) Fallback: fill with a deterministic shuffle of Stock assets (exclude purchased)
    if (picked.size < 12) {
      const fallbackPool = shuffleWithSeed(pool, seedBase ^ 0x9e3779b9);
      for (const a of fallbackPool) {
        if (isPurchased(a)) continue;
        const key = String(a?.id ?? getStockColourboxId(a) ?? '');
        if (!key) continue;
        if (!picked.has(key)) picked.set(key, a);
        if (picked.size >= 12) break;
      }
    }

    return Array.from(picked.values());
  }, [dailySeed, heroSeed, purchasedStockIds, stockSemanticModel]);

  // Non-hero thumbnails should stay generic (do not force Stock previews)
  const thumbSrcs = useMemo(() => {
    return ASSETS.slice(0, 12)
      .map((a) => (a as any).preview ?? (a as any).src ?? (a as any).url)
      .filter(Boolean) as string[];
  }, []);

  const driveMarquee = useMemo(() => thumbSrcs.slice(0, 10), [thumbSrcs]);
  const openStockAsset = useCallback(
    (id: string) => {
      const v = (id ?? '').trim();
      if (!v) {
        router.push('/stock');
        return;
      }
      router.push(`/stock/assets/${encodeURIComponent(v)}`);
    },
    [router]
  );

  // Thumbnail helpers
  const thumbPool = useMemo(() => thumbSrcs.slice(0, 10), [thumbSrcs]);

  const getThumb = useCallback(
    (seed: string, offset = 0) => {
      if (!thumbPool.length) return null;
      let h = 0;
      const s = `${seed}:${offset}`;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return thumbPool[h % thumbPool.length] ?? null;
    },
    [thumbPool]
  );

  const ThumbStack = useCallback(
    ({ seed, count = 3 }: { seed: string; count?: number }) => {
      const items = Array.from({ length: count }).map((_, i) => getThumb(seed, i)).filter(Boolean) as string[];
      if (!items.length) return null;
      return (
        <div className="flex -space-x-2">
          {items.map((src, i) => (
            <div
              key={`${seed}-${i}`}
              className="relative h-7 w-7 overflow-hidden rounded-full ring-2 ring-background bg-muted"
              style={{ zIndex: 10 - i }}
            >
              <NextImage src={src} alt="" fill sizes="28px" className="object-cover" />
            </div>
          ))}
        </div>
      );
    },
    [getThumb]
  );

  const isReturning = visitCount >= 2;

  const newPurchases = Math.max(0, purchasesCount - purchasesLastSeen);
  const hasNewPurchases = newPurchases > 0;
  const newPurchasesLabel = newPurchases > 9 ? '9+' : String(newPurchases);

  const greetingLine = useMemo(() => {
    if (!isReturning) return 'Let’s set up your flow — Files for uploads, Stock for visuals.';
    if (hasNewPurchases) {
      return `You’ve got ${newPurchasesLabel} new purchase${newPurchases === 1 ? '' : 's'} to review in Files.`;
    }
    if (cartCount > 0) return `You’ve got ${cartCount} item${cartCount === 1 ? '' : 's'} waiting in your cart.`;
    if (recentSearches.length > 0) return `Pick up where you left off — your recent searches are ready.`;
    return 'Welcome back — here’s your quick way into today’s work.';
  }, [cartCount, hasNewPurchases, isReturning, newPurchases, newPurchasesLabel, recentSearches.length]);

  const dailyNudge = useMemo(() => {
    if (!dailySeed) return null;
    // Deterministic “daily” hint without randomness
    const code = dailySeed.split('-').join('');
    const n = Number(code.slice(-2)) || 0;
    const pick = n % 3;
    if (pick === 0) return 'Daily tip: Name folders by campaign + date to keep Files clean.';
    if (pick === 1) return 'Daily tip: Save your best Stock search query as a habit.';
    return 'Daily tip: Add to cart as you browse — license when you’re ready.';
  }, [dailySeed]);

  const focus = useMemo(() => {
    if (hasNewPurchases) {
      return {
        icon: Receipt,
        title: "Today’s focus: Review your new purchases",
        description: `${newPurchasesLabel} new purchase${newPurchases === 1 ? '' : 's'} waiting — they’re already in Files.`,
        reason: 'Because new purchases arrived',
        steps: ['Open Purchases', 'Download or move to folder'],
        primary: { label: 'Open Purchases', href: '/drive?folder=purchases' },
        secondary: { label: 'Open Files', href: '/drive' },
      };
    }
    if (cartCount > 0) {
      return {
        icon: ShoppingCart,
        title: 'Today’s focus: Finish your cart',
        description: `${cartCount} item${cartCount === 1 ? '' : 's'} waiting — continue to checkout when ready.`,
        reason: 'Because you have items in your cart',
        steps: ['Review licenses', 'Checkout when ready'],
        primary: { label: 'Open cart', href: '/stock/cart' },
        secondary: { label: 'Browse Stock', href: '/stock' },
      };
    }

    if (recentSearches.length > 0) {
      const q = recentSearches[0];
      return {
        icon: History,
        title: 'Today’s focus: Continue your search',
        description: `Jump back into “${q}” and refine your results.`,
        reason: 'Because you searched recently',
        steps: ['Refine filters', 'Save this search'],
        primary: { label: 'Open search', href: `/stock/search?q=${encodeURIComponent(q)}` },
        secondary: { label: 'Open Stock', href: '/stock' },
      };
    }

    return {
      icon: UploadCloud,
      title: isReturning ? 'Today’s focus: Keep Files tidy' : 'Today’s focus: Start with Files',
      description: 'Upload files, create a folder, and keep today’s work organized.',
      reason: isReturning ? 'Because you’re back today' : 'Because this is your first visit',
      steps: ['Upload files', 'Create a folder'],
      primary: { label: 'Open Files', href: '/drive' },
      secondary: { label: 'Open Stock', href: '/stock' },
    };
  }, [cartCount, hasNewPurchases, isReturning, newPurchases, newPurchasesLabel, recentSearches]);

  const primaryIsPurchases = focus?.primary?.href === '/drive?folder=purchases';

  const pushRecentSearch = useCallback(
    (q: string) => {
      const cleaned = q.trim();
      if (!cleaned) return;
      const next = clampList([cleaned, ...recentSearches.filter((s) => s !== cleaned)], 6);
      setRecentSearches(next);
      lsSet(LS_KEYS.recentSearches, JSON.stringify(next));
    },
    [LS_KEYS.recentSearches, clampList, lsSet, recentSearches]
  );

  const openRecentView = useCallback(
    (id: string) => {
      const v = (id ?? '').trim();
      if (!v) return;

      // Heuristic: COLOURBOX ids (and pure numeric ids) should open the asset detail.
      const isColourbox = /^COLOURBOX\d+$/i.test(v);
      const isNumeric = /^\d+$/.test(v);

      if (isColourbox || isNumeric) {
        router.push(`/stock/assets/${encodeURIComponent(v)}`);
        return;
      }

      router.push(`/stock/search?q=${encodeURIComponent(v)}`);
    },
    [router]
  );

  const simulateDemoActivity = useCallback(() => {
    // Optional: seed the dashboard for demos if nothing exists yet
    const hasAny = recentSearches.length > 0 || recentViews.length > 0 || cartCount > 0;
    if (hasAny) return;

    const seededSearches = ['winter campaign', 'team portrait', 'minimal workspace'];
    const seededViews = ['COLOURBOX69824938', 'COLOURBOX34454367'];

    setRecentSearches(clampList(seededSearches));
    setRecentViews(clampList(seededViews));
    setCartCount(2);

    lsSet(LS_KEYS.recentSearches, JSON.stringify(clampList(seededSearches)));
    lsSet(LS_KEYS.recentViews, JSON.stringify(clampList(seededViews)));
    lsSet(LS_KEYS.cart, '2');
  }, [
    LS_KEYS.cart,
    LS_KEYS.recentSearches,
    LS_KEYS.recentViews,
    cartCount,
    clampList,
    lsSet,
    recentSearches.length,
    recentViews.length,
  ]);

  const seedDemoPurchases = useCallback(() => {
    try {
      const demo = [
        { id: 'COLOURBOX69824938', folderId: 'purchases', type: 'stock' },
        { id: 'COLOURBOX34454367', folderId: 'purchases', type: 'stock' },
        { id: 'COLOURBOX66668909', folderId: 'purchases', type: 'stock' },
      ];
      window.localStorage.setItem(DRIVE_IMPORTED_ASSETS_KEY, JSON.stringify(demo));
      // Force the “new purchases” badge to show.
      window.localStorage.setItem(PURCHASES_LAST_SEEN_KEY, '0');
      window.dispatchEvent(new Event(DRIVE_PURCHASES_IMPORTED_EVENT));
      setPurchasesCount(readPurchasesCount());
      setPurchasesLastSeen(readPurchasesLastSeen());
    } catch {
      // ignore
    }
  }, []);

  const runDemoSetup = useCallback(() => {
    simulateDemoActivity();
    seedDemoPurchases();
    // Also seed cart if empty.
    try {
      const cc = Number(lsGet(LS_KEYS.cart) ?? '0');
      if (!Number.isFinite(cc) || cc <= 0) {
        lsSet(LS_KEYS.cart, '2');
        setCartCount(2);
      }
    } catch {
      // ignore
    }
  }, [LS_KEYS.cart, lsGet, lsSet, seedDemoPurchases, simulateDemoActivity]);

  useEffect(() => {
    // Optional: `?demo=1` forces a stable demo state (once per tab session).
    const demo = searchParams?.get('demo');
    if (demo !== '1') return;

    try {
      const k = 'CBX_HOME_DEMOSETUP_DONE_V1';
      if (window.sessionStorage.getItem(k) === '1') return;

      // Only auto-seed if the workspace looks empty-ish.
      const looksEmpty = purchasesCount <= 0 && cartCount <= 0 && recentSearches.length === 0 && recentViews.length === 0;
      if (looksEmpty) runDemoSetup();

      window.sessionStorage.setItem(k, '1');
    } catch {
      // ignore
    }
  }, [cartCount, purchasesCount, recentSearches.length, recentViews.length, runDemoSetup, searchParams]);

  useEffect(() => {
    simulateDemoActivity();
  }, [simulateDemoActivity]);

  useEffect(() => {
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
  return (
    <AuthGate requireAuth redirectTo="/login">
      <div className="w-full space-y-6 overflow-x-clip">
        <section className="relative w-full overflow-hidden bg-background">
          {/* Soft background accents */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-foreground/5 blur-3xl" />
            <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-foreground/5 blur-3xl" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
          </div>

          <div className="relative px-4 py-4 sm:px-6 sm:py-5 lg:px-10">
            <div className="grid items-center gap-6 md:grid-cols-2">
              {/* Copy */}
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-muted/30 px-3 py-0.5 text-xs text-muted-foreground backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Home</span>
                </div>

                <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-[2.75rem]">
                  Welcome{user?.name ? `, ${user.name}` : ''}
                </h1>

                <p className="mt-2 text-sm text-muted-foreground sm:text-base">{greetingLine}</p>

                <p className="mt-2 text-xs text-muted-foreground">{todayLabel}</p>

                {dailyNudge ? (
                  <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-muted/20 px-3 py-0.5 text-xs text-muted-foreground backdrop-blur">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>{dailyNudge}</span>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <button
                    onClick={() => router.push(focus.primary.href)}
                    className="group inline-flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition hover:bg-foreground/90 sm:w-auto"
                  >
                    <span className="relative inline-flex items-center">
                      {primaryIsPurchases ? <Receipt className="h-4 w-4" /> : <focus.icon className="h-4 w-4" />}
                      {hasNewPurchases && primaryIsPurchases ? (
                        <span
                          className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold leading-none text-white shadow"
                          aria-label={`${newPurchasesLabel} new purchases`}
                          title={`${newPurchasesLabel} new purchases`}
                        >
                          {newPurchasesLabel}
                        </span>
                      ) : null}
                    </span>
                    <span className="max-w-full truncate">{focus.primary.label}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>

                  <button
                    onClick={() => router.push(focus.secondary.href)}
                    className="group inline-flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-full bg-background/60 px-5 text-sm font-medium ring-1 ring-border/30 transition hover:bg-background/80 sm:w-auto"
                  >
                    <span className="max-w-full truncate">{focus.secondary.label}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>

                  <button
                    onClick={() => router.push('/stock')}
                    className="group hidden h-11 w-full items-center justify-center gap-2 rounded-full bg-muted/30 px-5 text-sm font-medium transition hover:bg-muted/40 sm:inline-flex sm:w-auto"
                  >
                    Browse Stock <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>

                  {isDemo ? (
                    <button
                      onClick={runDemoSetup}
                      className="group inline-flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-full bg-background/60 px-5 text-sm font-medium ring-1 ring-border/40 transition hover:bg-background/80 sm:w-auto"
                      title="Seed a demo scenario locally"
                    >
                      <Sparkles className="h-4 w-4" />
                      Demo setup
                    </button>
                  ) : null}
                </div>

                <div className="mt-3 sm:hidden">
                  <button
                    type="button"
                    onClick={() => router.push('/stock')}
                    className="inline-flex items-center gap-2 rounded-full bg-background/50 px-4 py-2 text-sm font-medium ring-1 ring-border/30 transition hover:bg-background/70"
                  >
                    Browse Stock <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                {isDemo ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-background/50 px-3 py-1 ring-1 ring-border/20">
                      Cart: <span className="font-semibold text-foreground">{cartCount}</span>
                    </span>
                    <span className="rounded-full bg-background/50 px-3 py-1 ring-1 ring-border/20">
                      Purchases in Files:{' '}
                      <span className="font-semibold text-foreground">{purchasesCount}</span>
                    </span>
                    <span className="rounded-full bg-background/50 px-3 py-1 ring-1 ring-border/20">
                      Team: <span className="font-semibold text-foreground">{hasTeam ? 'set up' : 'not yet'}</span>
                    </span>
                    <span className="hidden sm:inline text-muted-foreground">•</span>
                    <span className="hidden sm:inline">Recommended demo path: Purchases → Files → Team</span>
                  </div>
                ) : null}

              </div>

              {/* Image previews */}
              <div className="md:block">
                {/* Mobile: horizontal preview strip */}
                <div className="md:hidden">
                  <div className="relative -mx-4 mt-6">
                    {/* Edge fades */}
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />

                    {/* In-strip hint */}
                    <div className="pointer-events-none absolute bottom-2 right-4 z-10 inline-flex items-center gap-2 rounded-full bg-background/70 px-3 py-1 text-[11px] text-muted-foreground ring-1 ring-border/30 backdrop-blur">
                      <span>Swipe</span>
                      <span aria-hidden className="text-xs">→</span>
                    </div>

                    <div className="overflow-x-auto px-4">
                      <div className="flex snap-x snap-mandatory gap-2 pr-4">
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => openStockAsset(heroItems[i]?.id ?? '')}
                            className="relative h-20 w-32 shrink-0 snap-start overflow-hidden rounded-xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                          >
                            {heroItems[i]?.src ? (
                              <NextImage
                                src={heroItems[i].src}
                                alt="Stock preview"
                                fill
                                sizes="176px"
                                className="object-cover"
                                priority={i === 0}
                                unoptimized={heroItems[i].src.startsWith('/demo/')}
                              />
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desktop: compact framed mosaic */}
                <div className="hidden md:block">
                  <div className="relative rounded-2xl bg-muted/10 p-2.5 ring-1 ring-border/60">
                    <div className="pointer-events-none absolute -inset-8 rounded-3xl bg-foreground/5 blur-3xl" />

                    <div className="relative grid grid-cols-3 gap-2">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => openStockAsset(heroItems[i]?.id ?? '')}
                          className={
                            i === 0
                              ? 'relative col-span-2 row-span-2 h-52 overflow-hidden rounded-xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20'
                              : 'relative h-24 overflow-hidden rounded-xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20'
                          }
                        >
                          {heroItems[i]?.src ? (
                            <NextImage
                              src={heroItems[i].src}
                              alt="Stock preview"
                              fill
                              sizes="(min-width: 1024px) 34vw, (min-width: 768px) 45vw, 100vw"
                              className="object-cover"
                              priority={i === 0}
                              unoptimized={heroItems[i].src.startsWith('/demo/')}
                            />
                          ) : null}
                        </button>
                      ))}
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Recent visuals from Stock</span>
                      <button
                        onClick={() => router.push('/stock')}
                        className="rounded-full bg-background/60 px-3 py-1 transition hover:bg-background/80"
                      >
                        Browse
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Newest uploads marquee */}
        <section className="mx-4 sm:mx-6 lg:mx-10">
          <div className="rounded-2xl bg-muted/10 p-5 sm:p-6 ring-1 ring-border/50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Newest uploads in Files</h2>
                <p className="mt-1 text-sm text-muted-foreground">A quick scroll of your latest files</p>
              </div>
              <button
                onClick={() => router.push('/drive')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-background/60 px-5 py-2.5 text-sm font-medium transition hover:bg-background/80 sm:w-auto"
              >
                Open Files <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="relative mt-4 overflow-hidden sm:mt-5">
              {/* Edge fades */}
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-background to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-background to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-background to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-background to-transparent" />

              <div className="cbx-marquee">
                <div className="cbx-marquee__track">
                  {[...driveMarquee, ...driveMarquee].map((src, idx) => (
                    <button
                      key={`${idx}-${src}`}
                      onClick={() => router.push('/drive')}
                      className="group relative flex shrink-0 snap-start items-center gap-3 rounded-2xl bg-background/60 p-3 pr-5 ring-1 ring-border/40 transition hover:bg-background/80 sm:gap-4 sm:p-3.5 sm:pr-6"
                    >
                      <div className="relative h-14 w-20 overflow-hidden rounded-2xl bg-muted sm:h-16 sm:w-24">
                        <NextImage src={src} alt="" fill sizes="(min-width: 640px) 96px, 80px" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-semibold sm:text-base">Recent upload</div>
                        </div>
                        <div className="mt-1 truncate text-xs text-muted-foreground sm:mt-1.5 sm:text-sm">Files • recently added</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <style jsx>{`
                .cbx-marquee {
                  --cbx-marquee-gap: 14px;
                  --cbx-marquee-duration: 40s;
                  width: 100%;
                  -webkit-mask-image: linear-gradient(to right, transparent, black 6%, black 94%, transparent);
                  mask-image: linear-gradient(to right, transparent, black 6%, black 94%, transparent);
                }
                .cbx-marquee__track {
                  display: flex;
                  gap: var(--cbx-marquee-gap);
                  width: max-content;
                  animation: cbx-marquee var(--cbx-marquee-duration) linear infinite;
                  will-change: transform;
                }
                .cbx-marquee:hover .cbx-marquee__track {
                  animation-play-state: paused;
                }
                @keyframes cbx-marquee {
                  0% {
                    transform: translateX(0);
                  }
                  100% {
                    transform: translateX(-50%);
                  }
                }
                @media (max-width: 639px) {
                  .cbx-marquee {
                    -webkit-mask-image: none;
                    mask-image: none;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    scroll-snap-type: x mandatory;
                    padding-bottom: 6px;
                  }
                  .cbx-marquee__track {
                    animation: none;
                    width: max-content;
                  }
                }
                @media (min-width: 1024px) {
                  .cbx-marquee {
                    --cbx-marquee-duration: 48s;
                  }
                }
                @media (prefers-reduced-motion: reduce) {
                  .cbx-marquee__track {
                    animation: none;
                  }
                }
              `}</style>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-4 sm:mx-6 lg:mx-10">
          <div className="rounded-2xl bg-muted/5 p-5 sm:p-6 ring-1 ring-border/30">
            <div>
              <h2 className="text-base font-semibold">How it works</h2>
              <p className="mt-1 text-sm text-muted-foreground">From Stock to Files — with access control built in.</p>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="flex gap-3">
                <span className="mt-0.5 text-xs font-semibold text-muted-foreground">1</span>
                <div>
                  <div className="text-sm font-medium">Find & license</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">Search Stock and add images to your cart.</div>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="mt-0.5 text-xs font-semibold text-muted-foreground">2</span>
                <div>
                  <div className="text-sm font-medium">Automatically in Files</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">Purchased images appear in Files instantly.</div>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="mt-0.5 text-xs font-semibold text-muted-foreground">3</span>
                <div>
                  <div className="text-sm font-medium">Share safely</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">Control access with teams, roles and groups.</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Today’s focus */}
        <section className="mx-4 sm:mx-6 lg:mx-10">
          <div
            role="button"
            tabIndex={0}
            onClick={() => router.push(focus.primary.href)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                router.push(focus.primary.href);
              }
            }}
            className="group relative w-full cursor-pointer overflow-hidden rounded-2xl bg-muted/10 p-4 text-left ring-1 ring-border/50 transition hover:bg-muted/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
          >
            <div className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-foreground/5 blur-3xl transition-opacity duration-200 group-hover:opacity-80" />
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <div className="absolute inset-0 bg-gradient-to-r from-foreground/5 via-transparent to-foreground/5" />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-full bg-background/60 ring-1 ring-border/30">
                  <focus.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <div className="text-base font-semibold">{focus.title}</div>
                    {focus.reason ? (
                      <span className="rounded-full bg-background/50 px-2 py-0.5 text-[10px] text-muted-foreground ring-1 ring-border/20">
                        {focus.reason}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{focus.description}</div>
                  {focus.steps?.length ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {focus.steps.slice(0, 2).map((s: string) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1.5 rounded-full bg-background/50 px-2.5 py-0.5 text-[11px] text-muted-foreground ring-1 ring-border/20"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(focus.secondary.href);
                  }}
                  className="hidden sm:inline-flex h-9 items-center rounded-full bg-background/60 px-3 text-xs font-medium transition hover:bg-background/80"
                >
                  {focus.secondary.label}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(focus.primary.href);
                  }}
                  className="inline-flex h-9 items-center rounded-full bg-foreground px-4 text-xs font-semibold text-background transition hover:bg-foreground/90"
                >
                  {focus.primary.label}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Based on purchases */}
        {purchasesCount > 0 ? (
          <section className="mx-4 sm:mx-6 lg:mx-10">
            <div className="rounded-2xl bg-muted/10 p-5 sm:p-6 ring-1 ring-border/50">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold">Based on what you have bought</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Based on what you have bought, we found these Stock photos.
                  </p>
                </div>
                <button
                  onClick={() => router.push('/stock')}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-background/60 px-5 py-2.5 text-sm font-medium transition hover:bg-background/80 sm:w-auto"
                >
                  Browse Stock <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="relative mt-4 overflow-hidden sm:mt-5">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent" />

                {recommendedBasedOnPurchases.length ? (
                  <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                    {recommendedBasedOnPurchases.map((a) => {
                      const id = String(a?.id ?? '').trim();
                      const src = String(a?.preview ?? '') || `/demo/stock/${id}.jpg`;
                      return (
                        <button
                          key={`rec-${id}`}
                          type="button"
                          onClick={() => openStockAsset(id)}
                          className="group w-64 shrink-0 snap-start text-left sm:w-72"
                        >
                          <div className="relative h-40 overflow-hidden rounded-2xl bg-muted ring-1 ring-border/40 transition group-hover:ring-border/60">
                            <NextImage
                              src={src}
                              alt={String(a?.title ?? 'Stock photo')}
                              fill
                              sizes="288px"
                              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                              unoptimized={src.startsWith('/demo/')}
                            />
                          </div>
                          <div className="mt-2 line-clamp-2 text-sm font-medium">{String(a?.title ?? id)}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">Open in Stock</div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
                    We’re still learning your style — here are a few solid picks to start with.
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : null}

        {!hasTeam ? (
          <section className="mx-4 sm:mx-6 lg:mx-10">
            <div className="relative overflow-hidden rounded-2xl bg-muted/10 p-5 sm:p-6 ring-1 ring-border/50">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="max-w-xl">
                  <p className="text-xs font-semibold text-muted-foreground">Get more value</p>
                  <h2 className="mt-1 text-base font-semibold tracking-tight">
                    Invite your first teammate
                  </h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Collaborate on files, purchases and rights. Invite one person to get started — you can manage access anytime.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => router.push('/team?demo=1')}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition hover:bg-foreground/90"
                  >
                    Invite teammate
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => router.push('/team')}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-background/60 px-5 text-sm font-medium ring-1 ring-border/40 transition hover:bg-background/80"
                  >
                    Team overview
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-background/60 px-3 py-1 text-xs ring-1 ring-border/30">Roles & access</span>
                <span className="rounded-full bg-background/60 px-3 py-1 text-xs ring-1 ring-border/30">Shared files</span>
                <span className="rounded-full bg-background/60 px-3 py-1 text-xs ring-1 ring-border/30">Rights stay attached</span>
              </div>
            </div>
          </section>
        ) : null}

        <div className="mx-4 sm:mx-6 lg:mx-10 h-px bg-border/60" />

        <div className="px-4 sm:px-6 lg:px-10 space-y-6">
          <div>
            <h2 className="text-base font-semibold">Get started</h2>
            <p className="mt-1 text-sm text-muted-foreground">Choose where you want to begin</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <button
              onClick={() => router.push('/drive')}
              className="group relative overflow-hidden rounded-2xl bg-muted/20 p-4 ring-1 ring-border/50 text-left transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/70">
                  <Folder className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold leading-tight">Files</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Your folders, uploads and shared links</p>
                </div>
              </div>

              <div className="mt-3 hidden items-center justify-between rounded-xl bg-background/40 px-3 py-2 ring-1 ring-border/30 sm:flex">
                <div className="text-xs text-muted-foreground">Recent in Files</div>
                <ThumbStack seed="get-started:share" count={4} />
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                Continue in Files — jump back to folders, uploads and team handoff.
              </p>

              <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-foreground">
                Continue <ArrowRight className="h-4 w-4" />
              </div>
            </button>

            <button
              onClick={() => router.push('/stock')}
              className="group relative overflow-hidden rounded-2xl bg-muted/20 p-4 ring-1 ring-border/50 text-left transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/70">
                  <Images className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold leading-tight">Stock</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Search, license and manage your cart</p>
                </div>
              </div>

              <div className="mt-3 hidden items-center justify-between rounded-xl bg-background/40 px-3 py-2 ring-1 ring-border/30 sm:flex">
                <div className="text-xs text-muted-foreground">Recent in Stock</div>
                <ThumbStack seed="get-started:stock" count={4} />
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                Continue in Stock — search fast, compare, add to cart, license when ready.
              </p>

              <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-foreground">
                Continue <ArrowRight className="h-4 w-4" />
              </div>
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Quick actions */}
            <section className="w-full rounded-2xl bg-muted/10 p-4 ring-1 ring-border/50">
              <div>
                <h2 className="text-base font-semibold">Quick actions</h2>
                <p className="mt-1 text-sm text-muted-foreground">Jump to common tasks</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {quickActions.map((a) => (
                  <button
                    key={a.label}
                    onClick={() => router.push(a.href)}
                    className="group inline-flex items-center gap-2 rounded-full bg-background/60 px-3 py-1.5 text-sm transition hover:bg-background/80"
                  >
                    {a.icon ? <a.icon className="h-4 w-4" /> : null}
                    <span className="font-medium">{a.label}</span>
                    <span className="hidden sm:inline text-xs text-muted-foreground">• {a.hint}</span>
                    <span className="ml-1 hidden sm:inline-flex scale-90 origin-right">
                      <ThumbStack seed={`qa:${a.label}`} />
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Recent activity */}
            <section className="w-full rounded-2xl bg-muted/10 p-4 ring-1 ring-border/50">
              <div>
                <h2 className="text-base font-semibold">Recent activity</h2>
                <p className="mt-1 text-sm text-muted-foreground">A quick snapshot based on your activity</p>
              </div>

              <div className="mt-3 grid gap-2">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-background/60 p-3 transition hover:bg-background/80">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground">Last seen</div>
                      <ThumbStack seed="last-seen" />
                    </div>
                    <div className="mt-1 text-sm font-medium">{lastSeenLabel ? lastSeenLabel : 'First visit today'}</div>
                    {isDemo ? (
                      <div className="mt-0.5 text-xs text-muted-foreground">{visitCount ? `Visit #${visitCount}` : '—'}</div>
                    ) : null}
                  </div>

                  <div className="rounded-xl bg-background/60 p-3 transition hover:bg-background/80">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground">Cart</div>
                      <ThumbStack seed="cart" />
                    </div>
                    <div className="mt-1 text-sm font-medium">
                      {cartCount ? `${cartCount} item${cartCount === 1 ? '' : 's'}` : 'Empty'}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">Add as you browse — license when ready</div>
                  </div>
                </div>

                <div className="rounded-xl bg-background/60 p-3 transition hover:bg-background/80">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground">Recent Stock searches</div>
                    {isDemo ? <span className="text-xs text-muted-foreground">Local</span> : null}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Visual inspiration</span>
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                      <span>based on your activity</span>
                    </div>
                    <div className="flex -space-x-2">
                      {[0, 1, 2, 3, 4].map((i) => {
                        const src = getThumb('searches', i);
                        if (!src) return null;
                        return (
                          <div key={i} className="relative h-5 w-5 overflow-hidden rounded-full ring-2 ring-background bg-muted">
                            <NextImage src={src} alt="" fill sizes="20px" className="object-cover" />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {recentSearches.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {recentSearches.map((q) => (
                        <button
                          key={q}
                          onClick={() => {
                            pushRecentSearch(q);
                            router.push(`/stock/search?q=${encodeURIComponent(q)}`);
                          }}
                          className="rounded-full bg-muted/30 px-3 py-1 text-xs text-foreground transition hover:bg-muted/40"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-1.5 text-sm text-muted-foreground">
                      No searches yet — open Stock and try a query like “winter campaign”. Your searches will show up here.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <section className="w-full rounded-2xl bg-muted/10 p-4 ring-1 ring-border/50">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">Suggested next</h2>
                <p className="mt-1 text-sm text-muted-foreground">Small steps that keep your workspace clean</p>
              </div>
              {isDemo ? <div className="text-xs text-muted-foreground">For you</div> : null}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {suggestions.map((s) => (
                <button
                  key={s.key}
                  onClick={() => router.push(s.href)}
                  className="group rounded-xl bg-background/60 p-3 text-left transition hover:bg-background/80"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/30">
                        <s.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium">{s.title}</div>
                        <div className="mt-0.5 text-sm text-muted-foreground">{s.description}</div>
                      </div>
                    </div>
                    <ThumbStack seed={`suggest:${s.key}`} />
                  </div>
                  <div className="mt-2 inline-flex items-center gap-2 text-sm font-medium">
                    Open <ArrowRight className="h-4 w-4" />
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="w-full rounded-2xl bg-muted/10 p-4 ring-1 ring-border/50">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">Recently viewed</h2>
                <p className="mt-1 text-sm text-muted-foreground">A quick way back to visuals you opened</p>
              </div>
              {isDemo ? <div className="text-xs text-muted-foreground">Local history</div> : null}
            </div>

            {recentViews.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {recentViews.map((id) => (
                  <button
                    key={id}
                    onClick={() => openRecentView(id)}
                    className="inline-flex items-center gap-2 rounded-full bg-background/60 px-2.5 py-1.5 text-sm transition hover:bg-background/80 sm:px-3"
                  >
                    {(() => {
                      const src = getThumb(`view:${id}`, 0);
                      return src ? (
                        <span className="relative h-5 w-5 overflow-hidden rounded-full bg-muted ring-2 ring-background">
                          <NextImage src={src} alt="" fill sizes="20px" className="object-cover" />
                        </span>
                      ) : null;
                    })()}
                    <Images className="h-4 w-4" />
                    <span className="max-w-[140px] truncate font-medium sm:max-w-none">{id}</span>
                    <span className="text-xs text-muted-foreground">Open</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-xl bg-background/60 p-3 text-sm text-muted-foreground">
                Nothing viewed yet. Browse Stock and this area will start to fill up.
              </div>
            )}
          </section>

          <section id="news" className="w-full rounded-2xl bg-muted/10 p-4 ring-1 ring-border/50">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">What’s new</h2>
                <p className="mt-1 text-sm text-muted-foreground">Updates and changes across Files and Stock.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAllNews((v) => !v)}
                  className="rounded-full bg-background/60 px-3 py-1 text-xs font-medium transition hover:bg-background/80"
                >
                  {showAllNews ? 'Show less' : 'Show all'}
                </button>
                <div className="text-xs text-muted-foreground">Latest updates</div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {newsItems.slice(0, showAllNews ? newsItems.length : 2).map((item) => (
                <article
                  key={`${item.date}-${item.title}`}
                  className="rounded-xl bg-background/60 p-3 transition hover:bg-background/80"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <time className="text-xs text-muted-foreground">{item.date}</time>
                      {item.badge ? (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{item.badge}</span>
                      ) : null}
                    </div>
                    <div className="hidden sm:block">
                      <ThumbStack seed={`news:${item.title}`} />
                    </div>
                  </div>
                  <h3 className="mt-2 text-sm font-medium">{item.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AuthGate>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageInner />
    </Suspense>
  );
}