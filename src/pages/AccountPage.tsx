import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Camera, MessageCircle, Repeat, Search, UserRound, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createCar, getUserCars, updateCarPhoto } from '../services/carService';
import { getUserOrders } from '../services/orderService';
import { uploadCarPhoto } from '../services/storageService';
import type { Car, Order } from '../types';
import { formatRub } from '../utils/pricing';
import { orderStatusLabels } from '../utils/status';

export function AccountPage() {
  const { firebaseUser, profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCarId, setSelectedCarId] = useState('');

  useEffect(() => {
    if (firebaseUser) {
      getUserOrders(firebaseUser.uid).then(setOrders).catch(() => setOrders([]));
      getUserCars(firebaseUser.uid).then(setCars).catch(() => setCars([]));
    }
  }, [firebaseUser]);

  const selectedCar = useMemo(() => cars.find((car) => car.id === selectedCarId) ?? cars[0], [cars, selectedCarId]);
  const filteredOrders = selectedCar ? orders.filter((order) => order.garageCarId === selectedCar.id || order.vin === selectedCar.vin) : orders;

  async function addCar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firebaseUser) return;
    const form = new FormData(event.currentTarget);
    const created = await createCar({
      userId: firebaseUser.uid,
      brand: String(form.get('brand') ?? ''),
      model: String(form.get('model') ?? ''),
      generation: String(form.get('generation') ?? ''),
      year: String(form.get('year') ?? ''),
      engine: String(form.get('engine') ?? ''),
      vin: String(form.get('vin') ?? ''),
      plate: String(form.get('plate') ?? ''),
      mileage: String(form.get('mileage') ?? ''),
      photoUrl: '',
      comment: String(form.get('comment') ?? ''),
      partsHistory: [],
      createdAt: new Date().toISOString(),
    });
    const file = form.get('photo');
    if (file instanceof File && file.size) {
      const photoUrl = await uploadCarPhoto(firebaseUser.uid, created.id, file);
      await updateCarPhoto(created.id, photoUrl);
    }
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
        <article className="feature-card"><Wrench size={22} /><h3>Мои автомобили</h3><p>{cars.length ? `${cars.length} авто в гараже` : 'Добавьте первый автомобиль ниже.'}</p></article>
        <article className="feature-card"><UserRound size={22} /><h3>Профиль</h3><p>{profile?.phone} · Рязань</p></article>
        <article className="feature-card"><Repeat size={22} /><h3>История</h3><p>{orders.length} заказов, фильтр по каждому автомобилю.</p></article>
      </div>

      <form className="panel-form car-form" onSubmit={addCar}>
        <h2>Добавить автомобиль</h2>
        <div className="form-row">
          <input name="brand" required placeholder="Марка" />
          <input name="model" required placeholder="Модель" />
          <input name="generation" placeholder="Поколение" />
          <input name="year" placeholder="Год" />
        </div>
        <div className="form-row">
          <input name="engine" placeholder="Двигатель" />
          <input name="vin" placeholder="VIN" />
          <input name="plate" placeholder="Госномер" />
          <input name="mileage" placeholder="Пробег" />
        </div>
        <input name="photo" type="file" accept="image/*" />
        <textarea name="comment" placeholder="Комментарий" />
        <button className="button button-secondary" type="submit"><Camera size={18} />Сохранить автомобиль</button>
      </form>

      {cars.length > 0 && (
        <>
          <div className="garage-grid">
            {cars.map((car) => (
              <article className={`garage-card ${selectedCar?.id === car.id ? 'active' : ''}`} key={car.id} onClick={() => setSelectedCarId(car.id ?? '')}>
                {car.photoUrl ? <img src={car.photoUrl} alt={`${car.brand} ${car.model}`} /> : <div className="car-placeholder">{car.brand.slice(0, 1)}{car.model.slice(0, 1)}</div>}
                <div>
                  <h3>{car.brand} {car.model}</h3>
                  <p>{car.generation} · {car.year} · {car.engine}</p>
                  <p>VIN: {car.vin || 'не указан'} · {car.plate || 'номер не указан'} · {car.mileage || 'пробег не указан'}</p>
                  <div className="card-actions">
                    <Link className="button button-secondary" to={`/search?vin=${encodeURIComponent(car.vin)}`}><Search size={16} />Найти по VIN</Link>
                    <Link className="button button-secondary" to="/search"><Repeat size={16} />Повторить заказ</Link>
                    <a className="button button-secondary" href={`https://t.me/share/url?text=${encodeURIComponent(`Запчасти для ${car.brand} ${car.model}, VIN ${car.vin}`)}`}><MessageCircle size={16} />Написать</a>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <h2>История по автомобилю</h2>
          <div className="orders-list">
            {filteredOrders.map((order) => (
              <article className="order-card" key={order.id}>
                <div>
                  <strong>Заказ от {new Date(order.createdAt).toLocaleDateString('ru-RU')}</strong>
                  <p>{order.items.map((item) => item.name).join(', ')}</p>
                  <p className="muted">VIN: {order.vin || selectedCar?.vin || 'не указан'}</p>
                </div>
                <span className="status">{orderStatusLabels[order.status]}</span>
                <strong>{formatRub(order.totalClientPrice)}</strong>
                <Link to="/search" className="button button-secondary"><Repeat size={16} />Повторить</Link>
              </article>
            ))}
            {filteredOrders.length === 0 && <div className="empty-state">По этому автомобилю заказов пока нет.</div>}
          </div>
        </>
      )}
    </section>
  );
}
