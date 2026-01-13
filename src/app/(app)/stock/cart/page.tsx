"use client";

import Link from "next/link";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/cart";
import { STOCK_ASSETS as ASSETS } from "@/lib/demo/stock-assets";

type Asset = {
  id: string;
  title: string;
  category: string;
  keywords?: string[];
  tags?: string[];
  preview: string;
};

const getAssetImage = (asset?: Asset) => asset?.preview ?? "";

// Demo pricing (align with the asset page)
const PRICE_SINGLE = 7.99;

export default function CartPage() {
  const { items, count, total, updateQty, removeItem, clear, addItem } = useCart();

  useEffect(() => {
    for (const it of items) {
      if (it.qty > 1) {
        updateQty(it.id, 1, it.license);
      }
    }
  }, [items, updateQty]);

  const related = useMemo(() => {
    const assets = ASSETS as Asset[];
    if (!items.length) return [] as Asset[];

    const inCart = new Set(items.map((i) => i.id));

    // Prefer same-category assets as items in cart
    const cartCategories = new Set<string>();
    for (const it of items) {
      const a = assets.find((x) => x.id === it.id);
      if (a?.category) cartCategories.add(a.category);
    }

    const sameCategory = assets.filter(
      (a) => !inCart.has(a.id) && cartCategories.has(a.category)
    );

    const fallback = assets.filter((a) => !inCart.has(a.id));

    const merged: Asset[] = [];
    const seen = new Set<string>();

    for (const a of [...sameCategory, ...fallback]) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      merged.push(a);
      if (merged.length === 8) break;
    }

    return merged;
  }, [items]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 sm:py-10 lg:pb-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs text-muted-foreground">
            <Link href="/stock" className="hover:text-foreground">
              Stock
            </Link>
            <span className="mx-1">/</span>
            <span className="text-foreground/80">Cart</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Cart</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {count === 0
              ? "Your cart is empty."
              : `${count} item${count === 1 ? "" : "s"} in your cart.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/stock">
            <Button variant="outline">Continue shopping</Button>
          </Link>
          {items.length > 0 ? (
            <Button
              variant="ghost"
              onClick={clear}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear cart
            </Button>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-background p-8 ring-1 ring-black/5 dark:ring-white/10 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium">Your cart is empty</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Add a license from Stock to continue.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/stock/search">
                <Button>Search Stock</Button>
              </Link>
              <Link href="/stock">
                <Button variant="outline">Browse</Button>
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-muted/20 p-4 ring-1 ring-black/5 dark:ring-white/10">
              <div className="text-xs font-medium">Royalty‑free</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Use across channels in your projects.
              </div>
            </div>
            <div className="rounded-xl bg-muted/20 p-4 ring-1 ring-black/5 dark:ring-white/10">
              <div className="text-xs font-medium">Instant delivery</div>
              <div className="mt-1 text-xs text-muted-foreground">Download immediately after purchase.</div>
            </div>
            <div className="rounded-xl bg-muted/20 p-4 ring-1 ring-black/5 dark:ring-white/10">
              <div className="text-xs font-medium">Clear licensing</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Single image or Pay &amp; Go—simple and transparent.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="order-1 lg:order-2 lg:col-span-4">
              <div className="hidden rounded-2xl bg-background p-5 ring-1 ring-black/5 dark:ring-white/10 lg:block lg:sticky lg:top-24">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Order summary</div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {count} item{count === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-muted-foreground">Subtotal</div>
                    <div className="font-medium tabular-nums">{formatMoneyEUR(total)}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-muted-foreground">Taxes</div>
                    <div className="text-muted-foreground">Calculated at checkout</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <div className="text-sm font-medium">Total</div>
                  <div className="text-lg font-semibold tabular-nums">{formatMoneyEUR(total)}</div>
                </div>

                <div className="mt-4 text-xs text-muted-foreground">
                  Prototype checkout is disabled. In the real product, taxes and payment are handled at checkout.
                </div>

                <Button className="mt-5 w-full" disabled>
                  Checkout (prototype)
                </Button>
              </div>
            </div>

            <div className="order-2 lg:order-1 lg:col-span-8">
              <div className="rounded-2xl bg-background ring-1 ring-black/5 dark:ring-white/10">
                <div className="divide-y divide-border/60">
                  {items.map((it) => (
                    <div
                      key={`${it.id}:${it.license ?? ""}`}
                      className="flex gap-4 p-4 transition-colors hover:bg-muted/10 sm:p-5"
                    >
                      <Link
                        href={`/stock/assets/${it.id}`}
                        className="relative h-20 w-28 overflow-hidden rounded-lg bg-muted ring-1 ring-black/5 transition hover:ring-black/10 dark:ring-white/10 dark:hover:ring-white/20"
                        aria-label={`Open ${it.title}`}
                      >
                        {it.image ? (
                          <Image src={it.image} alt={it.title} fill className="object-cover" />
                        ) : null}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 hover:opacity-100" />
                      </Link>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                          <div className="min-w-0">
                            <Link
                              href={`/stock/assets/${it.id}`}
                              className="truncate text-sm font-medium hover:underline"
                            >
                              {it.title}
                            </Link>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {it.license ? (
                                <span className="inline-flex items-center rounded-full bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-foreground/80 ring-1 ring-black/5 dark:ring-white/10">
                                  {it.license === "paygo10" ? "Pay & Go 10" : "Single image"}
                                </span>
                              ) : null}
                              <span className="text-[11px] text-muted-foreground">
                                Qty {it.qty} · {formatMoneyEUR(it.price)}
                              </span>
                            </div>
                          </div>

                          <div className="text-sm font-medium tabular-nums sm:text-right">
                            {formatMoneyEUR(it.price)}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="inline-flex items-center rounded-full bg-muted/30 px-2 py-1 text-xs text-muted-foreground ring-1 ring-black/5 dark:ring-white/10">
                            Quantity: {it.qty}
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => removeItem(it.id, it.license)}
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {related.length ? (
            <div className="mt-8">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Related images</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">Based on the content in your cart</div>
                </div>
                <Link href="/stock" className="text-xs text-muted-foreground hover:text-foreground">
                  Browse more
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {related.map((a) => {
                  const img = getAssetImage(a);
                  return (
                    <div
                      key={a.id}
                      className="group overflow-hidden rounded-xl bg-background ring-1 ring-black/5 dark:ring-white/10"
                    >
                      <Link
                        href={`/stock/assets/${a.id}`}
                        className="relative block aspect-[4/3] w-full bg-muted"
                        aria-label={`Open ${a.title}`}
                      >
                        {img ? (
                          <Image
                            src={img}
                            alt={a.title}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        ) : null}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      </Link>

                      <div className="p-3">
                        <div className="truncate text-xs font-medium">{a.title}</div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="text-[11px] text-muted-foreground">From {formatMoneyEUR(PRICE_SINGLE)}</div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              addItem({
                                id: a.id,
                                title: a.title,
                                price: PRICE_SINGLE,
                                image: img,
                                license: "single",
                                qty: 1,
                              });
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </>
      )}

      {items.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 backdrop-blur-sm lg:hidden">
          <div className="mx-auto w-full max-w-6xl px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="truncate text-base font-semibold tabular-nums">{formatMoneyEUR(total)}</div>
              </div>
              <Button className="shrink-0" disabled>
                Checkout (prototype)
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatMoneyEUR(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(v || 0);
}