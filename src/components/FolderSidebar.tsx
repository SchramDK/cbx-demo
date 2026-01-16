
'use client';

import * as React from 'react';
import {
  ArrowUpDown,
  ChevronRight,
  ChevronLeft,
  Folder,
  FolderOpen,
  Heart,
  MoreHorizontal,
  Plus,
  Sparkles,
  Star,
  Trash2,
  X,
  Receipt,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import {
  CreateSmartFolderDialog,
  type SmartRule,
} from '@/components/smart-folders/CreateSmartFolderDialog';
import { Input } from '@/components/ui/input';
import { readJSON, readString, writeJSON, writeString } from '@/lib/storage/localStorage';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

export type FolderNode = {
  id: string;
  name: string;
  children?: FolderNode[];
};

const LS_KEYS = {
  favorites: 'CBX_FAVORITES_V1',
  smartFolders: 'CBX_SMART_FOLDERS_V1',
  sections: 'CBX_SIDEBAR_SECTIONS_V1',
  folderOpen: 'CBX_FOLDER_OPEN_V1',
  sidebarWidth: 'CBX_SIDEBAR_WIDTH_V1',
  sidebarCollapsed: 'CBX_SIDEBAR_COLLAPSED_V1',
  purchasesLastSeen: 'CBX_PURCHASES_LAST_SEEN_V1',
} as const;


export const demoFolders: FolderNode[] = [
  {
    id: "marketing",
    name: "Marketing",
    children: [
      {
        id: "campaigns",
        name: "Campaigns",
        children: [
          { id: "campaigns_2025", name: "2025" },
          { id: "campaigns_2024", name: "2024" },
        ],
      },
      {
        id: "social",
        name: "Social",
        children: [
          { id: "social_instagram", name: "Instagram" },
          { id: "social_linkedin", name: "LinkedIn" },
        ],
      },
    ],
  },
  {
    id: "brand",
    name: "Brand",
    children: [
      {
        id: "logos",
        name: "Logos",
        children: [
          { id: "logos_primary", name: "Primary" },
          { id: "logos_symbol", name: "Symbol" },
        ],
      },
      {
        id: "guidelines",
        name: "Guidelines",
        children: [
          { id: "guidelines_tone", name: "Tone of voice" },
        ],
      },
    ],
  },
  {
    id: "product",
    name: "Product",
    children: [
      {
        id: "ui",
        name: "UI",
        children: [
          { id: "ui_components", name: "Components" },
          { id: "ui_screens", name: "Screens" },
        ],
      },
    ],
  },
  {
    id: "sales",
    name: "Sales",
    children: [
      {
        id: "pitch_decks",
        name: "Pitch decks",
        children: [
          { id: "pitch_decks_enterprise", name: "Enterprise" },
          { id: "pitch_decks_smb", name: "SMB" },
        ],
      },
    ],
  },
  {
    id: "press",
    name: "Press",
    children: [
      {
        id: "media_kit",
        name: "Media kit",
        children: [
          { id: "media_logos", name: "Logos" },
          { id: "media_photos", name: "Photos" },
        ],
      },
    ],
  },
];


type SmartFolderKind = "portraits" | "wides" | "squares";

type SmartFolderDef = {
  id: string;
  name: string;
  kind?: SmartFolderKind;
  rules?: SmartRule[];
};

const defaultSmartFolders: SmartFolderDef[] = [
  {
    id: "smart:portraits",
    name: "Portraits",
    kind: "portraits",
    rules: [{ field: "ratio", op: "is", value: "3/4" }],
  },
  {
    id: "smart:wides",
    name: "Wide (16:9)",
    kind: "wides",
    rules: [{ field: "ratio", op: "is", value: "16/9" }],
  },
  {
    id: "smart:squares",
    name: "Square (1:1)",
    kind: "squares",
    rules: [{ field: "ratio", op: "is", value: "1/1" }],
  },
];

function isSmartFolderId(id?: string) {
  return Boolean(id && id.startsWith("smart:"));
}


const SYSTEM_VIEWS = new Set<string>([
  "all",
  "favorites",
  "purchases",
  "trash",
]);

// Purchases helpers (moved from inside flattenFolders)
const DRIVE_IMPORTED_ASSETS_KEY = 'CBX_DRIVE_IMPORTED_ASSETS_V1';
const DRIVE_PURCHASES_IMPORTED_EVENT = 'CBX_PURCHASES_IMPORTED';

function readPurchasesCount(): number {
  try {
    const raw = window.localStorage.getItem(DRIVE_IMPORTED_ASSETS_KEY);
    const parsed = raw ? (JSON.parse(raw) as any[]) : [];
    if (!Array.isArray(parsed) || parsed.length === 0) return 0;

    // Count items that are in purchases (default to purchases if missing folderId)
    let count = 0;
    for (const a of parsed) {
      const fid = typeof a?.folderId === 'string' && a.folderId.trim().length ? a.folderId : 'purchases';
      if (fid === 'purchases') count += 1;
    }
    return count;
  } catch {
    return 0;
  }
}

function buildFolderIndex(nodes: FolderNode[]) {
  const map = new Map<string, FolderNode>();
  const walk = (list: FolderNode[]) => {
    for (const n of list) {
      map.set(n.id, n);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return map;
}

function SectionChevron({ open }: { open: boolean }) {
  return (
    <ChevronRight
      className={cn("h-4 w-4 transition-transform", open && "rotate-90")}
    />
  );
}

type PaletteItem = {
  id: string;
  label: string;
  keywords?: string;
};

function flattenFolders(nodes: FolderNode[], trail: string[] = []): PaletteItem[] {
  const out: PaletteItem[] = [];

  const walk = (list: FolderNode[]) => {
    for (const n of list) {
      trail.push(n.name);

      const path = trail.join(" / ");
      out.push({ id: n.id, label: n.name, keywords: path });

      if (n.children?.length) walk(n.children);

      trail.pop();
    }
  };

  walk(nodes);
  return out;
}

function CommandPalette({
  folders,
  smartFolders,
  onSelect,
  onCreateFolder,
}: {
  folders: FolderNode[];
  smartFolders: { id: string; name: string }[];
  onSelect: (id: string) => void;
  onCreateFolder: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  // Cmd/Ctrl+Shift+K opens the palette
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const typingTarget =
        tag === "input" ||
        tag === "textarea" ||
        (target as any)?.isContentEditable;

      const key = e.key.toLowerCase();
      const mod = e.metaKey || e.ctrlKey;
      const isCmdShiftK = mod && e.shiftKey && key === "k";

      if (isCmdShiftK && !typingTarget) {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const folderItems = React.useMemo(() => flattenFolders(folders), [folders]);

  const run = React.useCallback(
    (id: string) => {
      onSelect(id);
      setOpen(false);
    },
    [onSelect]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search folders and actions…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        <CommandGroup heading="Navigate">
          <CommandItem value="All files" onSelect={() => run("all")}>
            All files
          </CommandItem>
          <CommandItem value="Purchases" onSelect={() => run("purchases")}>
            Purchases
          </CommandItem>
          <CommandItem value="Favorites" onSelect={() => run("favorites")}>
            Favorites
          </CommandItem>
          <CommandItem value="Trash" onSelect={() => run("trash")}>
            Trash
          </CommandItem>
          <CommandItem
            value="Create folder"
            onSelect={() => {
              setOpen(false);
              onCreateFolder();
            }}
          >
            Create folder
          </CommandItem>
        </CommandGroup>

        {smartFolders.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Smart folders">
              {smartFolders.map((sf) => (
                <CommandItem
                  key={sf.id}
                  value={sf.name}
                  onSelect={() => run(sf.id)}
                >
                  {sf.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}

        <CommandSeparator />
        <CommandGroup heading="Folders">
          {folderItems.map((f) => (
            <CommandItem
              key={f.id}
              value={`${f.label} ${f.keywords ?? ""}`}
              onSelect={() => run(f.id)}
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate">{f.label}</span>
                {f.keywords ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {f.keywords}
                  </span>
                ) : null}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function FolderSidebar({
  folders,
  onFoldersChangeAction,
  selectedId,
  onSelectAction,
  className,
  onDropAssetAction,
}: {
  folders: FolderNode[];
  onFoldersChangeAction: (next: FolderNode[]) => void;
  selectedId?: string;
  onSelectAction?: (id: string) => void;
  className?: string;
  onDropAssetAction?: (assetId: number, folderId: string) => void;
}) {
  // Avoid SSR hydration mismatch: start empty and hydrate from localStorage after mount
  const [favoriteIds, setFavoriteIds] = React.useState<Set<string>>(() => new Set());
  const [favoritesReady, setFavoritesReady] = React.useState(false);
  React.useEffect(() => {
    const arr = readJSON<string[]>(LS_KEYS.favorites, []);
    setFavoriteIds(new Set(Array.isArray(arr) ? arr : []));
    setFavoritesReady(true);
  }, []);

  React.useEffect(() => {
    if (!favoritesReady) return;
    writeJSON(LS_KEYS.favorites, Array.from(favoriteIds));
  }, [favoriteIds, favoritesReady]);

  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const [createOpen, setCreateOpen] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");
  const folderIndex = React.useMemo(() => buildFolderIndex(folders), [folders]);

  // Purchases notification badge (like unread mail)
  const [purchasesCount, setPurchasesCount] = React.useState<number>(0);
  const [purchasesLastSeen, setPurchasesLastSeen] = React.useState<number>(0);

  React.useEffect(() => {
    // Load initial counts after mount
    const current = readPurchasesCount();
    setPurchasesCount(current);

    const seenRaw = readString(LS_KEYS.purchasesLastSeen, '0');
    const seen = Number(seenRaw);
    setPurchasesLastSeen(Number.isFinite(seen) ? seen : 0);
  }, []);

  React.useEffect(() => {
    const refresh = () => {
      setPurchasesCount(readPurchasesCount());
    };

    const onImported = () => refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === DRIVE_IMPORTED_ASSETS_KEY || e.key === LS_KEYS.purchasesLastSeen) {
        refresh();
      }
    };

    window.addEventListener(DRIVE_PURCHASES_IMPORTED_EVENT, onImported as EventListener);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener(DRIVE_PURCHASES_IMPORTED_EVENT, onImported as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Mark Purchases as seen when user opens Purchases
  React.useEffect(() => {
    if (selectedId !== 'purchases') return;
    setPurchasesLastSeen(purchasesCount);
    writeString(LS_KEYS.purchasesLastSeen, String(purchasesCount));
  }, [selectedId, purchasesCount]);

  const newPurchases = Math.max(0, purchasesCount - purchasesLastSeen);
  const hasNewPurchases = newPurchases > 0;
  const newPurchasesLabel = newPurchases > 9 ? '9+' : String(newPurchases);

  // Sidebar width (resizable, persisted)
  const [sidebarWidth, setSidebarWidth] = React.useState<number>(256);
  const [widthReady, setWidthReady] = React.useState(false);

  // Collapsed state (persisted)
  const [collapsed, setCollapsed] = React.useState(false);
  const [collapsedReady, setCollapsedReady] = React.useState(false);

  React.useEffect(() => {
    setCollapsed(readString(LS_KEYS.sidebarCollapsed, '0') === '1');
    setCollapsedReady(true);
  }, []);

  React.useEffect(() => {
    if (!collapsedReady) return;
    writeString(LS_KEYS.sidebarCollapsed, collapsed ? '1' : '0');
  }, [collapsed, collapsedReady]);

  React.useEffect(() => {
    const raw = readString(LS_KEYS.sidebarWidth, '');
    const n = raw ? Number(raw) : NaN;
    if (Number.isFinite(n)) setSidebarWidth(Math.min(Math.max(n, 220), 420));
    setWidthReady(true);
  }, []);

  React.useEffect(() => {
    if (!widthReady) return;
    writeString(LS_KEYS.sidebarWidth, String(sidebarWidth));
  }, [sidebarWidth, widthReady]);

  const dragRef = React.useRef<{ startX: number; startW: number } | null>(null);

  const onStartResize = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startW: sidebarWidth };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const onStartResizeCollapsed = (e: React.MouseEvent) => {
    e.preventDefault();
    // Expand first, then continue resizing from the stored width
    const base = Math.min(Math.max(sidebarWidth, 220), 420);
    setCollapsed(false);
    // Ensure we start from a sensible width
    setSidebarWidth(base);
    dragRef.current = { startX: e.clientX, startW: base };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const next = dragRef.current.startW + dx;
      setSidebarWidth(Math.min(Math.max(next, 220), 420));
    };

    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // Shared row classes for navigation rows
  const navRowBase =
    "group flex w-full items-center gap-2 rounded-md px-2 h-9 text-sm transition-colors hover:bg-muted";
  const navRowActive = "bg-muted font-medium";

  const sectionHeaderBase =
    "flex flex-1 items-center gap-1 rounded-md px-2 h-8 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40";

  // Smart folders (persisted)
  const [smartFolderDefs, setSmartFolderDefs] = React.useState<SmartFolderDef[]>(() => defaultSmartFolders);
  const [smartReady, setSmartReady] = React.useState(false);

  React.useEffect(() => {
    const parsed = readJSON<SmartFolderDef[] | null>(LS_KEYS.smartFolders, null);

    if (Array.isArray(parsed) && parsed.length > 0) {
      const cleaned: SmartFolderDef[] = [];

      parsed.forEach((d) => {
        if (!d || typeof d.id !== 'string' || typeof d.name !== 'string') return;

        const kindOk =
          !d.kind || d.kind === 'portraits' || d.kind === 'wides' || d.kind === 'squares';

        const rulesOk =
          !d.rules ||
          (Array.isArray(d.rules) &&
            d.rules.every(
              (r: any) =>
                r &&
                (r.field === 'ratio' || r.field === 'name' || r.field === 'keywords') &&
                (r.op === 'is' || r.op === 'contains') &&
                typeof r.value === 'string'
            ));

        if (kindOk && rulesOk) cleaned.push(d);
      });

      // If storage somehow contains nothing valid, fall back to defaults
      setSmartFolderDefs(cleaned.length ? cleaned : defaultSmartFolders);
    } else {
      setSmartFolderDefs(defaultSmartFolders);
    }

    setSmartReady(true);
  }, []);

  React.useEffect(() => {
    if (!smartReady) return;
    writeJSON(LS_KEYS.smartFolders, smartFolderDefs);
  }, [smartFolderDefs, smartReady]);

  const [createSmartOpen, setCreateSmartOpen] = React.useState(false);
  const smartFoldersForPalette = React.useMemo(
    () => smartFolderDefs.map((s) => ({ id: s.id, name: s.name })),
    [smartFolderDefs]
  );

  const createSmartFolder = (payload: { name: string; rules: SmartRule[] }) => {
    const id = `smart:${Math.random().toString(36).slice(2, 9)}`;
    const next: SmartFolderDef = { id, name: payload.name, rules: payload.rules };

    setSmartFolderDefs((prev) => [next, ...prev]);
    onSelectAction?.(id);
  };

  const deleteSmartFolder = (id: string) => {
    setSmartFolderDefs((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) onSelectAction?.("all");
  };

  // Collapsible sections (persisted)
  const [sectionsOpen, setSectionsOpen] = React.useState<{
    smart: boolean;
    starred: boolean;
    folders: boolean;
  }>(() => ({ smart: true, starred: true, folders: true }));

  const [sectionsReady, setSectionsReady] = React.useState(false);

  React.useEffect(() => {
    const parsed = readJSON<Partial<typeof sectionsOpen>>(LS_KEYS.sections, {});
    setSectionsOpen((prev) => ({
      smart: typeof parsed.smart === 'boolean' ? parsed.smart : prev.smart,
      starred: typeof parsed.starred === 'boolean' ? parsed.starred : prev.starred,
      folders: typeof parsed.folders === 'boolean' ? parsed.folders : prev.folders,
    }));
    setSectionsReady(true);
  }, []);

  React.useEffect(() => {
    if (!sectionsReady) return;
    writeJSON(LS_KEYS.sections, sectionsOpen);
  }, [sectionsOpen, sectionsReady]);

  const toggleSection = React.useCallback((key: keyof typeof sectionsOpen) => {
    setSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const [folderQuery, setFolderQuery] = React.useState("");
  const deferredFolderQuery = React.useDeferredValue(folderQuery);

  const [folderSort, setFolderSort] = React.useState<"name_asc" | "name_desc">("name_asc");

  const [openById, setOpenById] = React.useState<Record<string, boolean>>(() => ({}));
  const [openReady, setOpenReady] = React.useState(false);

  // Load persisted open/closed state after mount (avoid SSR hydration mismatch)
  React.useEffect(() => {
    const obj = readJSON<Record<string, boolean>>(LS_KEYS.folderOpen, {});
    setOpenById(obj || {});
    setOpenReady(true);
  }, []);

  // Persist on changes
  React.useEffect(() => {
    if (!openReady) return;
    writeJSON(LS_KEYS.folderOpen, openById);
  }, [openById, openReady]);

  const isOpen = (id: string) => {
    // While searching, force open so matches are visible
    if (folderQuery.trim().length > 0) return true;
    return openById[id] ?? false;
  };

  const toggleOpen = (id: string) => {
    // While searching, we force all folders open for visibility. Toggling would be confusing
    // (and previously could produce incorrect state because isOpen() returns true).
    if (folderQuery.trim().length > 0) return;

    setOpenById((prev) => {
      const current = prev[id] ?? false;
      return { ...prev, [id]: !current };
    });
  };

  const filterFolders = (nodes: FolderNode[], q: string): FolderNode[] => {
    const needle = q.trim().toLowerCase();
    if (!needle) return nodes;

    const walk = (list: FolderNode[]): FolderNode[] => {
      const out: FolderNode[] = [];
      for (const n of list) {
        const nameHit = n.name.toLowerCase().includes(needle);
        const childHits = n.children?.length ? walk(n.children) : [];

        if (nameHit || childHits.length) {
          out.push({ ...n, ...(childHits.length ? { children: childHits } : { children: n.children }) });
        }
      }
      return out;
    };

    return walk(nodes);
  };

  const sortFolders = React.useCallback((nodes: FolderNode[]): FolderNode[] => {
    const sorted = [...nodes].sort((a, b) => {
      const an = a.name.toLowerCase();
      const bn = b.name.toLowerCase();
      if (an < bn) return folderSort === "name_asc" ? -1 : 1;
      if (an > bn) return folderSort === "name_asc" ? 1 : -1;
      return 0;
    });

    return sorted.map((n) =>
      n.children?.length
        ? { ...n, children: sortFolders(n.children) }
        : n
    );
  }, [folderSort]);

  const visibleFolders = React.useMemo(() => {
    const filtered = filterFolders(folders, deferredFolderQuery);
    return sortFolders(filtered);
  }, [folders, deferredFolderQuery, sortFolders]);

  const isRealFolder =
    selectedId &&
    !SYSTEM_VIEWS.has(selectedId) &&
    !isSmartFolderId(selectedId);

  const addChildFolder = (
    list: FolderNode[],
    parentId: string | null,
    child: FolderNode
  ): FolderNode[] => {
    if (!parentId) return [...list, child];

    const walk = (nodes: FolderNode[]): FolderNode[] =>
      nodes.map((n) => {
        if (n.id === parentId) {
          const children = Array.isArray(n.children) ? n.children : [];
          return { ...n, children: [...children, child] };
        }
        if (n.children?.length) {
          return { ...n, children: walk(n.children) };
        }
        return n;
      });

    return walk(list);
  };

  const createFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;

    const id = `folder_${Math.random().toString(36).slice(2, 9)}`;
    const parentId = isRealFolder ? selectedId! : null;

    const next = addChildFolder(folders, parentId, { id, name });
    onFoldersChangeAction(next);

    // Auto-select the new folder
    onSelectAction?.(id);

    setNewFolderName("");
    setCreateOpen(false);
  };

  const [renameOpen, setRenameOpen] = React.useState(false);
  const [renameId, setRenameId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");

  const [smartRenameOpen, setSmartRenameOpen] = React.useState(false);
  const [smartRenameId, setSmartRenameId] = React.useState<string | null>(null);
  const [smartRenameValue, setSmartRenameValue] = React.useState("");

  const requestSmartRename = (id: string) => {
    const def = smartFolderDefs.find((s) => s.id === id);
    setSmartRenameId(id);
    setSmartRenameValue(def?.name ?? "");
    setSmartRenameOpen(true);
  };

  const commitSmartRename = () => {
    const id = smartRenameId;
    const name = smartRenameValue.trim();
    if (!id || !name) return;

    setSmartFolderDefs((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
    setSmartRenameOpen(false);
    setSmartRenameId(null);
    setSmartRenameValue("");
  };

  const duplicateSmartFolder = (id: string) => {
    const def = smartFolderDefs.find((s) => s.id === id);
    if (!def) return;

    const nextId = `smart:${Math.random().toString(36).slice(2, 9)}`;
    const copy: SmartFolderDef = {
      ...def,
      id: nextId,
      name: `${def.name} (copy)`,
    };

    setSmartFolderDefs((prev) => [copy, ...prev]);
    onSelectAction?.(nextId);
  };

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const collectIds = (n: FolderNode): string[] => {
    const ids = [n.id];
    if (n.children?.length) {
      for (const c of n.children) ids.push(...collectIds(c));
    }
    return ids;
  };

  const containsId = (n: FolderNode, target: string): boolean => {
    if (n.id === target) return true;
    if (!n.children?.length) return false;
    return n.children.some((c) => containsId(c, target));
  };

  const renameFolderById = (list: FolderNode[], targetId: string, name: string): FolderNode[] => {
    const walk = (nodes: FolderNode[]): FolderNode[] =>
      nodes.map((n) => {
        if (n.id === targetId) return { ...n, name };
        if (n.children?.length) return { ...n, children: walk(n.children) };
        return n;
      });
    return walk(list);
  };

  const deleteFolderById = (list: FolderNode[], targetId: string): FolderNode[] => {
    const walk = (nodes: FolderNode[]): FolderNode[] =>
      nodes
        .filter((n) => n.id !== targetId)
        .map((n) => (n.children?.length ? { ...n, children: walk(n.children) } : n));
    return walk(list);
  };

  const requestRename = (id: string) => {
    const node = folderIndex.get(id) ?? null;
    setRenameId(id);
    setRenameValue(node?.name ?? "");
    setRenameOpen(true);
  };

  const commitRename = () => {
    const id = renameId;
    const name = renameValue.trim();
    if (!id || !name) return;
    onFoldersChangeAction(renameFolderById(folders, id, name));
    setRenameOpen(false);
    setRenameId(null);
    setRenameValue("");
  };

  const requestDelete = (id: string) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const commitDelete = () => {
    const id = deleteId;
    if (!id) return;

    const node = folderIndex.get(id) ?? null;
    const idsToRemove = node ? collectIds(node) : [id];

    // If the selected folder is being deleted (or is inside the deleted subtree), reset to all
    if (selectedId && node && containsId(node, selectedId)) {
      onSelectAction?.("all");
    } else if (selectedId === id) {
      onSelectAction?.("all");
    }

    // Remove from starred folders
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      idsToRemove.forEach((x) => next.delete(x));
      return next;
    });

    onFoldersChangeAction(deleteFolderById(folders, id));

    setDeleteOpen(false);
    setDeleteId(null);
  };

  return (
    <aside
      className={cn(
        "relative h-full shrink-0 border-r border-border bg-background overflow-y-auto transition-[width] duration-200",
        collapsed && "border-r-transparent",
        className
      )}
      style={{ width: collapsed ? 14 : sidebarWidth }}
      onKeyDown={(e) => {
        if (!collapsed) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setCollapsed(false);
        }
      }}
      tabIndex={collapsed ? 0 : undefined}
      role={collapsed ? "button" : undefined}
      aria-label={collapsed ? "Show sidebar" : undefined}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        title="Drag to resize"
        onMouseDown={collapsed ? undefined : onStartResize}
        onClick={(e) => e.preventDefault()}
        className={cn(
          "absolute right-0 top-0 h-full cursor-col-resize",
          collapsed ? "w-0 pointer-events-none" : "w-2"
        )}
      >
        {!collapsed ? <div className="absolute right-0 top-0 h-full w-px bg-border/60" /> : null}
      </div>
      {!collapsed && (
        <>
        <div className="flex items-center justify-end px-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(true);
            }}
            aria-label="Hide sidebar"
            title="Hide sidebar"
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      <div className="h-4" />

      <CommandPalette
        folders={folders}
        smartFolders={smartFoldersForPalette}
        onSelect={(id) => {
          if (onSelectAction) onSelectAction(id);
        }}
        onCreateFolder={() => setCreateOpen(true)}
      />

      {/* Rename folder */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Rename folder</DialogTitle>
          </DialogHeader>

          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Folder name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitRename();
              }
            }}
          />

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={commitRename}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Rename smart folder */}
      <Dialog open={smartRenameOpen} onOpenChange={setSmartRenameOpen}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Rename smart folder</DialogTitle>
          </DialogHeader>

          <Input
            value={smartRenameValue}
            onChange={(e) => setSmartRenameValue(e.target.value)}
            placeholder="Smart folder name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitSmartRename();
              }
            }}
          />

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setSmartRenameOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={commitSmartRename}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateSmartFolderDialog
        open={createSmartOpen}
        onOpenChange={setCreateSmartOpen}
        onCreate={createSmartFolder}
      />

      {/* Delete folder */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the folder and its subfolders from the sidebar. (Demo)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                commitDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="space-y-3 px-2">
        {/* All files (not a folder) */}
        <button
          type="button"
          onClick={() => onSelectAction?.("all")}
          className={cn(navRowBase, selectedId === "all" && navRowActive)}
          aria-current={selectedId === "all" ? "page" : undefined}
        >
          <Folder className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">All files</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectAction?.("purchases")}
          className={cn(navRowBase, selectedId === "purchases" && navRowActive)}
          aria-current={selectedId === "purchases" ? "page" : undefined}
        >
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">Purchases</span>
          {hasNewPurchases && selectedId !== 'purchases' ? (
            <span
              className="ml-auto relative inline-flex items-center"
              aria-label={`${newPurchasesLabel} new purchases`}
              title={`${newPurchasesLabel} new purchases`}
            >
              {/* subtle pulse ring */}
              <span className="absolute -inset-1 rounded-full bg-red-500/20 animate-pulse motion-reduce:animate-none" />
              {/* badge */}
              <span className="relative inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold leading-none text-white">
                {newPurchasesLabel}
              </span>
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => onSelectAction?.("favorites")}
          className={cn(navRowBase, selectedId === "favorites" && navRowActive)}
          aria-current={selectedId === "favorites" ? "page" : undefined}
        >
          <Heart className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">Favorites</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectAction?.("trash")}
          className={cn(navRowBase, selectedId === "trash" && navRowActive)}
          aria-current={selectedId === "trash" ? "page" : undefined}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">Trash</span>
        </button>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => toggleSection("smart")}
              className={sectionHeaderBase}
              aria-label={sectionsOpen.smart ? "Collapse smart folders" : "Expand smart folders"}
              aria-expanded={sectionsOpen.smart}
              aria-controls="cbx-sidebar-smart-folders"
            >
              <SectionChevron open={sectionsOpen.smart} />
              <span>Smart folders</span>
            </button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Create smart folder"
              title="Create smart folder"
              onClick={() => setCreateSmartOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {sectionsOpen.smart && (
            <div id="cbx-sidebar-smart-folders">
              {smartFolderDefs.map((sf) => {
                return (
                  <div
                    key={sf.id}
                    className={cn(navRowBase, selectedId === sf.id && navRowActive)}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectAction?.(sf.id)}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{sf.name}</span>
                    </button>
                    <div className="ml-auto flex w-9 items-center justify-end">
                      <div
                        className={cn(
                          "pointer-events-auto opacity-0 transition-opacity",
                          "group-hover:opacity-100"
                        )}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => e.stopPropagation()}
                              aria-label="Smart folder actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                requestSmartRename(sf.id);
                              }}
                            >
                              Rename
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                duplicateSmartFolder(sf.id);
                              }}
                            >
                              Duplicate
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={(e) => {
                                e.preventDefault();
                                deleteSmartFolder(sf.id);
                              }}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {favoritesReady && (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => toggleSection("starred")}
              className={sectionHeaderBase}
              aria-label={sectionsOpen.starred ? "Collapse starred folders" : "Expand starred folders"}
              aria-expanded={sectionsOpen.starred}
              aria-controls="cbx-sidebar-starred-folders"
            >
              <SectionChevron open={sectionsOpen.starred} />
              <span>Starred folders</span>
            </button>

            {favoriteIds.size === 0 ? (
              sectionsOpen.starred && (
                <div id="cbx-sidebar-starred-folders">
                  <div className="mx-2 rounded-md bg-muted/40 px-2 py-2 text-xs text-muted-foreground">
                    No starred folders yet. Use <span className="font-medium">⋯</span> on a folder to star it.
                  </div>
                </div>
              )
            ) : (
              sectionsOpen.starred && (
                <div id="cbx-sidebar-starred-folders" className="space-y-1">
                  {Array.from(favoriteIds)
                    .map((id) => folderIndex.get(id))
                    .filter((n): n is FolderNode => Boolean(n))
                    .map((n) => (
                      <div
                        key={`fav-${n.id}`}
                        className={cn(navRowBase, selectedId === n.id && navRowActive)}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectAction?.(n.id)}
                          className="flex flex-1 items-center gap-2 text-left"
                        >
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="truncate">{n.name}</span>
                        </button>

                        <div className="ml-auto flex w-9 items-center justify-end">
                          <div
                            className={cn(
                              "pointer-events-auto opacity-0 transition-opacity",
                              "group-hover:opacity-100"
                            )}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label="Starred folder actions"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    toggleFavorite(n.id);
                                  }}
                                >
                                  Unstar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )
            )}
          </div>
        )}

        <div className="space-y-1">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => toggleSection("folders")}
                className={sectionHeaderBase}
                aria-label={sectionsOpen.folders ? "Collapse folders" : "Expand folders"}
                aria-expanded={sectionsOpen.folders}
                aria-controls="cbx-sidebar-folders"
              >
                <SectionChevron open={sectionsOpen.folders} />
                <span>Folders</span>
              </button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Sort folders"
                title={folderSort === "name_asc" ? "Sort A–Z" : "Sort Z–A"}
                onClick={() =>
                  setFolderSort((s) => (s === "name_asc" ? "name_desc" : "name_asc"))
                }
              >
                <ArrowUpDown className="h-3 w-3" />
              </Button>

              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Create folder"
                    title="Create folder"
                    onClick={() => {
                      setCreateOpen(true);
                      setNewFolderName("");
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-[420px]">
                  <DialogHeader>
                    <DialogTitle>Create folder</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      {isRealFolder ? (
                        <>Folder will be created inside the selected folder.</>
                      ) : (
                        <>Folder will be created at the root level.</>
                      )}
                    </div>

                    <Input
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Folder name"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          createFolder();
                        }
                      }}
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setCreateOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="button" onClick={createFolder}>
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            {sectionsOpen.folders && (
              <div className="px-2">
                <div className="relative">
                  <Input
                    value={folderQuery}
                    onChange={(e) => setFolderQuery(e.target.value)}
                    placeholder="Search folders…"
                    className="h-8 pr-9"
                  />

                  {folderQuery.trim().length > 0 && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => setFolderQuery("")}
                      aria-label="Clear folder search"
                      title="Clear"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          {sectionsOpen.folders && (
            <div
              id="cbx-sidebar-folders"
              className={cn(
                "transition-opacity duration-150",
                !openReady && folderQuery.trim().length === 0 && "pointer-events-none opacity-0"
              )}
            >
              {visibleFolders.length === 0 && (
                <div className="px-2 py-2 text-sm text-muted-foreground">
                  No folders found.
                </div>
              )}
              {visibleFolders.map((folder) => (
                <FolderRow
                  key={folder.id}
                  node={folder}
                  level={0}
                  selectedId={selectedId}
                  onSelectAction={onSelectAction}
                  isFavorite={favoriteIds.has(folder.id)}
                  onToggleFavorite={toggleFavorite}
                  favoriteIds={favoriteIds}
                  onRename={requestRename}
                  onDelete={requestDelete}
                  getOpen={isOpen}
                  onToggleOpen={toggleOpen}
                  onDropAssetAction={onDropAssetAction}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      </>
      )}
      {collapsed && (
        <div className="relative h-full">
          {/* easy click target to re-open (invisible) */}
          <button
            type="button"
            aria-label="Show sidebar"
            title="Show sidebar"
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(false);
            }}
            className="absolute inset-0 z-[50] bg-transparent"
          />

          {/* hairline rail */}
          <div className="absolute left-1/2 top-0 z-[55] h-full w-px -translate-x-1/2 bg-border/60" />
          {hasNewPurchases ? (
            <div
              className="absolute top-16 left-1/2 z-[80] -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-red-500 shadow"
              aria-label={`${newPurchasesLabel} new purchases`}
              title={`${newPurchasesLabel} new purchases`}
            />
          ) : null}

          {/* slim grab handle (drag to resize + open) */}
          <button
            type="button"
            aria-label="Markér eller træk for at udvide"
            title="Markér eller træk for at udvide"
            onMouseDown={(e) => {
              e.stopPropagation();
              onStartResizeCollapsed(e);
            }}
            className="absolute top-3 left-1/2 z-[70] -translate-x-1/2 flex h-10 w-3 items-center justify-center rounded-full bg-border/60 hover:bg-border cursor-col-resize"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground/70" />
          </button>
        </div>
      )}
    </aside>
  );
}

function FolderRow({
  node,
  level,
  selectedId,
  onSelectAction,
  isFavorite,
  onToggleFavorite,
  onRename,
  onDelete,
  favoriteIds,
  getOpen,
  onToggleOpen,
  onDropAssetAction,
}: {
  node: FolderNode;
  level: number;
  selectedId?: string;
  onSelectAction?: (id: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  onRename?: (id: string) => void;
  onDelete?: (id: string) => void;
  favoriteIds: Set<string>;
  getOpen: (id: string) => boolean;
  onToggleOpen: (id: string) => void;
  onDropAssetAction?: (assetId: number, folderId: string) => void;
}) {
  const open = getOpen(node.id);
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isActive = selectedId === node.id;
  const [dragOver, setDragOver] = React.useState(false);
  const droppable = typeof onDropAssetAction === "function";

  return (
    <div>
      <div
        onDragEnter={(e) => {
          if (!droppable) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          if (!droppable) return;
          e.preventDefault();
        }}
        onDragLeave={() => {
          if (!droppable) return;
          setDragOver(false);
        }}
        onDrop={(e) => {
          if (!droppable) return;
          e.preventDefault();
          setDragOver(false);

          const rawIds = e.dataTransfer.getData("application/x-cbx-asset-ids");
          const rawId = e.dataTransfer.getData("application/x-cbx-asset-id");
          const rawText = e.dataTransfer.getData("text/plain");

          // 1) Preferred: JSON array of ids
          if (rawIds) {
            try {
              const parsed = JSON.parse(rawIds) as unknown;
              const ids = Array.isArray(parsed)
                ? parsed.map((x) => Number(x)).filter((n) => Number.isFinite(n))
                : [];

              if (ids.length > 0) {
                ids.forEach((id) => onDropAssetAction?.(id, node.id));
                return;
              }
            } catch {
              // fall through
            }
          }

          // 2) Fallback: single id
          // Prefer our custom mime type. As a safe fallback, accept a tagged text format: "cbx-asset:<id>"
          const raw =
            rawId ||
            (rawText?.startsWith("cbx-asset:") ? rawText.slice("cbx-asset:".length) : "");

          const assetId = Number(raw);
          if (!Number.isFinite(assetId)) return;

          onDropAssetAction?.(assetId, node.id);
        }}
        className={cn(
          "group flex w-full items-center gap-2 rounded-md px-2 h-9 text-sm transition-colors",
          "hover:bg-muted",
          isActive && "bg-muted font-medium",
          dragOver && "ring-1 ring-ring bg-muted/60"
        )}
        style={{ paddingLeft: 8 + level * 12 }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="-ml-1 inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-background/60"
            onClick={(e) => {
              e.stopPropagation();
              onToggleOpen(node.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onToggleOpen(node.id);
              }
            }}
            aria-label={open ? "Collapse folder" : "Expand folder"}
            aria-expanded={open}
          >
            <SectionChevron open={open} />
          </button>
        ) : (
          <span className="w-7" />
        )}

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => onSelectAction?.(node.id)}
          aria-current={isActive ? "page" : undefined}
        >
          {open && hasChildren ? (
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="truncate">{node.name}</span>
        </button>

        <div className="ml-auto flex w-9 items-center justify-end">
          <div
            className={cn(
              "pointer-events-auto opacity-0 transition-opacity",
              "group-hover:opacity-100"
            )}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Folder actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    onToggleFavorite?.(node.id);
                  }}
                >
                  <Star
                    className={cn(
                      "mr-2 h-4 w-4",
                      isFavorite
                        ? "fill-yellow-400 text-yellow-500"
                        : "text-muted-foreground"
                    )}
                  />
                  {isFavorite ? "Unstar" : "Star"}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    onRename?.(node.id);
                  }}
                >
                  Rename
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={(e) => {
                    e.preventDefault();
                    onDelete?.(node.id);
                  }}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {hasChildren && open && (
        <div className="mt-1 space-y-1">
          {node.children!.map((child) => (
            <FolderRow
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              onSelectAction={onSelectAction}
              isFavorite={favoriteIds.has(child.id)}
              onToggleFavorite={onToggleFavorite}
              favoriteIds={favoriteIds}
              onRename={onRename}
              onDelete={onDelete}
              getOpen={getOpen}
              onToggleOpen={onToggleOpen}
              onDropAssetAction={onDropAssetAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function getFolderPathById(
  targetId: string,
  nodes: FolderNode[]
): FolderNode[] {
  if (
    !targetId ||
    SYSTEM_VIEWS.has(targetId) ||
    targetId.startsWith("smart:")
  )
    return [];

  const walk = (list: FolderNode[], acc: FolderNode[]): FolderNode[] | null => {
    for (const n of list) {
      const next = [...acc, n];
      if (n.id === targetId) return next;
      if (n.children && n.children.length) {
        const found = walk(n.children, next);
        if (found) return found;
      }
    }
    return null;
  };

  return walk(nodes, []) ?? [];
}