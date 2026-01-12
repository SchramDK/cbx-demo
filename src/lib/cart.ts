

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CartLicense = 'standard' | 'extended';

export type CartItem = {
  id: string;
  title: string;
  license: CartLicense;
  price: number;
  image: string;
};

export type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateLicense: (id: string, license: CartLicense, price: number) => void;
  clear: () => void;
  total: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === item.id ? { ...i, ...item } : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      updateLicense: (id, license, price) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, license, price } : i
          ),
        })),

      clear: () => set({ items: [] }),

      total: () => get().items.reduce((sum, i) => sum + (Number(i.price) || 0), 0),
    }),
    {
      name: 'cbx-stock-cart-v1',
      version: 1,
      partialize: (state) => ({ items: state.items }),
    }
  )
);