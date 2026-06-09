import { FormEvent, useEffect, useState } from 'react';
import { Repeat, Star, UserRound, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createCar, getUserCars } from '../services/carService';
import { getUserOrders } from '../services/orderService';
import type { Car, Order } from '../types';
import { formatRub } from '../utils/pricing';
import { orderStatusLabels } from '../utils/status';

export function AccountPage() {
  const { firebaseUser, profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [cars, setCars] = useState<Car[]>([]);

  useEffect(() => {
    if (firebaseUser) {
      getUserOrders(firebaseUser.uid).then(setOrders).catch(() => setOrders([]));
      getUserCars(firebaseUser.uid).then(setCars).catch(() => setCars([]));
    }
  }, [firebaseUser]);

  async function addCar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firebaseUser) return;
    const form = new FormData(event.currentTarget);
    await createCar({
      userId: firebaseUser.uid,
      brand: String(form.get('brand') ?? ''),
      model: String(form.get('model') ?? ''),
      year: String(form.get('year') ?? ''),
      vin: String(form.get('vin') ?? ''),
      engine: String(form.get('engine') ?? ''),
      comment: String(form.get('comment') ?? ''),
    });
    event.currentTarget.reset();
    setCars(await getUserCars(firebaseUser.uid));
  }

  if (!firebaseUser) {
    return (
      <section className="page narrow">
        <div className="empty-state">
          Войдите, чтобы видеть историю заказов, автомобили и избранное.
          <Link className="button button-primary" to="/auth">Войти</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-heading">
        <p className="eyebrow">Кабинет</p>
        <h1>{profile?.name ?? 'Профиль клиента'}</h1>
      </div>
      <div className="account-tabs">
        <article className="feature-card"><Wrench size={22} /><h3>Мои автомобили</h3><p>{cars.length ? cars.map((car) => `${car.brand} ${car.model}`).join(', ') : 'Добавьте первый автомобиль ниже.'}</p></article>
        <article className="feature-card"><Star size={22} /><h3>Избранное</h3><p>Сохраненные позиции для повторного заказа.</p></article>
        <article className="feature-card"><UserRound size={22} /><h3>Профиль</h3><p>{profile?.phone} · {profile?.email}</p></article>
      </div>
      <form className="panel-form car-form" onSubmit={addCar}>
        <h2>Добавить автомобиль</h2>
        <div className="form-row">
          <input name="brand" required placeholder="Марка" />
          <input name="model" required placeholder="Модель" />
          <input name="year" placeholder="Год" />
        </div>
        <div className="form-row">
          <input name="vin" placeholder="VIN" />
          <input name="engine" placeholder="Двигатель" />
        </div>
        <textarea name="comment" placeholder="Комментарий" />
        <button className="button button-secondary" type="submit">Сохранить автомобиль</button>
      </form>
      <h2>Мои заказы</h2>
      <div className="orders-list">
        {orders.map((order) => (
          <article className="order-card" key={order.id}>
            <div>
              <strong>Заказ от {new Date(order.createdAt).toLocaleDateString('ru-RU')}</strong>
              <p>{order.items.map((item) => item.name).join(', ')}</p>
            </div>
            <span className="status">{orderStatusLabels[order.status]}</span>
            <strong>{formatRub(order.totalClientPrice)}</strong>
            <Link to="/search" className="button button-secondary"><Repeat size={16} />Повторить</Link>
          </article>
        ))}
        {orders.length === 0 && <div className="empty-state">Заказов пока нет.</div>}
      </div>
    </section>
  );
}
