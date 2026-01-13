// src/lib/stock/commerce.ts
'use client';

export type License = 'single' | 'paygo10';

export type CartItem = {
  id: string;
  title: string;
  license: License;
  price: number;
  image: string;
  qty?: number; // we treat missing as 1
};

export type Order = {
  id: string;
  createdAt: string; // ISO
  status: 'paid';
  items: CartItem[];
  total: number;
};

export type DriveFile = {
  id: string;          // unique per drive entry
  assetId: string;     // original stock asset id
  title: string;
  preview: string;
  source: 'Colourbox';
  license: License;
  orderId: string;
  createdAt: string;   // ISO
  folderId: 'purchases';
};

const ORDERS_KEY = 'CBX_ORDERS_V1';
const DRIVE_KEY = 'CBX_DRIVE_V1';

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const nowIso = () => new Date().toISOString();

const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const getLS = () => (typeof window !== 'undefined' ? window.localStorage : null);

// ----- Orders -----
export function listOrders(): Order[] {
  const ls = getLS();
  if (!ls) return [];
  return safeParse<Order[]>(ls.getItem(ORDERS_KEY), []);
}

export function getOrder(orderId: string): Order | null {
  return listOrders().find((o) => o.id === orderId) ?? null;
}

export function saveOrder(order: Order): void {
  const ls = getLS();
  if (!ls) return;
  const orders = listOrders();
  const next = [order, ...orders.filter((o) => o.id !== order.id)];
  ls.setItem(ORDERS_KEY, JSON.stringify(next));
}

export function createOrderFromCart(items: CartItem[]): Order {
  const normalized = items.map((it) => ({ ...it, qty: it.qty ?? 1 }));
  const total = normalized.reduce((sum, it) => sum + it.price * (it.qty ?? 1), 0);

  return {
    id: uid('ord'),
    createdAt: nowIso(),
    status: 'paid',
    items: normalized,
    total: Math.round(total * 100) / 100,
  };
}

// ----- Drive -----
export function listDriveFiles(): DriveFile[] {
  const ls = getLS();
  if (!ls) return [];
  return safeParse<DriveFile[]>(ls.getItem(DRIVE_KEY), []);
}

export function saveDriveFiles(files: DriveFile[]): void {
  const ls = getLS();
  if (!ls) return;
  ls.setItem(DRIVE_KEY, JSON.stringify(files));
}

export function addFilesToDriveFromOrder(order: Order): DriveFile[] {
  const existing = listDriveFiles();

  // Avoid duplicates per (orderId + assetId + license)
  const exists = new Set(existing.map((f) => `${f.orderId}:${f.assetId}:${f.license}`));

  const created: DriveFile[] = [];
  for (const it of order.items) {
    const key = `${order.id}:${it.id}:${it.license}`;
    if (exists.has(key)) continue;

    created.push({
      id: uid('drv'),
      assetId: it.id,
      title: it.title,
      preview: it.image,
      source: 'Colourbox',
      license: it.license,
      orderId: order.id,
      createdAt: nowIso(),
      folderId: 'purchases',
    });
  }

  const next = [...created, ...existing];
  saveDriveFiles(next);
  return created;
}