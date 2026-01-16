"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProtoAuth } from "@/lib/proto-auth";
import { Menu, LayoutGrid, List, Upload, Share2, Trash2, Search, X, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImageGrid } from "../../../components/drive/image-grid";
import { demoAssets } from "@/lib/demo/assets";
import { FolderSidebar, demoFolders } from "../../../components/FolderSidebar";
import { SelectionBar } from "../../../components/selection-bar";
import { FolderHeader } from "../../../components/folder-header";
import { SubfolderStrip } from "@/components/SubfolderStrip";

import { AssetFiltersBar } from "@/components/assets-filters/AssetFiltersBar";
import {
  AssetFilters,
  DEFAULT_ASSET_FILTERS,
  clearFilters,
  loadFiltersFromStorage,
  saveFiltersToStorage,
} from "@/components/assets-filters/filters";
import { readJSON, readNumber, readString, remove, writeJSON, writeString } from "@/lib/storage/localStorage";

type AssetSort = "name_asc" | "name_desc" | "id_asc" | "id_desc" | "color_asc" | "color_desc";


function isAssetSort(v: string): v is AssetSort {
  return (
    v === "name_asc" ||
    v === "name_desc" ||
    v === "id_asc" ||
    v === "id_desc" ||
    v === "color_asc" ||
    v === "color_desc"
  );
}

function hashToStableId(src: string) {
  // Deterministic 32-bit hash (FNV-1a) -> safe positive integer id range
  let h = 2166136261;
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Keep within 1e9 span and offset high so it won't collide with demo ids
  const n = (h >>> 0) % 1_000_000_000;
  return 1_000_000_000 + n;
}

type FolderNode = {
  id: string;
  name: string;
  children?: FolderNode[];
};

// --- Extracted types for derived folder/asset data ---

type FolderAsset = { id: number; title: string; src: string };

type DriveFolderContextDetail = { id: string; name: string };

type DriveFolderDataArgs = {
  allImages: (typeof baseDemoImages)[number][];
  selectedFolder: string;
  assetFolderOverrides: Record<number, string>;
  favoriteAssetIds: Set<number>;
  folderCovers: Record<string, number>;
  allById: Map<number, (typeof baseDemoImages)[number]>;
  folderIndex: Map<string, FolderNode>;
  isRealFolderView: boolean;
};

type DriveFolderData = {
  coverAssetId: number | undefined;
  folderCounts: Record<string, number>;
  assetsByFolder: Record<string, FolderAsset[]>;
  folderAssets: FolderAsset[];
  subfolders: FolderNode[];
  subfolderItems: { id: string; name: string; coverSrc?: string; count: number }[];
  trashCount: number;
  showTrashEmptyState: boolean;
};
// --- Local hook for derived folder/asset data ---
function useDriveFolderData(args: DriveFolderDataArgs & { isTrashView: boolean; query: string }): DriveFolderData {
  const {
    allImages,
    selectedFolder,
    assetFolderOverrides,
    favoriteAssetIds,
    folderCovers,
    allById,
    folderIndex,
    isRealFolderView,
    isTrashView,
    query,
  } = args;

  const coverAssetId = isRealFolderView ? folderCovers[selectedFolder] : undefined;

  const { folderCounts, assetsByFolder } = useMemo(() => {
    const counts: Record<string, number> = {};
    const map: Record<string, FolderAsset[]> = {};

    // Ensure smart folders exist even when empty
    counts["favorites"] = 0;
    counts["purchases"] = 0;
    counts["trash"] = 0;
    counts["all"] = 0;
    map["favorites"] = [];
    map["purchases"] = [];
    map["trash"] = [];
    map["all"] = [];

    for (const img of allImages) {
      const fid = assetFolderOverrides[img.id] ?? img.folderId ?? "all";

      // Physical folder
      counts[fid] = (counts[fid] ?? 0) + 1;
      (map[fid] ??= []).push({ id: img.id, title: img.title, src: img.src });

      // "All" includes everything except trash
      if (fid !== "trash") {
        counts["all"] += 1;
        map["all"].push({ id: img.id, title: img.title, src: img.src });
      }

      // Favorites is a smart folder (exclude trash)
      if (fid !== "trash" && favoriteAssetIds.has(img.id)) {
        counts["favorites"] += 1;
        map["favorites"].push({ id: img.id, title: img.title, src: img.src });
      }

      // Purchases is a smart folder (exclude trash)
      if (fid !== "trash" && fid === "purchases") {
        counts["purchases"] += 1;
        map["purchases"].push({ id: img.id, title: img.title, src: img.src });
      }
    }

    // Ensure cover asset is first when viewing a folder (visual priority)
    if (isRealFolderView && typeof coverAssetId === "number") {
      const arr = map[selectedFolder];
      if (Array.isArray(arr) && arr.length > 1) {
        const idx = arr.findIndex((a) => a.id === coverAssetId);
        if (idx > 0) {
          const next = arr.slice();
          const [cover] = next.splice(idx, 1);
          next.unshift(cover);
          map[selectedFolder] = next;
        }
      }
    }

    return { folderCounts: counts, assetsByFolder: map };
  }, [allImages, assetFolderOverrides, favoriteAssetIds, isRealFolderView, coverAssetId, selectedFolder]);

  const folderAssets = useMemo(() => {
    // Smart folders
    if (selectedFolder === "favorites") return assetsByFolder["favorites"] ?? [];
    if (selectedFolder === "purchases") return assetsByFolder["purchases"] ?? [];
    if (selectedFolder === "trash") return assetsByFolder["trash"] ?? [];
    if (selectedFolder === "all") return assetsByFolder["all"] ?? [];

    // Real folders only
    if (!isRealFolderView) return [];
    return assetsByFolder[selectedFolder] ?? [];
  }, [assetsByFolder, isRealFolderView, selectedFolder]);

  const subfolders = useMemo<FolderNode[]>(() => {
    if (!isRealFolderView) return [];
    return folderIndex.get(selectedFolder)?.children ?? [];
  }, [isRealFolderView, selectedFolder, folderIndex]);

  const subfolderItems = useMemo(() => {
    return subfolders.map((sf) => {
      const coverId = folderCovers[sf.id];
      const coverSrc = typeof coverId === "number" ? allById.get(coverId)?.src : undefined;
      return {
        id: sf.id,
        name: sf.name ?? "Folder",
        coverSrc,
        count: folderCounts[sf.id] ?? 0,
      };
    });
  }, [subfolders, folderCovers, folderCounts, allById]);

  const trashCount = folderCounts["trash"] ?? 0;
  const showTrashEmptyState = isTrashView && query.trim() === "" && trashCount === 0;

  return { coverAssetId, folderCounts, assetsByFolder, folderAssets, subfolders, subfolderItems, trashCount, showTrashEmptyState };
}

