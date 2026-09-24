"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";

type Props = {
  item: {
    id: string;
    article: string;
    brand: string;
    name: string;
    price: number;
    deliveryDays: number;
  };
};

export function AddToCartButton({ item }: Props) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      className={added ? "addedButton" : ""}
      onClick={() => {
        add(item);
        setAdded(true);
        setTimeout(() => setAdded(false), 900);
      }}
    >
      {added ? "Добавлено" : "В корзину"}
    </button>
  );
}
