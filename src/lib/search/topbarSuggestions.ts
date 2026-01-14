

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
];

function normalize(q?: string) {
  return (q ?? '').toLowerCase().trim();
}

function score(s: TopbarSuggestion, q: string) {
  if (!q) return 1;
  const hay = [s.label, ...(s.keywords ?? [])].join(' ').toLowerCase();
  if (hay.startsWith(q)) return 5;
  if (hay.includes(q)) return 3;
  return 0;
}

export function getTopbarSuggestions({ query, scope, loggedIn }: Options) {
  const q = normalize(query);

  const base =
    scope === 'stock'
      ? STOCK_BASE
      : loggedIn
      ? DRIVE_BASE
      : [];

  return base
    .map((s) => ({ s, score: score(s, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.s);
}