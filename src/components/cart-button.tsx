'use client';

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
};

export function CartButton({
  count = 0,
  href = '/stock/cart',
  label = 'Open cart',
}: CartButtonProps) {
  return (
    <Button asChild type="button" variant="ghost" size="sm" className="relative h-10 w-10 p-0">
      <Link href={href} aria-label={label}>
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