"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export function BottomNav() {
  const { count } = useCart();

  return (
    <nav className="bottomNav">
      <Link href="/">Поиск</Link>
      <Link href="/garage">Гараж</Link>
      <Link href="/orders">Заказы</Link>
      <Link href="/cart">Корзина{count ? ` · ${count}` : ""}</Link>
    </nav>
  );
}
