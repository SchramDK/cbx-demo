export const COLOR_OPTIONS = [
  { key: "red", label: "Red", swatch: "bg-red-500" },
  { key: "orange", label: "Orange", swatch: "bg-orange-500" },
  { key: "yellow", label: "Yellow", swatch: "bg-yellow-400" },
  { key: "green", label: "Green", swatch: "bg-green-500" },
  { key: "blue", label: "Blue", swatch: "bg-blue-500" },
  { key: "purple", label: "Purple", swatch: "bg-purple-500" },
  { key: "pink", label: "Pink", swatch: "bg-pink-500" },
  { key: "neutral", label: "Neutral", swatch: "bg-zinc-400" },
] as const;

export type ColorKey = (typeof COLOR_OPTIONS)[number]["key"];

export type RatioKey = "3/4" | "4/3" | "1/1" | "16/9";
export type OrientationKey = "portrait" | "landscape" | "square";

export type DateRange = {
  from?: string; // ISO date (YYYY-MM-DD)
  to?: string;   // ISO date (YYYY-MM-DD)
};

export type NumericRange = {
  min?: number;
  max?: number;
};

export type AssetFilters = {
  /** Multi-select color filter */
  colors: Set<ColorKey>;

  /** Aspect ratio multi-select */
  ratios?: Set<RatioKey>;

  /** Derived from ratio (optional UX) */
  orientation?: OrientationKey;

  /** Text/metadata toggles */
  hasComments?: boolean;
  hasTags?: boolean;

  /** Common DAM toggles */
  favoritesOnly?: boolean;

  /** Tag include/exclude (future) */
  includeTags?: string[];
  excludeTags?: string[];

  /** People / model ids (future) */
  peopleIds?: string[];

  /** Date/size ranges (future) */
  createdDate?: DateRange;
  fileSizeKB?: NumericRange;
};

export const DEFAULT_ASSET_FILTERS: AssetFilters = {
  colors: new Set<ColorKey>(),
};

export function clearFilters(): AssetFilters {
  return {
    ...DEFAULT_ASSET_FILTERS,
    colors: new Set<ColorKey>(),
  };
}

export function isFiltersEmpty(filters: AssetFilters): boolean {
  return (
    filters.colors.size === 0 &&
    (!filters.ratios || filters.ratios.size === 0) &&
    !filters.orientation &&
    !filters.hasComments &&
    !filters.hasTags &&
    !filters.favoritesOnly &&
    (!filters.includeTags || filters.includeTags.length === 0) &&
    (!filters.excludeTags || filters.excludeTags.length === 0) &&
    (!filters.peopleIds || filters.peopleIds.length === 0) &&
    (!filters.createdDate || (!filters.createdDate.from && !filters.createdDate.to)) &&
    (!filters.fileSizeKB || (filters.fileSizeKB.min == null && filters.fileSizeKB.max == null))
  );
}

export type ActiveFilterChip = {
  key: string;
  label: string;
};

export function getActiveFilterChips(filters: AssetFilters): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  for (const c of filters.colors) chips.push({ key: `color:${c}`, label: `Color: ${c}` });

  if (filters.ratios) {
    for (const r of filters.ratios) chips.push({ key: `ratio:${r}`, label: `Ratio: ${r}` });
  }

  if (filters.orientation) chips.push({ key: `orientation:${filters.orientation}`, label: `Orientation: ${filters.orientation}` });
  if (filters.favoritesOnly) chips.push({ key: "favoritesOnly", label: "Favorites" });
  if (filters.hasComments) chips.push({ key: "hasComments", label: "Has comments" });
  if (filters.hasTags) chips.push({ key: "hasTags", label: "Has tags" });

  if (filters.includeTags && filters.includeTags.length) {
    for (const t of filters.includeTags) chips.push({ key: `tag:+${t}`, label: `Tag: ${t}` });
  }
  if (filters.excludeTags && filters.excludeTags.length) {
    for (const t of filters.excludeTags) chips.push({ key: `tag:-${t}`, label: `Exclude: ${t}` });
  }

  if (filters.peopleIds && filters.peopleIds.length) {
    chips.push({ key: "people", label: `People: ${filters.peopleIds.length}` });
  }

  if (filters.createdDate?.from || filters.createdDate?.to) {
    const from = filters.createdDate?.from ?? "…";
    const to = filters.createdDate?.to ?? "…";
    chips.push({ key: "createdDate", label: `Created: ${from} → ${to}` });
  }

  if (filters.fileSizeKB?.min != null || filters.fileSizeKB?.max != null) {
    const min = filters.fileSizeKB?.min ?? 0;
    const max = filters.fileSizeKB?.max ?? "…";
    chips.push({ key: "fileSizeKB", label: `Size: ${min}–${max} KB` });
  }

  return chips;
}

export function removeChip(filters: AssetFilters, chipKey: string): AssetFilters {
  const next = cloneFilters(filters);

  if (chipKey.startsWith("color:")) {
    const c = chipKey.slice("color:".length) as ColorKey;
    next.colors.delete(c);
    return next;
  }

  if (chipKey.startsWith("ratio:")) {
    const r = chipKey.slice("ratio:".length) as RatioKey;
    if (next.ratios) {
      next.ratios.delete(r);
      if (next.ratios.size === 0) next.ratios = undefined;
    }
    return next;
  }

  if (chipKey.startsWith("orientation:")) {
    next.orientation = undefined;
    return next;
  }

  if (chipKey === "favoritesOnly") next.favoritesOnly = undefined;
  if (chipKey === "hasComments") next.hasComments = undefined;
  if (chipKey === "hasTags") next.hasTags = undefined;

  if (chipKey.startsWith("tag:+")) {
    const t = chipKey.slice("tag:+".length);
    next.includeTags = (next.includeTags || []).filter((x) => x !== t);
    if (next.includeTags.length === 0) next.includeTags = undefined;
    return next;
  }

  if (chipKey.startsWith("tag:-")) {
    const t = chipKey.slice("tag:-".length);
    next.excludeTags = (next.excludeTags || []).filter((x) => x !== t);
    if (next.excludeTags.length === 0) next.excludeTags = undefined;
    return next;
  }

  if (chipKey === "people") next.peopleIds = undefined;
  if (chipKey === "createdDate") next.createdDate = undefined;
  if (chipKey === "fileSizeKB") next.fileSizeKB = undefined;

  return next;
}

