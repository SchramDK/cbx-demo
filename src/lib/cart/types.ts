// Shared cart types

export type CartItem = {
  id: string;
  title: string;
  license?: string;
  price: number;
  image?: string;
  qty: number;
};

export type CartState = {
  items: CartItem[];
};

export type AddToCartInput = Omit<CartItem, 'qty'> & { qty?: number };
