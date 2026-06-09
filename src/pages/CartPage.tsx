import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { LegalNote } from '../components/LegalNote';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useSettings } from '../contexts/SettingsContext';
import { getUserCars } from '../services/carService';
import { createOrder } from '../services/orderService';
import type { Car, DeliveryMethod, PaymentMethod } from '../types';
import { formatRub } from '../utils/pricing';

export function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, totalBasePrice, totalClientPrice } = useCart();
  const { firebaseUser, profile } = useAuth();
  const { settings } = useSettings();
  const [cars, setCars] = useState<Car[]>([]);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (firebaseUser) getUserCars(firebaseUser.uid).then(setCars).catch(() => setCars([]));
  }, [firebaseUser]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const garageCarId = String(form.get('garageCarId') ?? '');
    const selectedCar = cars.find((car) => car.id === garageCarId);
    const orderItems = items.map((item) => ({
      article: item.article,
      brand: item.brand,
      name: item.name,
      imageUrl: item.imageUrl,
      purchasePrice: item.purchasePrice,
      clientPrice: item.clientPrice,
      markupPercent: item.markupPercent,
      marginRub: item.marginRub,
      quantity: item.quantity,
      availability: item.availability,
      deliveryText: item.deliveryText,
      supplier: item.supplier,
      warehouse: item.warehouse,
      probability: item.probability,
      isOriginal: item.isOriginal,
    }));

    await createOrder({
      userId: firebaseUser?.uid ?? null,
      garageCarId: garageCarId || undefined,
      customerName: String(form.get('customerName') ?? ''),
      phone: String(form.get('phone') ?? ''),
      telegram: String(form.get('telegram') ?? ''),
      vin: String(form.get('vin') ?? selectedCar?.vin ?? ''),
      carLabel: selectedCar ? `${selectedCar.brand} ${selectedCar.model} ${selectedCar.year}` : '',
      items: orderItems,
      totalClientPrice,
      totalPurchasePrice: totalBasePrice,
      totalBasePrice,
      totalMargin: totalClientPrice - totalBasePrice,
      markupPercent: settings.markupPercent,
      status: 'new',
      paymentStatus: 'unpaid',
      paymentMethod: String(form.get('paymentMethod') ?? 'cash') as PaymentMethod,
      deliveryMethod: String(form.get('deliveryMethod')) === 'delivery' ? 'delivery' : ('pickup' as DeliveryMethod),
      contactMethod: String(form.get('contactMethod') ?? 'phone') as 'phone' | 'telegram' | 'whatsapp',
      comment: String(form.get('comment') ?? ''),
      clientComment: String(form.get('comment') ?? ''),
      internalComment: '',
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
        <div className="empty-state">{sent ? 'Заказ сохранен и отправлен владельцу.' : 'Корзина пока пустая.'}</div>
      ) : (
        <div className="cart-layout">
          <div className="cart-list">
            {items.map((item) => (
              <article className="cart-item" key={item.id}>
                <img src={item.imageUrl} alt={item.name} />
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.brand} · {item.article} · {item.deliveryText}</p>
                </div>
                <input type="number" min={1} value={item.quantity} onChange={(event) => updateQuantity(item.id, Number(event.target.value))} />
                <strong>{formatRub(item.clientPrice * item.quantity)}</strong>
                <button className="text-button" onClick={() => removeItem(item.id)} type="button">Удалить</button>
              </article>
            ))}
          </div>
          <form className="panel-form" onSubmit={onSubmit}>
            <input name="customerName" required placeholder="Имя" defaultValue={profile?.name ?? ''} />
            <input name="phone" required placeholder="Телефон" defaultValue={profile?.phone ?? ''} />
            <input name="telegram" placeholder="Telegram" defaultValue={profile?.telegram ?? ''} />
            <select name="garageCarId" defaultValue="">
              <option value="">Без привязки к авто</option>
              {cars.map((car) => <option key={car.id} value={car.id}>{car.brand} {car.model} · {car.vin || car.plate}</option>)}
            </select>
            <input name="vin" placeholder="VIN для заказа" />
            <div className="form-row">
              <select name="contactMethod" defaultValue="phone">
                <option value="phone">Связь: телефон</option>
                <option value="telegram">Связь: Telegram</option>
                <option value="whatsapp">Связь: WhatsApp</option>
              </select>
              <select name="paymentMethod" defaultValue="cash">
                <option value="cash">Наличные</option>
                <option value="transfer">Перевод</option>
                <option value="sbp">СБП</option>
              </select>
            </div>
            <select name="deliveryMethod" defaultValue="pickup">
              <option value="pickup">Самовывоз</option>
              <option value="delivery">Доставка</option>
            </select>
            <textarea name="comment" placeholder="Комментарий к заказу" />
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
