"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { formatRub } from "@/lib/pricing";

export default function CartPage() {
  const { items, total, remove, clear } = useCart();

  return (
    <section>
      <div className="pageHead">
        <div>
          <div className="eyebrow">Корзина</div>
          <h1>{items.length ? "Ваш заказ" : "Пока пусто"}</h1>
        </div>
      </div>

      {!items.length ? (
        <div className="empty">
          Найдите запчасть и добавьте её сюда.
          <div><Link className="textLink" href="/">Перейти к поиску →</Link></div>
        </div>
      ) : (
        <div className="cartLayout">
          <div className="cartItems">
            {items.map((item) => (
              <article className="cartItem" key={item.id}>
                <div>
                  <small>{item.brand}</small>
                  <h3>{item.name}</h3>
                  <span>{item.article} · {item.deliveryDays} дн.</span>
                </div>
                <div className="cartItemRight">
                  <b>{item.qty} × {formatRub(item.price)}</b>
                  <button className="linkButton" onClick={() => remove(item.id)}>Удалить</button>
                </div>
              </article>
            ))}
          </div>
          <aside className="summary">
            <small>Итого</small>
            <strong>{formatRub(total)}</strong>
            <p>Перед отправкой заказа цена и наличие будут перепроверены у поставщика.</p>
            <button className="primaryWide">Продолжить оформление</button>
            <button className="secondaryWide" onClick={clear}>Очистить корзину</button>
          </aside>
        </div>
      )}
    </section>
  );
}
