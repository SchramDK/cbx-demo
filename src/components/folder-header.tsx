'use client';

import { useMemo, useState } from 'react';
import { Pencil, Image as ImageIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [open, setOpen] = useState(false);

  const hasAssets = assets.length > 0;

  const cover = useMemo(() => {
    if (!hasAssets) return undefined;
    const fallback = assets[0];
    if (!coverAssetId) return fallback;
    return assets.find((a) => a.id === coverAssetId) ?? fallback;
  }, [assets, coverAssetId, hasAssets]);

  const countLabel = useMemo(() => {
    if (!hasAssets) return 'No files';
    const n = assets.length;
    return `${n} file${n === 1 ? '' : 's'}`;
  }, [assets.length, hasAssets]);

  const coverLabel = useMemo(() => {
    if (!cover) return undefined;
    const title = (cover.title || '').trim();
    return title.length ? title : `ID ${cover.id}`;
  }, [cover]);

  const subLabel = useMemo(() => {
    if (!hasAssets) return countLabel;
    if (!coverLabel) return countLabel;
    return `${countLabel} • Cover: ${coverLabel}`;
  }, [countLabel, coverLabel, hasAssets]);

  return (
    <div className={cn('mb-3 sm:mb-4', className)} data-folder-id={folderId}>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/40">
        {/* Cover */}
        <div className="relative h-[170px] w-full sm:h-[200px] md:h-[240px]">
          <Dialog open={open} onOpenChange={setOpen}>
            {hasAssets ? (
              <DialogTrigger asChild>
                <button
                  type="button"
                  aria-label={`Open cover picker for ${folderName}`}
                  className={cn(
                    'group absolute inset-0 block h-full w-full overflow-hidden text-left',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                  )}
                >
                  {cover?.src ? (
                    <img
                      src={cover.src}
                      alt={cover.title || folderName}
                      className={cn(
                        'absolute inset-0 h-full w-full object-cover transition-transform duration-300',
                        'group-hover:scale-[1.02]'
                      )}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}

                  {/* Stronger overlay for legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/35 to-transparent" />

                  {/* Bottom content */}
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="truncate text-lg font-semibold text-foreground">
                        {folderName}
                      </div>
                      <div className="text-sm text-muted-foreground">{subLabel}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'hidden sm:inline-flex rounded-full border border-border bg-background/70 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur',
                          'supports-[backdrop-filter]:bg-background/55'
                        )}
                      >
                        Click to change cover
                      </span>

                      {/* Mobile hint */}
                      <div
                        aria-hidden="true"
                        className={cn(
                          'inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm',
                          'bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55',
                          'sm:hidden'
                        )}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit cover
                      </div>

                      {/* Desktop chip */}
                      <div
                        aria-hidden="true"
                        className={cn(
                          'hidden sm:inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm',
                          'bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55'
                        )}
                      >
                        <Pencil className="h-4 w-4" />
                        Choose cover
                      </div>
                    </div>
                  </div>
                </button>
              </DialogTrigger>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/50">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="text-sm font-medium text-foreground">No files yet</div>
                  <div className="max-w-[260px] text-xs text-muted-foreground">
                    Upload files to this folder to choose a cover image.
                  </div>
                </div>
              </div>
            )}

            <DialogContent className="max-w-[900px]">
              <DialogHeader>
                <DialogTitle>Choose cover for “{folderName}”</DialogTitle>
              </DialogHeader>

              <ScrollArea className="h-[60vh] pr-2">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {assets.map((a) => {
                    const isActive = coverAssetId != null && a.id === coverAssetId;
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
                          'group relative overflow-hidden rounded-xl border border-border bg-muted/40 text-left',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                          isActive && 'ring-2 ring-ring'
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
  );
}
