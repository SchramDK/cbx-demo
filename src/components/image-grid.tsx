"use client";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Heart, SearchX, SlidersHorizontal, Sparkles } from "lucide-react";
import { ViewerModal, ViewerItem } from "@/components/viewer-modal";
import { ImageCard } from "@/components/image-card";
import { demoAssets } from "@/lib/demo/assets";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AssetFilters } from "@/components/assets-filters/filters";
type ImageItem = {
  id: number;
  title: string;
  ratio: "3/4" | "4/3" | "1/1" | "16/9";
  src: string;
  folderId: string;
  color: "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "neutral";
};

// Demo assets (single source of truth lives in /lib/demo/assets)

export const images: ImageItem[] = demoAssets.map((a, idx) => ({
  id: Number(a.id) || idx + 1,
  title: a.title,
  ratio: a.ratio,
  src: a.src,
  folderId: a.folderId ?? "all",
  color: a.color ?? "neutral",
}));

export function getAssetSearchSuggestions(query: string, limit = 8): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const pool: string[] = [];

  // Titles
  for (const a of demoAssets) {
    if (a?.title) pool.push(String(a.title));
  }

  // Keywords
  for (const a of demoAssets) {
    if (Array.isArray((a as any)?.keywords)) {
      for (const k of (a as any).keywords as any[]) {
        if (typeof k === "string") pool.push(k);
      }
    }
  }

  // Folder names / ids
  for (const a of demoAssets) {
    const f = (a as any)?.folderId;
    if (typeof f === "string") pool.push(f);
  }

  // Known colors
  pool.push("red", "orange", "yellow", "green", "blue", "purple", "pink", "neutral");

  // Normalize + score
  const uniq = new Map<string, { raw: string; score: number }>();

  for (const raw of pool) {
    const s = String(raw).trim();
    if (!s) continue;

    const lower = s.toLowerCase();
    const idx = lower.indexOf(q);
    if (idx === -1) continue;

    // Simple relevance: startsWith is best, then earlier occurrences, then shorter strings
    const score = (idx === 0 ? 1000 : 500) - idx * 10 - Math.min(lower.length, 80);

    const existing = uniq.get(lower);
    if (!existing || score > existing.score) {
      uniq.set(lower, { raw: s, score });
    }
  }

  return Array.from(uniq.values())
    .sort((a, b) => b.score - a.score || a.raw.localeCompare(b.raw))
    .slice(0, Math.max(1, limit))
    .map((x) => x.raw);
}

function levenshtein(a: string, b: string) {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  const n = s.length;
  const m = t.length;
  if (!n) return m;
  if (!m) return n;

  const dp = new Array(m + 1);
  for (let j = 0; j <= m; j++) dp[j] = j;

  for (let i = 1; i <= n; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= m; j++) {
      const temp = dp[j];
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[j] = Math.min(
        dp[j] + 1, // deletion
        dp[j - 1] + 1, // insertion
        prev + cost // substitution
      );
      prev = temp;
    }
  }

  return dp[m];
}

function getDidYouMean(query: string, limit = 3) {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 3) return [];

  // Build a candidate pool independent of the query (so typos still yield results)
  const pool: string[] = [];

  for (const a of demoAssets) {
    if (a?.title) pool.push(String(a.title));

    const f = (a as any)?.folderId;
    if (typeof f === "string") pool.push(f);

    if (Array.isArray((a as any)?.keywords)) {
      for (const k of (a as any).keywords as any[]) {
        if (typeof k === "string") pool.push(k);
      }
    }
  }

  pool.push("red", "orange", "yellow", "green", "blue", "purple", "pink", "neutral");

  const uniq = new Map<string, string>();
  for (const raw of pool) {
    const s = String(raw).trim();
    if (!s) continue;
    const lower = s.toLowerCase();
    if (!uniq.has(lower)) uniq.set(lower, s);
  }

  const candidates = Array.from(uniq.values());

  const scored = candidates
    .map((cand) => {
      const dist = levenshtein(q, cand.toLowerCase());
      return { cand, dist };
    })
    .filter((x) => x.cand && x.cand.toLowerCase() !== q)
    // Only keep reasonably close matches
    .filter((x) => x.dist <= Math.max(2, Math.floor(q.length * 0.25)))
    .sort((a, b) => a.dist - b.dist || a.cand.localeCompare(b.cand));

  return scored.slice(0, limit).map((s) => s.cand);
}


