export type SearchScope = 'stock' | 'drive';

export type TopbarSuggestion = {
  id: string;
  label: string;
  href: string;
  scope: SearchScope;
  keywords?: string[];
};

type Options = {
  query?: string;
  scope: SearchScope;
  loggedIn?: boolean;
};

const STOCK_BASE: TopbarSuggestion[] = [
  {
    id: 'stock-people',
    label: 'People',
    href: '/stock/search?category=people',
    scope: 'stock',
    keywords: ['person', 'people', 'model', 'portrait', 'face'],
  },
  {
    id: 'stock-business',
    label: 'Business',
    href: '/stock/search?category=business',
    scope: 'stock',
    keywords: ['office', 'work', 'corporate', 'team'],
  },
  {
    id: 'stock-nature',
    label: 'Nature',
    href: '/stock/search?category=nature',
    scope: 'stock',
    keywords: ['landscape', 'outdoor', 'forest', 'mountain'],
  },
  {
    id: 'stock-travel',
    label: 'Travel',
    href: '/stock/search?category=travel',
    scope: 'stock',
    keywords: ['trip', 'tourism', 'city', 'cities', 'destination', 'vacation'],
  },
  {
    id: 'stock-food',
    label: 'Food',
    href: '/stock/search?category=food',
    scope: 'stock',
    keywords: ['cooking', 'meal', 'restaurant', 'drink', 'ingredients'],
  },
  {
    id: 'stock-backgrounds',
    label: 'Backgrounds',
    href: '/stock/search?category=backgrounds',
    scope: 'stock',
    keywords: ['background', 'texture', 'pattern', 'wallpaper', 'abstract'],
  },
];

const DRIVE_BASE: TopbarSuggestion[] = [
  {
    id: 'drive-recent',
    label: 'Recent files',
    href: '/drive',
    scope: 'drive',
    keywords: ['recent', 'latest', 'last'],
  },
  {
    id: 'drive-consents',
    label: 'Consents',
    href: '/drive/consents',
    scope: 'drive',
    keywords: ['consent', 'permission', 'rights'],
  },
  {
    id: 'drive-people',
    label: 'People',
    href: '/drive/people',
    scope: 'drive',
    keywords: ['person', 'people', 'faces'],
  },
  {
    id: 'drive-purchases',
    label: 'Purchases',
    href: '/drive?folder=purchases',
    scope: 'drive',
    keywords: ['purchases', 'purchase', 'bought', 'download', 'downloads', 'orders', 'order'],
  },
  {
    id: 'drive-favorites',
    label: 'Favorites',
    href: '/drive?filter=favorites',
    scope: 'drive',
    keywords: ['starred', 'saved', 'bookmarks', 'bookmark'],
  },
  {
    id: 'drive-uploads',
    label: 'Uploads',
    href: '/drive?filter=uploads',
    scope: 'drive',
    keywords: ['new', 'incoming', 'recent uploads', 'upload'],
  },
];

function normalize(q?: string) {
  return (q ?? '').toLowerCase().trim();
}

const TOKEN_ALIASES: Record<string, string[]> = {
  // Purchases
  download: ['purchases', 'purchase', 'orders', 'order', 'bought'],
  downloads: ['purchases', 'purchase', 'orders', 'order', 'bought'],
  bought: ['purchases', 'purchase', 'orders', 'order'],
  order: ['purchases', 'purchase', 'orders', 'order'],
  orders: ['purchases', 'purchase', 'orders', 'order'],

  // People
  face: ['people', 'person', 'portrait'],
  faces: ['people', 'person', 'portrait'],

  // Consents
  rights: ['consents', 'consent', 'permission'],
  permissions: ['consents', 'consent', 'permission'],
};

function expandTokens(q: string) {
  const base = q.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (t: string) => {
    if (!t) return;
    if (seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };

  for (const t of base) {
    push(t);
    const aliases = TOKEN_ALIASES[t];
    if (aliases) for (const a of aliases) push(a);
  }

  return out;
}

function score(s: TopbarSuggestion, q: string) {
  if (!q) return 1;

  const label = s.label.toLowerCase();
  const kws = (s.keywords ?? []).map((k) => k.toLowerCase());
  const all = [label, ...kws];
  const hay = all.join(' ');

  // Exact label match gets top score
  if (label === q) return 120;

  const tokens = expandTokens(q);

  let points = 0;

  // Strong preference for label starts-with / includes
  if (label.startsWith(q)) points += 60;
  else if (label.includes(q)) points += 35;

  // Token-based scoring across label + keywords
  for (const t of tokens) {
    if (t.length < 2) continue;

    // starts-with on label/keywords
    if (all.some((x) => x.startsWith(t))) points += 18;

    // includes on label/keywords
    if (hay.includes(t)) points += 8;
  }

  // Whole query in hay (multi-word)
  if (q.length >= 3 && hay.includes(q)) points += 22;

  return points;
}

function buildQuerySuggestion(q: string, scope: SearchScope): TopbarSuggestion {
  const label = scope === 'stock' ? `Search in Stock for “${q}”` : `Search in Files for “${q}”`;

  if (scope === 'stock') {
    return {
      id: 'stock-search-query',
      label,
      href: `/stock/search?q=${encodeURIComponent(q)}`,
      scope: 'stock',
    };
  }

  return {
    id: 'drive-search-query',
    label,
    href: `/drive?q=${encodeURIComponent(q)}`,
    scope: 'drive',
  };
}

export function getTopbarSuggestions({ query, scope, loggedIn }: Options) {
  const q = normalize(query);

  const base =
    scope === 'stock'
      ? STOCK_BASE
      : loggedIn
      ? DRIVE_BASE
      : [];

  const scored = base
    .map((s) => ({ s, score: score(s, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.s.label.localeCompare(b.s.label);
    })
    .map((x) => x.s);

  const MAX = 8;
  const seenHref = new Set<string>();
  const seenLabel = new Set<string>();
  const unique: TopbarSuggestion[] = [];
  for (const s of scored) {
    const href = s.href;
    const label = s.label.toLowerCase();
    if (seenHref.has(href) || seenLabel.has(label)) continue;
    seenHref.add(href);
    seenLabel.add(label);
    unique.push(s);
    if (unique.length >= MAX) break;
  }

  // Query suggestion: always show for stock when query is non-empty.
  // For drive, keep empty when logged out.
  const canShowQuery = q.length > 0 && (scope === 'stock' || loggedIn);
  if (!canShowQuery) return unique;

  // Avoid duplicating an identical label
  const querySuggestion = buildQuerySuggestion(q, scope);
  return [querySuggestion, ...unique].slice(0, MAX);
}