"use client";

import * as React from "react";
import {
  MoreHorizontal,
  Eye,
  Link as LinkIcon,
  Download,
  FolderInput,
  Share2,
  Heart,
  Trash2,
  RotateCcw,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type AssetActionsMenuProps = {
  title: string;
  src?: string;
  inTrash?: boolean;

  // Primary actions
  onOpen?: () => void;
  onMove?: () => void;
  onShare?: () => void;
  onDownload?: () => void;

  // Secondary actions
  onToggleFavorite?: () => void;
  onDelete?: () => void; // soft delete -> move to trash
  onRestore?: () => void; // only in trash
  onDeleteForever?: () => void; // only in trash

  // Utilities
  onCopyLink?: (link: string) => void;

  // UI
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
};

export function AssetActionsMenu({
  title,
  src,
  inTrash,
  onOpen,
  onMove,
  onShare,
  onDownload,
  onToggleFavorite,
  onDelete,
  onRestore,
  onDeleteForever,
  onCopyLink,
  align = "end",
  side = "bottom",
  className,
}: AssetActionsMenuProps) {
  const [open, setOpen] = React.useState(false);

  const close = React.useCallback(() => setOpen(false), []);

  const runItem = React.useCallback(
    (fn?: () => void) =>
      (e: unknown) => {
        const ev = e as any;
        ev?.preventDefault?.();
        ev?.stopPropagation?.();
        close();
        fn?.();
      },
    [close]
  );

  const copyLink = React.useCallback(
    (e: unknown) => {
      const ev = e as any;
      ev?.preventDefault?.();
      ev?.stopPropagation?.();
      if (!src) return;
      close();
      onCopyLink?.(src);
    },
    [src, onCopyLink, close]
  );

  const download = React.useCallback(
    (e: unknown) => {
      const ev = e as any;
      ev?.preventDefault?.();
      ev?.stopPropagation?.();
      if (!src) return;
      close();
      if (onDownload) return onDownload();
      window.open(src, "_blank", "noopener,noreferrer");
    },
    [src, onDownload, close]
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          data-no-marquee
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", className)}
          aria-label="Open actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        side={side}
        className="w-56"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuLabel className="truncate">{title}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {onOpen ? (
          <DropdownMenuItem onSelect={runItem(onOpen)}>
            <Eye className="mr-2 h-4 w-4" />
            Open
          </DropdownMenuItem>
        ) : null}

        {onMove ? (
          <DropdownMenuItem onSelect={runItem(onMove)}>
            <FolderInput className="mr-2 h-4 w-4" />
            {inTrash ? "Restore / Move to" : "Move to…"}
          </DropdownMenuItem>
        ) : null}

        {onShare ? (
          <DropdownMenuItem onSelect={runItem(onShare)}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </DropdownMenuItem>
        ) : null}

        {src && onCopyLink ? (
          <DropdownMenuItem onSelect={copyLink}>
            <LinkIcon className="mr-2 h-4 w-4" />
            Copy link
          </DropdownMenuItem>
        ) : null}

        {src ? (
          <DropdownMenuItem onSelect={download}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </DropdownMenuItem>
        ) : null}

        {onToggleFavorite ? (
          <DropdownMenuItem onSelect={runItem(onToggleFavorite)}>
            <Heart className="mr-2 h-4 w-4" />
            Favorite
          </DropdownMenuItem>
        ) : null}

        {(onDelete || onRestore || onDeleteForever) ? <DropdownMenuSeparator /> : null}

        {inTrash && onRestore ? (
          <DropdownMenuItem onSelect={runItem(onRestore)}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Restore
          </DropdownMenuItem>
        ) : null}

        {inTrash && onDeleteForever ? (
          <DropdownMenuItem onSelect={runItem(onDeleteForever)}>
            <X className="mr-2 h-4 w-4" />
            Delete forever
          </DropdownMenuItem>
        ) : null}

        {!inTrash && onDelete ? (
          <DropdownMenuItem onSelect={runItem(onDelete)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Move to trash
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
