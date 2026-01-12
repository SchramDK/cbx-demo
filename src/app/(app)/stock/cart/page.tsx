"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/cart-context";

export default function CartPage() {
  const { items, count, total, updateQty, removeItem, clear } = useCart();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cart</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {count === 0 ? "Your cart is empty." : `${count} item${count === 1 ? "" : "s"} in your cart.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/stock">
            <Button variant="outline">Continue browsing</Button>
          </Link>
          {items.length > 0 ? (
            <Button variant="ghost" onClick={clear}>
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border bg-background p-8 text-center">
          <div className="text-sm text-muted-foreground">
            Search Stock and add a license to get started.
          </div>
          <div className="mt-4">
            <Link href="/stock/search">
              <Button>Search stock</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="rounded-2xl border bg-background">
              <div className="divide-y">
                {items.map((it) => (
                  <div key={`${it.id}:${it.license ?? ""}`} className="flex gap-4 p-4">
                    <div className="relative h-16 w-24 overflow-hidden rounded-md bg-muted">
                      {it.image ? (
                        <Image src={it.image} alt={it.title} fill className="object-cover" />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{it.title}</div>
                          {it.license ? (
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              License: {it.license}
                            </div>
                          ) : null}
                        </div>

                        <div className="text-sm font-medium tabular-nums">
                          {formatMoney(it.price * it.qty)}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQty(it.id, Math.max(1, it.qty - 1), it.license)}
                          >
                            −
                          </Button>
                          <div className="w-10 text-center text-sm tabular-nums">{it.qty}</div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQty(it.id, it.qty + 1, it.license)}
                          >
                            +
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeItem(it.id, it.license)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-20 rounded-2xl border bg-background p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Total</div>
                <div className="text-lg font-semibold tabular-nums">{formatMoney(total)}</div>
              </div>

              <div className="mt-4 text-xs text-muted-foreground">
                Taxes and final pricing can be handled at checkout in the real product.
              </div>

              <Button className="mt-5 w-full" disabled>
                Checkout (prototype)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatMoney(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v || 0);
}