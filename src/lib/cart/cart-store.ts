'use client';

export type CartItem = {
  id: string;
  title: string;
  license?: string;
  price: number;
  image?: string;
  qty?: number;
};

export type CartState = {
  items: CartItem[];
};

const STORAGE_KEY = 'cbx_cart_v1';

function read(): CartState {
  if (typeof window === 'undefined') return { items: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw) as CartState;
    return { items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch {
    return { items: [] };
  }
}

function write(state: CartState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

let state: CartState = read();
const listeners = new Set<(s: CartState) => void>();

function notify() {
  listeners.forEach((l) => l(state));
}

export const cartStore = {
  getState(): CartState {
    return state;
  },

  subscribe(listener: (s: CartState) => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  addItem(item: CartItem) {
    const qty = item.qty ?? 1;
    const existing = state.items.find(
      (i) => i.id === item.id && i.license === item.license
    );

    if (existing) {
      existing.qty = (existing.qty ?? 1) + qty;
    } else {
      state.items = [...state.items, { ...item, qty }];
    }

    write(state);
    notify();
  },

  removeItem(id: string, license?: string) {
    state.items = state.items.filter(
      (i) => !(i.id === id && i.license === license)
    );
    write(state);
    notify();
  },

  updateQty(id: string, qty: number, license?: string) {
    state.items = state.items.map((i) =>
      i.id === id && i.license === license ? { ...i, qty: Math.max(1, qty) } : i
    );
    write(state);
    notify();
  },

  clear() {
    state = { items: [] };
    write(state);
    notify();
  },

  get count() {
    return state.items.reduce((sum, i) => sum + (i.qty ?? 1), 0);
  },

  get total() {
    return state.items.reduce(
      (sum, i) => sum + (i.price * (i.qty ?? 1)),
      0
    );
  },
};
