'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STOCK_ASSETS as ASSETS } from '@/lib/demo/stock-assets';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import ImageCard from '@/components/stock/ImageCard';
import { ArrowLeft, ShoppingCart, Download, Loader2 } from 'lucide-react';
import { useCart, useCartUI } from '@/lib/cart/cart';
import { useProtoAuth } from '@/lib/proto-auth';
import { readJSON } from '@/lib/storage/localStorage';


type Asset = {
  id: string;
  title: string;
  preview: string;
  category: string;
  description?: string;
  keywords?: string[];
  tags?: string[];
};

type TabKey = 'info' | 'keywords' | 'similar' | 'shoot' | 'related';

const getAssetImage = (asset?: Asset) => asset?.preview ?? '';

const buildSemanticQuery = (asset?: Asset) => {
  const title = (asset?.title ?? '').trim();
  const desc = (asset?.description ?? '').trim();

  const tags = (asset?.tags ?? []).filter(isNonEmptyString).slice(0, 10).join(' ');
  const keywords = (asset?.keywords ?? []).filter(isNonEmptyString).slice(0, 10).join(' ');

  // Semantic query should focus on vibe/subject, not lock to category.
  // Weight title higher by repeating it.
  const parts = [title, title, desc, tags, keywords].filter(Boolean);
  return parts.join(' · ').slice(0, 420);
};

const DRIVE_IMPORTED_ASSETS_KEY = 'CBX_DRIVE_IMPORTED_ASSETS_V1';
const DRIVE_PURCHASES_IMPORTED_EVENT = 'CBX_PURCHASES_IMPORTED';

function extractPurchasedList(parsed: any): any[] {
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || typeof parsed !== 'object') return [];

  // Common container keys
  const direct =
    parsed.items ??
    parsed.assets ??
    parsed.purchases ??
    parsed.images ??
    parsed.files ??
    parsed.importedAssets ??
    parsed.data;
  if (Array.isArray(direct)) return direct;

  // Fallback: first array value in the object
  for (const v of Object.values(parsed)) {
    if (Array.isArray(v)) return v as any[];
  }

  return [];
}

function extractIdFromString(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const s = raw.trim();
  if (!s) return '';
  const cbx = s.match(/COLOURBOX\d+/i)?.[0];
  if (cbx) return cbx;
  const num = s.match(/\b\d{6,}\b/)?.[0];
  return num ?? '';
}

function addIdVariants(set: Set<string>, raw: unknown) {
  const v = (raw ?? '').toString().trim();
  if (!v) return;
  set.add(v);

  const upper = v.toUpperCase();
  set.add(upper);

  const numeric = v.replace(/^COLOURBOX/i, '').trim();
  if (numeric) {
    set.add(numeric);
    set.add(numeric.toUpperCase());
    set.add(`COLOURBOX${numeric}`);
    set.add(`COLOURBOX${numeric}`.toUpperCase());
  }
}

function isPurchasesFolder(folderId: unknown): boolean {
  const f = (folderId ?? '').toString().trim().toLowerCase();
  if (!f) return true; // missing -> treat as purchases in demo
  return f === 'purchases' || f === 'purchase' || f.includes('purch');
}

function collectIdsFromUnknown(ids: Set<string>, value: any, depth = 0) {
  if (depth > 5) return;
  if (value == null) return;

  if (typeof value === 'string') {
    addIdVariants(ids, extractIdFromString(value));
    return;
  }

  if (typeof value === 'number') {
    addIdVariants(ids, String(value));
    return;
  }

  if (Array.isArray(value)) {
    for (const v of value) collectIdsFromUnknown(ids, v, depth + 1);
    return;
  }

  if (typeof value === 'object') {
    // Known id-like fields
    addIdVariants(ids, value.id);
    addIdVariants(ids, value.assetId);
    addIdVariants(ids, value.colourboxId);
    addIdVariants(ids, value.cbxId);
    addIdVariants(ids, value.imageId);

    // Common src-like fields
    addIdVariants(ids, extractIdFromString(value.src));
    addIdVariants(ids, extractIdFromString(value.preview));
    addIdVariants(ids, extractIdFromString(value.url));
    addIdVariants(ids, extractIdFromString(value.image));

    for (const v of Object.values(value)) collectIdsFromUnknown(ids, v, depth + 1);
  }
}

function readPurchasedIdsFromAllStorage(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const ids = new Set<string>();

    const scan = (storage: Storage) => {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;

        // Heuristic: prefer likely keys, but don't completely miss the real one.
        const k = key.toLowerCase();
        const likely = k.includes('purchase') || k.includes('purch') || k.includes('import') || k.includes('drive') || k.includes('cbx');
        if (!likely && storage.length > 60) continue; // keep it safe in large storages

        const raw = storage.getItem(key);
        if (!raw) continue;

        // Plain string may contain a COLOURBOX id
        addIdVariants(ids, extractIdFromString(raw));

        // Structured JSON storage
        try {
          const parsed = (() => {
            try {
              return JSON.parse(raw);
            } catch {
              return null;
            }
          })();
          if (parsed) {
            const list = extractPurchasedList(parsed);
            if (Array.isArray(list) && list.length) {
              for (const it of list) collectIdsFromUnknown(ids, it);
            } else {
              collectIdsFromUnknown(ids, parsed);
            }
          }
        } catch {
          // ignore
        }
      }
    };

    scan(window.localStorage);
    scan(window.sessionStorage);

    return ids;
  } catch {
    return new Set();
  }
}

function readPurchasedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const parsed = readJSON<any>(DRIVE_IMPORTED_ASSETS_KEY, []);
    const list = extractPurchasedList(parsed);
    if (!Array.isArray(list) || list.length === 0) {
      return readPurchasedIdsFromAllStorage();
    }

    const ids = new Set<string>();
    for (const it of list) {
      if (!isPurchasesFolder(it?.folderId)) continue;

      // Collect multiple possible id fields (top-level)
      addIdVariants(ids, it?.id);
      addIdVariants(ids, it?.assetId);
      addIdVariants(ids, it?.colourboxId);
      addIdVariants(ids, it?.cbxId);
      addIdVariants(ids, it?.imageId);

      // Nested asset shapes
      addIdVariants(ids, it?.asset?.id);
      addIdVariants(ids, it?.asset?.assetId);
      addIdVariants(ids, it?.asset?.colourboxId);
      addIdVariants(ids, it?.asset?.cbxId);
      addIdVariants(ids, it?.asset?.imageId);

      // If ids are missing/wrong, derive from src-like fields
      addIdVariants(ids, extractIdFromString(it?.src));
      addIdVariants(ids, extractIdFromString(it?.preview));
      addIdVariants(ids, extractIdFromString(it?.url));
      addIdVariants(ids, extractIdFromString(it?.image));
      addIdVariants(ids, extractIdFromString(it?.asset?.src));
      addIdVariants(ids, extractIdFromString(it?.asset?.preview));
      addIdVariants(ids, extractIdFromString(it?.asset?.url));
      addIdVariants(ids, extractIdFromString(it?.asset?.image));
    }
    const extra = readPurchasedIdsFromAllStorage();
    for (const x of extra) ids.add(x);
    return ids;
  } catch {
    return new Set();
  }
}

const normalizeToken = (s?: string) => (s ?? '').trim().toLowerCase();

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const pickTokens = (
  asset?: Asset,
  opts?: { includeCategory?: boolean; limit?: number }
) => {
  const includeCategory = opts?.includeCategory ?? true;
  const limit = opts?.limit ?? 10;

  const fromTags = asset?.tags ?? [];
  const fromKeywords = asset?.keywords ?? [];
  const fromCategory = includeCategory && asset?.category ? [asset.category] : [];

  const merged = [...fromTags, ...fromKeywords, ...fromCategory]
    .filter(isNonEmptyString)
    .map(normalizeToken);

  const unique = Array.from(new Set(merged));
  return unique.slice(0, limit);
};

const pickMeaningful = (asset?: Asset, limit = 12) =>
  pickTokens(asset, { includeCategory: false, limit });

const pickTags = (asset?: Asset, limit = 10) => pickTokens(asset, { includeCategory: true, limit });

// --- Similarity helpers for better "Similar images" picks ---
const tokenSet = (a?: Asset) => new Set(pickTokens(a, { includeCategory: true, limit: 200 }));

const jaccard = (a: Set<string>, b: Set<string>) => {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
};

const signature = (a?: Asset) => {
  // coarse signature to avoid near-duplicates when demo assets share very similar metadata
  const cat = normalizeToken(a?.category ?? '');
  const t = pickMeaningful(a, 6).sort().join('|');
  return `${cat}::${t}`;
};

// --- Lightweight local semantic matcher (no external AI deps) ---
const buildDocText = (a?: Asset) => {
  if (!a) return '';
  const parts = [
    a.title,
    a.description ?? '',
    a.category,
    ...(a.tags ?? []),
    ...(a.keywords ?? []),
  ]
    .filter(isNonEmptyString)
    .map((s) => s.toLowerCase().trim());

  return parts.join(' · ').replace(/\s+/g, ' ').trim();
};

const charNgrams = (s: string, n = 3) => {
  const clean = s
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const padded = ` ${clean} `;
  const grams: string[] = [];
  if (padded.length < n) return grams;
  for (let i = 0; i <= padded.length - n; i++) grams.push(padded.slice(i, i + n));
  return grams;
};

const cosine = (a: Map<string, number>, b: Map<string, number>) => {
  if (!a.size || !b.size) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;

  for (const v of a.values()) na += v * v;
  for (const v of b.values()) nb += v * v;

  const small = a.size <= b.size ? a : b;
  const big = a.size <= b.size ? b : a;
  for (const [k, v] of small) {
    const w = big.get(k);
    if (w) dot += v * w;
  }

  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
};

const toTfidf = (grams: string[], idf: Map<string, number>) => {
  const tf = new Map<string, number>();
  for (const g of grams) tf.set(g, (tf.get(g) ?? 0) + 1);

  const vec = new Map<string, number>();
  for (const [g, c] of tf) {
    const w = (1 + Math.log(c)) * (idf.get(g) ?? 0);
    if (w > 0) vec.set(g, w);
  }
  return vec;
};


const overlapHint = (
  base: Set<string>,
  asset?: Asset,
  opts?: { limit?: number; fallback?: string }
) => {
  const limit = opts?.limit ?? 2;
  const fallback = opts?.fallback ?? asset?.category ?? '';
  const tokens = pickMeaningful(asset, 8);
  const overlap = tokens.filter((t) => base.has(t)).slice(0, limit);
  return overlap.length ? overlap.join(' · ') : fallback;
};


