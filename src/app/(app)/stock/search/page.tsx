'use client';

import { Suspense, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

import { STOCK_ASSETS as ASSETS, STOCK_CATEGORIES } from '@/lib/demo/stock-assets';

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

const SYNONYMS: Record<string, string[]> = {
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
    const syn = SYNONYMS[t] ?? SYNONYMS[normalize(t)] ?? [];
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
  for (const [k, vals] of Object.entries(SYNONYMS)) {
    addTokens(k);
    for (const v of vals) addTokens(v);
  }

  return Array.from(vocab);
};

const suggestDidYouMean = (query: string, assets: Asset[]) => {
  const base = tokenize(query);
  if (!base.length) return null;

  const vocab = buildVocab(assets);
  const vocabSet = new Set(vocab);

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
  return out && out !== normalize(query) ? out : null;
};

function StockSearchInner() {
  const searchParams = useSearchParams();
  const rawQ = (searchParams.get('q') ?? '').trim();
  const q = normalize(rawQ);
  const hasQuery = q.length > 0;

  const rawCat = (searchParams.get('cat') ?? '').trim().toLowerCase();
  const cat = rawCat === 'all' ? '' : rawCat;

  const buildHref = useCallback(
    (next: { q?: string; cat?: string }) => {
      const params = new URLSearchParams();
      const nq = (next.q ?? q).trim();
      const nc = (next.cat ?? cat).trim();
      if (nq) params.set('q', nq);
      if (nc) params.set('cat', nc);
      const qs = params.toString();
      return qs ? `/stock/search?${qs}` : '/stock/search';
    },
    [q, cat]
  );

  const results = useMemo(() => {
    const assets = ASSETS as Asset[];

    const baseTerms = tokenize(q);
    const terms = expandTerms(baseTerms);

    const catFilter = cat && cat !== 'all' ? cat : '';

    const scoreAsset = (asset: Asset) => {
      let s = 0;

      const title = normalize(asset.title ?? '');
      const desc = normalize(asset.description ?? '');
      const category = normalize(asset.category ?? '');
      const keywords = (asset.keywords ?? []).map((k) => normalize(String(k)));
      const tags = (asset.tags ?? []).map((t) => normalize(String(t)));

      for (const base of baseTerms) {
        const term = normalize(base);
        if (!term) continue;

        const candidates = expandTerms([term]);

        const hitTitle = candidates.some((c) => title.includes(c));
        const hitCat = candidates.some((c) => category.includes(c));
        const hitKeys = candidates.some((c) => keywords.some((k) => k.includes(c)));
        const hitTags = candidates.some((c) => tags.some((t) => t.includes(c)));
        const hitDesc = candidates.some((c) => desc.includes(c));

        if (hitTitle) s += 8;
        if (hitCat) s += 5;
        if (hitKeys) s += 4;
        if (hitTags) s += 3;
        if (hitDesc) s += 2;

        // tiny bonus if the exact term (not only synonym) is in title
        if (title.includes(term)) s += 0.5;
      }

      // slight boost for featured-looking categories (keeps results feeling curated)
      if (asset.category === 'nature') s += 0.1;

      return s;
    };

    const filtered = assets.filter((asset) => {
      if (catFilter && normalize(asset.category).toLowerCase() !== catFilter) return false;
      if (!terms.length) return true;

      const tokens = [
        ...tokenize(asset.title ?? ''),
        ...tokenize(asset.description ?? ''),
        ...tokenize(asset.category ?? ''),
        ...tokenize((asset.keywords ?? []).join(' ')),
        ...tokenize((asset.tags ?? []).join(' ')),
      ];

      // Require that every base term is satisfied by something in tokens OR its synonyms.
      // We use baseTerms here for strictness, but allow synonym/fuzzy via tokenMatch.
      const required = baseTerms.length ? baseTerms : terms;
      return required.every((t) => {
        const tNorm = normalize(t);
        if (!tNorm) return true;

        const syn = expandTerms([tNorm]);
        return syn.some((candidate) => tokenMatch(candidate, tokens));
      });
    });

    if (!terms.length) return filtered;

    return filtered
      .map((a) => ({ a, s: scoreAsset(a) }))
      .sort((x, y) => (y.s === x.s ? x.a.title.localeCompare(y.a.title) : y.s - x.s))
      .map((x) => x.a);
  }, [q, rawQ, cat]);

  const didYouMean = useMemo(() => {
    if (!q) return null;
    if (results.length > 0) return null;

    const assets = ASSETS as Asset[];
    return suggestDidYouMean(q, assets);
  }, [q, results.length]);

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
              href="/stock/search"
              className="ml-2 text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Clear
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
          ) : (
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
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {results.slice(0, 40).map((asset) => (
            <Link
              key={asset.id}
              href={`/stock/assets/${asset.id}`}
              className="group overflow-hidden rounded-xl border border-black/5 bg-background transition hover:border-foreground/20 dark:border-white/10"
            >
              {/* Image */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                <Image
                  src={getImage(asset)}
                  alt={asset.title}
                  fill
                  sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Meta */}
              <div className="p-3">
                <div className="line-clamp-1 text-sm font-medium">{asset.title}</div>
                <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  {asset.category}
                  {(asset.keywords ?? []).length ? ` · ${(asset.keywords ?? []).slice(0, 2).join(' · ')}` : ''}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Footer hint */}
      <div className="mt-8 text-xs text-muted-foreground">
        {hasQuery
          ? `Showing ${Math.min(results.length, 40)} of ${results.length} results`
          : `Showing ${Math.min(results.length, 40)} of ${results.length} assets`}
      </div>
    </div>
  );
}

export default function StockSearchPage() {
  return (
    <Suspense fallback={<div className="w-full px-4 py-6 text-sm text-muted-foreground">Loading…</div>}>
      <StockSearchInner />
    </Suspense>
  );
}
