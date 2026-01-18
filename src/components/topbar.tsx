 "use client";


import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/SearchBar";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CartButton } from "@/components/cart-button";
import { useCart, useCartUI } from '@/lib/cart/cart';
import ThemeToggle from "@/components/theme/ThemeToggle";
import { getTopbarSuggestions } from "@/lib/search/topbarSuggestions";
import { cn } from "@/lib/utils";
import { Bell, User as UserIcon, Settings as SettingsIcon, LogOut, CreditCard } from "lucide-react";

function useDemoMe(mounted: boolean) {
  const [me, setMe] = React.useState<null | {
    name: string;
    email?: string;
    org?: string;
    role?: string;
    imageUrl?: string;
  }>(null);

  const meFetchInFlightRef = React.useRef<Promise<void> | null>(null);
  const lastMeFetchAtRef = React.useRef<number>(0);
  const meAbortRef = React.useRef<AbortController | null>(null);

  const refreshMe = React.useCallback(
    async (reason?: "init" | "auth-changed" | "focus") => {
      if (!mounted) return;

      const now = Date.now();
      // Small throttle to avoid bursts
      if (now - lastMeFetchAtRef.current < 250 && reason !== "init") return;
      lastMeFetchAtRef.current = now;

      if (meFetchInFlightRef.current) {
        await meFetchInFlightRef.current;
        return;
      }

      // Abort any previous in-flight request
      try {
        meAbortRef.current?.abort();
      } catch {}

      const ac = new AbortController();
      meAbortRef.current = ac;

      const p = (async () => {
        try {
          const res = await fetch("/api/demo-auth/me", {
            cache: "no-store",
            signal: ac.signal,
          });
          const json = await res.json().catch(() => null);
          setMe(json?.user ?? null);
        } catch (err) {
          // Ignore abort errors; clear user on real errors
          if ((err as any)?.name === "AbortError") return;
          setMe(null);
        }
      })();

      meFetchInFlightRef.current = p.then(() => undefined);
      try {
        await meFetchInFlightRef.current;
      } finally {
        meFetchInFlightRef.current = null;
      }
    },
    [mounted]
  );

  React.useEffect(() => {
    if (!mounted) return;

    const onAuthChanged = () => {
      void refreshMe("auth-changed");
    };

    const onFocus = () => {
      void refreshMe("focus");
    };

    void refreshMe("init");

    window.addEventListener("cbx:auth-changed", onAuthChanged as EventListener);
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("cbx:auth-changed", onAuthChanged as EventListener);
      window.removeEventListener("focus", onFocus);
      try {
        meAbortRef.current?.abort();
      } catch {}
      meAbortRef.current = null;
    };
  }, [mounted, refreshMe]);

  return { me, setMe, refreshMe };
}

type TopbarProps = {
  /** Controls whether the topbar should render the logged-in account UI */
  isLoggedIn?: boolean;
  /** Optional content shown on the right when logged OUT (e.g. Login/Sign up buttons) */
  loggedOutRightSlot?: React.ReactNode;
  onLogin?: () => void;
  title?: string;
  /** Show a product switcher (Drive / Stock) on the left side */
  showProductSwitcher?: boolean;
  /** Current active product for the switcher */
  activeProduct?: 'drive' | 'stock';
  user?: {
    name: string;
    email?: string;
    imageUrl?: string;
    org?: string;
    role?: string;
  };
  /** Show name/email next to the avatar on >=sm screens */
  showUserText?: boolean;
  /** Optional content shown in the center of the topbar (e.g. SearchBar) */
  centerSlot?: React.ReactNode;
  /** Optional content shown on the left (e.g. back button, nav) */
  leftSlot?: React.ReactNode;
  /** Optional content shown on the right before the account menu (e.g. cart button) */
  rightSlot?: React.ReactNode;
  /** Show cart button in the topbar (defaults to true) */
  showCart?: boolean;
  /** Optional cart count badge */
  cartCount?: number;
  /** Optional cart href (defaults to /stock/cart) */
  cartHref?: string;
  /** Hide the account dropdown menu */
  showAccountMenu?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onProfile?: () => void;
  onSettings?: () => void;
  onLogout?: () => void | Promise<void>;
  /** Show CBX logo on the left */
  showLogo?: boolean;
  /** Enable the built-in search in the center (uses internal state and routes on submit) */
  enableSearch?: boolean;
  /** Optional initial search query */
  initialSearchQuery?: string;
  /** Show theme toggle (System / Light / Dark) */
  showThemeToggle?: boolean;
};

