import { FormEvent, useState } from 'react';
import { Button } from '../components/Button';
import { LegalNote } from '../components/LegalNote';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useSettings } from '../contexts/SettingsContext';
import { createOrder } from '../services/orderService';
import { formatRub } from '../utils/pricing';

export function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, totalBasePrice, totalClientPrice } = useCart();
  const { firebaseUser, profile } = useAuth();
  const { settings } = useSettings();
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await createOrder({
      userId: firebaseUser?.uid ?? null,
      customerName: String(form.get('customerName') ?? ''),
      phone: String(form.get('phone') ?? ''),
      items: items.map((item) => ({
        article: item.article,
        brand: item.brand,
        name: item.name,
        basePrice: item.basePrice,
        clientPrice: item.clientPrice,
        quantity: item.quantity,
        availability: item.availability,
        deliveryTerm: item.deliveryTerm,
        supplier: item.supplier,
      })),
      totalClientPrice,
      totalBasePrice,
      markupPercent: settings.markupPercent,
      status: 'new',
      paymentStatus: 'unpaid',
      deliveryMethod: String(form.get('deliveryMethod')) === 'delivery' ? 'delivery' : 'pickup',
      clientComment: String(form.get('clientComment') ?? ''),
      adminComment: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    clearCart();
    setSent(true);
  }

  return (
    <section className="page">
      <div className="page-heading">
        <p className="eyebrow">Корзина</p>
        <h1>Оформление заказа</h1>
      </div>
      {items.length === 0 ? (
        <div className="empty-state">{sent ? 'Заказ отправлен менеджеру.' : 'Корзина пока пустая.'}</div>
      ) : (
        <div className="cart-layout">
          <div className="cart-list">
            {items.map((item) => (
              <article className="cart-item" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.brand} · {item.article}</p>
                </div>
                <input type="number" min={1} value={item.quantity} onChange={(event) => updateQuantity(item.id, Number(event.target.value))} />
                <strong>{formatRub(item.clientPrice * item.quantity)}</strong>
                <button className="text-button" onClick={() => removeItem(item.id)}>Удалить</button>
              </article>
            ))}
          </div>
          <form className="panel-form" onSubmit={onSubmit}>
            <input name="customerName" required placeholder="Имя" defaultValue={profile?.name ?? ''} />
            <input name="phone" required placeholder="Телефон" defaultValue={profile?.phone ?? ''} />
            <select name="deliveryMethod" defaultValue="pickup">
              <option value="pickup">Самовывоз</option>
              <option value="delivery">Доставка</option>
            </select>
            <textarea name="clientComment" placeholder="Комментарий к заказу" />
            <div className="total-box">
              <span>Итого</span>
              <strong>{formatRub(totalClientPrice)}</strong>
            </div>
            <LegalNote />
            <Button type="submit">Оформить заказ</Button>
          </form>
        </div>
      )}
    </section>
  );
}
