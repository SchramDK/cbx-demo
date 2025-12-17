"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ViewerSidebar } from "@/components/viewer-sidebar";
import { useEffect, useMemo, useRef, useState } from "react";

export type ViewerItem = {
  id: number | string;
  title: string;
  src: string;
};

interface ViewerModalProps {
  open: boolean;
  item: ViewerItem | null;
  items: ViewerItem[];
  onClose: () => void;
}

export function ViewerModal({ open, item, items, onClose }: ViewerModalProps) {
  const [current, setCurrent] = useState<ViewerItem | null>(item);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewerTab, setViewerTab] = useState<"info" | "comments">("info");

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => setIsMobile(mq.matches);

    apply();

    // Safari < 14 fallback
    // @ts-ignore
    if (mq.addEventListener) mq.addEventListener("change", apply);
    // @ts-ignore
    else mq.addListener(apply);

    return () => {
      // @ts-ignore
      if (mq.removeEventListener) mq.removeEventListener("change", apply);
      // @ts-ignore
      else mq.removeListener(apply);
    };
  }, []);

  const [palette, setPalette] = useState<string[]>([]);
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [paletteError, setPaletteError] = useState<string | null>(null);

  // --- Local asset metadata (Phase A: localStorage demo) ---
  type CommentReply = { id: string; text: string; createdAt: string };
  type CommentItem = { id: string; text: string; createdAt: string; replies?: CommentReply[] };

  type AssetMeta = {
    tags: string[];
    comments: CommentItem[];
    updatedAt: string;
  };

  const [meta, setMeta] = useState<AssetMeta>({
    tags: [],
    comments: [],
    updatedAt: new Date().toISOString(),
  });

  const saveTimerRef = useRef<number | null>(null);

  const [tagInput, setTagInput] = useState("");

  const [commentInput, setCommentInput] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const uid = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
    return `c_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  };

  const commentAuthorName = "Nicki";
  const commentAuthorInitials = "NL";

  // const metaKey = current ? `CBX_META_V1:${String(current.id)}` : null;

  const endPan = () => setIsPanning(false);

  const currentIndex = useMemo(() => {
    if (!current) return -1;
    return items.findIndex((i) => i.id === current.id);
  }, [current, items]);

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

  const rgbToHex = (r: number, g: number, b: number) => {
    const toHex = (n: number) => n.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  };

  const extractPalette = (img: HTMLImageElement, count = 8) => {
    // Lightweight k-means on sampled pixels (better "dominant" colors than simple histograms)
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return [] as string[];

    // Downscale for speed
    const maxW = 220;
    const maxH = 220;
    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.width = w;
    canvas.height = h;

    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;

    // Sample pixels (skip fully transparent). Keep a broad range (including dark/light)
    const samples: Array<[number, number, number]> = [];
    const stride = 4 * 3; // sample every ~3 pixels

    for (let i = 0; i < data.length; i += stride) {
      const a = data[i + 3];
      if (a < 220) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Ignore near-transparent / very low-variance noise by simple saturation check
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max - min;
      if (sat < 6 && max < 30) continue; // very dark noise

      samples.push([r, g, b]);
      if (samples.length >= 6000) break;
    }

    if (samples.length === 0) return [] as string[];

    // K-means
    const k = Math.min(Math.max(3, count + 2), 12);
    const centroids: Array<[number, number, number]> = [];

    // Init: pick evenly spread samples
    for (let i = 0; i < k; i++) {
      const idx = Math.floor((i / k) * (samples.length - 1));
      centroids.push([...samples[idx]] as [number, number, number]);
    }

    const iters = 10;
    const sums = new Array(k).fill(0).map(() => ({ r: 0, g: 0, b: 0, n: 0 }));

    const dist2 = (a: [number, number, number], c: [number, number, number]) => {
      const dr = a[0] - c[0];
      const dg = a[1] - c[1];
      const db = a[2] - c[2];
      return dr * dr + dg * dg + db * db;
    };

    for (let t = 0; t < iters; t++) {
      for (let i = 0; i < k; i++) sums[i] = { r: 0, g: 0, b: 0, n: 0 };

      for (const p of samples) {
        let best = 0;
        let bestD = Infinity;
        for (let i = 0; i < k; i++) {
          const d = dist2(p, centroids[i]);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
        sums[best].r += p[0];
        sums[best].g += p[1];
        sums[best].b += p[2];
        sums[best].n += 1;
      }

      for (let i = 0; i < k; i++) {
        if (sums[i].n === 0) continue;
        centroids[i] = [
          Math.round(sums[i].r / sums[i].n),
          Math.round(sums[i].g / sums[i].n),
          Math.round(sums[i].b / sums[i].n),
        ];
      }
    }

    // Turn clusters into colors ordered by weight
    const clusters = centroids
      .map((c, i) => ({ c, n: sums[i]?.n ?? 0 }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n);

    // Distinctness filter: avoid near-duplicates
    const out: string[] = [];
    const outRgb: Array<[number, number, number]> = [];

    const minDist = 22; // higher -> more distinct colors
    const minDist2 = minDist * minDist;

    for (const cl of clusters) {
      const c = cl.c as [number, number, number];

      // Skip extreme near-white/near-black unless we don't have enough colors
      const luma = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      const isExtreme = luma < 6 || luma > 249;
      if (isExtreme && out.length >= Math.min(4, count)) continue;

      let ok = true;
      for (const o of outRgb) {
        if (dist2(c, o) < minDist2) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      out.push(rgbToHex(c[0], c[1], c[2]));
      outRgb.push(c);
      if (out.length >= count) break;
    }

    return out;
  };

  const openAt = (i: number) => {
    if (!items.length) return;
    const next = items[(i + items.length) % items.length];
    setCurrent(next);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsPanning(false);
  };

  const addTag = (raw: string) => {
    const parts = raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (!parts.length) return;

    setMeta((m) => {
      const existing = new Set(m.tags.map((t) => t.toLowerCase()));
      const merged = [...m.tags];
      for (const t of parts) {
        const k = t.toLowerCase();
        if (!existing.has(k)) {
          existing.add(k);
          merged.push(t);
        }
      }
      return { ...m, tags: merged, updatedAt: new Date().toISOString() };
    });

    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setMeta((m) => ({
      ...m,
      tags: m.tags.filter((t) => t !== tag),
      updatedAt: new Date().toISOString(),
    }));
  };

  const postComment = () => {
    const text = commentInput.trim();
    if (!text) return;

    setMeta((m) => ({
      ...m,
      comments: [{ id: uid(), text, createdAt: new Date().toISOString(), replies: [] }, ...m.comments],
      updatedAt: new Date().toISOString(),
    }));

    setCommentInput("");
  };

  const startReply = (id: string) => {
    setReplyToId(id);
    setReplyText("");
  };

  const cancelReply = () => {
    setReplyToId(null);
    setReplyText("");
  };

  const postReply = () => {
    const text = replyText.trim();
    if (!replyToId) return;
    if (!text) return;

    const reply: CommentReply = { id: uid(), text, createdAt: new Date().toISOString() };

    setMeta((m) => ({
      ...m,
      comments: m.comments.map((c) =>
        c.id === replyToId
          ? { ...c, replies: [...(Array.isArray(c.replies) ? c.replies : []), reply] }
          : c
      ),
      updatedAt: new Date().toISOString(),
    }));

    cancelReply();
  };

  const startEditComment = (id: string, text: string) => {
    setEditingCommentId(id);
    setEditingCommentText(text);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const saveEditComment = () => {
    const text = editingCommentText.trim();
    if (!editingCommentId) return;
    if (!text) return;

    setMeta((m) => ({
      ...m,
      comments: m.comments.map((c) => (c.id === editingCommentId ? { ...c, text } : c)),
      updatedAt: new Date().toISOString(),
    }));

    cancelEditComment();
  };

  const deleteComment = (id: string) => {
    setMeta((m) => ({
      ...m,
      comments: m.comments.filter((c) => c.id !== id),
      updatedAt: new Date().toISOString(),
    }));
    if (editingCommentId === id) cancelEditComment();
    if (replyToId === id) cancelReply();
  };


  // Sync when parent changes the selected item
  useEffect(() => {
    setCurrent(item);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsPanning(false);
    setSidebarOpen(true);
    setViewerTab("info");
    setReplyToId(null);
    setReplyText("");
  }, [item]);

  // Load asset meta from localStorage
  useEffect(() => {
    if (!open || !current) return;
    const key = `CBX_META_V1:${String(current.id)}`;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        setMeta({ tags: [], comments: [], updatedAt: new Date().toISOString() });
        setTagInput("");
        setCommentInput("");
        setReplyToId(null);
        setReplyText("");
        return;
      }
      const parsed = JSON.parse(raw) as Partial<AssetMeta>;
      setMeta({
        tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t) => typeof t === "string") : [],
        comments: Array.isArray(parsed.comments)
          ? parsed.comments
              .filter((c: any) => c && typeof c.text === "string")
              .map((c: any) => ({
                id: typeof c.id === "string" ? c.id : uid(),
                text: String(c.text),
                createdAt: typeof c.createdAt === "string" ? c.createdAt : new Date().toISOString(),
                replies: Array.isArray(c.replies)
                  ? c.replies
                      .filter((r: any) => r && typeof r.text === "string")
                      .map((r: any) => ({
                        id: typeof r.id === "string" ? r.id : uid(),
                        text: String(r.text),
                        createdAt:
                          typeof r.createdAt === "string" ? r.createdAt : new Date().toISOString(),
                      }))
                  : [],
              }))
          : [],
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
      });
    } catch {
      setMeta({ tags: [], comments: [], updatedAt: new Date().toISOString() });
    }

    setTagInput("");
    setCommentInput("");
    setReplyToId(null);
    setReplyText("");
  }, [open, current]);

  // Save asset meta to localStorage (debounced)
  useEffect(() => {
    if (!open || !current) return;
    const key = `CBX_META_V1:${String(current.id)}`;

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(meta));
      } catch {
        // ignore storage errors in demo
      }
    }, 300);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [open, current, meta]);

  // Extract palette for the current image (requires CORS-enabled images)
  useEffect(() => {
    if (!open || !current) return;

    let cancelled = false;
    setPaletteError(null);

    const img = new Image();
    // Required for canvas sampling on remote images that support CORS
    img.crossOrigin = "anonymous";
    img.src = current.src;

    img.onload = () => {
      if (cancelled) return;
      try {
        const colors = extractPalette(img, 10);
        setPalette(colors);
        setActiveColor(colors[0] ?? null);
      } catch (e) {
        setPalette([]);
        setActiveColor(null);
        setPaletteError("Palette unavailable");
      }
    };

    img.onerror = () => {
      if (cancelled) return;
      setPalette([]);
      setActiveColor(null);
      setPaletteError("Palette unavailable");
    };

    return () => {
      cancelled = true;
    };
  }, [open, current]);

  // Recenter when zooming back out
  useEffect(() => {
    if (!open || !current) return;
    if (zoom <= 1) {
      if (zoom !== 1) setZoom(1);
      if (pan.x !== 0 || pan.y !== 0) setPan({ x: 0, y: 0 });
      if (isPanning) setIsPanning(false);
    }
  }, [zoom, open, current, pan.x, pan.y, isPanning]);

  // Keyboard controls
  useEffect(() => {
    if (!open || !current) return;

    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const isTyping =
        !!el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          (el as any).isContentEditable === true);

      if (e.key === "Escape") {
        e.preventDefault();
        // On mobile, close the Sheet first if it is open
        if (isMobile && sidebarOpen) {
          setSidebarOpen(false);
          return;
        }
        onClose();
        return;
      }

      // Don't navigate while typing
      if (isTyping) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        openAt(currentIndex + 1);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        openAt(currentIndex - 1);
        return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, current, currentIndex, onClose, isMobile, sidebarOpen]);

  if (!open || !current) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="fixed inset-0 z-50 bg-background/95" onClick={onClose}>
        {/* click on overlay closes; clicking inside should not */}
        <div className="flex h-full w-full flex-col" onClick={(e) => e.stopPropagation()}>
          {/* Top menu */}
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background/70 px-3 backdrop-blur sm:px-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" className="max-w-[55vw] justify-start gap-2 rounded-full px-3 py-1">
                <span className="truncate">{current.title}</span>
                <span className="text-muted-foreground">▾</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Asset actions</TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-2 rounded-full border border-border bg-background/70 px-2 py-1 text-sm text-foreground">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 rounded-full px-2"
                  aria-label="Zoom out"
                  onClick={() =>
                    setZoom((z) => {
                      const next = clamp(Number((z - 0.25).toFixed(2)), 1, 3);
                      if (next === 1) setPan({ x: 0, y: 0 });
                      return next;
                    })
                  }
                >
                  −
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom out</TooltipContent>
            </Tooltip>
            <div className="min-w-[56px] text-center tabular-nums text-foreground">
              {Math.round(zoom * 100)}%
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 rounded-full px-2"
                  aria-label="Zoom in"
                  onClick={() => setZoom((z) => clamp(Number((z + 0.25).toFixed(2)), 1, 3))}
                >
                  +
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom in</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={sidebarOpen ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 rounded-full px-3"
                  onClick={() => setSidebarOpen((v) => !v)}
                  aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                  aria-pressed={sidebarOpen}
                >
                  ⓘ
                </Button>
              </TooltipTrigger>
              <TooltipContent>{sidebarOpen ? "Hide info" : "Show info"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full px-3"
                  onClick={onClose}
                  aria-label="Close"
                >
                  ESC
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close viewer</TooltipContent>
            </Tooltip>
          </div>
          </div>

        {/* Body: stage + optional sidebar */}
        <div className="flex min-h-0 flex-1">
          {/* Image stage */}
          <div
            className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden"
            onPointerDown={(e) => {
              if (zoom <= 1) return;
              // start panning
              setIsPanning(true);
              panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
            }}
            onPointerMove={(e) => {
              if (!isPanning || zoom <= 1) return;
              const dx = e.clientX - panStartRef.current.x;
              const dy = e.clientY - panStartRef.current.y;
              setPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
            }}
            onPointerUp={endPan}
            onPointerCancel={endPan}
            style={{ cursor: zoom > 1 ? (isPanning ? "grabbing" : "grab") : "default" }}
          >
            <img
              src={current.src}
              alt={current.title}
              className="max-h-[90vh] max-w-[90vw] select-none object-contain"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transition: isPanning ? "none" : "transform 120ms ease-out",
              }}
              draggable={false}
            />

            {/* Color palette (bottom-left) */}
            {(palette.length > 0 || paletteError) && (
              <div className="absolute bottom-4 left-4 rounded-2xl border border-border bg-background/70 p-3 text-foreground backdrop-blur">
                {activeColor && (
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-muted/30 px-3 py-1 text-xs">
                    <span
                      className="h-3 w-3 rounded-full border border-border"
                      style={{ backgroundColor: activeColor }}
                    />
                    <span className="tabular-nums">{activeColor}</span>
                  </div>
                )}

                {paletteError ? (
                  <div className="text-xs text-muted-foreground">{paletteError}</div>
                ) : (
                  <div className="flex gap-2">
                    {palette.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setActiveColor(c)}
                        className={
                          activeColor === c
                            ? "h-7 w-7 rounded-full ring-2 ring-ring"
                            : "h-7 w-7 rounded-full ring-1 ring-border hover:ring-ring/60"
                        }
                        style={{ backgroundColor: c }}
                        aria-label={c}
                        title={c}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mobile hint */}
            <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-background/80 px-4 py-2 text-sm text-foreground backdrop-blur sm:hidden">
              Tap outside to close • ← → to navigate • ESC
            </div>
          </div>

          {/* Right sidebar (desktop/tablet) */}
          {!isMobile && sidebarOpen && (
            <aside className="h-full w-[360px] shrink-0 border-l border-border bg-background/70 backdrop-blur">
              <ViewerSidebar
                meta={meta}
                setMeta={setMeta}
                assetTitle={current.title}
                assetId={String(current.id)}
                viewerTab={viewerTab}
                setViewerTab={(v) => setViewerTab(v as "info" | "comments")}
                tagInput={tagInput}
                setTagInput={setTagInput}
                addTag={() => addTag(tagInput)}
                removeTag={removeTag}
                commentInput={commentInput}
                setCommentInput={setCommentInput}
                postComment={postComment}
                deleteComment={deleteComment}
                editingCommentId={editingCommentId}
                editingCommentText={editingCommentText}
                setEditingCommentId={setEditingCommentId}
                setEditingCommentText={setEditingCommentText}
                saveEditComment={saveEditComment}
                cancelEditComment={cancelEditComment}
                replyToId={replyToId}
                replyText={replyText}
                setReplyText={setReplyText}
                startReply={startReply}
                postReply={postReply}
                cancelReply={cancelReply}
              />
            </aside>
          )}
          {/* Mobile sidebar as Sheet */}
          {isMobile && (
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetContent side="right" className="w-[92vw] max-w-[360px] p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Asset information</SheetTitle>
                </SheetHeader>

                <div className="flex h-full flex-col bg-background/70 backdrop-blur">
                  <ViewerSidebar
                    meta={meta}
                    setMeta={setMeta}
                    assetTitle={current.title}
                    assetId={String(current.id)}
                    viewerTab={viewerTab}
                    setViewerTab={(v) => setViewerTab(v as "info" | "comments")}
                    tagInput={tagInput}
                    setTagInput={setTagInput}
                    addTag={() => addTag(tagInput)}
                    removeTag={removeTag}
                    commentInput={commentInput}
                    setCommentInput={setCommentInput}
                    postComment={postComment}
                    deleteComment={deleteComment}
                    editingCommentId={editingCommentId}
                    editingCommentText={editingCommentText}
                    setEditingCommentId={setEditingCommentId}
                    setEditingCommentText={setEditingCommentText}
                    saveEditComment={saveEditComment}
                    cancelEditComment={cancelEditComment}
                    replyToId={replyToId}
                    replyText={replyText}
                    setReplyText={setReplyText}
                    startReply={startReply}
                    postReply={postReply}
                    cancelReply={cancelReply}
                  />
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
        </div>
      </div>
    </TooltipProvider>
  );
}