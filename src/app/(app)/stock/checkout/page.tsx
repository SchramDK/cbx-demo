'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import Link from 'next/link';

import { Button } from '@/components/ui/button';

import { useCart } from "@/lib/cart/cart";
import { createOrderFromCart, saveOrder } from '@/lib/stock/commerce';
import { DEFAULT_DEMO_USER_ID } from '@/lib/demo-auth/demo-users';

const fallbackImage = '/default-preview.png';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clear } = useCart();
  const [isCompleting, setIsCompleting] = useState(false);

  const cartItems = (items ?? []).map((it: any) => ({ ...it, qty: it.qty ?? 1 }));
  const total = cartItems.reduce((sum: number, it: any) => sum + it.price * it.qty, 0);

  useEffect(() => {
    if (!isCompleting && !cartItems.length) {
      router.replace("/stock/cart");
    }
  }, [cartItems.length, isCompleting, router]);

  if (!isCompleting && !cartItems.length) {
    return null;
  }

  const handleCompletePurchase = async () => {
    setIsCompleting(true);

    // DEMO: always use the single first-time user after purchase
    try {
      await fetch('/api/demo-auth/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: DEFAULT_DEMO_USER_ID }),
      });
      
      // evt. lille safety
      await new Promise(r => setTimeout(r, 50));
    } catch {
      // If demo-auth fails, we still proceed with the order in this prototype.
    }

    const order = createOrderFromCart(cartItems);
    saveOrder(order);

    // DEMO: remember latest order without putting it in the URL
    try {
      const now = Date.now();
      document.cookie = `cbx_demo_last_order_id=${encodeURIComponent(order.id)}; Path=/; SameSite=Lax`;
      document.cookie = `cbx_demo_last_order_ts=${encodeURIComponent(String(now))}; Path=/; SameSite=Lax`;
    } catch {
      // ignore
    }

    router.push('/stock/download');
    clear();
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      {/* Stepper */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Stock • Checkout</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Confirm your order</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review details and confirm. This is a demo — no payment is processed.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-muted/30 px-3 py-1 text-xs text-muted-foreground ring-1 ring-black/5 dark:ring-white/10">
            <span className="font-medium text-foreground">1</span>
            <span>Cart</span>
            <span className="mx-1 text-muted-foreground/50">→</span>
            <span className="font-medium text-foreground">2</span>
            <span>Checkout</span>
            <span className="mx-1 text-muted-foreground/50">→</span>
            <span className="font-medium text-foreground">3</span>
            <span>Download</span>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Left: checkout details */}
        <div className="space-y-6">
          <section className="rounded-2xl bg-background p-5 ring-1 ring-black/5 dark:ring-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Contact</h2>
              <span className="text-xs text-muted-foreground">Demo</span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <div className="mt-1 rounded-xl border bg-muted/20 px-3 py-2 text-sm text-foreground/90">
                  demo@colourbox.com
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Company</label>
                <div className="mt-1 rounded-xl border bg-muted/20 px-3 py-2 text-sm text-foreground/90">
                  Colourbox Demo
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-background p-5 ring-1 ring-black/5 dark:ring-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Billing</h2>
              <span className="text-xs text-muted-foreground">Read-only</span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <div className="mt-1 rounded-xl border bg-muted/20 px-3 py-2 text-sm text-foreground/90">
                  Jane Doe
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">VAT / CVR</label>
                <div className="mt-1 rounded-xl border bg-muted/20 px-3 py-2 text-sm text-foreground/90">
                  DK12345678
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Address</label>
                <div className="mt-1 rounded-xl border bg-muted/20 px-3 py-2 text-sm text-foreground/90">
                  Example Street 12, 1000 Copenhagen
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-background p-5 ring-1 ring-black/5 dark:ring-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Payment</h2>
              <span className="text-xs text-muted-foreground">Demo only</span>
            </div>

            <div className="mt-4 rounded-xl border bg-muted/20 p-4">
              <p className="text-sm font-medium">Payment method</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Disabled in this prototype. In production, this would be card / invoice / subscription handling.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground">
                  Card
                </div>
                <div className="rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground">
                  Invoice
                </div>
                <div className="rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground">
                  Pay &amp; Go
                </div>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/stock/cart" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to cart
            </Link>
            <p className="text-xs text-muted-foreground">
              By confirming, your order will be created and prepared for download.
            </p>
          </div>
        </div>

        {/* Right: order summary */}
        <aside className="rounded-2xl bg-background p-5 ring-1 ring-black/5 dark:ring-white/10 lg:sticky lg:top-24">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Order summary</h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {cartItems.length} item{cartItems.length === 1 ? "" : "s"}
            </span>
          </div>

          <ul className="mt-4 space-y-4">
            {cartItems.map((item: any) => (
              <li key={`${item.id}-${item.license}`} className="flex gap-3">
                <div className="relative h-14 w-20 overflow-hidden rounded-lg bg-muted ring-1 ring-black/5 dark:ring-white/10">
                  <Image
                    src={item.image || fallbackImage}
                    alt={item.title}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{item.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">License: {item.license}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">Qty {item.qty}</div>
                </div>

                <div className="text-sm font-medium tabular-nums">€{Number(item.price).toFixed(2)}</div>
              </li>
            ))}
          </ul>

          <div className="mt-5 space-y-2 border-t pt-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums">€{total.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Taxes</span>
              <span className="text-muted-foreground">Calculated at download</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <span className="text-sm font-medium">Total</span>
            <span className="text-lg font-semibold tabular-nums">€{total.toFixed(2)}</span>
          </div>

          <Button onClick={handleCompletePurchase} className="mt-5 w-full" disabled={isCompleting}>
            {isCompleting ? 'Confirming…' : 'Confirm & get download'}
          </Button>

          <p className="mt-3 text-xs text-muted-foreground">
            Demo only — no payment is processed.
          </p>
        </aside>
      </div>
    </main>
  );
}