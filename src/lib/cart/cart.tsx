"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AddToCartInput, CartItem, CartState } from "./types";

const STORAGE_KEY = "cbx-cart";

function readFromStorage(): CartState {
  if (typeof window === "undefined") return { items: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    const normalized: CartItem[] = items
      .filter(Boolean)
      .map((it: any) => ({
        id: String(it.id ?? ""),
        title: String(it.title ?? ""),
        license: it.license ? String(it.license) : undefined,
        price: Number(it.price ?? 0),
        image: it.image ? String(it.image) : undefined,
        qty: Math.max(1, Number(it.qty ?? 1)),
      }))
      .filter((it: CartItem) => it.id.length > 0);
    return { items: normalized };
  } catch {
    return { items: [] };
  }
}

function writeToStorage(state: CartState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  addItem: (item: AddToCartInput) => void;
  removeItem: (id: string, license?: string) => void;
  updateQty: (id: string, qty: number, license?: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  // IMPORTANT: start empty to match server-rendered HTML.
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted cart AFTER mount to avoid hydration mismatch.
  useEffect(() => {
    const state = readFromStorage();
    setItems(state.items);
    setHydrated(true);
  }, []);

  // Persist changes only after we've hydrated once.
  useEffect(() => {
    if (!hydrated) return;
    writeToStorage({ items });
  }, [hydrated, items]);

  const addItem = (item: AddToCartInput) => {
    const qty = Math.max(1, Number(item.qty ?? 1));
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id && i.license === item.license);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [
        ...prev,
        {
          id: item.id,
          title: item.title,
          license: item.license,
          price: item.price,
          image: item.image,
          qty,
        },
      ];
    });
  };

  const removeItem = (id: string, license?: string) =>
    setItems((prev) => prev.filter((i) => !(i.id === id && i.license === license)));

  const updateQty = (id: string, qty: number, license?: string) => {
    const q = Math.max(1, Number(qty));
    setItems((prev) =>
      prev.map((i) => (i.id === id && i.license === license ? { ...i, qty: q } : i))
    );
  };

  const clear = () => setItems([]);

  const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);
  const total = useMemo(() => items.reduce((s, i) => s + i.price * i.qty, 0), [items]);

  const value = useMemo(
    () => ({ items, count, total, addItem, removeItem, updateQty, clear }),
    [items, count, total]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

// -------------------
// Drawer UI state
// -------------------
type CartUIState = { isOpen: boolean; open: () => void; close: () => void };
const CartUIContext = createContext<CartUIState | null>(null);

export function CartUIProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const value = useMemo(
    () => ({ isOpen, open: () => setOpen(true), close: () => setOpen(false) }),
    [isOpen]
  );
  return <CartUIContext.Provider value={value}>{children}</CartUIContext.Provider>;
}

export function useCartUI() {
  const ctx = useContext(CartUIContext);
  if (!ctx) throw new Error("useCartUI must be used within CartUIProvider");
  return ctx;
}