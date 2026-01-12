
"use client";

import * as React from "react";
import {
  ArrowUpDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Heart,
  MoreHorizontal,
  Plus,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  CreateSmartFolderDialog,
  type SmartRule,
} from "@/components/smart-folders/CreateSmartFolderDialog";
import { Input } from "@/components/ui/input";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

export type FolderNode = {
  id: string;
  name: string;
  children?: FolderNode[];
};

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

function findNodeById(id: string, nodes: FolderNode[]): FolderNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children?.length) {
      const found = findNodeById(id, n.children);
      if (found) return found;
    }
  }
  return null;
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
  for (const n of nodes) {
    const nextTrail = [...trail, n.name];
    const path = nextTrail.join(" / ");
    out.push({ id: n.id, label: n.name, keywords: path });
    if (n.children?.length) out.push(...flattenFolders(n.children, nextTrail));
  }
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

  // Cmd/Ctrl+Shift+K (and Cmd/Ctrl+P) opens the palette
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
      const isCmdP = mod && !e.shiftKey && key === "p";

      if ((isCmdShiftK || isCmdP) && !typingTarget) {
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
    try {
      const raw = window.localStorage.getItem("CBX_FAVORITES_V1");
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      setFavoriteIds(new Set(arr));
    } catch {
      setFavoriteIds(new Set());
    } finally {
      setFavoritesReady(true);
    }
  }, []);

  React.useEffect(() => {
    if (!favoritesReady) return;
    try {
      window.localStorage.setItem(
        "CBX_FAVORITES_V1",
        JSON.stringify(Array.from(favoriteIds))
      );
    } catch {
      // ignore
    }
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
    try {
      const raw = window.localStorage.getItem("CBX_SMART_FOLDERS_V1");
      const parsed = raw ? (JSON.parse(raw) as SmartFolderDef[]) : null;

      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned: SmartFolderDef[] = [];

        parsed.forEach((d) => {
          if (!d || typeof d.id !== "string" || typeof d.name !== "string") return;

          const kindOk =
            !d.kind || d.kind === "portraits" || d.kind === "wides" || d.kind === "squares";

          const rulesOk =
            !d.rules ||
            (Array.isArray(d.rules) &&
              d.rules.every(
                (r: any) =>
                  r &&
                  (r.field === "ratio" || r.field === "name" || r.field === "keywords") &&
                  (r.op === "is" || r.op === "contains") &&
                  typeof r.value === "string"
              ));

          if (kindOk && rulesOk) cleaned.push(d);
        });

        // If storage somehow contains nothing valid, fall back to defaults
        setSmartFolderDefs(cleaned.length ? cleaned : defaultSmartFolders);
      } else {
        setSmartFolderDefs(defaultSmartFolders);
      }
    } catch {
      setSmartFolderDefs(defaultSmartFolders);
    } finally {
      setSmartReady(true);
    }
  }, []);

  React.useEffect(() => {
    if (!smartReady) return;
    try {
      window.localStorage.setItem(
        "CBX_SMART_FOLDERS_V1",
        JSON.stringify(smartFolderDefs)
      );
    } catch {
      // ignore
    }
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
    try {
      const raw = window.localStorage.getItem("CBX_SIDEBAR_SECTIONS_V1");
      const parsed = raw ? (JSON.parse(raw) as Partial<typeof sectionsOpen>) : {};
      setSectionsOpen((prev) => ({
        smart: typeof parsed.smart === "boolean" ? parsed.smart : prev.smart,
        starred: typeof parsed.starred === "boolean" ? parsed.starred : prev.starred,
        folders: typeof parsed.folders === "boolean" ? parsed.folders : prev.folders,
      }));
    } catch {
      // ignore
    } finally {
      setSectionsReady(true);
    }
  }, []);

  React.useEffect(() => {
    if (!sectionsReady) return;
    try {
      window.localStorage.setItem(
        "CBX_SIDEBAR_SECTIONS_V1",
        JSON.stringify(sectionsOpen)
      );
    } catch {
      // ignore
    }
  }, [sectionsOpen, sectionsReady]);

  const toggleSection = React.useCallback((key: keyof typeof sectionsOpen) => {
    setSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const [folderQuery, setFolderQuery] = React.useState("");

  const [folderSort, setFolderSort] = React.useState<"name_asc" | "name_desc">("name_asc");

  const [openById, setOpenById] = React.useState<Record<string, boolean>>(() => ({}));
  const [openReady, setOpenReady] = React.useState(false);

  // Load persisted open/closed state after mount (avoid SSR hydration mismatch)
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem("CBX_FOLDER_OPEN_V1");
      const obj = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
      setOpenById(obj || {});
    } catch {
      // ignore
    } finally {
      setOpenReady(true);
    }
  }, []);

  // Persist on changes
  React.useEffect(() => {
    if (!openReady) return;
    try {
      window.localStorage.setItem("CBX_FOLDER_OPEN_V1", JSON.stringify(openById));
    } catch {
      // ignore
    }
  }, [openById, openReady]);

  const isOpen = (id: string) => {
    // While searching, force open so matches are visible
    if (folderQuery.trim().length > 0) return true;
    return openById[id] ?? false;
  };

  const toggleOpen = (id: string) => {
    setOpenById((prev) => ({ ...prev, [id]: !isOpen(id) }));
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
    const filtered = filterFolders(folders, folderQuery);
    return sortFolders(filtered);
  }, [folders, folderQuery, sortFolders]);

  const isRealFolder =
    selectedId &&
    selectedId !== "all" &&
    selectedId !== "favorites" &&
    selectedId !== "trash" &&
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
    const node = findNodeById(id, folders);
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

    const node = findNodeById(id, folders);
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
        "h-full w-64 shrink-0 border-r border-border bg-background",
        className
      )}
    >
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
        >
          <Folder className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">All files</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectAction?.("favorites")}
          className={cn(navRowBase, selectedId === "favorites" && navRowActive)}
        >
          <Heart className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">Favorites</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectAction?.("trash")}
          className={cn(navRowBase, selectedId === "trash" && navRowActive)}
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

          {sectionsOpen.smart &&
            smartFolderDefs.map((sf) => {
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

        {favoritesReady && (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => toggleSection("starred")}
              className={sectionHeaderBase}
              aria-label={sectionsOpen.starred ? "Collapse starred folders" : "Expand starred folders"}
            >
              <SectionChevron open={sectionsOpen.starred} />
              <span>Starred folders</span>
            </button>

            {favoriteIds.size === 0 ? (
              sectionsOpen.starred && (
                <div className="mx-2 rounded-md bg-muted/40 px-2 py-2 text-xs text-muted-foreground">
                  No starred folders yet. Use <span className="font-medium">⋯</span> on a folder to star it.
                </div>
              )
            ) : (
              sectionsOpen.starred && (
                <div className="space-y-1">
                  {Array.from(favoriteIds)
                    .map((id) => findNodeById(id, folders))
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
        role="button"
        tabIndex={0}
        onClick={() => {
          onSelectAction?.(node.id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelectAction?.(node.id);
          }
        }}
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

          const raw =
            e.dataTransfer.getData("application/x-cbx-asset-id") ||
            e.dataTransfer.getData("text/plain");

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
            aria-label={open ? "Collapse" : "Expand"}
          >
            <SectionChevron open={open} />
          </button>
        ) : (
          <span className="w-7" />
        )}
        {open && hasChildren ? (
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Folder className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="truncate">{node.name}</span>
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
    targetId === "all" ||
    targetId === "favorites" ||
    targetId === "trash" ||
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