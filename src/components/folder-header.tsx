"use client";

import * as React from "react";
import { Pencil, Image as ImageIcon, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export type FolderHeaderAsset = {
  id: number;
  title: string;
  src: string;
};

export type FolderHeaderProps = {
  folderId: string;
  folderName: string;
  assets: FolderHeaderAsset[];
  coverAssetId?: number | null;
  onSetCoverAction: (assetId: number) => void;
  className?: string;
};

export function FolderHeader({
  folderId,
  folderName,
  assets,
  coverAssetId,
  onSetCoverAction,
  className,
}: FolderHeaderProps) {
  const [open, setOpen] = React.useState(false);

  const hasAssets = assets.length > 0;

  const fallback = hasAssets ? assets[0] : undefined;
  const cover =
    (coverAssetId ? assets.find((a) => a.id === coverAssetId) : undefined) ?? fallback;

  const countLabel = hasAssets
    ? `${assets.length} file${assets.length === 1 ? "" : "s"}`
    : "No files";

  return (
    <div className={cn("mb-3 sm:mb-4", className)} data-folder-id={folderId}>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/40">
        {/* Cover */}
        <div className="relative h-[150px] w-full">
          {cover?.src ? (
            <img
              src={cover.src}
              alt={cover.title || folderName}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          )}

          {/* Soft overlay for legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/75 via-background/25 to-transparent" />

          {/* Text + actions */}
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold text-foreground">
                {folderName}
              </div>
              <div className="text-sm text-muted-foreground">{countLabel}</div>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  aria-label={`Choose cover image for ${folderName}`}
                  disabled={!hasAssets}
                  className="h-9 gap-2 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55"
                >
                  <Pencil className="h-4 w-4" />
                  Choose cover
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-[900px]">
                <DialogHeader>
                  <DialogTitle>Choose cover for “{folderName}”</DialogTitle>
                </DialogHeader>

                <ScrollArea className="h-[60vh] pr-2">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {assets.map((a) => {
                      const isActive = Boolean(coverAssetId && a.id === coverAssetId);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            onSetCoverAction(a.id);
                            setOpen(false);
                          }}
                          aria-pressed={isActive}
                          className={cn(
                            "group relative overflow-hidden rounded-xl border border-border bg-muted/40 text-left",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            isActive && "ring-2 ring-ring"
                          )}
                        >
                          <div className="relative aspect-[4/3] w-full">
                            <img
                              src={a.src}
                              alt={a.title}
                              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                              loading="lazy"
                              decoding="async"
                              draggable={false}
                            />

                            {isActive && (
                              <div className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/80 backdrop-blur">
                                <Check className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <div className="px-3 py-2 text-sm">
                            <div className="truncate font-medium">{a.title}</div>
                            <div className="truncate text-xs text-muted-foreground">ID: {a.id}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
