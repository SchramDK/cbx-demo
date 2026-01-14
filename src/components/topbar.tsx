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
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CartButton } from "@/components/cart-button";
import { useCart, useCartUI } from '@/lib/cart/cart';
import ThemeToggle from "@/components/theme/ThemeToggle";
import { getTopbarSuggestions } from "@/lib/search/topbarSuggestions";
import { cn } from "@/lib/utils";
import { Bell } from "lucide-react";

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
  const loggedIn = Boolean(resolvedUser) && (typeof isLoggedIn === "boolean" ? isLoggedIn : true);

  const derivedActiveProduct: 'drive' | 'stock' =
    activeProduct ?? (pathname?.startsWith('/stock') ? 'stock' : 'drive');

  const displayUser = (resolvedUser ?? { name: "Account" }) as {
    name: string;
    email?: string;
    imageUrl?: string;
    org?: string;
    role?: string;
  };

  const userInitials = React.useMemo(() => initials(displayUser?.name ?? ""), [displayUser?.name]);

  const [internalQuery, setInternalQuery] = React.useState(initialSearchQuery ?? "");
  React.useEffect(() => {
    // Keep internal query in sync if the prop changes (only when uncontrolled)
    if (onSearchChange) return;
    setInternalQuery(initialSearchQuery ?? "");
  }, [initialSearchQuery, onSearchChange]);
  const [searchScope, setSearchScope] = React.useState<'drive' | 'stock'>(derivedActiveProduct);

  React.useEffect(() => {
    // Keep search scope aligned with current section unless user explicitly toggles
    setSearchScope(derivedActiveProduct);
  }, [derivedActiveProduct]);


  // Only pass a placeholder when explicitly provided (lets SearchBar show scope-aware defaults)
  const resolvedSearchPlaceholder = searchPlaceholder;


  const submitSearch = React.useCallback(() => {
    const q = (onSearchChange ? (searchValue ?? "") : internalQuery).trim();
    if (!q) return;

    const base = !loggedIn
      ? '/stock/search'
      : searchScope === 'stock'
      ? '/stock/search'
      : '/drive';

    const href = `${base}?q=${encodeURIComponent(q)}`;
    router.push(href);
  }, [router, internalQuery, onSearchChange, searchValue, loggedIn, searchScope]);

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

    router.replace("/drive/landing");
  }, [onLogout, router, refreshMe]);

  const shouldShowCart = showCart ?? true;
  // When logged in, always show the built-in SearchBar unless a custom centerSlot is provided.
  const shouldShowSearch = loggedIn ? true : (enableSearch || Boolean(onSearchChange));
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

  const center = centerSlot
    ? centerSlot
    : shouldShowSearch
    ? (
        <div className="w-full sm:max-w-xl">
          <SearchBar
            value={onSearchChange ? (searchValue ?? "") : internalQuery}
            onChange={onSearchChange ?? setInternalQuery}
            {...(resolvedSearchPlaceholder ? { placeholder: resolvedSearchPlaceholder } : {})}
            scope={loggedIn ? searchScope : undefined}
            scopes={
              loggedIn
                ? [
                    { value: 'stock', label: 'Stock' },
                    { value: 'drive', label: 'Files' },
                  ]
                : undefined
            }
            onScopeChange={
              loggedIn
                ? (next) => {
                    const v = next === 'stock' ? 'stock' : 'drive';
                    setSearchScope(v);

                    // If user toggles scope, keep query and navigate to the right section
                    const q = (onSearchChange ? (searchValue ?? "") : internalQuery).trim();
                    if (v === 'stock') {
                      router.push(q ? `/stock/search?q=${encodeURIComponent(q)}` : '/stock');
                    } else {
                      router.push(q ? `/drive?q=${encodeURIComponent(q)}` : '/drive');
                    }
                  }
                : undefined
            }
            getSuggestions={async (q, scope) =>
              getTopbarSuggestions({
                query: q,
                scope: (scope === 'drive' ? 'drive' : 'stock'),
                loggedIn,
              }).map((s) => s.label)
            }
            onSelectSuggestion={(v) => {
              // Update value and navigate immediately
              if (onSearchChange) onSearchChange(v);
              else setInternalQuery(v);

              if (!loggedIn) {
                router.push(`/stock/search?q=${encodeURIComponent(v)}`);
                return;
              }

              if (searchScope === 'stock') {
                router.push(`/stock/search?q=${encodeURIComponent(v)}`);
              } else {
                router.push(`/drive?q=${encodeURIComponent(v)}`);
              }
            }}
            onSubmit={submitSearch}
          />
        </div>
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
          <div className="pointer-events-none absolute left-1/2 top-1/2 hidden w-full -translate-x-1/2 -translate-y-1/2 items-center justify-center sm:flex sm:px-2 md:px-3">
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
                onClick={(e) => {
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
                      onClick={() => {
                        // placeholder
                      }}
                    >
                      Mark all read
                    </Button>
                  </div>
                  <div className="h-px bg-border" />

                  <div className="max-h-80 overflow-y-auto">
                    <button
                      type="button"
                      className="w-full px-3 py-3 text-left hover:bg-muted/40"
                      onClick={() => {
                        // placeholder
                      }}
                    >
                      <div className="text-sm font-medium">New demo assets added</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        We updated the stock demo set (s-014 → s-018).
                      </div>
                    </button>

                    <button
                      type="button"
                      className="w-full px-3 py-3 text-left hover:bg-muted/40"
                      onClick={() => {
                        // placeholder
                      }}
                    >
                      <div className="text-sm font-medium">Search improvements</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Sticky menu is smoother and respects the left nav.
                      </div>
                    </button>

                    <button
                      type="button"
                      className="w-full px-3 py-3 text-left hover:bg-muted/40"
                      onClick={() => {
                        // placeholder
                      }}
                    >
                      <div className="text-sm font-medium">Welcome back</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Your personal dashboard is ready.
                      </div>
                    </button>
                  </div>

                  <div className="h-px bg-border" />
                  <div className="p-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      onClick={() => router.push('/notifications')}
                    >
                      View all notifications
                    </Button>
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

                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        onProfile?.();
                      }}
                    >
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        onSettings?.();
                      }}
                    >
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onSelect={(e) => {
                        e.preventDefault();
                        void handleLogout();
                      }}
                    >
                      Log out
                    </DropdownMenuItem>
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