const COLOR_ORDER: Record<ImageItem["color"], number> = {
  red: 0,
  orange: 1,
  yellow: 2,
  green: 3,
  blue: 4,
  purple: 5,
  pink: 6,
  neutral: 7,
};

const COLOURBOX_DEMO_ASSETS: Array<{
  id: number;
  title: string;
  src: string;
  ratio: ImageItem["ratio"];
}> = [
  { id: 9001, title: "Christmas ornaments", src: "https://images.unsplash.com/photo-1543589077-47d81606c1bf", ratio: "1/1" },
  { id: 9002, title: "Winter forest", src: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e", ratio: "16/9" },
  { id: 9003, title: "Cozy candles", src: "https://images.unsplash.com/photo-1519681393784-d120267933ba", ratio: "4/3" },
  { id: 9004, title: "Snowy mountains", src: "https://images.unsplash.com/photo-1458668383970-8ddd3927deed", ratio: "16/9" },
  { id: 9005, title: "Team meeting", src: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d", ratio: "16/9" },
  { id: 9006, title: "Office desk", src: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4", ratio: "4/3" },
  { id: 9007, title: "Portrait smile", src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e", ratio: "3/4" },
  { id: 9008, title: "City skyline", src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e", ratio: "16/9" },
  { id: 9009, title: "Coffee cup", src: "https://images.unsplash.com/photo-1509042239860-f550ce710b93", ratio: "1/1" },
  { id: 9010, title: "Laptop close-up", src: "https://images.unsplash.com/photo-1518779578993-ec3579fee39f", ratio: "4/3" },
  { id: 9011, title: "Abstract colors", src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee", ratio: "16/9" },
  { id: 9012, title: "Nature texture", src: "https://images.unsplash.com/photo-1482192596544-9eb780fc7f66", ratio: "4/3" },
];

function getColourboxSuggestions(search: string) {
  const q = search.trim().toLowerCase();
  if (!q) return [];
  const hits = COLOURBOX_DEMO_ASSETS.filter((a) => a.title.toLowerCase().includes(q));
  return (hits.length > 0 ? hits : COLOURBOX_DEMO_ASSETS).slice(0, 8);
}

function getDemoKeywordsForAsset(assetId: number | string): string[] {
  const match = demoAssets.find((a) => String(a.id) === String(assetId));
  return Array.isArray(match?.keywords) ? match!.keywords!.filter(Boolean) : [];
}


function normalizeText(input: unknown): string {
  return String(input ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function withUnsplashParams(src: string, params: Record<string, string | number>) {
  try {
    const url = new URL(src);
    if (url.hostname !== "images.unsplash.com") return src;
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    url.searchParams.set("auto", url.searchParams.get("auto") ?? "format");
    url.searchParams.set("fit", url.searchParams.get("fit") ?? "max");
    return url.toString();
  } catch {
    return src;
  }
}

function SkeletonCard({ ratio }: { ratio: string }) {
  const ratioClass =
    ratio === "1/1"
      ? "aspect-square"
      : ratio === "3/4"
      ? "aspect-[3/4]"
      : ratio === "4/3"
      ? "aspect-[4/3]"
      : "aspect-video";

  return (
    <div className="mb-3 break-inside-avoid overflow-hidden rounded-2xl border border-border bg-background">
      <div className={cn("relative w-full", ratioClass)}>
        <Skeleton className="absolute inset-0" />
      </div>
      <div className="p-3">
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2">
      <Skeleton className="h-12 w-12 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/5" />
      </div>
      <Skeleton className="h-8 w-8 rounded-md" />
    </div>
  );
}

function ColourboxSuggestions({
  suggestions,
  className,
}: {
  suggestions: Array<{ id: number; title: string; src: string }>;
  className?: string;
}) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </span>
          <div>
            <div className="text-sm font-semibold text-foreground">Matches from Colourbox</div>
            <div className="text-xs text-muted-foreground">Stock suggestions based on your search</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">{suggestions.length} results</div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {suggestions.map((a) => (
          <div
            key={a.id}
            className="group overflow-hidden rounded-xl border border-border bg-background/60 transition-shadow hover:shadow-sm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={withUnsplashParams(a.src, { w: 900, q: 70, fit: "crop" })}
              alt={a.title}
              className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
            <div className="flex items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">{a.title}</div>
                <div className="text-xs text-muted-foreground">Colourbox</div>
              </div>
              <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                Stock
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  query,
  isFavorites,
  showColourbox,
  colourboxSuggestions,
  onSetQuery,
  onClearFilters,
}: {
  query: string;
  isFavorites: boolean;
  showColourbox: boolean;
  colourboxSuggestions: Array<{ id: number; title: string; src: string }>;
  onSetQuery?: (next: string) => void;
  onClearFilters?: () => void;
}) {
  const trimmed = query.trim();

  const didYouMean = trimmed ? getDidYouMean(trimmed, 3) : [];

  const setQuery = (next: string) => {
    if (onSetQuery) {
      onSetQuery(next);
      return;
    }
    // Fallback for demo wiring: emit an event the SearchBar/page can listen to.
    window.dispatchEvent(new CustomEvent("CBX_SEARCH_SET", { detail: next }));
  };

  const clearFilters = () => {
    if (onClearFilters) {
      onClearFilters();
      return;
    }
    window.dispatchEvent(new CustomEvent("CBX_FILTERS_CLEAR"));
  };

  const suggestedTerms = trimmed
    ? Array.from(
        new Set([
          trimmed,
          ...getAssetSearchSuggestions(trimmed, 4),
          "portrait",
          "team",
          "winter",
          "red",
        ])
      )
        .filter(Boolean)
        .slice(0, 6)
    : ["portrait", "team", "winter", "office", "red", "nature"];

  if (isFavorites) {
    return (
      <div className="rounded-2xl border border-border bg-muted/20 p-6">
        <div className="text-sm font-medium text-foreground">
          {trimmed ? (
            <>
              No favorites match <span className="font-semibold">“{trimmed}”</span>
            </>
          ) : (
            <>No favorites yet</>
          )}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {trimmed
            ? "Try a different search, or add more files to your favorites."
            : "Tip: click the heart on any file to add it here."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-background">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-muted/50 via-background to-background" />

        <div className="relative p-6">
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-background shadow-sm">
              <SearchX className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold text-foreground">
                {trimmed ? (
                  <>
                    No results for <span className="underline decoration-muted-foreground/30 underline-offset-4">“{trimmed}”</span>
                  </>
                ) : (
                  <>This folder is empty</>
                )}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {trimmed
                  ? "Try a different search, or clear filters to broaden the results."
                  : "Try a different folder, or add some files."}
              </div>

              <div className="mt-5 space-y-4">
                {didYouMean.length > 0 ? (
                  <div>
                    <div className="mb-2 text-xs font-medium text-muted-foreground">
                      Did you mean
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {didYouMean.map((t) => (
                        <button
                          key={t}
                          type="button"
                          className={cn(
                            "inline-flex h-8 items-center rounded-full border border-border bg-background px-3 text-sm",
                            "text-foreground/90 hover:bg-muted/50",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          )}
                          onClick={() => setQuery(t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                    Suggested searches
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {suggestedTerms.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={cn(
                          "inline-flex h-8 items-center rounded-full border border-border bg-background px-3 text-sm",
                          "text-foreground/90 hover:bg-muted/50",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        )}
                        onClick={() => setQuery(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {trimmed ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setQuery("")}
                  >
                    Clear search
                  </Button>
                ) : null}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={clearFilters}
                >
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Clear filters
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showColourbox ? (
        <div className="rounded-2xl border border-border bg-background p-6">
          <ColourboxSuggestions suggestions={colourboxSuggestions} className="space-y-4" />
        </div>
      ) : null}
    </div>
  );
}

function ListRow({
  img,
  selected,
  onToggleSelect,
  favorited,
  onToggleFavorite,
  onOpen,
}: {
  img: ImageItem;
  selected: boolean;
  onToggleSelect: (id: number) => void;
  favorited: boolean;
  onToggleFavorite: (id: number) => void;
  onOpen: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2 transition-colors",
        "hover:bg-muted/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected && "ring-1 ring-ring"
      )}
    >
      <button
        type="button"
        aria-pressed={selected}
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(img.id);
        }}
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded border border-border bg-background text-xs",
          selected && "bg-primary text-primary-foreground"
        )}
        aria-label={selected ? "Deselect asset" : "Select asset"}
      >
        {selected ? "✓" : ""}
      </button>

      <img
        src={withUnsplashParams(img.src, { w: 96, q: 70 })}
        alt={img.title}
        className="h-12 w-12 rounded-lg object-cover"
        draggable={false}
        loading="lazy"
        decoding="async"
      />

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{img.title}</div>
        <div className="flex items-center gap-2 truncate text-xs text-muted-foreground">
          <span
            aria-label={`Color: ${img.color}`}
            className={cn(
              "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
              img.color === "red" && "bg-red-500",
              img.color === "orange" && "bg-orange-500",
              img.color === "yellow" && "bg-yellow-400",
              img.color === "green" && "bg-green-500",
              img.color === "blue" && "bg-blue-500",
              img.color === "purple" && "bg-purple-500",
              img.color === "pink" && "bg-pink-500",
              img.color === "neutral" && "bg-zinc-400"
            )}
          />
          <span className="truncate">{img.folderId}</span>
        </div>
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-pressed={favorited}
          aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
          onClick={() => onToggleFavorite(img.id)}
        >
          <Heart className={cn("h-4 w-4", favorited && "fill-red-500 text-red-500")} />
        </Button>
      </div>
    </div>
  );
}

export function ImageGrid({
  view = "grid",
  sort = "name_asc",
  query = "",
  colors,
  filters,
  folder = "all",
  folderOverrides,
  selectedIds: controlledSelectedIds,
  onToggleSelect,
  onSetSelectedIds,
  favoriteIds: controlledFavoriteIds,
  onToggleFavorite,
  onRequestSetQuery,
  onRequestClearFilters,
  thumbSize,
}: {
  view?: "grid" | "list";
  sort?: "name_asc" | "name_desc" | "id_asc" | "id_desc" | "color_asc" | "color_desc";
  query?: string;
  colors?: Set<ImageItem["color"]>;
  filters?: AssetFilters;
  folder?: string;
  folderOverrides?: Record<number, string>;
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
  onSetSelectedIds?: (next: Set<number>) => void;
  favoriteIds?: Set<number>;
  onToggleFavorite?: (id: number) => void;
  onRequestSetQuery?: (next: string) => void;
  onRequestClearFilters?: () => void;
  thumbSize?: number;
}) {
  const [active, setActive] = useState<ImageItem | null>(null);

  const [marquee, setMarquee] = useState<null | {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    shift: boolean;
  }>(null);

  const marqueeRect = useMemo(() => {
    if (!marquee) return null;
    const left = Math.min(marquee.startX, marquee.endX);
    const top = Math.min(marquee.startY, marquee.endY);
    const right = Math.max(marquee.startX, marquee.endX);
    const bottom = Math.max(marquee.startY, marquee.endY);
    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top,
    };
  }, [marquee]);

  const intersects = (
    a: DOMRect,
    b: { left: number; top: number; right: number; bottom: number }
  ) => {
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  };

  const applyMarqueeSelection = useCallback(
    (rect: { left: number; top: number; right: number; bottom: number }, shift: boolean) => {
      const els = Array.from(document.querySelectorAll<HTMLElement>("[data-asset-id]"));
      const hitIds: number[] = [];

      for (const el of els) {
        const raw = el.getAttribute("data-asset-id");
        const id = raw ? Number(raw) : NaN;
        if (!Number.isFinite(id)) continue;
        const r = el.getBoundingClientRect();
        if (intersects(r, rect)) hitIds.push(id);
      }

      if (hitIds.length === 0) return;

      const current = controlledSelectedIds ?? new Set<number>();

      if (onSetSelectedIds) {
        const next = shift ? new Set(current) : new Set<number>();
        hitIds.forEach((id) => next.add(id));
        onSetSelectedIds(next);
        return;
      }

      // Fallback: add-only selection
      hitIds.forEach((id) => {
        if (!current.has(id)) onToggleSelect?.(id);
      });
    },
    [controlledSelectedIds, onSetSelectedIds, onToggleSelect]
  );

  const MARQUEE_BLOCK_SELECTOR = "button,[role='button'],a,input,textarea,select,[data-no-marquee]";

  const onMarqueePointerDown = useCallback(
    (e: any) => {
      if (view !== "grid") return;
      // Marquee is desktop-only (mouse). On touch/mobile we allow normal scrolling/tapping.
      if (e.pointerType !== "mouse") return;
      if (e.button !== 0) return;

      const target = e.target as HTMLElement | null;
      if (target?.closest(MARQUEE_BLOCK_SELECTOR)) return;

      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setMarquee({
        startX: e.clientX,
        startY: e.clientY,
        endX: e.clientX,
        endY: e.clientY,
        shift: e.shiftKey,
      });
    },
    [MARQUEE_BLOCK_SELECTOR, view]
  );

  const onMarqueePointerMove = useCallback((e: any) => {
    if (!marquee) return;
    setMarquee((prev) =>
      prev
        ? {
            ...prev,
            endX: e.clientX,
            endY: e.clientY,
          }
        : prev
    );
  }, [marquee]);

  const finishMarquee = useCallback(() => {
    if (!marqueeRect || !marquee) {
      setMarquee(null);
      return;
    }

    // Ignore tiny drags (treat as click)
    if (marqueeRect.width < 6 || marqueeRect.height < 6) {
      setMarquee(null);
      return;
    }

    applyMarqueeSelection(marqueeRect, marquee.shift);
    setMarquee(null);
  }, [applyMarqueeSelection, marquee, marqueeRect]);

  useEffect(() => {
    if (!active) return;

    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyPaddingRight = document.body.style.paddingRight;

    // Compensate for scrollbar removal to avoid layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.paddingRight = prevBodyPaddingRight;
    };
  }, [active]);

  const [smartDefs, setSmartDefs] = useState<
    {
      id: string;
      kind?: "portraits" | "wides" | "squares";
      rules?: { field: "ratio" | "name" | "keywords"; op: "is" | "contains"; value: string }[];
    }[]
  >([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("CBX_SMART_FOLDERS_V1");
      const parsed = raw ? (JSON.parse(raw) as any[]) : [];
      if (Array.isArray(parsed)) {
        const cleaned = parsed
          .filter((d) => d && typeof d.id === "string")
          .map((d) => ({
            id: d.id as string,
            kind: d.kind as ("portraits" | "wides" | "squares" | undefined),
            rules: Array.isArray(d.rules)
              ? d.rules
                  .filter(
                    (r: any) =>
                      r &&
                      (r.field === "ratio" || r.field === "name" || r.field === "keywords") &&
                      (r.op === "is" || r.op === "contains") &&
                      typeof r.value === "string"
                  )
                  .map((r: any) => ({
                    field: r.field as "ratio" | "name" | "keywords",
                    op: r.op as "is" | "contains",
                    value: String(r.value),
                  }))
              : undefined,
          }));
        setSmartDefs(cleaned);
      } else {
        setSmartDefs([]);
      }
    } catch {
      setSmartDefs([]);
    }
  }, []);

  const [isLoading, setIsLoading] = useState(true);
  const deferredQuery = useDeferredValue(query);
  const colorsEffective = filters?.colors ?? colors;
  const colorsKey = useMemo(() => {
    if (!colorsEffective || colorsEffective.size === 0) return "";
    return Array.from(colorsEffective).sort().join(",");
  }, [colorsEffective]);

  useEffect(() => {
    // Small skeleton window to avoid visual jank and mimic fetch.
    setIsLoading(true);
    const t = window.setTimeout(() => setIsLoading(false), 300);
    return () => window.clearTimeout(t);
  }, [deferredQuery, folder, folderOverrides, view, sort, colorsKey]);

  const [localSelectedIds, setLocalSelectedIds] = useState<Set<number>>(() => new Set());
  const selectedIds = controlledSelectedIds ?? localSelectedIds;

  const isSelected = useCallback((id: number) => selectedIds.has(id), [selectedIds]);

  const toggleSelected = useCallback(
    (id: number) => {
      if (onToggleSelect) {
        onToggleSelect(id);
        return;
      }

      setLocalSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [onToggleSelect]
  );

  const [localFavoriteIds, setLocalFavoriteIds] = useState<Set<number>>(() => new Set());
  const favoriteIds = controlledFavoriteIds ?? localFavoriteIds;

  // Persist local favorites when not controlled by the parent
  useEffect(() => {
    if (controlledFavoriteIds) return;

    try {
      const raw = window.localStorage.getItem("CBX_ASSET_FAVORITES_V1");
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      const arr = Array.isArray(parsed) ? parsed : [];
      const next = new Set<number>(
        arr.map((v) => Number(v)).filter((n) => Number.isFinite(n))
      );
      setLocalFavoriteIds(next);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (controlledFavoriteIds) return;

    try {
      window.localStorage.setItem(
        "CBX_ASSET_FAVORITES_V1",
        JSON.stringify(Array.from(localFavoriteIds))
      );
    } catch {
      // ignore
    }
  }, [controlledFavoriteIds, localFavoriteIds]);

  const isFavorited = useCallback((id: number) => favoriteIds.has(id), [favoriteIds]);

  const toggleFavorite = useCallback(
    (id: number) => {
      if (onToggleFavorite) {
        onToggleFavorite(id);
        return;
      }

      setLocalFavoriteIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [onToggleFavorite]
  );

  type AssetMeta = {
    tags: string[];
    comments: { id: string; text: string; createdAt: string }[];
    updatedAt: string;
  };

  const metaCacheRef = useRef<Map<string, AssetMeta>>(new Map());

  const getFilename = (src: string) => {
    try {
      return decodeURIComponent(src.split("/").filter(Boolean).pop() ?? "");
    } catch {
      return src.split("/").filter(Boolean).pop() ?? "";
    }
  };

  const writeMeta = (id: string | number, meta: AssetMeta) => {
    const key = `CBX_META_V1:${String(id)}`;
    try {
      localStorage.setItem(key, JSON.stringify(meta));
      metaCacheRef.current.set(key, meta);
    } catch {
      // ignore
    }
  };

  const readMeta = (id: string | number): AssetMeta => {
    const key = `CBX_META_V1:${String(id)}`;

    const cached = metaCacheRef.current.get(key);
    if (cached) return cached;

    let meta: AssetMeta = {
      tags: [],
      comments: [],
      updatedAt: "",
    };

    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as any;
        meta = {
          tags: Array.isArray(parsed.tags)
            ? parsed.tags.filter((t: any) => typeof t === "string")
            : [],
          comments: Array.isArray(parsed.comments)
            ? parsed.comments
                .filter((c: any) => c && typeof c.text === "string")
                .map((c: any) => ({
                  id: typeof c.id === "string" ? c.id : "",
                  text: String(c.text),
                  createdAt: typeof c.createdAt === "string" ? c.createdAt : "",
                }))
            : [],
          updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
        };
      }
    } catch {
      // ignore
    }

    // Seed demo keywords -> meta.tags (only when tags are empty)
    try {
      const demoKeywords = getDemoKeywordsForAsset(id);
      if ((!meta.tags || meta.tags.length === 0) && demoKeywords.length > 0) {
        meta = {
          ...meta,
          tags: Array.from(new Set(demoKeywords)),
          updatedAt: new Date().toISOString(),
        };
        writeMeta(id, meta);
      }
    } catch {
      // ignore
    }

    metaCacheRef.current.set(key, meta);
    return meta;
  };

  const allImages = useMemo(() => {
    const seen = new Set<string>();
    const out: ImageItem[] = [];

    for (const img of images) {
      const key = String(img.src || "") || `id:${img.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(img);
    }

    return out;
  }, []);

  const allImagesEffective = useMemo(() => {
    if (!folderOverrides) return allImages;
    return allImages.map((img) => ({
      ...img,
      folderId: folderOverrides[img.id] ?? img.folderId,
    }));
  }, [allImages, folderOverrides]);

  const q = deferredQuery.trim().toLowerCase();
  const f = String(folder || "all");
  const isFavoritesFolder = f === "favorites";
  const isTrashFolder = f === "trash";

  const baseFiltered = useMemo(() => {
    const raw = deferredQuery;
    const nq = normalizeText(raw);
    if (!nq) return allImagesEffective;

    const tokens = nq.split(" ").filter(Boolean);
    if (tokens.length === 0) return allImagesEffective;

    return allImagesEffective.filter((img) => {
      const filename = getFilename(String(img.src ?? ""));
      const meta = readMeta(img.id);

      const hay = normalizeText(
        [
          img.id,
          img.title,
          filename,
          img.folderId,
          img.color,
          meta.tags?.join(" ") ?? "",
          meta.comments?.map((c) => c.text).join(" ") ?? "",
        ].join(" ")
      );

      return tokens.every((t) => hay.includes(t));
    });
  }, [allImagesEffective, deferredQuery]);


  const filteredImages = useMemo(() => {
    let list = baseFiltered;

    if (colorsEffective && colorsEffective.size > 0) {
      list = list.filter((img) => colorsEffective.has(img.color));
    }

    const isTrashed = (img: ImageItem) => img.folderId === "trash";

    // Trash view: show only trashed items
    if (isTrashFolder) return list.filter(isTrashed);

    // Everywhere else: hide trashed items
    list = list.filter((img) => !isTrashed(img));

    if (f === "all") return list;
    if (f === "favorites") return list.filter((img) => isFavorited(img.id));

    if (f.startsWith("smart:")) {
      const def = smartDefs.find((d) => d.id === f);

      // If we have explicit rules, apply them (AND)
      const rules = def?.rules;
      if (rules && rules.length > 0) {
        return rules.reduce((acc, rule) => {
          if (rule.field === "ratio" && rule.op === "is") {
            const v = rule.value as ImageItem["ratio"];
            return acc.filter((img) => img.ratio === v);
          }

          if (rule.field === "name" && rule.op === "contains") {
            const needle = rule.value.trim().toLowerCase();
            if (!needle) return acc;
            const getName = (img: any) =>
              String((img.title ?? img.name ?? img.filename ?? "") as string).toLowerCase();
            return acc.filter((img) => getName(img).includes(needle));
          }

          if (rule.field === "keywords" && rule.op === "contains") {
            const needle = rule.value.trim().toLowerCase();
            if (!needle) return acc;

            return acc.filter((img) => {
              const meta = readMeta(img.id);
              const tags = meta.tags ?? [];
              return tags.some((t) => String(t).toLowerCase().includes(needle));
            });
          }

          return acc;
        }, list);
      }

      // Fallback to built-in kinds
      const kind = def?.kind;
      if (kind === "portraits" || f === "smart:portraits")
        return list.filter((img) => img.ratio === "3/4");
      if (kind === "wides" || f === "smart:wides") return list.filter((img) => img.ratio === "16/9");
      if (kind === "squares" || f === "smart:squares") return list.filter((img) => img.ratio === "1/1");

      return list;
    }

    return list.filter((img) => img.folderId === f);
  }, [baseFiltered, f, smartDefs, favoriteIds, colorsEffective, isFavorited, isTrashFolder]);

  const sortedImages = useMemo(() => {
    const list = [...filteredImages];

    list.sort((a, b) => {
      if (sort === "id_asc") return a.id - b.id;
      if (sort === "id_desc") return b.id - a.id;

      if (sort === "color_asc" || sort === "color_desc") {
        const ao = COLOR_ORDER[a.color] ?? 999;
        const bo = COLOR_ORDER[b.color] ?? 999;
        const diff = ao - bo;
        if (diff !== 0) return sort === "color_desc" ? -diff : diff;

        // Stable tie-breakers within same color
        const an = String(a.title ?? "").toLowerCase();
        const bn = String(b.title ?? "").toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return a.id - b.id;
      }

      const an = String(a.title ?? "").toLowerCase();
      const bn = String(b.title ?? "").toLowerCase();
      if (an < bn) return sort === "name_desc" ? 1 : -1;
      if (an > bn) return sort === "name_desc" ? -1 : 1;
      return a.id - b.id;
    });

    return list;
  }, [filteredImages, sort]);

  const showColourboxFallback = !isLoading && q.length > 0 && sortedImages.length === 0;
  const colourboxSuggestions = useMemo(
    () => getColourboxSuggestions(deferredQuery),
    [deferredQuery]
  );

  return (
    <>
      {view === "list" ? (
        <section className="w-full space-y-2">
          {isLoading ? (
            Array.from({ length: 10 }).map((_, idx) => <SkeletonRow key={`sr_${idx}`} />)
          ) : (
            <>
              {sortedImages.length === 0 && (
                <EmptyState
                  query={deferredQuery}
                  isFavorites={isFavoritesFolder}
                  showColourbox={showColourboxFallback && !isFavoritesFolder}
                  colourboxSuggestions={colourboxSuggestions}
                  onSetQuery={onRequestSetQuery}
                  onClearFilters={onRequestClearFilters}
                />
              )}
              {sortedImages.map((img) => (
                <ListRow
                  key={img.id}
                  img={img}
                  selected={isSelected(img.id)}
                  onToggleSelect={toggleSelected}
                  favorited={isFavorited(img.id)}
                  onToggleFavorite={toggleFavorite}
                  onOpen={() => setActive(img)}
                />
              ))}
            </>
          )}
        </section>
      ) : isLoading ? (
        <div
          className="relative w-full min-h-[60vh]"
          onPointerDown={onMarqueePointerDown}
          onPointerMove={onMarqueePointerMove}
          onPointerUp={finishMarquee}
          onPointerCancel={() => setMarquee(null)}
        >
          <section
            className="w-full grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(var(--thumb),1fr))]"
            style={{ ["--thumb" as any]: `${Math.max(140, Math.min(520, thumbSize ?? 220))}px` }}
          >
            {Array.from({ length: 16 }).map((_, idx) => {
              const ratios = ["3/4", "4/3", "16/9", "1/1"];
              const ratio = ratios[idx % ratios.length];
              return <SkeletonCard key={`sk_${idx}`} ratio={ratio} />;
            })}
          </section>

          {marqueeRect ? (
            <div
              className="pointer-events-none fixed z-50 rounded-md border border-ring bg-ring/10"
              style={{
                left: marqueeRect.left,
                top: marqueeRect.top,
                width: marqueeRect.width,
                height: marqueeRect.height,
              }}
            />
          ) : null}
        </div>
      ) : sortedImages.length === 0 ? (
        <section className="w-full">
          <EmptyState
            query={deferredQuery}
            isFavorites={isFavoritesFolder}
            showColourbox={showColourboxFallback && !isFavoritesFolder}
            colourboxSuggestions={colourboxSuggestions}
            onSetQuery={onRequestSetQuery}
            onClearFilters={onRequestClearFilters}
          />
        </section>
      ) : (
        <div
          className="relative w-full min-h-[60vh]"
          onPointerDown={onMarqueePointerDown}
          onPointerMove={onMarqueePointerMove}
          onPointerUp={finishMarquee}
          onPointerCancel={() => setMarquee(null)}
        >
          <section
            className="w-full grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(var(--thumb),1fr))]"
            style={{ ["--thumb" as any]: `${Math.max(140, Math.min(520, thumbSize ?? 220))}px` }}
          >
            {sortedImages.map((img) => (
              <ImageCard
                key={img.id}
                id={img.id}
                title={img.title}
                ratio={img.ratio as any}
                src={img.src}
                selected={isSelected(img.id)}
                onToggleSelect={toggleSelected}
                favorited={isFavorited(img.id)}
                onToggleFavorite={toggleFavorite}
                onOpen={(_id) => setActive(img)}
              />
            ))}
          </section>

          {marqueeRect ? (
            <div
              className="pointer-events-none fixed z-50 rounded-md border border-ring bg-ring/10"
              style={{
                left: marqueeRect.left,
                top: marqueeRect.top,
                width: marqueeRect.width,
                height: marqueeRect.height,
              }}
            />
          ) : null}
        </div>
      )}

      <ViewerModal
        open={!!active}
        item={active as ViewerItem | null}
        items={sortedImages as unknown as ViewerItem[]}
        onClose={() => setActive(null)}
      />
    </>
  );
}