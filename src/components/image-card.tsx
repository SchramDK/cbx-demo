"use client";

import React from "react";
import { Card, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";
import { AssetActionsMenu } from "@/components/asset-actions/AssetActionsMenu";

function withUnsplashParams(src: string, params: Record<string, string | number>) {
  try {
    const url = new URL(src);
    if (url.hostname !== "images.unsplash.com") return src;
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    url.searchParams.set("auto", url.searchParams.get("auto") ?? "format");
    url.searchParams.set("fit", url.searchParams.get("fit") ?? "max");
    return url.toString();
  } catch {
    return src;
  }
}

export type ImageCardRatio = "1/1" | "3/4" | "4/3" | "16/9";

const ratioMap: Record<ImageCardRatio, string> = {
  "1/1": "aspect-square",
  "3/4": "aspect-[3/4]",
  "4/3": "aspect-[4/3]",
  "16/9": "aspect-video",
};

export type ImageCardProps = {
  id: number;
  title: string;
  ratio: ImageCardRatio;
  src?: string;
  selected?: boolean;
  onToggleSelect?: (id: number) => void;
  onOpen?: (id: number) => void;
  favorited?: boolean;
  onToggleFavorite?: (id: number) => void;
  onDelete?: (id: number) => void;
};

export function ImageCard({
  id,
  title,
  ratio,
  src,
  selected = false,
  favorited = false,
  onToggleSelect,
  onOpen,
  onToggleFavorite,
  onDelete,
}: ImageCardProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const dragDisabledRef = React.useRef(false);

  const copyText = async (text?: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore (demo)
    }
  };

  const toggle = () => onToggleSelect?.(id);
  const toggleFavorite = () => {
    onToggleFavorite?.(id);
  };

  const handleOpen = React.useCallback(() => {
    onOpen?.(id);
  }, [onOpen, id]);

  return (
    <Card
      data-asset-id={id}
      draggable
      onPointerDownCapture={(e) => {
        const target = e.target as HTMLElement | null;
        dragDisabledRef.current = Boolean(
          target?.closest("button,a,input,textarea,select,[data-no-marquee]")
        );
      }}
      onPointerUpCapture={() => {
        dragDisabledRef.current = false;
      }}
      onPointerCancelCapture={() => {
        dragDisabledRef.current = false;
      }}
      onDragStart={(e) => {
        // If the drag started from an interactive control (menu/select/favorite), don't hijack the click.
        if (dragDisabledRef.current) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        e.stopPropagation();
        setIsDragging(true);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("application/cbx-asset-ids", JSON.stringify([id]));
        e.dataTransfer.setData("application/x-cbx-asset-id", String(id));
        e.dataTransfer.setData("text/plain", String(id));

        const imgEl = (e.currentTarget as HTMLElement).querySelector("img") as HTMLImageElement | null;
        if (imgEl) {
          e.dataTransfer.setDragImage(imgEl, 24, 24);
        }
      }}
      onDragEnd={() => setIsDragging(false)}
      className={cn(
        "group relative mb-3 break-inside-avoid overflow-hidden rounded-2xl transition",
        "cursor-grab active:cursor-grabbing",
        "hover:ring-2 hover:ring-ring/40",
        selected && "ring-2 ring-ring",
        isDragging && "opacity-70 scale-[0.98] ring-2 ring-ring shadow-lg"
      )}
    >

      {/* Hover actions */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="flex items-start justify-between p-2">
          {/* Select */}
          <div
            className={cn(
              "pointer-events-auto transition-opacity",
              selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            <div
              data-no-marquee
              className="flex h-8 w-8 items-center justify-center rounded-md bg-background/80 backdrop-blur"
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                data-no-marquee
                aria-label={selected ? "Deselect" : "Select"}
                checked={selected}
                onClick={(e) => e.stopPropagation()}
                onCheckedChange={() => toggle()}
              />
            </div>
          </div>

          {/* Menu */}
          <div className="pointer-events-auto opacity-0 transition-opacity group-hover:opacity-100">
            <AssetActionsMenu
              title={title}
              src={src}
              onOpen={handleOpen}
              onToggleFavorite={toggleFavorite}
              onDelete={() => onDelete?.(id)}
              onCopyLink={(link) => void copyText(link)}
            />
          </div>
        </div>
      </div>

      {/* Image */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOpen();
          }
        }}
        className={cn(
          "relative overflow-hidden bg-gradient-to-br from-muted to-muted/70 cursor-zoom-in",
          ratioMap[ratio]
        )}
      >
        {src ? (
          <img
            src={withUnsplashParams(src, { w: 720, q: 70 })}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 will-change-transform group-hover:scale-[1.02]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0" />
        )}
      </div>

      {/* Footer */}
      <CardFooter className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex w-full items-center justify-between gap-2 rounded-xl bg-background/60 px-3 py-2 text-[13px] text-foreground backdrop-blur">
          <span className="min-w-0 truncate">{title}</span>

          <button
            data-no-marquee
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite();
            }}
            aria-pressed={favorited}
            aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
            title={favorited ? "Remove from favorites" : "Add to favorites"}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleFavorite();
              }
            }}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
              "hover:bg-background/60",
              favorited && "text-rose-500"
            )}
          >
            <Heart
              className={cn(
                "h-4 w-4",
                favorited ? "fill-rose-500" : "text-muted-foreground"
              )}
            />
          </button>
        </div>
      </CardFooter>
    </Card>
  );
}