"use client";

import Link from "next/link";
import Image from "next/image";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useCart, useCartUI } from "@/lib/cart/cart";

function formatMoneyEUR(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(v || 0);
}

export function CartDrawer() {
  const { isOpen, close } = useCartUI();
  const { items, total, removeItem, clear, updateQty } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={(v) => (v ? null : close())}>
      <SheetContent side="right" className="w-[380px] sm:w-[420px] p-0">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur">
          <div>
            <div className="text-sm font-semibold">Cart</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {items.length === 0 ? 'No items' : `${items.length} item${items.length === 1 ? '' : 's'}`}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={close} aria-label="Close cart">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-[calc(100vh-160px)] overflow-auto px-4 py-4">
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground">Your cart is empty</div>
          ) : (
            <div className="space-y-3">
              {items.map((it) => (
                <div
                  key={`${it.id}:${it.license ?? ''}`}
                  className="flex gap-3 rounded-2xl border bg-background p-3 transition-colors hover:bg-muted/10"
                >
                  <div className="relative h-16 w-24 overflow-hidden rounded-xl bg-muted ring-1 ring-black/5 dark:ring-white/10">
                    {it.image ? (
                      <Image src={it.image} alt={it.title} fill className="object-cover" />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{it.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {it.license === 'paygo10' ? 'Pay & Go 10' : 'Single image'}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center rounded-full bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground ring-1 ring-black/5 dark:ring-white/10">
                        {formatMoneyEUR(it.price)}
                      </div>

                      <div className="inline-flex items-center gap-1 rounded-full bg-muted/20 p-1 ring-1 ring-black/5 dark:ring-white/10">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                          onClick={() => updateQty(it.id, Math.max(1, it.qty - 1), it.license)}
                          aria-label="Decrease quantity"
                        >
                          <span className="text-base leading-none">−</span>
                        </Button>
                        <div className="min-w-[28px] text-center text-xs font-medium tabular-nums">
                          {it.qty}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                          onClick={() => updateQty(it.id, it.qty + 1, it.license)}
                          aria-label="Increase quantity"
                        >
                          <span className="text-base leading-none">+</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(it.id, it.license)}
                    aria-label="Remove item"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 mt-auto border-t bg-background/90 px-4 py-4 backdrop-blur">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <div className="flex items-center gap-2">
              {items.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clear}
                  className="text-muted-foreground"
                >
                  Clear
                </Button>
              ) : null}
              <span className="text-base font-semibold tabular-nums">{formatMoneyEUR(total)}</span>
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            <Button asChild disabled={items.length === 0}>
              <Link href="/stock/cart" onClick={close}>View cart</Link>
            </Button>
            <Button asChild variant="secondary" disabled={items.length === 0}>
              <Link href="/stock/checkout" onClick={close}>Checkout</Link>
            </Button>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Review your cart and complete checkout.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}