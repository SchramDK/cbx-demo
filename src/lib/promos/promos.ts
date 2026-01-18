export type PromoPlacement = 'global' | 'team' | 'drive' | 'stock';
export type PromoVariant = 'modal';

export type Promo = {
  id: string;
  placement: PromoPlacement;
  variant: PromoVariant;
  priority: number; // higher wins

  title: string;
  description?: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryLabel?: string;

  // Optional visual + quick bullets (used by modal renderer)
  imageSrc?: string;
  imageAlt?: string;
  highlights?: string[];

  when: {
    onRoute?: RegExp;        // e.g. /^\/team/
    afterMs?: number;        // delay after route enter
    onEvent?: string;        // CustomEvent key
    minVisits?: number;      // number of visits to this placement before eligible (counted in localStorage)
  };

  cap: {
    once?: boolean;          // show only once
    cooldownHours?: number;  // time-based cap
  };

  target?: {
    loggedIn?: boolean;
    demoMode?: boolean;
  };
};

// --- Demo / initial promos ---

export const PROMOS: Promo[] = [
  {
    id: 'drive-first-time-intro',
    placement: 'drive',
    variant: 'modal',
    priority: 50,
    title: 'Welcome to Files',
    description: 'Your personal workspace for everything you own — uploads, folders, and purchases. Files keeps everything organised, easy to find, and ready to share.',
    ctaLabel: 'Explore your files',
    ctaHref: '/drive',
    secondaryLabel: 'Take a quick tour',
    imageSrc: '/demo/stock/COLOURBOX69824938.jpg',
    imageAlt: 'Files workspace with organised folders',
    highlights: [
      'Organise uploads into folders and projects',
      'Everything you buy lands here automatically',
      'Search fast — and always know where files live',
    ],
    when: {
      onRoute: /^\/drive(\/|$)/,
      afterMs: 900,
      minVisits: 2,
    },
    cap: {
      once: true,
    },
    target: {
      loggedIn: true,
    },
  },
  {
    id: 'team-invite-upsell',
    placement: 'team',
    variant: 'modal',
    priority: 20,
    title: 'Invite your team in seconds',
    description: 'Add teammates, manage roles, and stay compliant from one place.',
    ctaLabel: 'Invite members',
    ctaHref: '/team',
    secondaryLabel: 'Maybe later',
    when: {
      onRoute: /^\/team(\/|$)/,
      afterMs: 1200,
      minVisits: 1,
    },
    cap: {
      once: true,
    },
    target: {
      loggedIn: true,
    },
  },
];

// Helpers (used by promo engine)

export const PROMO_STORAGE_KEYS = {
  seen: (id: string) => `CBX_PROMO_SEEN_${id}`,
  lastShown: (id: string) => `CBX_PROMO_LAST_${id}`,
  visits: (placement: PromoPlacement) => `CBX_PROMO_VISITS_${placement}`,
};