export default function StockAssetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isReady, isLoggedIn } = useProtoAuth();
  const loggedIn = isReady && isLoggedIn;
  const { addItem, items } = useCart();
  const { open: openCart } = useCartUI();

  const assets = useMemo(() => ASSETS as Asset[], []);

  const asset = useMemo(() => assets.find((a) => a.id === id), [assets, id]);

  const cartIds = useMemo(() => {
    const ids = new Set<string>();
    const list = (items as any[]) ?? [];
    for (const it of list) {
      const itId = (it?.id ?? it?.assetId ?? '').toString();
      if (itId) ids.add(itId);
    }
    return ids;
  }, [items]);


  const baseMeaningfulSet = useMemo(() => new Set(pickMeaningful(asset, 24)), [asset]);

  const semanticQuery = useMemo(() => buildSemanticQuery(asset), [asset]);

  const semanticModel = useMemo(() => {
    const docs = assets.map((a) => ({ id: a.id, text: buildDocText(a) }));

    // document frequency (df) for 3-grams
    const df = new Map<string, number>();
    const docGrams = new Map<string, string[]>();

    for (const d of docs) {
      const gramsArr = charNgrams(d.text, 3);
      docGrams.set(d.id, gramsArr);

      const gramsSet = new Set(gramsArr);
      for (const g of gramsSet) df.set(g, (df.get(g) ?? 0) + 1);
    }

    const N = Math.max(1, docs.length);
    const idf = new Map<string, number>();
    for (const [g, c] of df) {
      // smooth idf
      idf.set(g, Math.log(1 + N / (1 + c)));
    }

    const docVecs = new Map<string, Map<string, number>>();
    for (const d of docs) {
      const gramsArr = docGrams.get(d.id) ?? [];
      docVecs.set(d.id, toTfidf(gramsArr, idf));
    }

    return { idf, docVecs };
  }, [assets]);

  const similarSemanticScores = useMemo(() => {
    const q = semanticQuery.trim();
    if (!q) return new Map<string, number>();

    const qVec = toTfidf(charNgrams(q, 3), semanticModel.idf);

    const scores = new Map<string, number>();
    const currentId = asset?.id ?? id;

    for (const [docId, dVec] of semanticModel.docVecs) {
      if (docId === currentId) continue;
      const s = cosine(qVec, dVec);
      if (s > 0) scores.set(docId, s);
    }

    return scores;
  }, [asset, id, semanticQuery, semanticModel]);

  const relatedPicks = useMemo(() => {
    if (!assets.length) return [] as Asset[];

    const currentId = asset?.id ?? id;
    const baseMeaningful = baseMeaningfulSet;
    const baseAll = tokenSet(asset);

    const scored = assets
      .filter((a) => a.id !== currentId)
      .map((a) => {
        const meaningful = pickMeaningful(a, 24);
        let hits = 0;
        for (const t of meaningful) if (baseMeaningful.has(t)) hits += 1;

        const sameCat = asset?.category && a.category && a.category === asset.category;
        const sim = jaccard(baseAll, tokenSet(a));
        const hasPreview = Boolean(getAssetImage(a));

        // Penalize category-only matches (no meaningful overlap)
        const categoryOnly = sameCat && hits === 0;

        let score = 0;
        score += Math.min(hits, 8) * 2.4; // strong overlap on meaningful tokens
        score += sim * 6; // softer semantic similarity
        if (sameCat) score += 4; // category matters for related
        if (hasPreview) score += 0.5;
        if (categoryOnly) score -= 3;

        return {
          a,
          score,
          sig: signature(a),
          cat: (a.category ?? '').trim(),
        };
      })
      .sort((x, y) => y.score - x.score);

    // Pool: top unique signatures
    const pool: typeof scored = [];
    const seenSig = new Set<string>();
    for (const item of scored) {
      if (pool.length >= 20) break;
      if (seenSig.has(item.sig)) continue;
      seenSig.add(item.sig);
      pool.push(item);
    }

    // Diversity after first 3
    const result: Asset[] = [];
    const seenCats = new Set<string>();
    for (const item of pool) {
      if (result.length >= 8) break;
      const cat = item.cat;

      if (result.length >= 3 && cat && seenCats.has(cat)) continue;

      if (cat) seenCats.add(cat);
      result.push(item.a);
    }

    // Fill remaining slots
    if (result.length < 8) {
      for (const item of pool) {
        if (result.length >= 8) break;
        if (result.some((r) => r.id === item.a.id)) continue;
        result.push(item.a);
      }
    }

    return result;
  }, [assets, asset, id, baseMeaningfulSet]);

  const sameShootPicks = useMemo(() => {
    if (!assets.length) return [] as Asset[];
    const currentId = asset?.id ?? id;

    const pool = assets
      .filter((a) => a.id !== currentId && a.category === asset?.category)
      .map((a) => {
        const meaningful = pickMeaningful(a, 24);
        let hits = 0;
        for (const t of meaningful) if (baseMeaningfulSet.has(t)) hits += 1;
        const hasPreview = Boolean(getAssetImage(a));
        const score = Math.min(hits, 8) * 2 + (hasPreview ? 0.5 : 0);
        return { a, score, sig: signature(a) };
      })
      .sort((x, y) => y.score - x.score);

    const res: Asset[] = [];
    const seenSig = new Set<string>();
    for (const item of pool) {
      if (res.length >= 12) break;
      if (seenSig.has(item.sig)) continue;
      seenSig.add(item.sig);
      res.push(item.a);
    }

    return res;
  }, [assets, asset, id, baseMeaningfulSet]);

  const similarPicks = useMemo(() => {
    if (!assets.length) return [] as Asset[];

    const currentId = asset?.id ?? id;

    // Semantic-first pool
    const hasSemantic = similarSemanticScores.size > 0;

    const base = tokenSet(asset);
    const baseTags = baseMeaningfulSet;

    const scored = assets
      .filter((a) => a.id !== currentId)
      .map((a) => {
        const t = tokenSet(a);
        const jac = jaccard(base, t);

        const aTags = pickMeaningful(a, 16);
        let tagHits = 0;
        for (const tok of aTags) if (baseTags.has(tok)) tagHits += 1;

        const sameCat = asset?.category && a.category && a.category === asset.category;
        const categoryOnly = sameCat && tagHits === 0;
        const hasPreview = Boolean(getAssetImage(a));

        const sem = hasSemantic ? (similarSemanticScores.get(a.id) ?? 0) : 0;

        let score = 0;

        // When semantic is available, prefer it strongly. Otherwise fall back to heuristic.
        if (hasSemantic) {
          score += sem * 10;
          score += jac * 2;
          score += Math.min(tagHits, 6) * 0.8;
          if (sameCat) score += 1.0;
        } else {
          score += jac * 10;
          score += Math.min(tagHits, 6) * 2.2;
          if (sameCat) score += 2.5;
        }

        if (hasPreview) score += 0.5;
        if (categoryOnly) score -= 3.5;

        return {
          a,
          score,
          sig: signature(a),
          cat: (a.category ?? '').trim(),
          sem,
        };
      })
      .sort((x, y) => y.score - x.score);

    // First pass: take best, but avoid near-duplicates by signature
    const pool: typeof scored = [];
    const seenSig = new Set<string>();
    for (const item of scored) {
      if (pool.length >= 22) break;
      if (seenSig.has(item.sig)) continue;
      // If semantic is available, keep only clearly similar matches
      if (hasSemantic && item.sem < 0.30) continue;
      seenSig.add(item.sig);
      pool.push(item);
    }

    // MMR-style pick: keep relevance but penalize near-duplicates.
    // Higher lambda => more relevance, lower => more diversity.
    const LAMBDA = 0.78;

    // Cache token sets for fast similarity checks
    const tokenCache = new Map<string, Set<string>>();
    const getTokens = (a: Asset) => {
      const cached = tokenCache.get(a.id);
      if (cached) return cached;
      const ts = tokenSet(a);
      tokenCache.set(a.id, ts);
      return ts;
    };

    const picked: Asset[] = [];
    const pickedCats = new Set<string>();

    // Seed with the best item
    if (pool.length) {
      const first = pool[0];
      picked.push(first.a);
      if (first.cat) pickedCats.add(first.cat);
    }

    while (picked.length < 12) {
      let bestIdx = -1;
      let bestScore = -Infinity;

      for (let i = 0; i < pool.length; i++) {
        const cand = pool[i];
        const a = cand.a;
        if (picked.some((p) => p.id === a.id)) continue;

        // After a few picks, encourage category diversity
        if (picked.length >= 4 && cand.cat && pickedCats.has(cand.cat)) continue;

        // Diversity penalty: max similarity to any already picked
        const aTok = getTokens(a);
        let maxSim = 0;
        for (const p of picked) {
          const sim = jaccard(aTok, getTokens(p));
          if (sim > maxSim) maxSim = sim;
        }

        // MMR score
        const mmr = LAMBDA * cand.score - (1 - LAMBDA) * (maxSim * 10);

        if (mmr > bestScore) {
          bestScore = mmr;
          bestIdx = i;
        }
      }

      if (bestIdx === -1) break;
      const chosen = pool[bestIdx];
      picked.push(chosen.a);
      if (chosen.cat) pickedCats.add(chosen.cat);
    }

    // If we got stuck due to category diversity, relax and fill remaining by relevance.
    if (picked.length < 12) {
      for (const cand of pool) {
        if (picked.length >= 12) break;
        if (picked.some((p) => p.id === cand.a.id)) continue;
        picked.push(cand.a);
      }
    }

    return picked;
  }, [assets, asset, id, baseMeaningfulSet, similarSemanticScores]);

  const fallbackImage = useMemo(() => {
    const firstValid = assets.find((a) => Boolean(getAssetImage(a)));
    const src = firstValid ? getAssetImage(firstValid) : '';
    return src || '/demo/stock/COLOURBOX69824938.jpg';
  }, [assets]);
  const assetPreview = asset ? getAssetImage(asset) : '';
  const imageSrc = assetPreview ? assetPreview : fallbackImage;
  const title = asset?.title ?? 'Asset';
  const tags = pickTags(asset, 10);
  const displayTags = useMemo(() => {
    // Try to show original tag casing when available
    const original = [
      ...(asset?.tags ?? []),
      ...(asset?.keywords ?? []),
      ...(asset?.category ? [asset.category] : []),
    ].filter(isNonEmptyString);

    const map = new Map<string, string>();
    for (const t of original) map.set(t.trim().toLowerCase(), t.trim());

    return tags.map((t) => map.get(t) ?? t);
  }, [asset, tags]);

  const assetId = asset?.id ?? id;
  const returnTo = `/stock/assets/${assetId}`;

  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(() => new Set());

  const isPurchased = useMemo(() => {
    const aId = (assetId ?? '').toString().trim();
    if (!aId) return false;

    const upper = aId.toUpperCase();
    const numeric = aId.replace(/^COLOURBOX/i, '').trim();

    return (
      purchasedIds.has(aId) ||
      purchasedIds.has(upper) ||
      (numeric ? purchasedIds.has(numeric) || purchasedIds.has(numeric.toUpperCase()) : false) ||
      (numeric ? purchasedIds.has(`COLOURBOX${numeric}`) || purchasedIds.has(`COLOURBOX${numeric}`.toUpperCase()) : false)
    );
  }, [assetId, purchasedIds]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!loggedIn) return;

    const refresh = () => setPurchasedIds(readPurchasedIds());
    refresh();

    const onImported = () => refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === DRIVE_IMPORTED_ASSETS_KEY) refresh();
    };

    window.addEventListener(DRIVE_PURCHASES_IMPORTED_EVENT, onImported as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(DRIVE_PURCHASES_IMPORTED_EVENT, onImported as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, [loggedIn]);

  // Demo pricing (mirrors Colourbox example)
  const priceSingle = 7.99;
  const payGo10Price = 69.0;
  const payGo10Was = 79.9;
  const payGo10SavePct = 14;

  const [purchaseOption, setPurchaseOption] = useState<'single' | 'paygo10'>('single');
  const [added, setAdded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isSmUp, setIsSmUp] = useState(false);
  const topbarOffset = isSmUp ? 64 : 56;
  const stickyMenuOffset = isSmUp ? 48 : 44; // compact sticky menu height

  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const infoRef = useRef<HTMLDivElement | null>(null);
  const keywordsRef = useRef<HTMLDivElement | null>(null);
  const similarRef = useRef<HTMLElement | null>(null);
  const shootRef = useRef<HTMLElement | null>(null);
  const relatedRef = useRef<HTMLElement | null>(null);
  const [showStickyMenu, setShowStickyMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const showStickyMenuRef = useRef(false);
  const stickyRafRef = useRef<number | null>(null);
  const activeTabRef = useRef<TabKey>('info');
  const tabRafRef = useRef<number | null>(null);
  const addedTimeoutRef = useRef<number | null>(null);
  const scrollTo = useCallback(
    (ref: React.RefObject<HTMLElement | null>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const targetLine = topbarOffset + (showStickyMenu ? stickyMenuOffset : 0) + 8;
      const y = window.scrollY + rect.top - targetLine;

      // If we are already close to the target line, don't restart a smooth scroll (feels like a hitch).
      if (Math.abs(rect.top - targetLine) < 12) {
        window.scrollTo({ top: y, behavior: 'auto' });
        return;
      }

      window.scrollTo({ top: y, behavior: 'smooth' });
    },
    [topbarOffset, stickyMenuOffset, showStickyMenu]
  );

  const onTabClick = useCallback(
    (key: TabKey, ref: React.RefObject<HTMLElement | null>) => {
      setActiveTab(key);
      activeTabRef.current = key;
      scrollTo(ref);
    },
    [scrollTo]
  );

  const stickyTabs = useMemo(
    () => [
      { key: 'info' as const, label: 'Info', ref: infoRef },
      { key: 'keywords' as const, label: 'Keywords', ref: keywordsRef },
      { key: 'shoot' as const, label: 'From the same shoot', ref: shootRef },
      { key: 'similar' as const, label: 'Similar', ref: similarRef },
      { key: 'related' as const, label: 'Related', ref: relatedRef },
    ],
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 640px)');
    const onChange = () => setIsSmUp(mq.matches);
    onChange();
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        // Stable trigger: show sticky menu when the hero has scrolled past the topbar line.
        const next = entry.boundingClientRect.bottom <= topbarOffset + 8;

        if (stickyRafRef.current !== null) cancelAnimationFrame(stickyRafRef.current);
        stickyRafRef.current = requestAnimationFrame(() => {
          if (showStickyMenuRef.current === next) return;
          showStickyMenuRef.current = next;
          setShowStickyMenu(next);
        });
      },
      {
        root: null,
        // Trigger updates around the topbar line to avoid oscillation.
        rootMargin: `-${topbarOffset + 8}px 0px 0px 0px`,
        threshold: 0,
      }
    );

    obs.observe(el);
    return () => {
      if (stickyRafRef.current !== null) cancelAnimationFrame(stickyRafRef.current);
      obs.disconnect();
    };
  }, [topbarOffset]);

  useEffect(() => {
    const infoEl = infoRef.current;
    const keywordsEl = keywordsRef.current;
    const similarEl = similarRef.current;
    const shootEl = shootRef.current;
    const relatedEl = relatedRef.current;

    const targets: Array<{ key: TabKey; el: HTMLElement | null }> = [
      { key: 'info', el: infoEl },
      { key: 'keywords', el: keywordsEl },
      { key: 'similar', el: similarEl },
      { key: 'shoot', el: shootEl },
      { key: 'related', el: relatedEl },
    ];

    const existing = targets.filter((t) => t.el) as Array<{ key: TabKey; el: HTMLElement }>;
    if (!existing.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top that is intersecting.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0));

        if (!visible.length) return;

        const el = visible[0].target as HTMLElement;
        const found = existing.find((t) => t.el === el);
        if (!found) return;

        const nextKey = found.key;
        if (tabRafRef.current !== null) cancelAnimationFrame(tabRafRef.current);
        tabRafRef.current = requestAnimationFrame(() => {
          if (activeTabRef.current === nextKey) return;
          activeTabRef.current = nextKey;
          setActiveTab(nextKey);
        });
      },
      {
        root: null,
        // Account for topbar + sticky menu height, only when sticky menu is visible.
        rootMargin: `-${topbarOffset + (showStickyMenu ? stickyMenuOffset : 0) + 24}px 0px -65% 0px`,
        threshold: 0.01,
      }
    );

    for (const t of existing) obs.observe(t.el);
    return () => {
      if (tabRafRef.current !== null) cancelAnimationFrame(tabRafRef.current);
      obs.disconnect();
    };
  }, [topbarOffset, stickyMenuOffset, showStickyMenu]);

  const onTouchStart = (e: React.TouchEvent) => {
    const p = e.touches[0];
    if (!p) return;
    touchStart.current = { x: p.clientX, y: p.clientY, t: Date.now() };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;

    const p = e.changedTouches[0];
    if (!p) return;

    const dx = p.clientX - start.x;
    const dy = p.clientY - start.y;
    const dt = Date.now() - start.t;

    // fast-ish horizontal swipe
    if (dt > 800) return;
    if (Math.abs(dx) < 60) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.2) return;

    if (dx > 0) goPrev();
    else goNext();
  };

  const currentIndex = useMemo(() => {
    const idx = assets.findIndex((a) => a.id === assetId);
    return idx >= 0 ? idx : 0;
  }, [assets, assetId]);

  const openLightbox = () => setLightboxOpen(true);
  const closeLightbox = () => setLightboxOpen(false);

  const goPrev = useCallback(() => {
    if (!assets.length) return;
    const prev = assets[(currentIndex - 1 + assets.length) % assets.length];
    if (prev) router.push(`/stock/assets/${prev.id}`);
  }, [assets, currentIndex, router]);

  const goNext = useCallback(() => {
    if (!assets.length) return;
    const next = assets[(currentIndex + 1) % assets.length];
    if (next) router.push(`/stock/assets/${next.id}`);
  }, [assets, currentIndex, router]);

  useEffect(() => {
    if (!lightboxOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [lightboxOpen, closeLightbox, goPrev, goNext]);

  const price = purchaseOption === 'single' ? priceSingle : payGo10Price;
  const selectedLicense = purchaseOption === 'single' ? 'single' : 'paygo10';
  const isInCart = useMemo(() => {
    const list = (items as any[]) ?? [];
    return list.some((it) => {
      if (!it) return false;
      const itId = (it.id ?? it.assetId ?? '').toString();
      if (itId !== assetId) return false;
      const itLic = it.license ?? it.selectedLicense;
      return itLic ? itLic === selectedLicense : true;
    });
  }, [items, assetId, selectedLicense]);

  const cartCtaLabel = useCallback(
    (addedText: string) => {
      if (added) return addedText;
      if (isInCart) return 'Show cart';
      return `Add to cart · €${price}`;
    },
    [added, isInCart, price]
  );

  const showInFiles = useCallback(() => {
    const v = (assetId ?? '').toString().trim();
    const highlight = v ? `&highlight=${encodeURIComponent(v)}` : '';
    router.push(`/drive?folder=purchases${highlight}`);
  }, [assetId, router]);

  const downloadImage = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (isDownloading) return;

    setDownloadError(null);
    setDownloaded(false);
    setIsDownloading(true);

    try {
      const res = await fetch(imageSrc, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${assetId}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

      setDownloaded(true);
      window.setTimeout(() => setDownloaded(false), 2000);
    } catch (e: any) {
      setDownloadError(e?.message ? String(e.message) : 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  }, [assetId, imageSrc, isDownloading]);

  const handleAddToCart = useCallback(() => {
    if (loggedIn && isPurchased) {
      showInFiles();
      return;
    }
    if (addedTimeoutRef.current !== null) {
      window.clearTimeout(addedTimeoutRef.current);
      addedTimeoutRef.current = null;
    }

    if (isInCart) {
      openCart();
      return;
    }

    addItem({
      id: assetId,
      title,
      license: selectedLicense,
      price,
      image: imageSrc,
      qty: 1,
    });

    openCart();
    setAdded(true);
    addedTimeoutRef.current = window.setTimeout(() => {
      setAdded(false);
      addedTimeoutRef.current = null;
    }, 2000);
  }, [addItem, assetId, title, selectedLicense, price, imageSrc, openCart, isInCart, loggedIn, isPurchased, showInFiles]);

  const addQuick = useCallback(
    (a: Asset) => {
      const aId = a.id;
      if (cartIds.has(aId)) {
        openCart();
        return;
      }
      addItem({
        id: aId,
        title: a.title,
        license: 'single',
        price: priceSingle,
        image: getAssetImage(a) || fallbackImage,
        qty: 1,
      });
      openCart();
    },
    [addItem, cartIds, openCart, fallbackImage]
  );

  useEffect(() => {
    return () => {
      if (addedTimeoutRef.current !== null) {
        window.clearTimeout(addedTimeoutRef.current);
        addedTimeoutRef.current = null;
      }
    };
  }, []);

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
    <main className="w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8 [--cbx-topbar:56px] sm:[--cbx-topbar:64px] [--cbx-sticky:44px] sm:[--cbx-sticky:48px]">
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

      <div
        className={`fixed top-[var(--cbx-topbar)] left-0 right-0 ${
          loggedIn ? 'md:left-[var(--app-left-rail)]' : 'md:left-0'
        } z-30 transition-all duration-200 ${
          showStickyMenu
            ? 'opacity-100 translate-y-0'
            : 'pointer-events-none opacity-0 -translate-y-2'
        }`}
        aria-hidden={!showStickyMenu}
      >
        <div className="border-b border-border bg-background/90 backdrop-blur">
          <div className="w-full px-4 py-2 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                {stickyTabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => onTabClick(t.key, t.ref)}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ring-1 ${
                      activeTab === t.key
                        ? 'bg-muted/50 text-foreground ring-black/10 dark:ring-white/20'
                        : 'text-muted-foreground ring-transparent hover:bg-muted/40 hover:text-foreground'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 sm:flex">
                  <div className="relative h-9 w-9 overflow-hidden rounded-lg ring-1 ring-black/5 dark:ring-white/10">
                    <Image src={imageSrc} alt={title} fill sizes="36px" className="object-cover" />
                  </div>
                  <div className="max-w-[200px]">
                    <div className="line-clamp-1 text-sm font-semibold">{title}</div>
                    <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      Image #{assetId}
                    </div>
                  </div>
                </div>

                <div className="hidden h-6 w-px bg-border sm:block" aria-hidden />

                {loggedIn && isPurchased ? (
                  <div className="flex items-center gap-2">
                    <Button
                      size="default"
                      variant="secondary"
                      className="gap-2"
                      onClick={downloadImage}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Downloading…
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Download
                        </>
                      )}
                    </Button>
                    <Button size="default" className="gap-2" onClick={showInFiles} disabled={isDownloading}>
                      Open in Files
                      <span aria-hidden>→</span>
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="default"
                    variant={isInCart || added ? 'secondary' : 'default'}
                    className="gap-2"
                    onClick={handleAddToCart}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {cartCtaLabel('Added')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] pt-2">
        <div className="space-y-3">
          <button
            type="button"
            onClick={openLightbox}
            className="group relative w-full rounded-2xl bg-muted/20 text-left"
            aria-label="Open image preview"
          >
            <div
              ref={heroRef}
              id="asset-preview"
              className="relative h-[calc(100vh-260px)] min-h-[320px] w-full overflow-hidden rounded-2xl ring-1 ring-black/5 dark:ring-white/10"
            >
              <Image
                src={imageSrc}
                alt={title}
                fill
                priority
                sizes="(min-width: 1024px) calc(100vw - 420px), 100vw"
                className="object-contain"
              />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10" />
            {/* ring overlay removed */}
            <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-background/80 px-2 py-1 text-[11px] text-foreground/70 ring-1 ring-black/5 dark:ring-white/10">
              <span className="sm:hidden">Tap to zoom</span>
              <span className="hidden sm:inline">Click to zoom · Esc to close</span>
            </div>
          </button>

          <div
            ref={infoRef}
            id="info"
            className="scroll-mt-[calc(var(--cbx-topbar)+var(--cbx-sticky)+44px)] rounded-2xl bg-background/95 p-4 ring-1 ring-black/5 dark:ring-white/10"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl font-semibold leading-tight sm:text-2xl">{title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">by Colourbox / Demo Photographer</p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="cursor-default">Royalty-free</Badge>
                <Badge variant="secondary" className="cursor-default">Instant download</Badge>
              </div>
            </div>

            {asset?.description ? (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{asset.description}</p>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                High-quality stock image ready to license and use across channels.
              </p>
            )}

            <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 ring-1 ring-black/5 dark:ring-white/10">
                <span>Image ID</span>
                <span className="font-medium text-foreground/80">#{assetId}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 ring-1 ring-black/5 dark:ring-white/10">
                <span>{loggedIn && isPurchased ? 'Status' : 'Starting at'}</span>
                <span className="font-medium text-foreground/80">
                  {loggedIn && isPurchased ? 'Purchased' : `€${priceSingle.toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>

          <section
            ref={keywordsRef}
            id="keywords"
            className="scroll-mt-[calc(var(--cbx-topbar)+var(--cbx-sticky)+44px)] rounded-2xl bg-background/95 p-4 ring-1 ring-black/5 dark:ring-white/10"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Keywords</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Explore similar images by clicking a keyword.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/stock/search')}
                className="shrink-0 inline-flex items-center gap-1 rounded-full bg-muted/30 px-3 py-1.5 text-xs font-semibold text-muted-foreground ring-1 ring-black/5 transition hover:bg-muted/50 hover:text-foreground dark:ring-white/10"
              >
                Explore
                <span aria-hidden>→</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {asset?.category ? (
                <Link href={`/stock/search?cat=${encodeURIComponent(asset.category.toLowerCase())}`}>
                  <Badge
                    variant="secondary"
                    className="cursor-pointer px-3 py-1 text-xs font-semibold transition hover:bg-muted/60 hover:text-foreground"
                  >
                    {asset.category}
                  </Badge>
                </Link>
              ) : null}

              {displayTags
                .filter((t) => t && t.toLowerCase() !== (asset?.category ?? '').toLowerCase())
                .slice(0, 14)
                .map((t) => (
                  <Link
                    key={t}
                    href={`/stock/search?q=${encodeURIComponent(t)}`}
                    className="inline-flex"
                  >
                    <Badge
                      variant="secondary"
                      className="cursor-pointer px-3 py-1 text-xs font-semibold transition hover:bg-muted/60 hover:text-foreground"
                    >
                      {t}
                    </Badge>
                  </Link>
                ))}
            </div>
          </section>
        </div>

        <Card className="h-fit p-4 lg:sticky lg:top-[calc(var(--cbx-topbar)+var(--cbx-sticky)+44px)] ring-1 ring-black/5 dark:ring-white/10">
          {loggedIn && isPurchased ? (
            <>
              <div className="mb-3">
                <div className="text-sm font-semibold">You’ve already purchased this image</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  The image is available in <span className="font-medium text-foreground/80">Files → Purchases</span>.
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button className="w-full gap-2" onClick={downloadImage} disabled={isDownloading}>
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Downloading…
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download JPG
                    </>
                  )}
                </Button>

                <Button
                  variant="secondary"
                  className="w-full gap-2"
                  onClick={showInFiles}
                  disabled={isDownloading}
                >
                  Open in Files
                  <span aria-hidden>→</span>
                </Button>

                {downloaded ? (
                  <div className="text-xs text-foreground/80">Downloaded.</div>
                ) : downloadError ? (
                  <div className="text-xs text-destructive">{downloadError}</div>
                ) : null}
              </div>

              <p className="mt-3 text-xs text-muted-foreground">Demo · Purchases are stored locally in your browser.</p>
            </>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Buy license</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">Choose an option below</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  From <span className="font-medium text-foreground/80">€{priceSingle.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <button
                  type="button"
                  onClick={() => setPurchaseOption('single')}
                  className={`w-full rounded-lg p-3 text-left transition ring-1 ${
                    purchaseOption === 'single'
                      ? 'bg-primary/10 ring-primary/40'
                      : 'bg-background ring-black/5 hover:bg-muted/40 dark:ring-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">€{priceSingle.toFixed(2)} for this image</span>
                    <span className="font-semibold">€{priceSingle.toFixed(2)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">One download · JPG · royalty-free</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPurchaseOption('paygo10')}
                  className={`w-full rounded-lg p-3 text-left transition ring-1 ${
                    purchaseOption === 'paygo10'
                      ? 'bg-primary/10 ring-primary/40'
                      : 'bg-background ring-black/5 hover:bg-muted/40 dark:ring-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Pay &amp; Go 10</span>
                      <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-medium text-foreground/80">
                        Save {payGo10SavePct}%
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">€{payGo10Price.toFixed(2)}</div>
                      <div className="text-[11px] text-muted-foreground line-through">
                        €{payGo10Was.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    10 downloads incl. this one · 1 year to use · free re-downloads
                  </p>
                </button>
              </div>

              <Button
                className="mt-4 w-full gap-2"
                variant={isInCart || added ? 'secondary' : 'default'}
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-4 w-4" />
                {cartCtaLabel('Added to cart')}
              </Button>


              <Link
                href="/stock/cart"
                className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-muted/20 px-4 py-2 text-sm font-medium text-foreground ring-1 ring-black/5 transition hover:bg-muted/30 dark:ring-white/10"
              >
                View cart
              </Link>

              <p className="mt-3 text-xs text-muted-foreground">Demo only · Items are stored locally in your browser.</p>
            </>
          )}
        </Card>
      </div>

      <section ref={shootRef} id="shoot" className="scroll-mt-[calc(var(--cbx-topbar)+var(--cbx-sticky)+44px)] mt-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">From the same shoot</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              More from the same series — based on category and keyword overlap.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/stock/search')}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Browse more
          </button>
        </div>

        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {sameShootPicks.slice(0, 12).map((a) => (
              <div key={`shoot-${a.id}`} className="w-56 shrink-0">
                <ImageCard
                  asset={{
                    id: a.id,
                    title: a.title,
                    preview: getAssetImage(a) || fallbackImage,
                  }}
                  href={`/stock/assets/${a.id}`}
                  aspect="photo"
                  inCart={cartIds.has(a.id)}
                  onAddToCartAction={() => addQuick(a)}
                />
              </div>
            ))}
        </div>
      </section>

      <section ref={similarRef} id="similar" className="scroll-mt-[calc(var(--cbx-topbar)+var(--cbx-sticky)+44px)] mt-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Similar images</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Same vibe, subject or style — based on tags and keywords.
            </p>
          </div>
          <button
            type="button"
            onClick={() => scrollTo(relatedRef)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            See related
          </button>
        </div>

        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {similarPicks.slice(0, 12).map((a) => {
            const hint = overlapHint(baseMeaningfulSet, a, { limit: 3, fallback: 'Similar vibe' });
            const sem = similarSemanticScores.get(a.id) ?? 0;
            const strength = sem >= 0.42 ? 'Very similar' : 'Similar';
            return (
              <div key={`similar-${a.id}`} className="w-56 shrink-0">
                <div className="relative">
                  <ImageCard
                    asset={{
                      id: a.id,
                      title: a.title,
                      preview: getAssetImage(a) || fallbackImage,
                    }}
                    href={`/stock/assets/${a.id}`}
                    aspect="photo"
                    inCart={cartIds.has(a.id)}
                    onAddToCartAction={() => addQuick(a)}
                  />

                  {sem > 0 ? (
                    <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-semibold text-foreground/80 ring-1 ring-black/5 backdrop-blur dark:ring-white/10">
                      {strength}
                    </div>
                  ) : null}
                </div>

                <div className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                  Match: <span className="text-foreground/70">{hint}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section ref={relatedRef} id="related" className="scroll-mt-[calc(var(--cbx-topbar)+var(--cbx-sticky)+44px)] mt-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Related images</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Picked by category and shared tags.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/stock/search')}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Browse more
          </button>
        </div>

        <div className="flex flex-wrap gap-4">
          {relatedPicks.slice(0, 8).map((a) => (
            <div key={a.id} className="w-56">
              <ImageCard
                asset={{
                  id: a.id,
                  title: a.title,
                  preview: getAssetImage(a) || fallbackImage,
                }}
                href={`/stock/assets/${a.id}`}
                aspect="photo"
                inCart={cartIds.has(a.id)}
                onAddToCartAction={() => addQuick(a)}
              />
            </div>
          ))}
        </div>
      </section>

      {lightboxOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={closeLightbox}
        >
          <div
            className="relative z-10 w-full max-w-6xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 pb-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">{title}</div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-white/70">
                  <span>Use ← → to navigate · Esc to close</span>
                  <span className="hidden sm:inline">·</span>
                  <span className="hidden sm:inline">{currentIndex + 1} / {assets.length}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  className="hidden rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-white ring-1 ring-white/15 hover:bg-white/15 sm:inline-flex"
                >
                  ← Prev
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="hidden rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-white ring-1 ring-white/15 hover:bg-white/15 sm:inline-flex"
                >
                  Next →
                </button>
                <button
                  type="button"
                  onClick={closeLightbox}
                  className="ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15"
                  aria-label="Close"
                >
                  <span className="text-lg leading-none">×</span>
                </button>
              </div>
            </div>
            <div
              className="relative max-h-[calc(100vh-140px)] overflow-hidden rounded-2xl bg-black/30 ring-1 ring-white/10"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              <Image
                src={imageSrc}
                alt={title}
                width={2400}
                height={1600}
                className="h-full w-full object-contain"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 sm:px-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    goPrev();
                  }}
                  aria-label="Previous image"
                  className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-white/15 sm:h-11 sm:w-11"
                >
                  <span className="text-lg">←</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    goNext();
                  }}
                  aria-label="Next image"
                  className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-white/15 sm:h-11 sm:w-11"
                >
                  <span className="text-lg">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}