function initials(name: string) {
  const parts = (name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  const value = parts.map((p) => p[0]!.toUpperCase()).join("");
  return value || "?";
}


function emitAuthChanged() {
  try {
    const ev = new CustomEvent('cbx:auth-changed');
    window.dispatchEvent(ev);

    window.setTimeout(() => {
      try {
        const ev2 = new CustomEvent('cbx:auth-changed');
        window.dispatchEvent(ev2);
      } catch {
        // ignore
      }
    }, 250);
  } catch {
    // ignore
  }
}


export function Topbar({
  title = "CBX Demo",
  showLogo = true,
  showProductSwitcher = false,
  activeProduct,
  user,
  showUserText = false,
  centerSlot,
  leftSlot,
  rightSlot,
  showCart,
  cartCount,
  cartHref = '/stock/cart',
  isLoggedIn,
  loggedOutRightSlot,
  onLogin,
  showAccountMenu = true,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  onProfile,
  onSettings,
  onLogout,
  enableSearch = true,
  initialSearchQuery = "",
  showThemeToggle = true,
}: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = React.useMemo(() => searchParams.toString(), [searchParams]);
  const searchParamsEntries = React.useMemo(
    () => Array.from(searchParams.entries()),
    [searchParamsString]
  );
  const sp = React.useMemo(() => new URLSearchParams(searchParamsString), [searchParamsString]);

  const urlQ = (
    sp.get("q") ??
    sp.get("query") ??
    sp.get("search") ??
    ""
  ).trim();

  const [driveFolderContextName, setDriveFolderContextName] = React.useState<string>("");
  const [driveFolderContextId, setDriveFolderContextId] = React.useState<string>("");
  const [driveFolderContextPathLabel, setDriveFolderContextPathLabel] = React.useState<string>("");
  const urlFolderId = (sp.get("folder") ?? "").trim();
  const urlHasFolderParam = sp.has("folder");
  const driveFolderId = (driveFolderContextId || ((pathname ?? "").startsWith("/drive") ? urlFolderId : "")).trim();
  const folderContextLabel = driveFolderId && driveFolderId !== "all" ? driveFolderId : "";

  const folderContextLabelPretty = React.useMemo(() => {
    const raw = (folderContextLabel ?? "").trim();
    if (!raw) return "";

    // Prettify ids like "marketing_campaigns" -> "Marketing Campaigns"
    const words = raw
      .replace(/[\-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean);

    const pretty = words
      .map((w) => (w.length ? w[0]!.toUpperCase() + w.slice(1) : w))
      .join(" ");

    return pretty || raw;
  }, [folderContextLabel]);
  const { open: openCart } = useCartUI();
  const { count: liveCartCount } = useCart();

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const { me, setMe, refreshMe } = useDemoMe(mounted);

  const resolvedUser = (user ?? me) as {
    name: string;
    email?: string;
    imageUrl?: string;
    org?: string;
    role?: string;
  } | null;

  // Never let a stale boolean prop keep the UI "logged in" when user data is gone.
  const loggedIn =
    Boolean(resolvedUser) && (typeof isLoggedIn === "boolean" ? isLoggedIn : true);

  React.useEffect(() => {
    if (!mounted) return;
    // Hydrate last selected folder so the context chip works across the app (not only on /drive)
    if ((driveFolderContextId ?? "").trim()) return;

    try {
      const stored = (window.localStorage.getItem("CBX_SELECTED_FOLDER_V1") ?? "").trim();
      const normalized = stored === "all" ? "" : stored;

      if (normalized) {
        setDriveFolderContextId(normalized);
      } else {
        // All files (or no stored folder) => clear any lingering labels so the chip disappears
        setDriveFolderContextName("");
        setDriveFolderContextPathLabel("");
      }
    } catch {
      // ignore
    }
  }, [mounted, driveFolderContextId]);

  const driveContextLabel = React.useMemo(() => {
    const label = (
      driveFolderContextPathLabel ||
      driveFolderContextName ||
      folderContextLabelPretty ||
      folderContextLabel ||
      driveFolderContextId
    ).trim();
    return label.length ? label : undefined;
  }, [driveFolderContextPathLabel, driveFolderContextName, folderContextLabelPretty, folderContextLabel, driveFolderContextId]);

  const hasDriveFolderContext = React.useMemo(() => {
    const id = (driveFolderId ?? "").trim();
    const hasId = Boolean(id) && id !== "all";
    const hasName = Boolean((driveFolderContextName ?? "").trim());
    const hasPathLabel = Boolean((driveFolderContextPathLabel ?? "").trim());
    const hasLabel = Boolean((driveContextLabel ?? "").trim());
    return hasLabel && (hasId || hasName || hasPathLabel);
  }, [driveFolderId, driveFolderContextName, driveFolderContextPathLabel, driveContextLabel]);

  React.useEffect(() => {
    if (!mounted) return;

    const onCtx = (e: Event) => {
      const ce = e as CustomEvent<{ id?: string; name?: string; pathLabel?: string }>;
      const nextId = (ce.detail?.id ?? "").trim();
      const nextName = (ce.detail?.name ?? "").trim();
      const nextPathLabel = (ce.detail?.pathLabel ?? "").trim();

      setDriveFolderContextId(nextId);
      setDriveFolderContextName(nextName);
      setDriveFolderContextPathLabel(nextPathLabel);

      // If Drive clears context (All files), persist that so the chip doesn't come back from hydration.
      if (!nextId || nextId === "all") {
        try {
          window.localStorage.setItem("CBX_SELECTED_FOLDER_V1", "all");
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener("CBX_DRIVE_FOLDER_CONTEXT", onCtx as EventListener);
    return () => window.removeEventListener("CBX_DRIVE_FOLDER_CONTEXT", onCtx as EventListener);
  }, [mounted]);

  React.useEffect(() => {
    if (!mounted) return;
    if (!loggedIn) return;
    if (!(pathname ?? "").startsWith("/drive")) return;

    // Only sync/clear folder context when the URL explicitly includes a `folder` param.
    // If it's absent, we allow localStorage + events to control the chip and avoid a ping-pong loop.
    if (!urlHasFolderParam) {
      // If the URL has no folder param and the stored folder is "all", make sure we clear any
      // lingering in-memory context so the pill disappears.
      try {
        const stored = (window.localStorage.getItem("CBX_SELECTED_FOLDER_V1") ?? "").trim();
        if (stored === "all") {
          if (driveFolderContextId) setDriveFolderContextId("");
          if (driveFolderContextName) setDriveFolderContextName("");
          if (driveFolderContextPathLabel) setDriveFolderContextPathLabel("");
        }
      } catch {
        // ignore
      }
      return;
    }

    const next = (urlFolderId ?? "").trim();

    // If Drive URL explicitly sets folder, prefer it
    if (next && next !== "all") {
      if (driveFolderContextId !== next) setDriveFolderContextId(next);
      return;
    }

    // If Drive URL clears folder, clear all context state
    if (!next || next === "all") {
      if (driveFolderContextId) setDriveFolderContextId("");
      if (driveFolderContextName) setDriveFolderContextName("");
      if (driveFolderContextPathLabel) setDriveFolderContextPathLabel("");
    }
  }, [mounted, loggedIn, pathname, urlHasFolderParam, urlFolderId, driveFolderContextId, driveFolderContextName, driveFolderContextPathLabel]);


  const derivedActiveProduct: 'drive' | 'stock' =
    activeProduct ?? (pathname?.startsWith('/stock') ? 'stock' : 'drive');
  const [searchScope, setSearchScope] = React.useState<'drive' | 'stock'>(derivedActiveProduct);

  const displayUser = (resolvedUser ?? { name: "Account" }) as {
    name: string;
    email?: string;
    imageUrl?: string;
    org?: string;
    role?: string;
  };

  const userInitials = React.useMemo(() => initials(displayUser?.name ?? ""), [displayUser?.name]);

  const [internalQuery, setInternalQuery] = React.useState(initialSearchQuery ?? "");
  const liveSyncTimerRef = React.useRef<number | null>(null);
  const suppressNextDriveLiveSyncRef = React.useRef<string | null>(null);
  const scopeTouchedRef = React.useRef(false);
  React.useEffect(() => {
    // Keep internal query in sync if the prop changes (only when uncontrolled)
    if (onSearchChange) return;
    setInternalQuery(initialSearchQuery ?? "");
  }, [initialSearchQuery, onSearchChange]);

  React.useEffect(() => {
    // On Drive: keep the Topbar input in sync with URL `q` (e.g. back/forward, folder -> search)
    if (!mounted) return;
    if (!loggedIn) return;
    if (!(pathname ?? "").startsWith("/drive")) return;

    const next = urlQ;

    if (onSearchChange) {
      // Controlled input: inform parent
      if ((searchValue ?? "").trim() !== next) onSearchChange(next);
    } else {
      // Uncontrolled: update internal state
      setInternalQuery((prev) => (prev.trim() === next ? prev : next));
    }
  }, [mounted, loggedIn, pathname, urlQ, onSearchChange, searchValue]);

  React.useEffect(() => {
    if (!mounted) return;

    const onSync = (e: Event) => {
      const ce = e as CustomEvent<string>;
      const next = (typeof ce.detail === "string" ? ce.detail : "").trim();

      if (onSearchChange) {
        if ((searchValue ?? "").trim() !== next) onSearchChange(next);
      } else {
        setInternalQuery((prev) => (prev.trim() === next ? prev : next));
      }

      // If we're in Drive, keep scope aligned
      if ((pathname ?? "").startsWith("/drive")) {
        scopeTouchedRef.current = false;
        setSearchScope("drive");
      }
    };

    window.addEventListener("CBX_SEARCH_SYNC", onSync as EventListener);
    return () => window.removeEventListener("CBX_SEARCH_SYNC", onSync as EventListener);
  }, [mounted, onSearchChange, searchValue, pathname]);

  React.useEffect(() => {
    if (!mounted) return;
    if (!loggedIn) return;
    if (!(pathname ?? "").startsWith("/drive")) return;
    if (searchScope !== "drive") return;

    const q = (onSearchChange ? (searchValue ?? "") : internalQuery).trim();

    // If we just performed an explicit navigation/replace to Drive for this exact query
    // (submit/suggestion), skip one live-sync cycle to avoid double `router.replace`.
    if (suppressNextDriveLiveSyncRef.current !== null) {
      const suppressed = suppressNextDriveLiveSyncRef.current;
      if (suppressed.trim() === q) {
        suppressNextDriveLiveSyncRef.current = null;
        return;
      }
      suppressNextDriveLiveSyncRef.current = null;
    }

    const hasLegacy = Boolean(sp.get("query") || sp.get("search"));

    if (q === urlQ) {
      if (!(q && hasLegacy)) return;
    }

    if (liveSyncTimerRef.current) {
      window.clearTimeout(liveSyncTimerRef.current);
      liveSyncTimerRef.current = null;
    }

    liveSyncTimerRef.current = window.setTimeout(() => {
      try {
        const params = new URLSearchParams(searchParamsEntries);

        if (q) {
          params.set("q", q);
          // Keep `folder` so search can be scoped to the current folder.
        } else {
          params.delete("q");
        }

        params.delete("query");
        params.delete("search");

        const next = params.toString();
        router.replace(`/drive${next ? `?${next}` : ""}`);
      } catch {
        router.replace(q ? `/drive?q=${encodeURIComponent(q)}` : "/drive");
      }
    }, 250);

    return () => {
      if (liveSyncTimerRef.current) {
        window.clearTimeout(liveSyncTimerRef.current);
        liveSyncTimerRef.current = null;
      }
    };
  }, [
    mounted,
    loggedIn,
    pathname,
    searchScope,
    onSearchChange,
    searchValue,
    internalQuery,
    urlQ,
    router,
    searchParamsString,
    searchParamsEntries,
    // sp, // Removed sp from dependencies to reduce unnecessary reruns
  ]);

  React.useEffect(() => {
    if (!mounted) return;

    // If the user manually changed scope, don't fight them.
    // Once the route-derived product matches the current scope, we are "in sync" again.
    if (scopeTouchedRef.current) {
      if (searchScope === derivedActiveProduct) {
        scopeTouchedRef.current = false;
      }
      return;
    }

    setSearchScope(derivedActiveProduct);
  }, [mounted, derivedActiveProduct, searchScope]);


  // Only pass a placeholder when explicitly provided (lets SearchBar show scope-aware defaults)
  const resolvedSearchPlaceholder = searchPlaceholder;

  const clearFolderContext = React.useCallback(() => {
    if (typeof window === "undefined") return;
    // Clearing folder context should be sticky even when query is empty.
    // Drive restores last selected folder from localStorage when there is no `q` and no `folder`.
    // So we also reset the stored folder to "all".
    try {
      try {
        window.localStorage.setItem("CBX_SELECTED_FOLDER_V1", "all");
      } catch {
        // ignore
      }

      // Clear chip immediately (in case Drive event arrives later)
      setDriveFolderContextName("");
      setDriveFolderContextId("");
      setDriveFolderContextPathLabel("");

      const params = new URLSearchParams(searchParamsString);
      params.delete("folder");

      // Normalize legacy query params to `q`
      const q = (
        params.get("q") ??
        params.get("query") ??
        params.get("search") ??
        ""
      ).trim();

      if (q) params.set("q", q);
      else params.delete("q");

      params.delete("query");
      params.delete("search");

      const next = params.toString();
      const inDrive = (pathname ?? "").startsWith("/drive");
      if (inDrive) {
        router.replace(`/drive${next ? `?${next}` : ""}`);
      }

      // Notify listeners that folder context is cleared
      try {
        window.dispatchEvent(
          new CustomEvent("CBX_DRIVE_FOLDER_CONTEXT", { detail: { id: "", name: "", pathLabel: "" } })
        );
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
  }, [router, searchParamsString, pathname]);

  const submitSearch = React.useCallback(() => {
    const q = (onSearchChange ? (searchValue ?? "") : internalQuery).trim();
    if (!q) return;

    const inDrive = (pathname ?? "").startsWith("/drive");

    // If we're already in Drive and searching Drive, update the URL in-place and clear folder context.
    if (loggedIn && inDrive && searchScope === "drive") {
      try {
        const params = new URLSearchParams(searchParamsEntries);
        params.set("q", q);
        params.delete("query");
        params.delete("search");
        suppressNextDriveLiveSyncRef.current = q;
        router.replace(`/drive?${params.toString()}`);
        return;
      } catch {
        suppressNextDriveLiveSyncRef.current = q;
        router.replace(`/drive?q=${encodeURIComponent(q)}`);
        return;
      }
    }

    const base = !loggedIn
      ? "/stock/search"
      : searchScope === "stock"
      ? "/stock/search"
      : "/drive";

    const href = `${base}?q=${encodeURIComponent(q)}`;
    router.push(href);
  }, [router, internalQuery, onSearchChange, searchValue, loggedIn, searchScope, pathname, searchParamsEntries]);

  const handleLogout = React.useCallback(async () => {
    // Prefer app-provided logout (usually proto-auth). It may be async.
    if (onLogout) {
      try {
        await Promise.resolve(onLogout());
      } catch {
        // ignore
      }

      // Ensure our local `/me` mirror is cleared quickly
      setMe(null);
      try {
        await refreshMe('auth-changed');
      } catch {
        // ignore
      }
      emitAuthChanged();
      return;
    }

    // Default demo logout (cookie switch)
    try {
      await fetch("/api/demo-auth/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: null }),
      });
    } catch {
      // ignore
    }

    // Optimistically update UI
    setMe(null);

    // Re-sync from server cookies (in case switch failed or was delayed)
    try {
      await refreshMe('auth-changed');
    } catch {
      // ignore
    }

    emitAuthChanged();

    scopeTouchedRef.current = false;
    router.replace("/drive/landing");
  }, [onLogout, router, refreshMe]);

  const shouldShowCart = showCart ?? true;
  // Show built-in SearchBar when enabled (default true). If controlled via onSearchChange, always show.
  const shouldShowSearch = Boolean(onSearchChange) || (loggedIn ? enableSearch !== false : Boolean(enableSearch));
  const shouldShowLogo = showLogo && !loggedIn;
  const shouldShowSwitcher = Boolean(showProductSwitcher) && !loggedIn;
  const resolvedCartCount =
    typeof cartCount === "number"
      ? cartCount
      : typeof liveCartCount === "number"
      ? liveCartCount
      : 0;
  const isBuiltInSearch = !centerSlot && shouldShowSearch;

  // Mobile: show the search bar as a full-width second row
  const showMobileSearchRow = Boolean(isBuiltInSearch);

  const hasRightExtras =
    (shouldShowCart && mounted) || (showThemeToggle && mounted) || Boolean(rightSlot);
  const canOpenProfile = true; // via callback or fallback route
  const canOpenSettings = true; // via callback or fallback route

  // Memoized SearchBar helpers to stabilize props and prevent rerenders
  const searchScopes = React.useMemo(() => {
    return loggedIn
      ? [
          { value: 'stock' as const, label: 'Stock' },
          { value: 'drive' as const, label: 'Files' },
        ]
      : undefined;
  }, [loggedIn]);

  const handleScopeChange = React.useCallback(
    (next: string) => {
      if (!loggedIn) return;
      if (next !== 'drive' && next !== 'stock') return;
      const v = next === 'stock' ? 'stock' : 'drive';
      scopeTouchedRef.current = true;
      setSearchScope(v);

      // If user toggles scope, keep query and navigate to the right section
      const q = (onSearchChange ? (searchValue ?? '') : internalQuery).trim();
      if (v === 'stock') {
        router.push(q ? `/stock/search?q=${encodeURIComponent(q)}` : '/stock');
      } else {
        router.push(q ? `/drive?q=${encodeURIComponent(q)}` : '/drive');
      }
    },
    [loggedIn, onSearchChange, searchValue, internalQuery, router]
  );

  const handleGetSuggestions = React.useCallback(
    async (q: string, scope?: string) => {
      const normalizedScope: 'drive' | 'stock' = scope === 'drive' ? 'drive' : 'stock';
      const results = getTopbarSuggestions({
        query: q,
        scope: normalizedScope,
        loggedIn,
      });
      return results.map((s) => s.label);
    },
    [loggedIn]
  );

  const handleSelectSuggestion = React.useCallback(
    (v: string) => {
      // Update value and navigate immediately
      if (onSearchChange) onSearchChange(v);
      else setInternalQuery(v);

      if (!loggedIn) {
        router.push(`/stock/search?q=${encodeURIComponent(v)}`);
        return;
      }

      if (searchScope === 'stock') {
        router.push(`/stock/search?q=${encodeURIComponent(v)}`);
        return;
      }

      // Drive
      if ((pathname ?? '').startsWith('/drive')) {
        try {
          const params = new URLSearchParams(searchParamsEntries);
          params.set('q', v);
          params.delete('query');
          params.delete('search');
          suppressNextDriveLiveSyncRef.current = v;
          router.replace(`/drive?${params.toString()}`);
        } catch {
          suppressNextDriveLiveSyncRef.current = v;
          router.replace(`/drive?q=${encodeURIComponent(v)}`);
        }
        return;
      }

      router.push(`/drive?q=${encodeURIComponent(v)}`);
    },
    [onSearchChange, loggedIn, searchScope, router, pathname, searchParamsEntries]
  );

  const center = centerSlot
    ? centerSlot
    : shouldShowSearch
    ? (
        <SearchBar
          value={onSearchChange ? (searchValue ?? "") : internalQuery}
          onChange={onSearchChange ?? setInternalQuery}
          {...(resolvedSearchPlaceholder ? { placeholder: resolvedSearchPlaceholder } : {})}
          contextLabel={driveContextLabel}
          onClearContext={hasDriveFolderContext ? clearFolderContext : undefined}
          scope={loggedIn ? searchScope : undefined}
          scopes={searchScopes}
          onScopeChange={loggedIn ? handleScopeChange : undefined}
          getSuggestions={handleGetSuggestions}
          onSelectSuggestion={handleSelectSuggestion}
          onSubmit={submitSearch}
        />
      )
    : null;

  const loggedOutButtons = loggedOutRightSlot ? (
    <div className="flex items-center gap-2">{loggedOutRightSlot}</div>
  ) : (
    <div className="flex items-center gap-2">
      {onLogin ? (
        <Button type="button" variant="ghost" size="sm" onClick={onLogin} aria-label="Log in">
          Log in
        </Button>
      ) : (
        <Button
          asChild
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Log in"
        >
          <Link href={`/login?returnTo=${encodeURIComponent(pathname ?? '/')}`}>Log in</Link>
        </Button>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "w-full border-b border-border/70 bg-background/75 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 shadow-sm"
      )}
    >
      <div className="w-full px-4 sm:px-6">
        <div className="relative flex h-14 items-center gap-2 sm:h-16 sm:gap-3">
          {/* Left */}
          <div className="relative z-10 flex min-w-0 items-center gap-3 sm:gap-4">
            {leftSlot ? <div className="flex h-10 items-center">{leftSlot}</div> : null}

            {shouldShowLogo ? (
              <Link
                href="/stock"
                className="flex h-10 items-center rounded-md px-1"
                aria-label="Go to Stock"
              >
                {/* Light theme logo */}
                <Image
                  src="/logo_dark.svg"
                  alt="CBX"
                  width={28}
                  height={28}
                  className="h-6 w-auto dark:hidden sm:h-7"
                  priority
                />
                {/* Dark theme logo */}
                <Image
                  src="/logo.svg"
                  alt="CBX"
                  width={28}
                  height={28}
                  className="h-6 w-auto hidden dark:block sm:h-7"
                  priority
                />
              </Link>
            ) : null}

            {shouldShowSwitcher ? (
              <div className="ml-1 flex h-10 items-center rounded-full border bg-muted/40 p-1 shadow-sm">
                <Link
                  href="/stock"
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    derivedActiveProduct === 'stock'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                  )}
                  aria-current={derivedActiveProduct === 'stock' ? 'page' : undefined}
                >
                  <span className="hidden sm:inline">Stock</span>
                  <span className="sm:hidden">S</span>
                </Link>

                <Link
                  href="/drive"
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    derivedActiveProduct === 'drive'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                  )}
                  aria-current={derivedActiveProduct === 'drive' ? 'page' : undefined}
                >
                  <span className="hidden sm:inline">Share</span>
                  <span className="sm:hidden">Sh</span>
                </Link>
              </div>
            ) : (
              <div className="flex h-10 min-w-0 items-center truncate text-sm font-semibold tracking-tight text-foreground/90">
                {title}
              </div>
            )}
          </div>

          {/* Center (desktop) — always centered in the bar */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 hidden w-full -translate-y-1/2 items-center justify-center sm:flex sm:px-2 md:px-3">
            <div className="pointer-events-auto w-full max-w-xl md:max-w-2xl">
              <div className="flex h-10 min-w-0 items-center">
                {isBuiltInSearch ? (
                  <form
                    className="w-full"
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitSearch();
                    }}
                  >
                    {center}
                  </form>
                ) : (
                  center
                )}
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="relative z-10 ml-auto flex h-10 shrink-0 items-center justify-end gap-1.5 whitespace-nowrap sm:gap-3">
            {shouldShowCart && mounted ? (
              <CartButton
                count={resolvedCartCount}
                href={cartHref}
                label="Open cart"
                onClickAction={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openCart();
                }}
              />
            ) : null}

            {showThemeToggle && mounted ? <ThemeToggle /> : null}

            {loggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="relative h-10 w-10 px-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label="Notifications"
                    aria-haspopup="menu"
                  >
                    <Bell className="h-5 w-5" />
                    {/* simple unread indicator */}
                    <span
                      className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary"
                      aria-hidden
                    />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-80 p-0">
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="text-sm font-semibold">Notifications</div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      disabled
                    >
                      Mark all read
                    </Button>
                  </div>
                  <div className="h-px bg-border" />

                  <div className="max-h-80 overflow-y-auto p-1">
                    <DropdownMenuItem
                      className="flex cursor-pointer flex-col items-start gap-0.5 rounded-md px-2 py-2"
                      disabled
                    >
                      <div className="text-sm font-medium">New demo assets added</div>
                      <div className="text-xs text-muted-foreground">
                        We updated the stock demo set (s-014 → s-018).
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      className="flex cursor-pointer flex-col items-start gap-0.5 rounded-md px-2 py-2"
                      disabled
                    >
                      <div className="text-sm font-medium">Search improvements</div>
                      <div className="text-xs text-muted-foreground">
                        Sticky menu is smoother and respects the left nav.
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      className="flex cursor-pointer flex-col items-start gap-0.5 rounded-md px-2 py-2"
                      disabled
                    >
                      <div className="text-sm font-medium">Welcome back</div>
                      <div className="text-xs text-muted-foreground">
                        Your personal dashboard is ready.
                      </div>
                    </DropdownMenuItem>
                  </div>

                  <div className="h-px bg-border" />
                  <div className="p-1">
                    <DropdownMenuItem
                      className="rounded-md"
                      onSelect={(e) => {
                        e.preventDefault();
                        router.push('/notifications');
                      }}
                    >
                      View all notifications
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            {rightSlot ? <div className="flex items-center gap-2">{rightSlot}</div> : null}

            {hasRightExtras ? <div className="mx-1 h-7 w-px bg-border/70" /> : null}

            {loggedIn ? (
              showAccountMenu ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-10 gap-2 px-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      aria-label="Open account menu"
                      aria-haspopup="menu"
                    >
                      <Avatar className="h-8 w-8">
                        {displayUser?.imageUrl ? (
                          <AvatarImage src={displayUser.imageUrl} alt={displayUser?.name ?? 'User'} />
                        ) : null}
                        <AvatarFallback>{userInitials}</AvatarFallback>
                      </Avatar>
                      {showUserText ? (
                        <div className="ml-2 hidden text-left sm:block">
                          <div className="text-sm font-medium leading-none">{displayUser?.name}</div>
                          {displayUser?.email ? (
                            <div className="text-xs text-muted-foreground">{displayUser.email}</div>
                          ) : null}
                        </div>
                      ) : null}
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-72 p-0">
                    <div className="flex items-start gap-3 px-3 py-3">
                      <Avatar className="h-9 w-9">
                        {displayUser?.imageUrl ? (
                          <AvatarImage src={displayUser.imageUrl} alt={displayUser?.name ?? 'User'} />
                        ) : null}
                        <AvatarFallback>{userInitials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{displayUser?.name}</div>
                        {displayUser?.email ? (
                          <div className="truncate text-xs text-muted-foreground">{displayUser.email}</div>
                        ) : displayUser?.org ? (
                          <div className="truncate text-xs text-muted-foreground">{displayUser.org}</div>
                        ) : null}
                        {displayUser?.org ? (
                          <div className="mt-1 inline-flex items-center rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground">
                            {displayUser.org}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="h-px bg-border" />

                    <div className="p-1">
                      <DropdownMenuItem
                        className="gap-2"
                        disabled={!canOpenProfile}
                        onSelect={(e) => {
                          e.preventDefault();
                          if (onProfile) {
                            onProfile();
                            return;
                          }
                          router.push('/profile');
                        }}
                      >
                        <UserIcon className="h-4 w-4" />
                        View profile
                      </DropdownMenuItem>

                      <DropdownMenuItem className="gap-2 opacity-60" disabled>
                        <CreditCard className="h-4 w-4" />
                        Billing (coming soon)
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        className="gap-2"
                        disabled={!canOpenSettings}
                        onSelect={(e) => {
                          e.preventDefault();
                          if (onSettings) {
                            onSettings();
                            return;
                          }
                          router.push('/settings');
                        }}
                      >
                        <SettingsIcon className="h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                    </div>

                    <div className="h-px bg-border" />

                    <div className="p-1">
                      <DropdownMenuItem
                        className="gap-2 font-medium text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive"
                        onSelect={(e) => {
                          e.preventDefault();
                          void handleLogout();
                        }}
                      >
                        <LogOut className="h-4 w-4" />
                        Log out
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null
            ) : (
              loggedOutButtons
            )}
          </div>
        </div>

        {/* Mobile search row */}
        {showMobileSearchRow ? (
          <div className="sm:hidden">
            <div className="border-t border-border/60 pt-3 pb-4">
              <form
                className="w-full"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitSearch();
                }}
              >
                <div className="w-full">{center}</div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}