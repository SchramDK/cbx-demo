'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

import ImageCard from '@/components/stock/ImageCard';
import { useCart, useCartUI } from '@/lib/cart/cart';

import { STOCK_ASSETS as ASSETS, STOCK_CATEGORIES } from '@/lib/demo/stock-assets';
import { semanticSearch } from '@/lib/search/semantic';

// ---- Types ----
type Asset = {
  id: string;
  title: string;
  preview: string;
  category: string;
  description?: string;
  keywords?: string[];
  tags?: string[];
};

// ---- Helpers ----
function getImage(asset: Asset) {
  return asset.preview;
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

function hasId(set: Set<string>, raw: unknown): boolean {
  const v = (raw ?? '').toString().trim();
  if (!v) return false;
  const upper = v.toUpperCase();
  const numeric = v.replace(/^COLOURBOX/i, '').trim();
  return (
    set.has(v) ||
    set.has(upper) ||
    (numeric ? set.has(numeric) || set.has(numeric.toUpperCase()) : false) ||
    (numeric ? set.has(`COLOURBOX${numeric}`) || set.has(`COLOURBOX${numeric}`.toUpperCase()) : false)
  );
}

const RAW_SYNONYMS: Record<string, string[]> = {
  aurora: ['northern lights', 'aurora borealis', 'nordlys'],
  'aurora borealis': ['aurora', 'northern lights', 'nordlys'],
  'northern lights': ['aurora', 'aurora borealis', 'nordlys'],
  nordlys: ['aurora', 'aurora borealis', 'northern lights'],

  copenhagen: ['kobenhavn', 'københavn', 'nyhavn'],
  københavn: ['copenhagen', 'kobenhavn', 'nyhavn'],
  kobenhavn: ['copenhagen', 'københavn', 'nyhavn'],
  nyhavn: ['copenhagen', 'københavn'],

  bicycle: ['bike', 'cycling', 'cyclist', 'cykel', 'cyklist'],
  bike: ['bicycle', 'cycling', 'cyclist', 'cykel', 'cyklist'],
  cycling: ['bicycle', 'bike', 'cyclist', 'cykel', 'cyklist'],
  cyclist: ['bicycle', 'bike', 'cycling', 'cykel', 'cyklist'],
  cykel: ['bicycle', 'bike', 'cycling', 'cyclist', 'cyklist'],
  cyklist: ['bicycle', 'bike', 'cycling', 'cyclist', 'cykel'],

  swan: ['swans', 'svane', 'svaner'],
  swans: ['swan', 'svane', 'svaner'],
  svane: ['swan', 'swans', 'svaner'],
  svaner: ['swan', 'swans', 'svane'],

  eagle: ['golden eagle', 'kongeorn', 'kongeørn'],
  'golden eagle': ['eagle', 'kongeorn', 'kongeørn'],
  kongeørn: ['eagle', 'golden eagle', 'kongeorn'],
  kongeorn: ['eagle', 'golden eagle', 'kongeørn'],

  wind: ['windmill', 'windmills', 'wind turbine', 'wind turbines', 'vindmolle', 'vindmoller', 'vindmølle', 'vindmøller'],
  windmill: ['wind', 'windmills', 'wind turbine', 'wind turbines', 'vindmolle', 'vindmoller', 'vindmølle', 'vindmøller'],
  windmills: ['wind', 'windmill', 'wind turbine', 'wind turbines', 'vindmolle', 'vindmoller', 'vindmølle', 'vindmøller'],
  'wind turbine': ['wind', 'windmill', 'windmills', 'wind turbines', 'vindmolle', 'vindmoller', 'vindmølle', 'vindmøller'],
  'wind turbines': ['wind', 'windmill', 'windmills', 'wind turbine', 'vindmolle', 'vindmoller', 'vindmølle', 'vindmøller'],
  vindmølle: ['wind', 'windmill', 'windmills', 'wind turbine', 'wind turbines', 'vindmoller', 'vindmolle', 'vindmøller'],
  vindmøller: ['wind', 'windmill', 'windmills', 'wind turbine', 'wind turbines', 'vindmoller', 'vindmolle', 'vindmølle'],
  vindmolle: ['wind', 'windmill', 'windmills', 'wind turbine', 'wind turbines', 'vindmølle', 'vindmøller', 'vindmoller'],
  vindmoller: ['wind', 'windmill', 'windmills', 'wind turbine', 'wind turbines', 'vindmølle', 'vindmøller', 'vindmolle'],
};

const POPULAR_SEARCHES = ['aurora', 'københavn', 'cyklist', 'vindmølle', 'svane', 'kongeørn'];

const normalize = (input: string) => {
  return (input ?? '')
    .toLowerCase()
    .normalize('NFKD')
    // strip combining marks
    .replace(/[\u0300-\u036f]/g, '')
    // replace danish letters explicitly (after NFKD, æ/ø/å might remain)
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'aa')
    // keep letters/numbers/spaces
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const tokenize = (input: string) => normalize(input).split(' ').filter(Boolean);

const SYNONYMS = (() => {
  const out: Record<string, string[]> = {};

  for (const [k, vals] of Object.entries(RAW_SYNONYMS)) {
    const nk = normalize(k);
    if (!nk) continue;

    const list: string[] = [];
    const seen = new Set<string>();

    const add = (v: string) => {
      const nv = normalize(v);
      if (!nv) return;
      if (seen.has(nv)) return;
      seen.add(nv);
      list.push(nv);
    };

    // include original key and values
    add(k);
    for (const v of vals) add(v);

    out[nk] = list;
  }

  return out;
})();

const expandTerms = (terms: string[]) => {
  const out: string[] = [];
  const seen = new Set<string>();

  const add = (t: string) => {
    const v = normalize(t);
    if (!v) return;
    if (seen.has(v)) return;
    seen.add(v);
    out.push(v);
  };

  for (const t of terms) {
    add(t);
    const syn = SYNONYMS[normalize(t)] ?? [];
    for (const s of syn) add(s);
  }

  return out;
};

// small Levenshtein for mild fuzzy matching
const levenshtein = (a: string, b: string) => {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (!al) return bl;
  if (!bl) return al;

  const v0 = new Array(bl + 1).fill(0);
  const v1 = new Array(bl + 1).fill(0);

  for (let i = 0; i <= bl; i++) v0[i] = i;

  for (let i = 0; i < al; i++) {
    v1[0] = i + 1;
    const ca = a.charCodeAt(i);
    for (let j = 0; j < bl; j++) {
      const cost = ca === b.charCodeAt(j) ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= bl; j++) v0[j] = v1[j];
  }

  return v1[bl];
};

const fuzzyAllows = (term: string) => {
  // keep fuzzy conservative
  if (term.length <= 3) return 0;
  if (term.length <= 6) return 1;
  return 2;
};

const tokenMatch = (term: string, tokens: string[]) => {
  // exact / substring token match
  for (const t of tokens) {
    if (t === term) return true;
    if (t.includes(term) || term.includes(t)) return true;
  }

  // fuzzy fallback
  const maxEdits = fuzzyAllows(term);
  if (maxEdits === 0) return false;

  for (const t of tokens) {
    if (Math.abs(t.length - term.length) > maxEdits) continue;
    if (levenshtein(t, term) <= maxEdits) return true;
  }

  return false;
};

const buildVocab = (assets: Asset[]) => {
  const vocab = new Set<string>();

  const addTokens = (value: string) => {
    for (const t of tokenize(value)) vocab.add(t);
  };

  for (const a of assets) {
    addTokens(a.title ?? '');
    addTokens(a.description ?? '');
    addTokens(a.category ?? '');
    addTokens((a.keywords ?? []).join(' '));
    addTokens((a.tags ?? []).join(' '));
  }

  // include synonym keys + values as vocabulary
  for (const [k, vals] of Object.entries(RAW_SYNONYMS)) {
    addTokens(k);
    for (const v of vals) addTokens(v);
  }

  return Array.from(vocab);
};

const suggestDidYouMean = (
  query: string,
  assets: Asset[],
  pre?: { vocab: string[]; vocabSet: Set<string> }
) => {
  const base = tokenize(query);
  if (!base.length) return null;

  const vocab = pre?.vocab ?? buildVocab(assets);
  const vocabSet = pre?.vocabSet ?? new Set(vocab);

  let changed = false;

  const pickClosest = (term: string) => {
    if (vocabSet.has(term)) return term;

    const maxEdits = fuzzyAllows(term);
    if (maxEdits === 0) return term;

    let best: string | null = null;
    let bestD = Number.POSITIVE_INFINITY;

    for (const cand of vocab) {
      if (cand === term) return term;
      if (Math.abs(cand.length - term.length) > maxEdits) continue;

      const d = levenshtein(cand, term);
      if (d <= maxEdits && d < bestD) {
        best = cand;
        bestD = d;
        if (bestD === 1) break; // good enough
      }
    }

    return best ?? term;
  };

  const suggested = base.map((t) => {
    const s = pickClosest(t);
    if (s !== t) changed = true;
    return s;
  });

  if (!changed) return null;

  const out = suggested.join(' ').trim();
  const baseJoined = tokenize(query).join(' ');
  return out && out !== baseJoined ? out : null;
};

function StockSearchInner() {
  const searchParams = useSearchParams();
  const rawQ = (searchParams.get('q') ?? '').trim();
  const q = normalize(rawQ);
  const hasQuery = q.length > 0;
  const [semanticScores, setSemanticScores] = useState<Map<string, number>>(() => new Map());
  useEffect(() => {
    let cancelled = false;

    // Only run semantic search when user has an actual query
    if (!rawQ.trim()) {
      setSemanticScores(new Map());
      return;
    }

    (async () => {
      try {
        const res = await semanticSearch(rawQ, { topK: 200, minScore: 0.15 });
        if (cancelled) return;

        const map = new Map<string, number>();
        for (const r of res) map.set(r.id, r.score);
        setSemanticScores(map);
      } catch {
        // If index is missing (not generated yet), keep keyword search working
        if (!cancelled) setSemanticScores(new Map());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rawQ]);

  const cart = useCart() as any;
  const cartUI = useCartUI() as any;

  const cartIds = useMemo(() => {
    const ids = new Set<string>();
    const items = (cart?.items ?? []) as any[];
    for (const it of items) {
      addIdVariants(ids, it?.id);
      addIdVariants(ids, it?.assetId);
      addIdVariants(ids, it?.asset?.id);
    }
    return ids;
  }, [cart?.items]);

  const addToCart = useCallback(
    (asset: Asset) => {
      const fn = cart?.addAsset ?? cart?.addItem ?? cart?.add;
      if (typeof fn === 'function') {
        const img = getImage(asset);

        // Provide a robust cart-item shape so previews render in the cart UI.
        // We include multiple common keys used across cart implementations.
        const cartItem: any = {
          id: asset.id,
          assetId: asset.id,
          title: asset.title,
          name: asset.title,
          preview: img,
          image: img,
          thumbnail: img,
          qty: 1,
          quantity: 1,
          asset,
        };

        fn(cartItem);

        // Match front-page UX: open the cart UI if available
        if (typeof cartUI?.open === 'function') cartUI.open();
        else if (typeof cartUI?.setOpen === 'function') cartUI.setOpen(true);
      }
    },
    [cart, cartUI]
  );

  const rawCat = (searchParams.get('cat') ?? '').trim().toLowerCase();
  const cat = rawCat === 'all' ? '' : rawCat;

  const [visibleCount, setVisibleCount] = useState(40);

  const vocabPre = useMemo(() => {
    const assets = ASSETS as Asset[];
    const vocab = buildVocab(assets);
    return { vocab, vocabSet: new Set(vocab) };
  }, []);

  useEffect(() => {
    // reset pagination when query or category changes
    setVisibleCount(40);

    // Make navigation between chips/search feel consistent (return user to top)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [q, cat]);

  const buildHref = useCallback(
    (next: { q?: string; cat?: string }) => {
      const params = new URLSearchParams();

      // Keep the URL query as the user typed it (rawQ). Normalization is only for matching.
      const nq = (next.q ?? rawQ).trim();
      const nc = (next.cat ?? cat).trim();

      if (nq) params.set('q', nq);
      if (nc) params.set('cat', nc);

      const qs = params.toString();
      return qs ? `/stock/search?${qs}` : '/stock/search';
    },
    [rawQ, cat]
  );

  const results = useMemo(() => {
    const assets = ASSETS as Asset[];

    const baseTerms = tokenize(q);
    const terms = expandTerms(baseTerms);

    // Build per-asset precomputed index
    const indexed = assets.map((asset) => {
      const titleNorm = normalize(asset.title ?? '');
      const descNorm = normalize(asset.description ?? '');
      const categoryNorm = normalize(asset.category ?? '');
      const keywordsNorm = (asset.keywords ?? []).map((k) => normalize(String(k)));
      const tagsNorm = (asset.tags ?? []).map((t) => normalize(String(t)));

      const titleTokens = tokenize(asset.title ?? '');
      const keywordTokens = tokenize((asset.keywords ?? []).join(' '));
      const tagTokens = tokenize((asset.tags ?? []).join(' '));

      const allTokens = [
        ...titleTokens,
        ...tokenize(asset.description ?? ''),
        ...tokenize(asset.category ?? ''),
        ...keywordTokens,
        ...tagTokens,
      ];

      return {
        asset,
        titleNorm,
        descNorm,
        categoryNorm,
        keywordsNorm,
        tagsNorm,
        titleTokens,
        keywordTokens,
        tagTokens,
        allTokens,
      };
    });

    const catFilter = cat && cat !== 'all' ? normalize(cat) : '';

    const scoreAsset = (entry: {
      asset: Asset;
      titleNorm: string;
      descNorm: string;
      categoryNorm: string;
      keywordsNorm: string[];
      tagsNorm: string[];
      titleTokens: string[];
      keywordTokens: string[];
      tagTokens: string[];
    }) => {
      const asset = entry.asset;
      let s = 0;

      const title = entry.titleNorm;
      const desc = entry.descNorm;
      const category = entry.categoryNorm;
      const keywords = entry.keywordsNorm;
      const tags = entry.tagsNorm;

      const titleTokens = entry.titleTokens;
      const keywordTokens = entry.keywordTokens;
      const tagTokens = entry.tagTokens;

      // Phrase match is a strong signal
      if (q && title.includes(q)) s += 10;
      if (q && desc.includes(q)) s += 4;

      // Pre-expand synonyms once per base term
      const expandedPerBase = baseTerms.map((t) => ({
        term: normalize(t),
        expanded: expandTerms([normalize(t)]),
      }));

      for (const { term, expanded } of expandedPerBase) {
        if (!term) continue;

        const hitTitle = expanded.some((c) => title.includes(c));
        const hitCat = expanded.some((c) => category.includes(c));
        const hitKeys = expanded.some((c) => keywords.some((k) => k.includes(c)));
        const hitTags = expanded.some((c) => tags.some((t) => t.includes(c)));
        const hitDesc = expanded.some((c) => desc.includes(c));

        if (hitTitle) s += 8;
        if (hitCat) s += 5;
        if (hitKeys) s += 4;
        if (hitTags) s += 3;
        if (hitDesc) s += 2;

        // Extra boosts for exact token hits (predictable ranking)
        // Title token hits should dominate over keywords/tags.
        if (titleTokens.includes(term)) s += 6;
        if (keywordTokens.includes(term)) s += 2.5;
        if (tagTokens.includes(term)) s += 2;

        // tiny bonus if the exact term (not only synonym) is in title
        if (title.includes(term)) s += 0.75;
      }

      // slight boost for featured-looking categories (keeps results feeling curated)
      if (asset.category === 'nature') s += 0.1;

      // Hybrid: add semantic similarity score (AI)
      // semanticScores are cosine similarities (~0..1). Scale to match keyword score range.
      const sem = semanticScores.get(asset.id) ?? 0;
      s += sem * 12;

      return s;
    };

    const filtered = indexed.filter((entry) => {
      const asset = entry.asset;
      if (catFilter && entry.categoryNorm !== catFilter) return false;
      if (!terms.length) return true;

      const tokens = entry.allTokens;

      // Require that base terms are satisfied by something in tokens OR its synonyms.
      // For multi-word queries (3+ terms), require a majority hit to avoid 0-result dead ends.
      const required = baseTerms.length ? baseTerms : terms;
      const requiredCount = required.filter(Boolean).length;
      const minHits =
        requiredCount <= 2
          ? requiredCount
          : Math.max(2, Math.ceil(requiredCount * 0.66));

      let hits = 0;
      for (const t of required) {
        const tNorm = normalize(t);
        if (!tNorm) continue;

        const syn = expandTerms([tNorm]);
        const ok = syn.some((candidate) => tokenMatch(candidate, tokens));
        if (ok) hits++;

        // early exit
        if (hits >= minHits) return true;
      }

      return false;
    });

    // AI fallback: if keyword filtering yields 0 results but semantic scores exist,
    // show the top semantic matches (still respecting category filter).
    if (terms.length && filtered.length === 0 && semanticScores.size > 0) {
      return indexed
        .filter((e) => (catFilter ? e.categoryNorm === catFilter : true))
        .map((e) => ({ a: e.asset, s: semanticScores.get(e.asset.id) ?? 0 }))
        .filter((x) => x.s > 0)
        .sort((x, y) => y.s - x.s)
        .slice(0, 200)
        .map((x) => x.a);
    }

    if (!terms.length) return filtered.map((e) => e.asset);

    return filtered
      .map((e) => ({ a: e.asset, s: scoreAsset(e) }))
      .sort((x, y) => (y.s === x.s ? x.a.title.localeCompare(y.a.title) : y.s - x.s))
      .map((x) => x.a);
  }, [q, rawQ, cat, semanticScores]);

  const didYouMean = useMemo(() => {
    if (!rawQ) return null;
    if (results.length > 0) return null;

    const assets = ASSETS as Asset[];
    return suggestDidYouMean(rawQ, assets, vocabPre);
  }, [rawQ, results.length, vocabPre]);

  return (
    <div className="w-full px-4 py-6 sm:px-6">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {hasQuery ? `Results for “${rawQ}”` : 'Browse stock images'}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {hasQuery
            ? `Showing ${results.length} matching assets from the stock library.`
            : 'Explore curated stock images ready for campaigns, websites, and social media.'}
        </p>

        {!hasQuery ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Try:</span>
            {POPULAR_SEARCHES.map((s) => (
              <Link
                key={s}
                href={buildHref({ q: s })}
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"
              >
                {s}
              </Link>
            ))}
          </div>
        ) : null}

        {/* Category chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href={buildHref({ cat: '' })}
            className={`rounded-full border px-3 py-1 text-xs transition hover:border-foreground/30 ${
              !cat ? 'bg-foreground text-background' : 'bg-background'
            }`}
          >
            All
          </Link>
          {STOCK_CATEGORIES.map((c) => (
            <Link
              key={c.key}
              href={buildHref({ cat: c.key })}
              className={`rounded-full border px-3 py-1 text-xs transition hover:border-foreground/30 ${
                cat === c.key ? 'bg-foreground text-background' : 'bg-background'
              }`}
            >
              {c.label}
            </Link>
          ))}

          {(rawQ || cat) ? (
            <Link
              href={rawQ ? buildHref({ q: '' }) : '/stock/search'}
              className="ml-2 text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              {rawQ ? 'Clear search' : 'Clear filter'}
            </Link>
          ) : null}
        </div>
      </header>

      {/* Meta row */}
      <div className="mb-5 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {results.length} asset{results.length === 1 ? '' : 's'}
          {cat ? ` · ${STOCK_CATEGORIES.find((c) => c.key === cat)?.label ?? cat}` : ''}
        </span>
        <span className="hidden sm:inline">Sorted by relevance</span>
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <h2 className="text-sm font-medium">No results found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a different keyword, or browse a category above to discover similar images.
          </p>
          {didYouMean ? (
            <p className="mt-3 text-sm">
              Did you mean{' '}
              <Link
                href={buildHref({ q: didYouMean })}
                className="font-medium underline underline-offset-4"
              >
                “{didYouMean}”
              </Link>
              ?
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {STOCK_CATEGORIES.slice(0, 4).map((c) => (
              <Link
                key={c.key}
                href={buildHref({ cat: c.key })}
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"
              >
                Browse {c.label}
              </Link>
            ))}
            {POPULAR_SEARCHES.slice(0, 4).map((s) => (
              <Link
                key={`sugg-${s}`}
                href={buildHref({ q: s })}
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"
              >
                “{s}”
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {results.slice(0, visibleCount).map((asset) => (
              <ImageCard
                key={asset.id}
                asset={{
                  id: asset.id,
                  title: asset.title,
                  preview: getImage(asset),
                }}
                href={`/stock/assets/${asset.id}`}
                aspect="photo"
                inCart={hasId(cartIds, asset.id)}
                onAddToCartAction={() => addToCart(asset)}
              />
            ))}
          </div>
          {results.length > visibleCount ? (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => Math.min(results.length, n + 40))}
                className="rounded-full border px-4 py-2 text-sm transition hover:border-foreground/30"
              >
                Load more
              </button>
            </div>
          ) : null}
        </>
      )}

      {/* Footer hint */}
      <div className="mt-8 text-xs text-muted-foreground">
        {hasQuery
          ? `Showing ${Math.min(results.length, visibleCount)} of ${results.length} results`
          : `Showing ${Math.min(results.length, visibleCount)} of ${results.length} assets`}
      </div>
    </div>
  );
}

export default function StockSearchPage() {
  return (
    <Suspense fallback={null}>
      <StockSearchInner />
    </Suspense>
  );
}
