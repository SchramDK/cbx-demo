'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Check } from 'lucide-react';

// Minimal Asset shape expected by Stock views
export type ImageCardAsset = {
  id: string;
  title?: string;
  preview: string; // image src
  category?: string;
  photographer?: string;
  width?: number;
  height?: number;
};

export type ImageCardProps = {
  asset: ImageCardAsset;
  href?: string; // click-through (e.g. asset page)
  aspect?: 'square' | 'photo' | 'wide'; // default: photo (4/3)
  showActions?: boolean; // hover actions
  inCart?: boolean;
  onAddToCartAction?: () => void;
  priority?: boolean; // next/image priority
  className?: string;
};

const aspectClass: Record<NonNullable<ImageCardProps['aspect']>, string> = {
  square: 'aspect-square',
  photo: 'aspect-[4/3]',
  wide: 'aspect-[16/9]',
};

export default function ImageCard({
  asset,
  href,
  aspect = 'photo',
  showActions = true,
  inCart,
  onAddToCartAction,
  priority,
  className,
}: ImageCardProps) {
  const hasAction = Boolean(onAddToCartAction);

  const cardClassName = cn(
    'relative block overflow-hidden rounded-xl border border-border bg-card',
    href
      ? 'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      : hasAction
        ? 'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
        : ''
  );

  const imageSizes =
    '(min-width: 1280px) 16vw, (min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw';

  const content = (
    <div className={cn('relative w-full', aspectClass[aspect])}>
      <Image
        src={asset.preview}
        alt={asset.title ?? 'Stock image'}
        fill
        sizes={imageSizes}
        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        priority={priority}
      />

      {/* Top-left badge */}
      {asset.category ? (
        <Badge
          variant="secondary"
          className="pointer-events-none absolute left-2 top-2 bg-background/80 backdrop-blur"
        >
          {asset.category}
        </Badge>
      ) : null}

      {/* Hover title overlay */}
      {asset.title ? (
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0',
            'bg-gradient-to-t from-black/70 via-black/40 to-transparent',
            'px-2',
            'h-12 flex items-center',
            'opacity-0 transition-opacity duration-200',
            'group-hover:opacity-100 group-focus-within:opacity-100'
          )}
          style={{ paddingRight: hasAction ? '3rem' : undefined }}
        >
          <div className="truncate text-xs font-medium text-white">
            {asset.title}
          </div>
        </div>
      ) : null}

      {/* Hover actions (bottom-right) */}
      {showActions && hasAction ? (
        <div
          className={cn(
            'absolute bottom-2 right-2 transition-opacity duration-200',
            inCart
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
          )}
        >
          <Button
            size="sm"
            variant="secondary"
            className="h-9 w-9 rounded-full bg-background/80 px-0 backdrop-blur"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToCartAction?.();
            }}
            aria-label={inCart ? 'Added to cart' : 'Add to cart'}
          >
            {inCart ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
          </Button>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className={cn('group relative', className)}>
      {href ? (
        <Link href={href} className={cardClassName}>
          {content}
        </Link>
      ) : (
        <div className={cardClassName} tabIndex={hasAction ? 0 : undefined}>
          {content}
        </div>
      )}
    </div>
  );
}