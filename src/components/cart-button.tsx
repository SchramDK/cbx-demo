'use client';

import * as React from 'react';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';

import { Button } from '@/components/ui/button';

export type CartButtonProps = {
  /** Number of items in cart (badge). */
  count?: number;
  /** Cart destination. */
  href?: string;
  /** Accessible label. */
  label?: string;
  /** Optional click handler (e.g. open cart drawer). */
  onClickAction?: (e: React.MouseEvent<HTMLElement>) => void;
};

export function CartButton({
  count = 0,
  href = '/stock/cart',
  label = 'Open cart',
  onClickAction,
}: CartButtonProps) {
  return (
    <Button type="button" variant="ghost" size="sm" className="relative h-10 w-10 p-0">
      <Link href={href} aria-label={label} onClick={onClickAction}>
        <ShoppingCart className="h-5 w-5" />
        {count > 0 ? (
          <span
            aria-live="polite"
            aria-label={`${count} items in cart`}
            className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-foreground px-1.5 text-[10px] font-medium text-background"
          >
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}