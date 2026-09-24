"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  id: string;
  article: string;
  brand: string;
  name: string;
  price: number;
  deliveryDays: number;
  qty: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  add: (item: Omit<CartItem, "qty">) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const KEY = "parts-ai-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  function add(item: Omit<CartItem, "qty">) {
    setItems((current) => {
      const existing = current.find((x) => x.id === item.id);
      if (existing) return current.map((x) => x.id === item.id ? { ...x, qty: x.qty + 1 } : x);
      return [...current, { ...item, qty: 1 }];
    });
  }

  function remove(id: string) {
    setItems((current) => current.filter((x) => x.id !== id));
  }

  function clear() {
    setItems([]);
  }

  const value = useMemo(() => ({
    items,
    count: items.reduce((s, x) => s + x.qty, 0),
    total: items.reduce((s, x) => s + x.price * x.qty, 0),
    add,
    remove,
    clear
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
