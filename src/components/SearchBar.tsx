"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchBarProps = {
  value: string;
  /** Immediate change callback (fires on every keystroke) */
  onChange: (next: string) => void;
  /** Optional debounced callback (fires after user stops typing) */
  onChangeDebounced?: (next: string) => void;
  /** Debounce delay for onChangeDebounced */
  debounceMs?: number;
  placeholder?: string;
  /** Called when user presses Enter */
  onSubmit?: (value: string) => void;
  /**
   * Optional suggestions provider. If provided, a dropdown will show under the input.
   * Return up to ~8-12 items for best UX.
   */
  getSuggestions?: (query: string, scope?: string) => string[] | Promise<string[]>;
  /** Called when a suggestion is clicked/selected */
  onSelectSuggestion?: (value: string) => void;
  /** Max number of suggestions to show (default 8) */
  maxSuggestions?: number;
  /** Minimum query length before suggestions show (default 1) */
  minSuggestionChars?: number;
  /** Show recent searches when the input is focused and empty (default true) */
  showRecents?: boolean;
  /** Max recent items to store/show (default 6) */
  maxRecents?: number;
  /** localStorage key for recents (default CBX_SEARCH_RECENTS_V1) */
  recentsStorageKey?: string;
  /** Show a search icon on the left inside the input */
  showIcon?: boolean;
  /** Autofocus input on mount */
  autoFocus?: boolean;
  /** Optional controls rendered to the right of the search input (e.g. view toggle, sort) */
  rightSlot?: React.ReactNode;
  /** Additional wrapper classes */
  className?: string;
  /** Optional scope selector (e.g. Stock vs Drive). If onScopeChange is provided, selector is shown. */
  scope?: string;
  onScopeChange?: (scope: string) => void;
  scopes?: Array<{ value: string; label: string }>;
};

