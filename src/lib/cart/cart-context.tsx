'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AddToCartInput, CartItem, CartState } from './types';

const STORAGE_KEY = 'cbx-cart';

type Listener = (state: CartState) => void;

function read(): CartState {
  if (typeof window === 'undefined') return { items: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    const normalized: CartItem[] = items
      .filter(Boolean)
      .map((it: any) => ({
        id: String(it.id),
        title: String(it.title ?? ''),
        license: it.license ? String(it.license) : undefined,
        price: Number(it.price ?? 0),
        image: it.image ? String(it.image) : undefined,
        qty: Math.max(1, Number(it.qty ?? 1)),
      }));
    return { items: normalized };
  } catch {
    return { items: [] };
  }
}

function write(state: CartState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function createStore() {
  let state = read();
  const listeners: Listener[] = [];

  function getState() {
    return state;
  }

  function setState(newState: CartState) {
    state = newState;
    write(state);
    listeners.forEach((listener) => listener(state));
  }

  function subscribe(listener: Listener) {
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  function addItem(item: AddToCartInput) {
    const qty = item.qty ?? 1;
    const existing = state.items.find((i) => i.id === item.id && i.license === item.license);

    if (existing) {
      existing.qty = existing.qty + qty;
    } else {
      const normalized: CartItem = {
        id: item.id,
        title: item.title,
        license: item.license,
        price: item.price,
        image: item.image,
        qty,
      };
      state.items = [...state.items, normalized];
    }
    setState({ items: state.items });
  }

  function removeItem(id: string, license?: string) {
    state.items = state.items.filter((i) => !(i.id === id && i.license === license));
    setState({ items: state.items });
  }

  function updateQty(id: string, qty: number, license?: string) {
    const item = state.items.find((i) => i.id === id && i.license === license);
    if (item) {
      item.qty = qty;
      setState({ items: state.items });
    }
  }

  function clear() {
    setState({ items: [] });
  }

  function count() {
    return state.items.reduce((sum, i) => sum + i.qty, 0);
  }

  function total() {
    return state.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  return {
    getState,
    subscribe,
    addItem,
    removeItem,
    updateQty,
    clear,
    count,
    total,
  };
}

export const cartStore = createStore();


export type CartContextValue = {
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
  const [items, setItems] = useState<CartItem[]>(() => cartStore.getState().items);

  useEffect(() => {
    const unsubscribe = cartStore.subscribe((state) => {
      setItems(state.items);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const count = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items]);
  const total = useMemo(() => items.reduce((sum, i) => sum + i.price * i.qty, 0), [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count,
      total,
      addItem: cartStore.addItem,
      removeItem: cartStore.removeItem,
      updateQty: cartStore.updateQty,
      clear: cartStore.clear,
    }),
    [items, count, total]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
