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
import { useCartUI } from '@/lib/cart/cart';
import { Laptop2, Moon, Sun, Search } from "lucide-react";

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
  };
  /** Show name/email next to the avatar on >=sm screens */
  showUserText?: boolean;
  /** Optional content shown in the center of the topbar (e.g. SearchBar) */
  centerSlot?: React.ReactNode;
  /** Optional content shown on the left (e.g. back button, nav) */
  leftSlot?: React.ReactNode;
  /** Optional content shown on the right before the account menu (e.g. cart button) */
  rightSlot?: React.ReactNode;
  /** Show cart button in the topbar (defaults to true on Stock when logged in) */
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
  onLogout?: () => void;
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

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type ThemeMode = "system" | "light" | "dark";

function getSystemPrefersDark() {
  if (typeof window === "undefined") return false;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(mode: ThemeMode) {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  const dark = mode === "dark" || (mode === "system" && getSystemPrefersDark());
  root.classList.toggle("dark", dark);
  // Optional: help native controls render correctly
  root.style.colorScheme = dark ? "dark" : "light";
}

function ThemeToggle() {
  const [mode, setMode] = React.useState<ThemeMode>("dark");

  React.useEffect(() => {
    // Load persisted preference
    try {
      const saved = window.localStorage.getItem("cbx_theme") as ThemeMode | null;
      if (saved === "light" || saved === "dark" || saved === "system") {
        setMode(saved);
        applyTheme(saved);
      } else {
        setMode("dark");
        applyTheme("dark");
      }
    } catch {
      applyTheme("dark");
    }

    // React to OS theme changes when in system mode
    const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mql) return;

    const onChange = () => {
      // Only re-apply when we're in system mode
      try {
        const saved = window.localStorage.getItem("cbx_theme") as ThemeMode | null;
        const current = saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
        if (current === "system") applyTheme("system");
      } catch {
        applyTheme("system");
      }
    };

    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);

  const Icon = mode === "dark" ? Moon : mode === "light" ? Sun : Laptop2;

  const setAndPersist = (next: ThemeMode) => {
    setMode(next);
    try {
      window.localStorage.setItem("cbx_theme", next);
    } catch {}
    applyTheme(next);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0"
          aria-label="Theme"
        >
          <Icon className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setAndPersist("system"); }}>
          <Laptop2 className="mr-2 h-4 w-4" /> System
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setAndPersist("light"); }}>
          <Sun className="mr-2 h-4 w-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setAndPersist("dark"); }}>
          <Moon className="mr-2 h-4 w-4" /> Dark
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Topbar({
  title = "CBX Demo",
  showLogo = true,
  showProductSwitcher = false,
  activeProduct,
  user = { name: "Nicki Larsen", email: "nicki@cbx.demo" },
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

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const [demoLoggedIn, setDemoLoggedIn] = React.useState(false);
  React.useEffect(() => {
    if (!mounted) return;
    try {
      const v =
        window.localStorage.getItem("CBX_AUTH_V1") ||
        window.sessionStorage.getItem("CBX_AUTH_V1");
      setDemoLoggedIn(v === "1" || v === "true" || v === "yes" || v === "in");
    } catch {
      setDemoLoggedIn(false);
    }
  }, [mounted]);


  const loggedIn = typeof isLoggedIn === "boolean" ? isLoggedIn : demoLoggedIn;

  const derivedActiveProduct: 'drive' | 'stock' = (activeProduct ?? (pathname?.startsWith('/stock') ? 'stock' : 'drive'));
  const userInitials = React.useMemo(() => initials(user?.name ?? ""), [user?.name]);

  const [internalQuery, setInternalQuery] = React.useState(initialSearchQuery ?? "");

  const searchTargetBase = !loggedIn
    ? '/stock/search'
    : derivedActiveProduct === 'stock'
    ? '/stock/search'
    : '/drive';

  const resolvedSearchPlaceholder =
    searchPlaceholder ??
    (!loggedIn
      ? 'Search stock images, keywords…'
      : derivedActiveProduct === 'stock'
      ? 'Search images, keywords…'
      : 'Search files, folders…');

  const submitSearch = React.useCallback(() => {
    const q = (onSearchChange ? (searchValue ?? "") : internalQuery).trim();
    if (!q) return;
    const href = `${searchTargetBase}?q=${encodeURIComponent(q)}`;
    router.push(href);
  }, [router, searchTargetBase, internalQuery, onSearchChange, searchValue]);

  const handleLogout = React.useCallback(() => {
    if (onLogout) {
      onLogout();
      return;
    }

    // Default demo logout
    try {
      window.localStorage.removeItem("CBX_AUTH_V1");
      window.sessionStorage.removeItem("CBX_AUTH_V1");
    } catch {}

    setDemoLoggedIn(false);
    router.replace("/drive/landing");
  }, [onLogout, router]);

  const shouldShowCart = showCart ?? true;
  const shouldShowSearch = enableSearch || Boolean(onSearchChange);
  const shouldShowLogo = showLogo && !loggedIn;
  const shouldShowSwitcher = Boolean(showProductSwitcher) && !loggedIn;
  const resolvedCartCount = typeof cartCount === "number" ? cartCount : 0;
  const isBuiltInSearch = !centerSlot && shouldShowSearch;
  const hasRightCluster = Boolean(
    (shouldShowCart && mounted) || (showThemeToggle && mounted) || rightSlot
  );

  // Mobile: show the search bar as a full-width second row
  const showMobileSearchRow = Boolean(isBuiltInSearch);

  const center = centerSlot
    ? centerSlot
    : shouldShowSearch
    ? (
        <div className="w-full sm:max-w-xl">
          <SearchBar
            value={onSearchChange ? (searchValue ?? "") : internalQuery}
            onChange={onSearchChange ?? setInternalQuery}
            placeholder={resolvedSearchPlaceholder}
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm sm:shadow">
      <div className="w-full px-4 sm:px-6">
        <div className="grid h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:h-16 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-3">
          {/* Left */}
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
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
                  className={cx(
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
                  className={cx(
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

          {/* Center (desktop) */}
          <div className="hidden min-w-0 items-center justify-center sm:flex sm:px-2 md:px-3">
            <div className="w-full max-w-xl md:max-w-2xl">
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
          <div className="flex h-10 shrink-0 items-center justify-end gap-1.5 whitespace-nowrap sm:gap-3">
            {shouldShowSearch && !showMobileSearchRow ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 sm:hidden"
                aria-label="Search"
                onClick={() => router.push(searchTargetBase)}
              >
                <Search className="h-5 w-5" />
              </Button>
            ) : null}
            {shouldShowCart && mounted ? (
              <CartButton
                count={resolvedCartCount}
                href={cartHref}
                label="Open cart"
                onClick={(e) => {
                  e.preventDefault();
                  openCart();
                }}
              />
            ) : null}

            {showThemeToggle && mounted ? <ThemeToggle /> : null}

            {rightSlot ? <div className="flex items-center gap-2">{rightSlot}</div> : null}

            {(shouldShowCart || (showThemeToggle) || rightSlot) ? (
              <div className="mx-1 h-7 w-px bg-border/70" />
            ) : null}

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
                        {user?.imageUrl ? (
                          <AvatarImage src={user.imageUrl} alt={user?.name ?? 'User'} />
                        ) : null}
                        <AvatarFallback>{userInitials}</AvatarFallback>
                      </Avatar>
                      {showUserText ? (
                        <div className="ml-2 hidden text-left sm:block">
                          <div className="text-sm font-medium leading-none">{user?.name}</div>
                          {user?.email ? (
                            <div className="text-xs text-muted-foreground">{user.email}</div>
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
                        handleLogout();
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
    </header>
  );
}