export function SearchBar({
  value,
  onChange,
  onChangeDebounced,
  debounceMs = 180,
  placeholder = "Search images, keywords, tags…",
  onSubmit,
  getSuggestions,
  onSelectSuggestion,
  maxSuggestions,
  minSuggestionChars,
  showRecents = true,
  maxRecents = 6,
  recentsStorageKey = "CBX_SEARCH_RECENTS_V1",
  showIcon = true,
  autoFocus = false,
  rightSlot,
  scope = "stock",
  onScopeChange,
  scopes = [
    { value: "stock", label: "Stock" },
    { value: "drive", label: "Files" },
  ],
  className,
}: SearchBarProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const triggerRef = React.useRef<HTMLDivElement | null>(null);
  const popoverRef = React.useRef<HTMLDivElement | null>(null);
  const blurCloseTimerRef = React.useRef<number | null>(null);
  const suppressOpenRef = React.useRef(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const [popoverWidth, setPopoverWidth] = React.useState<number | undefined>(undefined);

  const effectiveRecentsKey = React.useMemo(() => {
    // Only scope the key when the selector is enabled (keeps existing behavior for all current callers)
    return onScopeChange ? `${recentsStorageKey}_${scope}` : recentsStorageKey;
  }, [onScopeChange, recentsStorageKey, scope]);

  React.useLayoutEffect(() => {
    const el = triggerRef.current;
    if (!el) return;

    const update = () => setPopoverWidth(el.getBoundingClientRect().width);
    update();

    if (typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(() => update());
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = React.useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = React.useState(false);
  const [highlight, setHighlight] = React.useState<string>("");

  const [recents, setRecents] = React.useState<string[]>(() => {
    if (!showRecents) return [];
    try {
      const raw = window.localStorage.getItem(effectiveRecentsKey);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      const list = Array.isArray(parsed)
        ? parsed.map((x) => String(x).trim()).filter(Boolean)
        : [];
      return list.slice(0, Math.max(1, maxRecents));
    } catch {
      return [];
    }
  });

  const selectableItems = React.useMemo(() => {
    const q = value.trim();
    return q.length === 0 ? recents : suggestions;
  }, [value, recents, suggestions]);

  const loadRecents = React.useCallback(() => {
    if (!showRecents) return [];
    try {
      const raw = window.localStorage.getItem(effectiveRecentsKey);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      const list = Array.isArray(parsed)
        ? parsed.map((x) => String(x).trim()).filter(Boolean)
        : [];
      return list.slice(0, Math.max(1, maxRecents));
    } catch {
      return [];
    }
  }, [showRecents, effectiveRecentsKey, maxRecents]);

  const persistRecents = React.useCallback(
    (next: string[]) => {
      if (!showRecents) return;
      try {
        window.localStorage.setItem(effectiveRecentsKey, JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [showRecents, effectiveRecentsKey]
  );

  const addRecent = React.useCallback(
    (term: string) => {
      if (!showRecents) return;
      const t = term.trim();
      if (!t) return;
      setRecents((prev) => {
        const uniq = [t, ...prev.filter((x) => x.toLowerCase() !== t.toLowerCase())]
          .slice(0, Math.max(1, maxRecents));
        persistRecents(uniq);
        return uniq;
      });
    },
    [showRecents, maxRecents, persistRecents]
  );

  const clearRecents = React.useCallback(() => {
    try {
      window.localStorage.removeItem(effectiveRecentsKey);
    } catch {
      // ignore
    }
    setRecents([]);
  }, [effectiveRecentsKey]);
  React.useEffect(() => {
    if (!onScopeChange) return;
    if (!showRecents) {
      setRecents([]);
      setHighlight("");
      return;
    }
    setRecents(loadRecents());
    setHighlight("");
  }, [scope, onScopeChange, showRecents, loadRecents]);

  const maxSug = maxSuggestions ?? 8;
  const minChars = minSuggestionChars ?? 1;

  const setScope = React.useCallback(
    (next: string) => {
      if (!onScopeChange) return;
      onScopeChange(next);
      // Keep focus so the user can keep typing
      window.setTimeout(() => inputRef.current?.focus(), 0);
    },
    [onScopeChange]
  );

  const scopeLabel = React.useMemo(() => {
    const found = scopes.find((s) => s.value === scope);
    return found?.label ?? scope;
  }, [scopes, scope]);

  const effectivePlaceholder = React.useMemo(() => {
    // Only adjust when using the default placeholder and the selector is enabled
    if (!onScopeChange) return placeholder;
    if (placeholder !== "Search images, keywords, tags…") return placeholder;
    return scope === "drive" ? "Search files, folders, people…" : "Search images, keywords, tags…";
  }, [onScopeChange, placeholder, scope]);

  const effectiveAriaLabel = React.useMemo(() => {
    return onScopeChange ? `Search in ${scopeLabel}` : "Search assets";
  }, [onScopeChange, scopeLabel]);

  const scopePadLeft = React.useMemo(() => {
    if (!onScopeChange) return undefined;
    // Rough estimate: pill width + current label width (keeps compact while avoiding overlap)
    const base = 74; // pill + icon gap
    const perChar = 6; // conservative
    const label = scopeLabel ?? "";
    const est = base + label.length * perChar;
    return Math.min(Math.max(est, 120), 160);
  }, [onScopeChange, scopeLabel]);

  // Avoid mismatch: render a stable default, then show shortcut hint only after mount
  const [primaryShortcut, setPrimaryShortcut] = React.useState("Ctrl K");
  const [shortcutReady, setShortcutReady] = React.useState(false);

  React.useEffect(() => {
    const isMac =
      typeof navigator !== "undefined" &&
      /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    setPrimaryShortcut(isMac ? "⌘K" : "Ctrl K");
    setShortcutReady(true);
  }, []);

  // Debounce
  React.useEffect(() => {
    if (!onChangeDebounced) return;
    const t = window.setTimeout(() => onChangeDebounced(value), debounceMs);
    return () => window.clearTimeout(t);
  }, [value, debounceMs, onChangeDebounced]);

  React.useEffect(() => {
    if (!getSuggestions) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    const q = value.trim();
    const isInputFocused =
      typeof document !== "undefined" && document.activeElement === inputRef.current;

    if (!isInputFocused || q.length < minChars) {
      setSuggestions([]);
      setSuggestionsLoading(false);

      // Keep the popover stable on first focus when empty.
      // We show the hint row and, if available, recent searches.
      if (isInputFocused && q.length === 0) {
        setSuggestionsOpen(true);
      } else {
        setSuggestionsOpen(false);
      }

      return;
    }

    // Open immediately so the user sees Loading/Empty states
    if (!suppressOpenRef.current) {
      setSuggestionsOpen(true);
    } else {
      // Keep closed right after selecting a suggestion
      setSuggestionsOpen(false);
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    let cancelled = false;
    setSuggestionsLoading(true);

    const t = window.setTimeout(async () => {
      try {
        const res = await getSuggestions(q, scope);
        if (cancelled) return;
        const cleaned = (Array.isArray(res) ? res : [])
          .map((s) => String(s))
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, maxSug);
        setSuggestions(cleaned);
        setSuggestionsOpen(true);
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [value, getSuggestions, minChars, maxSug, scope]);

  React.useEffect(() => {
    if (!suggestionsOpen) return;

    if (selectableItems.length === 0) {
      setHighlight("");
      return;
    }

    // Do NOT auto-highlight on open. Only clear invalid highlight.
    if (highlight && !selectableItems.includes(highlight)) {
      setHighlight("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestionsOpen, selectableItems]);

  React.useEffect(() => {
    if (!autoFocus) return;
    // next tick to avoid hydration/focus flicker
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [autoFocus]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don’t steal focus when user is typing in a form field
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      const isEditable =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        Boolean(el && (el as any).isContentEditable);

      if (isEditable) return;

      const key = (e.key || "").toLowerCase();
      const isCmdK = (e.metaKey || e.ctrlKey) && !e.shiftKey && key === "k";

      if (isCmdK) {
        e.preventDefault();
        inputRef.current?.focus();
        setSuggestionsOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onScopeChange, setScope]);

  const clear = React.useCallback(() => {
    onChange("");
    setSuggestionsOpen(false);
    setSuggestions([]);
    // keep focus so user can continue typing
    inputRef.current?.focus();
  }, [onChange]);

  const selectSuggestion = React.useCallback(
    (s: string) => {
      suppressOpenRef.current = true;
      addRecent(s);
      if (onSelectSuggestion) onSelectSuggestion(s);
      else onChange(s);
      setSuggestionsOpen(false);
      // keep focus so user can continue typing
      inputRef.current?.focus();
    },
    [onSelectSuggestion, onChange, addRecent]
  );

  React.useEffect(() => {
    return () => {
      if (blurCloseTimerRef.current) window.clearTimeout(blurCloseTimerRef.current);
    };
  }, []);

  // Consistent trimmed query for checks
  const q = value.trim();

  return (
    <div className={cn("flex w-full items-center gap-3", className)}>
      <Popover
        open={suggestionsOpen}
        onOpenChange={(open) => {
          setSuggestionsOpen(open);
          if (!open) setHighlight("");
        }}
      >
        <div role="search" className="relative w-full">
          <PopoverAnchor asChild>
            <div ref={triggerRef}>
              <Input
                ref={inputRef}
                type="search"
                value={value}
                onChange={(e) => {
                  const next = e.target.value;
                  // User is typing again; allow suggestions to open
                  suppressOpenRef.current = false;
                  onChange(next);

                  // Ensure suggestions can open on first type
                  if (next.trim().length >= minChars) {
                    setSuggestionsOpen(true);
                  }
                }}
                onFocus={() => {
                  if (blurCloseTimerRef.current) {
                    window.clearTimeout(blurCloseTimerRef.current);
                    blurCloseTimerRef.current = null;
                  }
                  setIsFocused(true);
                  const q = value.trim();
                  if (q.length >= minChars) {
                    setSuggestionsOpen(true);
                    return;
                  }

                  if (q.length === 0) {
                    // Ensure recents are fresh (scoped per selector)
                    if (showRecents) setRecents(loadRecents());
                    setSuggestionsOpen(true);
                  }
                }}
                onBlur={(e) => {
                  setIsFocused(false);

                  // Close slightly later to allow clicks into the popover without flicker
                  if (blurCloseTimerRef.current) window.clearTimeout(blurCloseTimerRef.current);
                  blurCloseTimerRef.current = window.setTimeout(() => {
                    const ae = document.activeElement as HTMLElement | null;
                    if (ae && popoverRef.current && popoverRef.current.contains(ae)) return;
                    setSuggestionsOpen(false);
                    setHighlight("");
                  }, 90);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    const q = value.trim();
                    const canNavigate =
                      (q.length >= minChars && suggestions.length > 0) ||
                      (q.length === 0 && showRecents && recents.length > 0);

                    if (canNavigate) {
                      setSuggestionsOpen(true);

                      const list = selectableItems;
                      if (list.length > 0) {
                        e.preventDefault();
                        const dir = e.key === "ArrowDown" ? 1 : -1;
                        const currentIndex = highlight ? list.indexOf(highlight) : -1;
                        const nextIndex =
                          currentIndex === -1
                            ? 0
                            : (currentIndex + dir + list.length) % list.length;
                        setHighlight(list[nextIndex] ?? "");
                      }
                    }
                  }

                  if (e.key === "Escape") {
                    if (suggestionsOpen) {
                      e.preventDefault();
                      setSuggestionsOpen(false);
                      setHighlight("");
                      return;
                    }

                    if (value) {
                      e.preventDefault();
                      clear();
                      return;
                    }
                  }

                  if (e.key === "Enter") {
                    if (suggestionsOpen && highlight && selectableItems.includes(highlight)) {
                      e.preventDefault();
                      selectSuggestion(highlight);
                      return;
                    }

                    // Submitting a search should close the popover
                    suppressOpenRef.current = true;
                    setSuggestionsOpen(false);
                    setHighlight("");

                    if (value.trim()) addRecent(value);
                    if (onSubmit) onSubmit(value);
                  }
                }}
                placeholder={effectivePlaceholder}
                aria-label={effectiveAriaLabel}
                style={
                  onScopeChange
                    ? ({ paddingLeft: `${(scopePadLeft ?? 130) + (showIcon ? 22 : 0)}px` } as React.CSSProperties)
                    : undefined
                }
                className={cn(
                  "h-10 bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:ring-offset-background",
                  onScopeChange ? "" : showIcon ? "pl-9" : "pl-3",
                  value ? "pr-9" : "pr-16",
                  "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none"
                )}
              />
            </div>
          </PopoverAnchor>

          {onScopeChange ? (
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-2 pr-1">
              <div
                className="inline-flex h-7 items-center rounded-full bg-muted/50 p-0.5 ring-1 ring-border/40"
                role="tablist"
                aria-label="Search scope"
                onKeyDown={(e) => {
                  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
                  e.preventDefault();
                  const list = scopes.slice(0, 4);
                  const idx = Math.max(0, list.findIndex((s) => s.value === scope));
                  const dir = e.key === 'ArrowRight' ? 1 : -1;
                  const next = list[(idx + dir + list.length) % list.length];
                  if (next) setScope(next.value);
                }}
              >
                {scopes.slice(0, 4).map((s) => {
                  const active = s.value === scope;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setScope(s.value)}
                      className={cn(
                        "h-6 rounded-full px-2.5 text-[11px] font-medium transition",
                        active
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      aria-pressed={active}
                      role="tab"
                      aria-selected={active}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>

              {showIcon ? (
                <div className="pointer-events-none text-muted-foreground">
                  <Search className="h-4 w-4" />
                </div>
              ) : null}
            </div>
          ) : showIcon ? (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Search className="h-4 w-4" />
            </div>
          ) : null}

          {value ? (
            <button
              type="button"
              aria-label="Clear search"
              title="Clear search"
              onClick={clear}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}

          {/* Show shortcut hint only when input is NOT focused (after mount to avoid mismatch) */}
          {!value && !isFocused && shortcutReady ? (
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                {primaryShortcut.startsWith("⌘") ? (
                  <span className="flex items-center gap-0.5">
                    <span className="text-[12px] leading-none">⌘</span>
                    <span>K</span>
                  </span>
                ) : (
                  primaryShortcut
                )}
              </kbd>
            </div>
          ) : null}

          {suggestionsOpen ? (
            <PopoverContent
              ref={popoverRef}
              align="start"
              side="bottom"
              sideOffset={8}
              className="p-0"
              style={{ width: popoverWidth }}
              onOpenAutoFocus={(e) => e.preventDefault()}
              onInteractOutside={(e) => {
                // If you click the trigger/input again, don't close
                const target = e.target as HTMLElement | null;
                if (
                  target &&
                  ((inputRef.current && inputRef.current.contains(target)) ||
                    (triggerRef.current && triggerRef.current.contains(target)))
                ) {
                  e.preventDefault();
                  return;
                }

                setSuggestionsOpen(false);
                setHighlight("");
              }}
            >
              <Command className="rounded-xl border border-border bg-popover shadow-md">
                <CommandList>
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    Enter to search • ↑/↓ then Enter to select • Esc to close
                  </div>
                  {showRecents && q.length === 0 && recents.length > 0 ? (
                    <CommandGroup
                      heading={
                        <div className="flex items-center justify-between">
                          <span>Recent {onScopeChange ? (scope === 'drive' ? 'Files' : 'Stock') : ''} searches</span>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              clearRecents();
                              window.setTimeout(() => inputRef.current?.focus(), 0);
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Clear
                          </button>
                        </div>
                      }
                    >
                      {recents.map((r) => (
                        <CommandItem
                          key={r}
                          value={r}
                          onSelect={() => selectSuggestion(r)}
                          className={cn(
                            highlight === r && "bg-accent text-accent-foreground"
                          )}
                        >
                          {r}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : null}
                  {suggestionsLoading ? (
                    <CommandGroup>
                      <div className="px-3 py-2 text-xs text-muted-foreground">Loading…</div>
                    </CommandGroup>
                  ) : null}

                  {!suggestionsLoading && q.length >= minChars && suggestions.length === 0 ? (
                    <CommandEmpty>No suggestions</CommandEmpty>
                  ) : null}

                  {suggestions.length > 0 ? (
                    <CommandGroup heading="Suggestions">
                      {suggestions.map((s) => (
                        <CommandItem
                          key={s}
                          value={s}
                          onSelect={() => selectSuggestion(s)}
                          className={cn(
                            highlight === s && "bg-accent text-accent-foreground"
                          )}
                        >
                          {s}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : null}
                {showRecents && q.length === 0 && recents.length === 0 ? (
                  <CommandGroup>
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No recent searches yet.
                    </div>
                  </CommandGroup>
                ) : null}
                </CommandList>
              </Command>
            </PopoverContent>
          ) : null}
        </div>
      </Popover>

      {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
    </div>
  );
}