type DriveUrlSync = {
  query: string;
  setQuery: (next: string) => void;
  urlQ: string;
  urlFolder: string;
  scheduleQueryUrlUpdate: (nextValue: string) => void;
  clearPendingQueryUrlUpdate: () => void;
  clearSearchUrlAndFolder: () => void;
  getCurrentSearchParams: () => URLSearchParams;
};

function useDriveUrlSync(args: {
  mounted: boolean;
  router: ReturnType<typeof useRouter>;
  searchParams: ReturnType<typeof useSearchParams>;
  initialQuery: string;
}): DriveUrlSync {
  const { mounted, router, searchParams, initialQuery } = args;

  const urlQ = (
    searchParams.get("q") ??
    searchParams.get("query") ??
    searchParams.get("search") ??
    ""
  ).trim();
  const urlFolder = (searchParams.get("folder") ?? "").trim();

  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  const searchParamsRef = useRef(searchParams);
  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  const suppressNextUrlQuerySyncRef = useRef<string | null>(null);

  const getCurrentSearchParams = useCallback(() => {
    return new URLSearchParams(Array.from(searchParamsRef.current.entries()));
  }, []);

  const [query, _setQuery] = useState(initialQuery);
  const setQuery = useCallback((next: string) => _setQuery(next), []);

  const queryUrlUpdateTimeoutRef = useRef<number | null>(null);
  const clearPendingQueryUrlUpdate = useCallback(() => {
    if (queryUrlUpdateTimeoutRef.current !== null) {
      window.clearTimeout(queryUrlUpdateTimeoutRef.current);
      queryUrlUpdateTimeoutRef.current = null;
    }
  }, []);

  const scheduleQueryUrlUpdate = useCallback(
    (nextValue: string) => {
      const trimmed = (nextValue ?? "").trim();
      clearPendingQueryUrlUpdate();

      queryUrlUpdateTimeoutRef.current = window.setTimeout(() => {
        try {
          const params = getCurrentSearchParams();
          suppressNextUrlQuerySyncRef.current = trimmed;

          if (trimmed) {
            params.set("q", trimmed);
            // Keep `folder` so search can be scoped to the current folder.
          } else {
            params.delete("q");
          }
          params.delete("query");
          params.delete("search");
          routerRef.current.replace(`/drive${params.toString() ? `?${params.toString()}` : ""}`);
        } catch {
          // ignore
        }
      }, 250);
    },
    [clearPendingQueryUrlUpdate, getCurrentSearchParams]
  );

  useEffect(() => clearPendingQueryUrlUpdate, [clearPendingQueryUrlUpdate]);

  // Apply external URL query changes into state
  useEffect(() => {
    if (!mounted) return;
    const next = urlQ.trim();

    if (suppressNextUrlQuerySyncRef.current !== null) {
      const suppressed = suppressNextUrlQuerySyncRef.current;
      if (suppressed.trim() === next) {
        suppressNextUrlQuerySyncRef.current = null;
        return;
      }
      suppressNextUrlQuerySyncRef.current = null;
    }

    _setQuery((prev) => {
      if (prev.trim() === next) return prev;

      // Keep folder context when searching (scoped search)
      // (Do not force folder to "all" or delete the `folder` param.)

      return next;
    });
  }, [mounted, urlQ]);

  const clearSearchUrlAndFolder = useCallback(() => {
    _setQuery("");
    clearPendingQueryUrlUpdate();

    try {
      const params = getCurrentSearchParams();
      suppressNextUrlQuerySyncRef.current = "";
      params.delete("q");
      params.delete("query");
      params.delete("search");
      // Keep `folder` so we stay in the current folder.
      routerRef.current.replace(`/drive${params.toString() ? `?${params.toString()}` : ""}`);
    } catch {
      // ignore
    }
  }, [clearPendingQueryUrlUpdate, getCurrentSearchParams]);

  return {
    query,
    setQuery,
    urlQ,
    urlFolder,
    scheduleQueryUrlUpdate,
    clearPendingQueryUrlUpdate,
    clearSearchUrlAndFolder,
    getCurrentSearchParams,
  };
}

const LS_KEYS = {
  filters: "CBX_ASSET_FILTERS_V1",
  oldColors: "CBX_COLOR_FILTER_V1",
  sort: "CBX_ASSET_SORT_V1",
  view: "CBX_ASSET_VIEW_V1",
  thumbSize: "CBX_ASSET_THUMBSIZE_V1",
  selectedFolder: "CBX_SELECTED_FOLDER_V1",
  favorites: "CBX_ASSET_FAVORITES_V1",
  folderCovers: "CBX_FOLDER_COVERS_V1",
  folderTree: "CBX_FOLDER_TREE_V1",
  assetFolders: "CBX_ASSET_FOLDERS_V1",
  importedAssets: "CBX_DRIVE_IMPORTED_ASSETS_V1",
} as const;

const baseDemoImages = demoAssets.map((a, idx) => ({
  id: Number(a.id) || idx + 1,
  title: a.title,
  src: a.src,
  ratio: a.ratio,
  folderId: a.folderId ?? "all",
  color: a.color ?? "neutral",
}));

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DrivePageInner />
    </Suspense>
  );
}

