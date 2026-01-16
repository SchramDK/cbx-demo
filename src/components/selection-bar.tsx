"use client";

import * as React from "react";
import {
  X,
  Eye,
  FolderInput,
  Share2,
  Heart,
  Download,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type SelectionAction =
  | "open"
  | "move"
  | "share"
  | "favorite"
  | "download"
  | "delete";

export type SelectionBarProps = {
  count: number;
  /** Up to a few preview image urls (thumbs). */
  previewSrcs?: string[];
  className?: string;
  onClear?: () => void;
  onAction?: (action: SelectionAction) => void;
};

function ActionButton({
  label,
  children,
  onClick,
  disabled,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn(disabled ? "cursor-not-allowed" : "")}
              aria-disabled={disabled ? true : undefined}>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className={cn(
              "h-9 w-9 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50",
              disabled ? "opacity-50" : ""
            )}
            onClick={disabled ? undefined : onClick}
            aria-label={label}
            title={label}
            disabled={disabled}
          >
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export function SelectionBar({
  count,
  previewSrcs = [],
  className,
  onClear,
  onAction,
}: SelectionBarProps) {
  if (!count) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className={cn(
          "fixed bottom-4 left-1/2 z-50 w-[min(920px,calc(100vw-2rem))] -translate-x-1/2",
          className
        )}
      >
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/80 px-3 py-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200"
        >
          {/* Left */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex -space-x-2">
              {previewSrcs.slice(0, 3).map((src, idx) => (
                <img
                  key={`${src}-${idx}`}
                  src={src}
                  alt=""
                  className="h-8 w-8 rounded-lg border border-border object-cover"
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
              ))}
            </div>

            <div className="min-w-0 text-sm text-foreground">
              <span className="font-medium">{count}</span>{" "}
              <span className="text-muted-foreground">
                item{count === 1 ? "" : "s"} selected
              </span>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={onClear}
              aria-label="Clear selection"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </Button>
            <span className="ml-1 hidden text-xs text-muted-foreground sm:inline">Esc</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <ActionButton
              label={count === 1 ? "Open" : "Open (select 1)"}
              disabled={count !== 1}
              onClick={() => onAction?.("open")}
            >
              <Eye className="h-4 w-4" />
            </ActionButton>

            <ActionButton
              label="Move to…"
              onClick={() => onAction?.("move")}
            >
              <FolderInput className="h-4 w-4" />
            </ActionButton>

            <ActionButton
              label="Share"
              onClick={() => onAction?.("share")}
            >
              <Share2 className="h-4 w-4" />
            </ActionButton>

            <ActionButton
              label="Favorite"
              onClick={() => onAction?.("favorite")}
            >
              <Heart className="h-4 w-4" />
            </ActionButton>

            <ActionButton
              label="Download"
              onClick={() => onAction?.("download")}
            >
              <Download className="h-4 w-4" />
            </ActionButton>

            <ActionButton
              label="Delete"
              onClick={() => onAction?.("delete")}
            >
              <Trash2 className="h-4 w-4" />
            </ActionButton>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