export function cloneFilters(filters: AssetFilters): AssetFilters {
  return {
    ...filters,
    colors: new Set(filters.colors),
    ratios: filters.ratios ? new Set(filters.ratios) : undefined,
    includeTags: filters.includeTags ? [...filters.includeTags] : undefined,
    excludeTags: filters.excludeTags ? [...filters.excludeTags] : undefined,
    peopleIds: filters.peopleIds ? [...filters.peopleIds] : undefined,
    createdDate: filters.createdDate ? { ...filters.createdDate } : undefined,
    fileSizeKB: filters.fileSizeKB ? { ...filters.fileSizeKB } : undefined,
  };
}

export function toggleSetValue<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

// -----------------------------
// Persistence helpers
// -----------------------------

type PersistedAssetFiltersV1 = {
  colors?: ColorKey[];
  ratios?: RatioKey[];
  orientation?: OrientationKey;
  hasComments?: boolean;
  hasTags?: boolean;
  favoritesOnly?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
  peopleIds?: string[];
  createdDate?: DateRange;
  fileSizeKB?: NumericRange;
};

type PersistedEnvelopeV1 = {
  v: 1;
  data: PersistedAssetFiltersV1;
};

const VALID_COLORS = new Set<ColorKey>(COLOR_OPTIONS.map((c) => c.key));
const VALID_RATIOS = new Set<RatioKey>(["3/4", "4/3", "1/1", "16/9"]);
const VALID_ORIENTATIONS = new Set<OrientationKey>(["portrait", "landscape", "square"]);

export function serializeFiltersV1(filters: AssetFilters): PersistedEnvelopeV1 {
  return {
    v: 1,
    data: {
      colors: Array.from(filters.colors),
      ratios: filters.ratios ? Array.from(filters.ratios) : undefined,
      orientation: filters.orientation,
      hasComments: filters.hasComments,
      hasTags: filters.hasTags,
      favoritesOnly: filters.favoritesOnly,
      includeTags: filters.includeTags,
      excludeTags: filters.excludeTags,
      peopleIds: filters.peopleIds,
      createdDate: filters.createdDate,
      fileSizeKB: filters.fileSizeKB,
    },
  };
}

export function deserializeFiltersV1(raw: unknown): AssetFilters {
  const base = cloneFilters(DEFAULT_ASSET_FILTERS);
  if (!raw) return base;

  // Backward compatible: support both {v:1,data:{...}} and plain object {colors:[...]}.
  const envelope =
    typeof raw === "object" && raw !== null && "v" in (raw as any) && "data" in (raw as any)
      ? (raw as PersistedEnvelopeV1)
      : ({ v: 1, data: raw as PersistedAssetFiltersV1 } as PersistedEnvelopeV1);

  const obj = envelope.data;

  if (Array.isArray(obj.colors)) {
    base.colors = new Set(
      obj.colors.filter((c): c is ColorKey => typeof c === "string" && VALID_COLORS.has(c as ColorKey))
    );
  }

  if (Array.isArray(obj.ratios)) {
    const valid = obj.ratios.filter((r) => VALID_RATIOS.has(r as any)) as RatioKey[];
    if (valid.length > 0) base.ratios = new Set(valid);
  }

  if (typeof obj.orientation === "string" && VALID_ORIENTATIONS.has(obj.orientation as OrientationKey)) {
    base.orientation = obj.orientation as OrientationKey;
  }

  if (typeof obj.hasComments === "boolean") base.hasComments = obj.hasComments;
  if (typeof obj.hasTags === "boolean") base.hasTags = obj.hasTags;
  if (typeof obj.favoritesOnly === "boolean") base.favoritesOnly = obj.favoritesOnly;

  if (Array.isArray(obj.includeTags)) base.includeTags = obj.includeTags.filter((t) => typeof t === "string");
  if (Array.isArray(obj.excludeTags)) base.excludeTags = obj.excludeTags.filter((t) => typeof t === "string");
  if (Array.isArray(obj.peopleIds)) base.peopleIds = obj.peopleIds.filter((t) => typeof t === "string");

  if (obj.createdDate && typeof obj.createdDate === "object") {
    const d = obj.createdDate as DateRange;
    base.createdDate = {
      from: typeof d.from === "string" ? d.from : undefined,
      to: typeof d.to === "string" ? d.to : undefined,
    };
  }

  if (obj.fileSizeKB && typeof obj.fileSizeKB === "object") {
    const r = obj.fileSizeKB as NumericRange;
    base.fileSizeKB = {
      min: typeof r.min === "number" ? r.min : undefined,
      max: typeof r.max === "number" ? r.max : undefined,
    };
  }

  return base;
}

export function loadFiltersFromStorage(key: string): AssetFilters {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return cloneFilters(DEFAULT_ASSET_FILTERS);
    return deserializeFiltersV1(JSON.parse(raw));
  } catch {
    return cloneFilters(DEFAULT_ASSET_FILTERS);
  }
}

export function saveFiltersToStorage(key: string, filters: AssetFilters): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(serializeFiltersV1(filters)));
  } catch {
    // ignore
  }
}