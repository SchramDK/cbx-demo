"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type SubfolderItem = {
  id: string;
  name: string;
  coverSrc?: string;
  count: number;
};

function parseDroppedIds(dt: DataTransfer): number[] {
  const raw =
    dt.getData("application/cbx-asset-ids") ||
    dt.getData("application/json") ||
    dt.getData("text/plain") ||
    dt.getData("application/x-cbx-asset-id");

  if (!raw) return [];

  // JSON array
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((x) => Number(x)).filter((n) => Number.isFinite(n));
    }
  } catch {
    // ignore
  }

  // fallback: comma/space separated
  return raw
    .split(/[\s,]+/g)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n));
}

export function SubfolderStrip({
  items,
  onOpenFolder,
  onDropAssets,
  className,
}: {
  items: SubfolderItem[];
  onOpenFolder: (folderId: string) => void;
  onDropAssets: (assetIds: number[], folderId: string) => void;
  className?: string;
}) {
  const [dragOverId, setDragOverId] = React.useState<string | null>(null);

  if (!items.length) return null;

  return (
    <div className={cn("mb-5", className)}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium">Subfolders</div>
        <div className="text-xs text-muted-foreground">{items.length} total</div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {items.map((sf) => (
          <button
            key={sf.id}
            type="button"
            onClick={() => onOpenFolder(sf.id)}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOverId(sf.id);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverId(sf.id);
            }}
            onDragLeave={() =>
              setDragOverId((prev) => (prev === sf.id ? null : prev))
            }
            onDrop={(e) => {
              e.preventDefault();
              setDragOverId(null);

              const ids = parseDroppedIds(e.dataTransfer);
              if (ids.length === 0) return;

              onDropAssets(ids, sf.id);
            }}
            className={cn(
              "group flex w-56 shrink-0 items-center gap-3 rounded-lg border border-border bg-background/60 p-3 text-left transition hover:bg-accent",
              dragOverId === sf.id && "ring-2 ring-ring bg-accent"
            )}
          >
            <div className="h-12 w-12 overflow-hidden rounded-md border border-border bg-muted">
              {sf.coverSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sf.coverSrc}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  —
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium group-hover:underline">
                {sf.name}
              </div>
              <div className="text-xs text-muted-foreground">{sf.count} files</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
