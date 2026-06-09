import { ReactNode, createContext, useContext, useMemo, useState } from 'react';
import type { CartItem, SupplierPart } from '../types';
import { calculateClientPrice } from '../utils/pricing';
import { useSettings } from './SettingsContext';

interface CartContextValue {
  items: CartItem[];
  addPart(part: SupplierPart): void;
  removeItem(id: string): void;
  updateQuantity(id: string, quantity: number): void;
  clearCart(): void;
  totalClientPrice: number;
  totalBasePrice: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [items, setItems] = useState<CartItem[]>([]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addPart(part) {
        setItems((current) => {
          const exists = current.find((item) => item.id === part.id);
          if (exists) {
            return current.map((item) => (item.id === part.id ? { ...item, quantity: item.quantity + 1 } : item));
          }
          return [
            ...current,
            {
              ...part,
              clientPrice: calculateClientPrice(part.basePrice, settings.markupPercent),
              quantity: 1,
            },
          ];
        });
      },
      removeItem(id) {
        setItems((current) => current.filter((item) => item.id !== id));
      },
      updateQuantity(id, quantity) {
        setItems((current) => current.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item)));
      },
      clearCart() {
        setItems([]);
      },
      totalClientPrice: items.reduce((sum, item) => sum + item.clientPrice * item.quantity, 0),
      totalBasePrice: items.reduce((sum, item) => sum + item.basePrice * item.quantity, 0),
    }),
    [items, settings.markupPercent],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used inside CartProvider');
  return value;
}