function DrivePageInner() {
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    if (!mounted) return;

    const onScroll = () => {
      setIsScrolled(window.scrollY > 4);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mounted]);
  useEffect(() => {
    setMounted(true);
  }, []);

  const router = useRouter();
  const { isReady, isLoggedIn } = useProtoAuth();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isReady) return;
    if (isLoggedIn) return;
    router.replace("/drive/landing");
  }, [isReady, isLoggedIn, router]);

  const initialUrlQ = (
    searchParams.get("q") ??
    searchParams.get("query") ??
    searchParams.get("search") ??
    ""
  ).trim();
  const initialUrlFolder = (searchParams.get("folder") ?? "").trim();

  const [selectedFolder, setSelectedFolder] = useState<string>(() =>
    initialUrlFolder ? initialUrlFolder : "all"
  );

  const {
    query,
    setQuery,
    urlQ,
    urlFolder,
    scheduleQueryUrlUpdate,
    clearPendingQueryUrlUpdate,
    clearSearchUrlAndFolder,
    getCurrentSearchParams,
  } = useDriveUrlSync({
    mounted,
    router,
    searchParams,
    initialQuery: initialUrlQ,
  });

  const navigateToFolder = useCallback(
    (folderId: string) => {
      setSelectedFolder(folderId);
      // Folder navigation should exit search context
      setQuery("");
      clearPendingQueryUrlUpdate();

      try {
        const params = getCurrentSearchParams();
        // Clear any search params
        params.delete("q");
        params.delete("query");
        params.delete("search");

        // Set folder param (omit for "all")
        if (folderId && folderId !== "all") params.set("folder", folderId);
        else params.delete("folder");

        router.replace(`/drive${params.toString() ? `?${params.toString()}` : ""}`);
      } catch {
        // ignore
      }
    },
    [clearPendingQueryUrlUpdate, getCurrentSearchParams, setQuery, setSelectedFolder, router]
  );

  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const shareFolder = useCallback(async () => {
    if (!mounted) return;

    const folderParam =
      selectedFolder && selectedFolder !== "all"
        ? `?folder=${encodeURIComponent(selectedFolder)}`
        : "";
    const url = `${window.location.origin}/drive${folderParam}`;

    try {
      await navigator.clipboard.writeText(url);
      console.log(`[Share] Copied folder link: ${url}`);
    } catch {
      // Fallback: best-effort prompt
      window.prompt("Copy this folder link:", url);
    }
  }, [mounted, selectedFolder]);

  const handleUploadFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    // Demo stub: wire this to real upload later
    console.log(
      `[Upload] Folder: ${selectedFolder}`,
      list.map((f) => ({ name: f.name, size: f.size, type: f.type }))
    );
  }, [selectedFolder]);

  // Wiring for EmptyState actions (Suggested searches / Clear actions)
  useEffect(() => {
    if (!mounted) return;

    const onSearchSet = (e: Event) => {
      const ce = e as CustomEvent<string>;
      const next = typeof ce.detail === "string" ? ce.detail : "";
      setQuery(next);
      // Keep current folder (scoped search)
      scheduleQueryUrlUpdate(next);
    };

    const onFiltersClear = () => {
      setFilters(clearFilters());
      // Optional: close the filters panel if it was open
      setFiltersOpen(false);
    };

    window.addEventListener("CBX_SEARCH_SET", onSearchSet as EventListener);
    window.addEventListener("CBX_FILTERS_CLEAR", onFiltersClear as EventListener);

    return () => {
      window.removeEventListener("CBX_SEARCH_SET", onSearchSet as EventListener);
      window.removeEventListener("CBX_FILTERS_CLEAR", onFiltersClear as EventListener);
    };
  }, [mounted, scheduleQueryUrlUpdate]);
  const [assetView, setAssetView] = useState<"grid" | "list">("grid");
  const [thumbSize, setThumbSize] = useState(220);

  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (!mounted) return;

    const mq = window.matchMedia("(min-width: 640px)"); // tailwind `sm`
    const update = () => setIsDesktop(mq.matches);
    update();

    // Safari < 14 fallback
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }

    mq.addListener?.(update);
    return () => {
      mq.removeListener?.(update);
    };
  }, [mounted]);
  useEffect(() => {
    const n = readNumber(LS_KEYS.thumbSize, 0);
    if (n >= 140 && n <= 520) setThumbSize(n);
  }, []);
  useEffect(() => {
    if (!mounted) return;
    writeString(LS_KEYS.thumbSize, String(thumbSize));
  }, [mounted, thumbSize]);

  const effectiveThumbSize = isDesktop ? thumbSize : 140;

  const [assetSort, setAssetSort] = useState<AssetSort>("name_asc");

  const [filters, setFilters] = useState<AssetFilters>(() => ({
    ...DEFAULT_ASSET_FILTERS,
    colors: new Set(DEFAULT_ASSET_FILTERS.colors),
  }));

  const activeFilterCount = useMemo(() => {
    return (
      filters.colors.size +
      (filters.ratios?.size ?? 0) +
      (filters.favoritesOnly ? 1 : 0) +
      (filters.orientation ? 1 : 0) +
      (filters.hasComments ? 1 : 0) +
      (filters.hasTags ? 1 : 0)
    );
  }, [filters]);



  // Load filters after mount (client only)
  useEffect(() => {
    if (!mounted) return;
    const loaded = loadFiltersFromStorage(LS_KEYS.filters);

    // Backward-compat: if we don't have v1 stored yet, try old color-only key
    try {
      const rawOld = readString(LS_KEYS.oldColors, "");
      if (rawOld && (!loaded.colors || loaded.colors.size === 0)) {
        const arr = JSON.parse(rawOld) as string[];
        if (Array.isArray(arr)) {
          loaded.colors = new Set(arr as any);
          remove(LS_KEYS.oldColors);
        }
      }
    } catch {
      // ignore
    }

    setFilters(loaded);
  }, [mounted]);

  // Persist filters
  useEffect(() => {
    if (!mounted) return;
    saveFiltersToStorage(LS_KEYS.filters, filters);
  }, [mounted, filters]);

  useEffect(() => {
    const raw = readString(LS_KEYS.sort, "");
    if (raw && isAssetSort(raw)) setAssetSort(raw);
    else setAssetSort("name_asc");
  }, []);

  useEffect(() => {
    if (!mounted) return;
    writeString(LS_KEYS.sort, assetSort);
  }, [mounted, assetSort]);

  useEffect(() => {
    const raw = readString(LS_KEYS.view, "");
    if (raw === "list" || raw === "grid") setAssetView(raw);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    writeString(LS_KEYS.view, assetView);
  }, [mounted, assetView]);

  useEffect(() => {
    if (!mounted) return;
  
    // If we have an active search OR an explicit folder from the URL, don't override from localStorage
    if (urlQ.trim().length > 0) return;
    if (urlFolder.trim().length > 0) return;
  
    const raw = readString(LS_KEYS.selectedFolder, "");
    if (raw.length > 0) setSelectedFolder(raw);
  }, [mounted, urlQ, urlFolder]);

  useEffect(() => {
    if (!mounted) return;
    writeString(LS_KEYS.selectedFolder, selectedFolder);
  }, [mounted, selectedFolder]);

  const [foldersOpen, setFoldersOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  const openFilters = useCallback(() => setFiltersOpen(true), [setFiltersOpen]);

  const clearAllFilters = useCallback(() => {
    setFilters(clearFilters());
    setFiltersOpen(false);
  }, [setFilters, setFiltersOpen]);

  // --- Search-state bar logic ---
  const hasActiveQuery = query.trim().length > 0;
  const hasActiveFilters = activeFilterCount > 0;
  const showSearchStateBar = hasActiveQuery || hasActiveFilters;

  const clearOnlyQuery = useCallback(() => {
    clearSearchUrlAndFolder();
  }, [clearSearchUrlAndFolder]);

  const clearAllSearchAndFilters = useCallback(() => {
    clearSearchUrlAndFolder();
    setFilters(clearFilters());
    setFiltersOpen(false);
  }, [clearSearchUrlAndFolder, setFilters, setFiltersOpen]);

  const [folderTree, setFolderTree] = useState<FolderNode[]>(() => {
    // On the server we can't access localStorage; initial render uses demoFolders.
    return demoFolders as unknown as FolderNode[];
  });
  // Build fast lookup maps for folder nodes and breadcrumb paths.

  useEffect(() => {
    if (!mounted) return;

    const stored = readJSON<FolderNode[] | null>(LS_KEYS.folderTree, null);
    if (Array.isArray(stored) && stored.length > 0) {
      setFolderTree(stored);
    }
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    setFolderTree((prev) => {
      const hasPurchases = Array.isArray(prev) && prev.some((n) => n.id === "purchases");
      if (hasPurchases) return prev;
      return [{ id: "purchases", name: "Purchases" }, ...(prev ?? [])];
    });
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    writeJSON(LS_KEYS.folderTree, folderTree);
  }, [mounted, folderTree]);

  const { folderIndex, folderPathIndex } = useMemo(() => {
    const map = new Map<string, FolderNode>();
    const pathMap = new Map<string, FolderNode[]>();

    const walk = (nodes: FolderNode[], path: FolderNode[]) => {
      for (const n of nodes) {
        map.set(n.id, n);
        const nextPath = [...path, n];
        pathMap.set(n.id, nextPath);
        if (Array.isArray(n.children) && n.children.length) walk(n.children, nextPath);
      }
    };

    walk(folderTree, []);
    return { folderIndex: map, folderPathIndex: pathMap };
  }, [folderTree]);

  // --- Imported assets state and logic ---
  const [importedImages, setImportedImages] = useState<(typeof baseDemoImages)[number][]>([]);

  useEffect(() => {
    if (!mounted) return;

    const arr = readJSON<any[]>(LS_KEYS.importedAssets, []);
    if (!Array.isArray(arr) || arr.length === 0) {
      setImportedImages([]);
      return;
    }

    const next = arr
      .map((a, idx) => {
        const src = typeof a?.src === "string" ? a.src : "";
        if (!src) return null;
        const id = hashToStableId(src);
        return {
          id,
          title: typeof a?.title === "string" && a.title.trim().length ? a.title : `Asset ${id}`,
          src,
          ratio: a?.ratio ?? "landscape",
          folderId: typeof a?.folderId === "string" && a.folderId ? a.folderId : "purchases",
          color: typeof a?.color === "string" ? a.color : "neutral",
        };
      })
      .filter(Boolean) as (typeof baseDemoImages)[number][];

    // Deduplicate by src
    const seen = new Set<string>();
    const deduped: (typeof baseDemoImages)[number][] = [];
    for (const img of next) {
      if (seen.has(img.src)) continue;
      seen.add(img.src);
      deduped.push(img);
    }

    setImportedImages(deduped);
  }, [mounted]);

  const handlePurchasesImported = useCallback(
    (e: Event) => {
      const ce = e as CustomEvent<any[]>;
      const incomingRaw = Array.isArray(ce.detail) ? ce.detail : [];
      if (!incomingRaw.length) return;

      // Normalize incoming to the same shape as `importedImages`
      const incoming = incomingRaw
        .map((a, idx) => {
          const src = typeof a?.src === "string" ? a.src : "";
          if (!src) return null;
          const id = hashToStableId(src);
          return {
            id,
            title:
              typeof a?.title === "string" && a.title.trim().length ? a.title : `Asset ${id}`,
            src,
            ratio: a?.ratio ?? "landscape",
            folderId:
              typeof a?.folderId === "string" && a.folderId ? a.folderId : "purchases",
            color: typeof a?.color === "string" ? a.color : "neutral",
          };
        })
        .filter(Boolean) as (typeof baseDemoImages)[number][];

      if (!incoming.length) return;

      setImportedImages((prev) => {
        const bySrc = new Set(prev.map((x) => x.src));
        const merged = [...prev];
        let changed = false;

        for (const img of incoming) {
          if (bySrc.has(img.src)) continue;
          bySrc.add(img.src);
          merged.push(img);
          changed = true;
        }

        if (!changed) return prev;

        // Persist as raw objects
        writeJSON(
          LS_KEYS.importedAssets,
          merged.map((m) => ({
            id: m.id,
            title: m.title,
            src: m.src,
            ratio: m.ratio,
            folderId: m.folderId ?? "purchases",
            color: m.color,
          }))
        );

        return merged;
      });

      // Take user straight to Purchases after import
      setSelectedFolder("purchases");
    },
    [setSelectedFolder]
  );

  useEffect(() => {
    if (!mounted) return;

    window.addEventListener("CBX_PURCHASES_IMPORTED", handlePurchasesImported as EventListener);
    return () =>
      window.removeEventListener(
        "CBX_PURCHASES_IMPORTED",
        handlePurchasesImported as EventListener
      );
  }, [mounted, handlePurchasesImported]);

  const allImages = useMemo(() => {
    if (!importedImages.length) return baseDemoImages;

    const bySrc = new Set<string>();
    const merged: (typeof baseDemoImages)[number][] = [];

    // Imported first so purchases win in case of duplicates
    for (const img of importedImages) {
      if (bySrc.has(img.src)) continue;
      bySrc.add(img.src);
      merged.push(img);
    }

    for (const img of baseDemoImages) {
      if (bySrc.has(img.src)) continue;
      bySrc.add(img.src);
      merged.push(img);
    }

    return merged;
  }, [importedImages]);

  const allById = useMemo(() => {
    const m = new Map<number, (typeof baseDemoImages)[number]>();
    for (const a of allImages) m.set(a.id, a);
    return m;
  }, [allImages]);
  useEffect(() => {
    if (!mounted) return;
    const f = urlFolder.trim();
    if (!f) return;

    const isSmart = f === "all" || f === "favorites" || f === "purchases" || f === "trash";
    if (!isSmart && !folderIndex.has(f)) return;

    setSelectedFolder(f);
    setQuery("");
    clearPendingQueryUrlUpdate();
  }, [mounted, urlFolder, folderIndex, clearPendingQueryUrlUpdate, setQuery, setSelectedFolder]);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());

  // UX: Esc closes the top-most panel; otherwise clears selection
  useEffect(() => {
    if (!mounted) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      // Close panels first (priority order)
      if (moveOpen) {
        setMoveOpen(false);
        return;
      }
      if (filtersOpen) {
        setFiltersOpen(false);
        return;
      }
      if (foldersOpen) {
        setFoldersOpen(false);
        return;
      }

      // Otherwise clear selection
      if (selectedIds.size > 0) {
        setSelectedIds(new Set());
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mounted, moveOpen, filtersOpen, foldersOpen, selectedIds.size]);

  const [favoriteAssetIds, setFavoriteAssetIds] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    if (!mounted) return;
    const arr = readJSON<number[]>(LS_KEYS.favorites, []);
    setFavoriteAssetIds(new Set(Array.isArray(arr) ? arr : []));
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    writeJSON(LS_KEYS.favorites, Array.from(favoriteAssetIds));
  }, [mounted, favoriteAssetIds]);

  const toggleAssetFavorite = (id: number) => {
    setFavoriteAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const [folderCovers, setFolderCovers] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!mounted) return;
    const obj = readJSON<Record<string, number>>(LS_KEYS.folderCovers, {});
    if (obj && typeof obj === "object") setFolderCovers(obj);
    else setFolderCovers({});
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    writeJSON(LS_KEYS.folderCovers, folderCovers);
  }, [mounted, folderCovers]);

  const setFolderCover = (folderId: string, assetId: number) => {
    setFolderCovers((prev) => ({ ...prev, [folderId]: assetId }));
  };

  const [assetFolderOverrides, setAssetFolderOverrides] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!mounted) return;
    const obj = readJSON<Record<string, string>>(LS_KEYS.assetFolders, {});
    const next: Record<number, string> = {};
    Object.entries(obj || {}).forEach(([k, v]) => {
      const id = Number(k);
      if (Number.isFinite(id) && typeof v === "string") next[id] = v;
    });
    setAssetFolderOverrides(next);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    writeJSON(LS_KEYS.assetFolders, assetFolderOverrides);
  }, [mounted, assetFolderOverrides]);

  const moveAssetToFolder = useCallback((assetId: number, folderId: string) => {
    const idsToMove = selectedIds.has(assetId) ? Array.from(selectedIds) : [assetId];

    setAssetFolderOverrides((prev) => {
      const next = { ...prev };
      idsToMove.forEach((id) => {
        next[id] = folderId;
      });
      return next;
    });
  }, [selectedIds]);

  const toggleSelected = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const selectedIdList = useMemo(() => Array.from(selectedIds), [selectedIds]);

  const { selectedLinks, previewSrcs } = useMemo(() => {
    const links: string[] = [];
    const previews: string[] = [];

    for (const id of selectedIdList) {
      const src = allById.get(id)?.src;
      if (!src) continue;
      links.push(src);
      if (previews.length < 3) previews.push(src);
    }

    return { selectedLinks: links, previewSrcs: previews };
  }, [selectedIdList, allById]);

  const isFavoritesView = selectedFolder === "favorites";
  const isPurchasesView = selectedFolder === "purchases";
  const isTrashView = selectedFolder === "trash";
  const crumbNodes = useMemo(() => {
    return folderPathIndex.get(selectedFolder) ?? [];
  }, [selectedFolder, folderPathIndex]);
  const fullBreadcrumbLabel = useMemo(() => {
    if (isFavoritesView) return "All files / Favorites";
    if (isPurchasesView) return "All files / Purchases";
    if (isTrashView) return "All files / Trash";
    if (!crumbNodes.length) return "All files";
    return ["All files", ...crumbNodes.map((n) => n.name ?? "")].filter(Boolean).join(" / ");
  }, [crumbNodes, isFavoritesView, isPurchasesView, isTrashView]);
  const breadcrumbNodes = useMemo<FolderNode[]>(() => {
    // For real folders: show first + … + last two when deep.
    if (isFavoritesView || isPurchasesView || isTrashView) return [];
    if (crumbNodes.length <= 3) return crumbNodes;

    const first = crumbNodes[0];
    const lastTwo = crumbNodes.slice(-2);
    const ellipsis = { id: "__ellipsis__", name: "…" } as FolderNode;
    return [first, ellipsis, ...lastTwo];
  }, [crumbNodes, isFavoritesView, isPurchasesView, isTrashView]);
  const hiddenBreadcrumbNodes = useMemo<FolderNode[]>(() => {
    if (isFavoritesView || isPurchasesView || isTrashView) return [];
    if (crumbNodes.length <= 3) return [];
    // Hidden = everything between first and last two
    return crumbNodes.slice(1, -2);
  }, [crumbNodes, isFavoritesView, isPurchasesView, isTrashView]);
  const isFolderView =
    selectedFolder !== "all" &&
    selectedFolder !== "favorites" &&
    selectedFolder !== "purchases" &&
    selectedFolder !== "trash";
  const isRealFolder = useMemo(() => {
    return folderIndex.has(selectedFolder);
  }, [selectedFolder, folderIndex]);
  const isRealFolderView = isFolderView && isRealFolder;
  const canUploadHere = isRealFolderView;
  const folderName = isPurchasesView
    ? "Purchases"
    : isRealFolderView
      ? crumbNodes[crumbNodes.length - 1]?.name ?? "Folder"
      : "";

  // Tell Topbar which folder we're in (for the search context chip)
  useEffect(() => {
    if (!mounted) return;

    const id = (selectedFolder ?? "").trim();
    if (!id || id === "all") {
      try {
        window.dispatchEvent(
          new CustomEvent<DriveFolderContextDetail>("CBX_DRIVE_FOLDER_CONTEXT", {
            detail: { id: "", name: "" },
          })
        );
      } catch {
        // ignore
      }
      return;
    }

    const name = (isPurchasesView ? "Purchases" : (isRealFolderView ? folderName : "")) || folderIndex.get(id)?.name || id;

    try {
      window.dispatchEvent(
        new CustomEvent<DriveFolderContextDetail>("CBX_DRIVE_FOLDER_CONTEXT", {
          detail: { id, name: String(name || id) },
        })
      );
    } catch {
      // ignore
    }
  }, [mounted, selectedFolder, isRealFolderView, isPurchasesView, folderName, folderIndex]);


  const {
    coverAssetId,
    folderCounts,
    folderAssets,
    subfolders,
    subfolderItems,
    trashCount,
    showTrashEmptyState,
  } = useDriveFolderData({
    allImages,
    selectedFolder,
    assetFolderOverrides,
    favoriteAssetIds,
    folderCovers,
    allById,
    folderIndex,
    isRealFolderView,
    isTrashView,
    query,
  });

  const purchasesCount = folderCounts["purchases"] ?? 0;
  const showPurchasesEmptyState = isPurchasesView && query.trim() === "" && purchasesCount === 0;

  if (!isReady) return null;
  if (!isLoggedIn) return null;
  return (
    <div className="min-h-screen">
      <div className="flex min-h-screen">
        {/* Desktop folders */}
        <div className="hidden md:block sticky top-14 h-[calc(100vh-56px)] overflow-y-auto">
          <FolderSidebar
            folders={folderTree}
            onFoldersChangeAction={setFolderTree}
            selectedId={selectedFolder}
            onSelectAction={navigateToFolder}
            onDropAssetAction={moveAssetToFolder}
          />
        </div>

        {/* Mobile folders */}
        <Sheet open={foldersOpen} onOpenChange={setFoldersOpen}>
          <SheetContent side="left" className="w-80 p-0 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-2 motion-safe:duration-200">
            <SheetHeader className="px-4 py-3">
              <SheetTitle>Folders</SheetTitle>
            </SheetHeader>
            <div className="h-[calc(100vh-56px)]">
              <FolderSidebar
                folders={folderTree}
                onFoldersChangeAction={setFolderTree}
                selectedId={selectedFolder}
                onSelectAction={(id) => {
                  navigateToFolder(id);
                  setFoldersOpen(false);
                }}
                onDropAssetAction={moveAssetToFolder}
                className="w-full border-r-0"
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Filters panel */}
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetContent side="left" className="w-96 p-0 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-2 motion-safe:duration-200">
            <SheetHeader className="px-4 py-3">
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="px-4 py-4">
              <AssetFiltersBar
                value={filters}
                onChange={setFilters}
                onClear={clearAllFilters}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Move-to panel (bulk action) */}
        <Sheet open={moveOpen} onOpenChange={setMoveOpen}>
          <SheetContent side="right" className="w-96 p-0 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-2 motion-safe:duration-200">
            <SheetHeader className="px-4 py-3">
              <SheetTitle>Move to</SheetTitle>
            </SheetHeader>
            <div className="h-[calc(100vh-56px)]">
              <FolderSidebar
                folders={folderTree}
                onFoldersChangeAction={setFolderTree}
                selectedId={selectedFolder}
                onSelectAction={(folderId) => {
                  // Only allow real folders (no smart folders)
                  if (!folderIndex.has(folderId)) return;

                  setAssetFolderOverrides((prev) => {
                    const next = { ...prev };
                    selectedIdList.forEach((id) => {
                      next[id] = folderId;
                    });
                    return next;
                  });

                  clearSelection();
                  setMoveOpen(false);
                }}
                onDropAssetAction={moveAssetToFolder}
                className="w-full border-r-0"
              />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex-1 flex flex-col">
          <header
            className={
              "sticky top-14 z-20 px-4 lg:px-6 py-2 transition-shadow transition-colors " +
              (isScrolled
                ? "border-b bg-background/90 shadow-sm supports-[backdrop-filter]:bg-background/80"
                : "bg-background/70 supports-[backdrop-filter]:bg-background/60")
            }
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden transition-transform duration-150 active:scale-[0.98]"
                  aria-label="Open folders"
                  onClick={() => setFoldersOpen(true)}
                >
                  <Menu className="h-4 w-4" />
                </Button>

                <div className="min-w-0 flex-1">
                  {query.trim().length > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border bg-background px-2">
                        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1 truncate text-sm">
                          {query.trim()}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        aria-label="Clear search"
                        onClick={clearSearchUrlAndFolder}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>

              </div>

              {/* Row 2: Controls */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                {/* Left: Primary actions (Filters + Sort) */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="default"
                    className="h-10 transition-transform duration-150 active:scale-[0.98]"
                    onClick={openFilters}
                  >
                    Filters
                    {activeFilterCount > 0 ? (
                      <Badge className="ml-2" variant="secondary">
                        {activeFilterCount}
                      </Badge>
                    ) : null}
                  </Button>

                  <Select
                    value={assetSort}
                    onValueChange={(v) => {
                      if (isAssetSort(v)) setAssetSort(v);
                    }}
                  >
                    <SelectTrigger className="h-10 w-[180px]">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name_asc">Name (A–Z)</SelectItem>
                      <SelectItem value="name_desc">Name (Z–A)</SelectItem>
                      <SelectItem value="id_asc">ID (Low → High)</SelectItem>
                      <SelectItem value="id_desc">ID (High → Low)</SelectItem>
                      <SelectItem value="color_asc">Color (Hue)</SelectItem>
                      <SelectItem value="color_desc">Color (Hue rev)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Right: View + Size */}
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {assetView === "grid" ? (
                    <div className="hidden sm:flex items-center gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Size</span>
                      <div className="w-32">
                        <Slider
                          value={[thumbSize]}
                          min={140}
                          max={520}
                          step={10}
                          onValueChange={(v) => setThumbSize(v[0] ?? 220)}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="flex h-10 shrink-0 items-stretch overflow-hidden rounded-md border border-border">
                    <Button
                      type="button"
                      variant={assetView === "grid" ? "secondary" : "ghost"}
                      size="icon"
                      className="h-10 w-10 rounded-none"
                      aria-label="Grid view"
                      onClick={() => setAssetView("grid")}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={assetView === "list" ? "secondary" : "ghost"}
                      size="icon"
                      className="h-10 w-10 rounded-none"
                      aria-label="List view"
                      onClick={() => setAssetView("list")}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {showSearchStateBar ? (
            <div className="border-b bg-background/60 supports-[backdrop-filter]:bg-background/50">
              <div className="px-4 lg:px-6 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  {hasActiveQuery ? (
                    <div className="flex min-w-0 items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs">
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="max-w-[240px] truncate">{query.trim()}</span>
                      <button
                        type="button"
                        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-muted"
                        aria-label="Clear search"
                        onClick={clearOnlyQuery}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}

                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={openFilters}
                      className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs hover:bg-muted"
                      aria-label="Open filters"
                    >
                      <span>Filters</span>
                      <Badge variant="secondary" className="h-5 px-2">
                        {activeFilterCount}
                      </Badge>
                    </button>
                  ) : null}

                  <div className="flex-1" />

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={clearAllSearchAndFilters}
                  >
                    Clear all
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <div
            key={selectedFolder}
            className={
              "flex-1 px-4 lg:px-6 py-4 " +
              (selectedIds.size > 0 ? "selection-active" : "")
            }
          >
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold">
                  {isFavoritesView
                    ? "Favorites"
                    : isPurchasesView
                      ? "Purchases"
                      : isTrashView
                        ? "Trash"
                        : isFolderView
                          ? folderName
                          : "All files"}
                </h1>
                {selectedFolder !== "all" ? (
                  <div className="mt-1 relative max-w-full sm:max-w-[80%] pr-10" title={fullBreadcrumbLabel} aria-label={fullBreadcrumbLabel}>
                    <div className="overflow-hidden">
                      <Breadcrumb>
                        <BreadcrumbList className="flex-nowrap whitespace-nowrap overflow-hidden text-xs text-muted-foreground">
                          <BreadcrumbItem>
                            {selectedFolder === "all" ? (
                              <BreadcrumbPage>All files</BreadcrumbPage>
                            ) : (
                              <BreadcrumbLink asChild>
                                <button
                                  type="button"
                                  onClick={() => navigateToFolder("all")}
                                  className="text-left"
                                >
                                  All files
                                </button>
                              </BreadcrumbLink>
                            )}
                          </BreadcrumbItem>

                          {isFavoritesView && (
                            <span className="flex items-center">
                              <BreadcrumbSeparator />
                              <BreadcrumbItem>
                                <BreadcrumbPage>Favorites</BreadcrumbPage>
                              </BreadcrumbItem>
                            </span>
                          )}
                          {isPurchasesView && (
                            <span className="flex items-center">
                              <BreadcrumbSeparator />
                              <BreadcrumbItem>
                                <BreadcrumbPage>Purchases</BreadcrumbPage>
                              </BreadcrumbItem>
                            </span>
                          )}
                          {isTrashView && (
                            <span className="flex items-center">
                              <BreadcrumbSeparator />
                              <BreadcrumbItem>
                                <BreadcrumbPage>Trash</BreadcrumbPage>
                              </BreadcrumbItem>
                            </span>
                          )}

                          {!isFavoritesView &&
                            !isPurchasesView &&
                            !isTrashView &&
                            breadcrumbNodes.map((n, idx) => {
                              const isEllipsis = n.id === "__ellipsis__";
                              const isLast = idx === breadcrumbNodes.length - 1;
                              return (
                                <span key={`${n.id}-${idx}`} className="flex items-center">
                                  <BreadcrumbSeparator />
                                  <BreadcrumbItem>
                                    {isEllipsis ? (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <button
                                            type="button"
                                            className="rounded px-1 text-xs text-muted-foreground hover:text-foreground"
                                            aria-label="Show full path"
                                          >
                                            …
                                          </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="min-w-[220px]">
                                          {hiddenBreadcrumbNodes.length ? (
                                            hiddenBreadcrumbNodes.map((hn) => (
                                              <DropdownMenuItem
                                                key={hn.id}
                                                onSelect={() => navigateToFolder(hn.id)}
                                              >
                                                {(() => {
                                                  const path = folderPathIndex.get(hn.id) ?? [];
                                                  const label = ["All files", ...path.map((p) => p.name ?? "")]
                                                    .filter(Boolean)
                                                    .join(" / ");
                                                  return label || hn.name;
                                                })()}
                                              </DropdownMenuItem>
                                            ))
                                          ) : (
                                            <DropdownMenuItem disabled>No more folders</DropdownMenuItem>
                                          )}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    ) : isLast ? (
                                      <BreadcrumbPage>{n.name}</BreadcrumbPage>
                                    ) : (
                                      <BreadcrumbLink asChild>
                                        <button
                                          type="button"
                                          onClick={() => navigateToFolder(n.id)}
                                          className="text-left"
                                        >
                                          {n.name}
                                        </button>
                                      </BreadcrumbLink>
                                    )}
                                  </BreadcrumbItem>
                                </span>
                              );
                            })}
                        </BreadcrumbList>
                      </Breadcrumb>
                    </div>

                    {/* Right-side fade (indicates overflow) */}
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent" />
                  </div>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                    {(isRealFolderView ? folderAssets.length : (folderCounts[selectedFolder] ?? 0))} assets
                  </span>

                  {subfolderItems.length > 0 && isRealFolderView ? (
                    <span className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                      {subfolderItems.length} subfolders
                    </span>
                  ) : null}
                </div>
              </div>

              {canUploadHere ? (
                <div className="flex items-center justify-end gap-2">
                  <input
                    ref={uploadInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleUploadFiles(e.target.files);
                      // allow selecting same file again
                      e.currentTarget.value = "";
                    }}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 whitespace-nowrap"
                    onClick={shareFolder}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>

                  <Button
                    type="button"
                    className="h-10 whitespace-nowrap"
                    onClick={() => uploadInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                </div>
              ) : null}
            </div>
            {isRealFolderView && (
              <FolderHeader
                folderId={selectedFolder}
                folderName={folderName}
                assets={folderAssets}
                coverAssetId={coverAssetId}
                onSetCoverAction={(assetId: number) => setFolderCover(selectedFolder, assetId)}
              />
            )}

            {isRealFolderView && subfolderItems.length > 0 ? (
              <SubfolderStrip
                items={subfolderItems}
                onOpenFolder={navigateToFolder}
                onDropAssets={(ids, folderId) => {
                  // If one of the dragged ids is already selected, move the whole selection.
                  const toMove = new Set<number>();
                  ids.forEach((id) => {
                    if (selectedIds.has(id)) {
                      selectedIds.forEach((sid) => toMove.add(sid));
                    } else {
                      toMove.add(id);
                    }
                  });
                  setAssetFolderOverrides((prev) => {
                    const next = { ...prev };
                    toMove.forEach((id) => {
                      next[id] = folderId;
                    });
                    return next;
                  });
                }}
              />
            ) : null}

            {showTrashEmptyState ? (
              <div className="mt-10 flex w-full justify-center">
                <div className="w-full max-w-xl rounded-xl border border-border bg-card p-8">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted">
                      <Trash2 className="h-6 w-6 text-muted-foreground" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold">Trash is empty</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Deleted items will appear here. You can restore them or delete them permanently.
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <Button type="button" onClick={() => navigateToFolder("all")}>
                          Go to All files
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setQuery("deleted");
                            setSelectedFolder("all");
                            scheduleQueryUrlUpdate("deleted");
                          }}
                        >
                          Search for “deleted”
                        </Button>
                      </div>

                      <div className="mt-6 rounded-lg border border-border bg-background/40 p-4">
                        <div className="text-sm font-medium">Tip</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          Use the bulk action bar to move selected items to Trash.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : showPurchasesEmptyState ? (
              <div className="mt-10 flex w-full justify-center">
                <div className="w-full max-w-xl rounded-xl border border-border bg-card p-8">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted">
                      <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold">No purchases yet</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Images you buy from Stock will automatically appear here.
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <Button type="button" onClick={() => router.push("/stock")}
                        >
                          Browse Stock
                        </Button>
                        <Button type="button" variant="outline" onClick={() => navigateToFolder("all")}
                        >
                          Go to All files
                        </Button>
                      </div>

                      <div className="mt-6 rounded-lg border border-border bg-background/40 p-4">
                        <div className="text-sm font-medium">Tip</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          After checkout, your purchased images will show up in Purchases automatically.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <ImageGrid
                view={assetView}
                sort={assetSort}
                query={query}
                folder={selectedFolder}
                folderOverrides={assetFolderOverrides}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelected}
                onSetSelectedIds={setSelectedIds}
                favoriteIds={favoriteAssetIds}
                onToggleFavorite={toggleAssetFavorite}
                colors={filters.colors}
                filters={filters}
                onRequestSetQuery={(next) => {
                  const trimmed = (next ?? "").trim();
                  setQuery(trimmed);
                  // Keep current folder (scoped search)
                  scheduleQueryUrlUpdate(trimmed);
                }}
                onRequestClearFilters={clearAllFilters}
                thumbSize={effectiveThumbSize}
              />
            )}

            <SelectionBar
              count={selectedIds.size}
              previewSrcs={previewSrcs}
              onClear={clearSelection}
              onAction={async (action) => {
                if (action === "delete") {
                  // UX: soft delete -> move to Trash
                  if (isTrashView) {
                    // demo-safe for now: already in Trash
                    clearSelection();
                    return;
                  }

                  setAssetFolderOverrides((prev) => {
                    const next = { ...prev };
                    selectedIdList.forEach((id) => {
                      next[id] = "trash";
                    });
                    return next;
                  });

                  clearSelection();
                  return;
                }

                if (action === "move") {
                  setMoveOpen(true);
                  return;
                }

                if (action === "favorite") {
                  setFavoriteAssetIds((prev) => {
                    const next = new Set(prev);
                    selectedIdList.forEach((id) => {
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                    });
                    return next;
                  });
                  return;
                }

                if (action === "share") {
                  // Copy all selected links (one per line)
                  const payload = selectedLinks.join("\n");
                  if (!payload) return;

                  try {
                    await navigator.clipboard.writeText(payload);
                    console.log(`[Share] Copied ${selectedLinks.length} link(s)`);
                  } catch {
                    window.prompt("Copy these links:", payload);
                  }
                  return;
                }

                if (action === "download") {
                  // Demo: open up to 5 assets in new tabs
                  selectedLinks.slice(0, 5).forEach((url) => {
                    window.open(url, "_blank", "noopener,noreferrer");
                  });
                  return;
                }

                if (action === "open") {
                  // For now: only meaningful when exactly 1 item is selected.
                  if (selectedIdList.length !== 1) return;
                  const id = selectedIdList[0];
                  // Best-effort: scroll the card into view.
                  const el = document.querySelector(`[data-asset-id="${id}"]`);
                  (el as HTMLElement | null)?.scrollIntoView({ behavior: "smooth", block: "center" });
                  return;
                }
              }}
            />
            {selectedIds.size === 0 ? (
              <div className="mt-6 mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded border bg-muted px-2 py-1">Esc</span>
                <span>closes panels / clears selection</span>
                <span className="mx-2 hidden sm:inline">•</span>
                <span className="rounded border bg-muted px-2 py-1">Shift</span>
                <span>multi-select</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
