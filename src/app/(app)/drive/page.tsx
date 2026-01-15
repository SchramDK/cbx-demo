"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProtoAuth } from "@/lib/proto-auth";
import { Menu, LayoutGrid, List, Upload, Share2, Trash2, Search, X } from "lucide-react";
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

type FolderNode = {
  id: string;
  name: string;
  children?: FolderNode[];
};

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
  useEffect(() => {
    setMounted(true);
  }, []);

  const router = useRouter();
  const { isReady, isLoggedIn } = useProtoAuth();
  const searchParams = useSearchParams();

  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  const searchParamsRef = useRef(searchParams);
  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);
  // Prevent URL -> state sync from overwriting local typing.
  // Whenever this page itself updates the URL `q`, we store the value here.
  // Then the URL-sync effect will ignore that next `urlQ` update.
  const suppressNextUrlQuerySyncRef = useRef<string | null>(null);
  const getCurrentSearchParams = useCallback(() => {
    return new URLSearchParams(Array.from(searchParamsRef.current.entries()));
  }, []);
  const queryUrlUpdateTimeoutRef = useRef<number | null>(null);
  const clearPendingQueryUrlUpdate = useCallback(() => {
    if (queryUrlUpdateTimeoutRef.current !== null) {
      window.clearTimeout(queryUrlUpdateTimeoutRef.current);
      queryUrlUpdateTimeoutRef.current = null;
    }
  }, []);
  const scheduleQueryUrlUpdate = useCallback(
    (nextValue: string) => {
      const trimmed = nextValue.trim();
      clearPendingQueryUrlUpdate();

      queryUrlUpdateTimeoutRef.current = window.setTimeout(() => {
        try {
          const params = getCurrentSearchParams();
          // Mark as local URL write so URL-sync effect won't fight the user's typing.
          suppressNextUrlQuerySyncRef.current = trimmed;

          if (trimmed) {
            params.set("q", trimmed);
            // Search is global: clear explicit folder context
            params.delete("folder");
          } else {
            params.delete("q");
          }
          params.delete("query");
          params.delete("search");
          routerRef.current.replace(
            `/drive${params.toString() ? `?${params.toString()}` : ""}`
          );
        } catch {
          // ignore
        }
      }, 200);
    },
    [clearPendingQueryUrlUpdate, getCurrentSearchParams]
  );
  useEffect(() => clearPendingQueryUrlUpdate, [clearPendingQueryUrlUpdate]);

  useEffect(() => {
    if (!isReady) return;
    if (!isLoggedIn) {
      router.replace("/drive/landing");
    }
  }, [isReady, isLoggedIn, router]);
  const urlQ = (
    searchParams.get("q") ??
    searchParams.get("query") ??
    searchParams.get("search") ??
    ""
  ).trim();
  const urlFolder = (searchParams.get("folder") ?? "").trim();

  const [query, setQuery] = useState(urlQ);

  // Sync query when URL changes (e.g. from Topbar search)
  useEffect(() => {
    if (!mounted) return;
    const next = urlQ.trim();

    // If this page just wrote the same value to the URL, don't re-apply it back into state.
    if (suppressNextUrlQuerySyncRef.current !== null) {
      const suppressed = suppressNextUrlQuerySyncRef.current;
      if (suppressed.trim() === next) {
        suppressNextUrlQuerySyncRef.current = null;
        return;
      }
      // If URL differs, clear suppression and allow sync (external change)
      suppressNextUrlQuerySyncRef.current = null;
    }

    setQuery((prev) => {
      if (prev.trim() === next) return prev;

      // If search comes from the URL (Topbar), search should apply across Drive
      if (next.length > 0) {
        setSelectedFolder("all");

        // Normalize URL: search implies no folder
        try {
          const params = new URLSearchParams(
            Array.from(searchParamsRef.current.entries())
          );
          if (params.get("folder")) {
            params.delete("folder");
            routerRef.current.replace(
              `/drive${params.toString() ? `?${params.toString()}` : ""}`
            );
          }
        } catch {
          // ignore
        }
      }

      return next;
    });
  }, [mounted, urlQ]);

  const [selectedFolder, setSelectedFolder] = useState<string>(() =>
    urlFolder ? urlFolder : "all"
  );

  const navigateToFolder = useCallback(
    (folderId: string) => {
      setSelectedFolder(folderId);
      // Folder navigation should exit search context
      setQuery("");
      suppressNextUrlQuerySyncRef.current = "";
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

        routerRef.current.replace(`/drive${params.toString() ? `?${params.toString()}` : ""}`);
      } catch {
        // ignore
      }
    },
    [clearPendingQueryUrlUpdate, getCurrentSearchParams]
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
      setSelectedFolder("all");
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

  const openFilters = useCallback(() => setFiltersOpen(true), []);

  const clearAllFilters = useCallback(() => {
    setFilters(clearFilters());
    setFiltersOpen(false);
  }, []);

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
        const id = Number(a?.id) || 100000 + idx;
        const src = typeof a?.src === "string" ? a.src : "";
        if (!src) return null;
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

  const allImages = useMemo(() => {
    if (!importedImages.length) return baseDemoImages;

    const bySrc = new Set(baseDemoImages.map((x) => x.src));
    const merged = [...baseDemoImages];
    for (const img of importedImages) {
      if (bySrc.has(img.src)) continue;
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
    if (!folderIndex.has(f)) return;
  
    setSelectedFolder(f);
    setQuery("");
  }, [mounted, urlFolder, folderIndex]);

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

  const crumbNodes = useMemo(() => {
    return folderPathIndex.get(selectedFolder) ?? [];
  }, [selectedFolder, folderPathIndex]);
  const isFavoritesView = selectedFolder === "favorites";
  const isTrashView = selectedFolder === "trash";
  const isFolderView =
    selectedFolder !== "all" && selectedFolder !== "favorites" && selectedFolder !== "trash";
  const isRealFolder = useMemo(() => {
    return folderIndex.has(selectedFolder);
  }, [selectedFolder, folderIndex]);
  const isRealFolderView = isFolderView && isRealFolder;
  const canUploadHere = isRealFolderView;
  const folderName = isRealFolderView
    ? crumbNodes[crumbNodes.length - 1]?.name ?? "Folder"
    : "";

  const coverAssetId = isRealFolderView ? folderCovers[selectedFolder] : undefined;

  const { folderCounts, assetsByFolder } = useMemo(() => {
    const counts: Record<string, number> = {};
    const map: Record<string, { id: number; title: string; src: string }[]> = {};

    // Ensure smart folders exist even when empty
    counts["favorites"] = 0;
    counts["trash"] = 0;
    counts["all"] = 0;
    map["favorites"] = [];
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

      // Favorites is a smart folder (also exclude trash)
      if (fid !== "trash" && favoriteAssetIds.has(img.id)) {
        counts["favorites"] += 1;
        map["favorites"].push({ id: img.id, title: img.title, src: img.src });
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
  }, [assetFolderOverrides, allImages, favoriteAssetIds, isRealFolderView, coverAssetId, selectedFolder]);

  const folderAssets = useMemo(() => {
    // Smart folders
    if (selectedFolder === "favorites") return assetsByFolder["favorites"] ?? [];
    if (selectedFolder === "trash") return assetsByFolder["trash"] ?? [];
    if (selectedFolder === "all") return assetsByFolder["all"] ?? [];

    // Real folders only
    if (!isRealFolderView) return [];
    return assetsByFolder[selectedFolder] ?? [];
  }, [isRealFolderView, selectedFolder, assetsByFolder]);

  const subfolders = useMemo<FolderNode[]>(() => {
    if (!isRealFolderView) return [];
    return folderIndex.get(selectedFolder)?.children ?? [];
  }, [isRealFolderView, selectedFolder, folderIndex]);

  const subfolderItems = useMemo(() => {
    return subfolders.map((sf) => {
      const coverId = folderCovers[sf.id];
      const coverSrc =
        typeof coverId === "number"
          ? allById.get(coverId)?.src
          : undefined;
      return {
        id: sf.id,
        name: sf.name ?? "Folder",
        coverSrc,
        count: folderCounts[sf.id] ?? 0,
      };
    });
  }, [subfolders, folderCovers, folderCounts, allById]);

  // (folderAssetsOrdered removed: now handled in assetsByFolder)

  const trashCount = useMemo(() => {
    return folderCounts["trash"] ?? 0;
  }, [folderCounts]);

  const showTrashEmptyState = isTrashView && query.trim() === "" && trashCount === 0;

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
          <header className="sticky top-14 z-20 border-b bg-background/70 px-4 lg:px-6 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
                        onClick={() => {
                          setQuery("");
                          setSelectedFolder("all");
                          clearPendingQueryUrlUpdate();
                          try {
                            const params = getCurrentSearchParams();
                            suppressNextUrlQuerySyncRef.current = "";
                            params.delete("q");
                            params.delete("query");
                            params.delete("search");
                            params.delete("folder");
                            routerRef.current.replace(
                              `/drive${params.toString() ? `?${params.toString()}` : ""}`
                            );
                          } catch {
                            // ignore
                          }
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>

              </div>

              {/* Row 2: Controls */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                {/* Left: Filters */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
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
                </div>

                {/* Right: Sort + View */}
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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

                  <div className="flex items-center gap-2">
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
            </div>
          </header>

          <div key={selectedFolder} className="flex-1 px-4 lg:px-6 py-4">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold">
                  {isFavoritesView
                    ? "Favorites"
                    : isTrashView
                      ? "Trash"
                      : isFolderView
                        ? folderName
                        : "All files"}
                </h1>
                {selectedFolder !== "all" ? (
                  <div className="mt-1">
                    <Breadcrumb>
                      <BreadcrumbList className="flex-nowrap overflow-x-auto text-xs text-muted-foreground">
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
                      {isTrashView && (
                        <span className="flex items-center">
                          <BreadcrumbSeparator />
                          <BreadcrumbItem>
                            <BreadcrumbPage>Trash</BreadcrumbPage>
                          </BreadcrumbItem>
                        </span>
                      )}

                      {!isFavoritesView &&
                        !isTrashView &&
                        crumbNodes.map((n, idx) => {
                          const isLast = idx === crumbNodes.length - 1;
                          return (
                            <span key={n.id} className="flex items-center">
                              <BreadcrumbSeparator />
                              <BreadcrumbItem>
                                {isLast ? (
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
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {isRealFolderView ? (
                    <span className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                      {folderAssets.length} assets
                    </span>
                  ) : null}
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
                  setSelectedFolder("all");
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
