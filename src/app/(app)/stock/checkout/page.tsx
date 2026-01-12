

'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/lib/cart';

function formatCardNumber(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function makeOrderId() {
  const part = Math.random().toString(16).slice(2, 8).toUpperCase();
  return `CBX-${part}`;
}

export default function StockCheckoutPage() {
  const router = useRouter();
  const { items, total, clear } = useCart();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const [isPaying, setIsPaying] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalAmount = useMemo(() => total(), [items, total]);

  const canPay = useMemo(() => {
    if (items.length === 0) return false;
    if (name.trim().length < 2) return false;
    if (!isValidEmail(email)) return false;
    if (cardNumber.replace(/\s/g, '').length !== 16) return false;
    if (expiry.length !== 5) return false;
    if (cvc.replace(/\D/g, '').length < 3) return false;
    return true;
  }, [items.length, name, email, cardNumber, expiry, cvc]);

  async function onPay() {
    setError(null);
    if (!canPay) {
      setError('Please fill out all fields to continue.');
      return;
    }

    setIsPaying(true);

    // Fake payment delay (demo only)
    await new Promise((r) => setTimeout(r, 900));

    const id = makeOrderId();
    setOrderId(id);
    clear();

    setIsPaying(false);
  }

  // Success state
  if (orderId) {
    return (
      <main className="w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="mx-auto max-w-[900px]">
          <div className="mb-6">
            <Link href="/stock" className="text-sm text-muted-foreground hover:underline">
              ← Back to stock
            </Link>
          </div>

          <Card className="p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-semibold">Payment successful</h1>
                <p className="mt-1 text-sm text-muted-foreground">Demo checkout — no real payment was processed.</p>
              </div>
              <Badge variant="secondary">Order {orderId}</Badge>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button type="button" onClick={() => router.push('/stock')}>
                Continue browsing
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/stock')}>
                Download (demo)
              </Button>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Checkout</h1>
            <p className="text-sm text-muted-foreground">Demo only · Credit card fields are not processed</p>
          </div>
          <Link href="/stock" className="text-sm text-muted-foreground hover:underline">
            ← Back to stock
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          {/* Payment form */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Payment details</h2>

            <div className="mt-4 grid gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" />
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Card number</label>
                <Input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="4242 4242 4242 4242"
                  inputMode="numeric"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Expiry</label>
                  <Input
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    placeholder="12/34"
                    inputMode="numeric"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">CVC</label>
                  <Input
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    inputMode="numeric"
                  />
                </div>
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <Button type="button" disabled={!canPay || isPaying} onClick={onPay} className="mt-1">
                {isPaying ? 'Processing…' : `Pay €${totalAmount}`}
              </Button>

              <p className="text-xs text-muted-foreground">
                Tip: Use <span className="font-medium">4242 4242 4242 4242</span> for a classic “demo card” feel.
              </p>
            </div>
          </Card>

          {/* Order summary */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Order summary</h2>

            {items.length === 0 ? (
              <div className="mt-4 text-sm text-muted-foreground">Your cart is empty.</div>
            ) : (
              <div className="mt-4 space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{item.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.license === 'extended' ? 'Extended' : 'Standard'} license
                      </div>
                    </div>
                    <div className="shrink-0 font-medium">€{item.price}</div>
                  </div>
                ))}

                <div className="border-t pt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-semibold">€{totalAmount}</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}