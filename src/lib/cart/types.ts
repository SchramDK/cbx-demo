export type CartItem = {
  id: string;
  title: string;
  price: number;
  license?: string;
  image?: string;
  qty: number;
};

export type CartState = { items: CartItem[] };

export type AddToCartInput = Omit<CartItem, "qty"> & { qty?: number };