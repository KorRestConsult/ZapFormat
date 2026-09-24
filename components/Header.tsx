"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export function Header() {
  const { count } = useCart();

  return (
    <header className="header">
      <Link className="brand" href="/">PARTS<span>AI</span></Link>
      <nav className="desktopNav">
        <Link href="/garage">Гараж</Link>
        <Link href="/orders">Заказы</Link>
        <Link href="/account">Профиль</Link>
        <Link className="cartPill" href="/cart">Корзина <b>{count}</b></Link>
      </nav>
    </header>
  );
}
