import { FormEvent, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { getAllOrders, updateOrderPrice, updateOrderStatus, updatePaymentStatus } from '../services/orderService';
import { saveBusinessSettings } from '../services/settingsService';
import type { BusinessSettings, Order, OrderStatus } from '../types';
import { formatRub } from '../utils/pricing';
import { orderStatusLabels } from '../utils/status';

export function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const { settings, refreshSettings } = useSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState('');
  const [draftSettings, setDraftSettings] = useState<BusinessSettings>(settings);

  useEffect(() => setDraftSettings(settings), [settings]);
  useEffect(() => {
    if (isAdmin) getAllOrders().then(setOrders).catch(() => setOrders([]));
  }, [isAdmin]);

  if (!loading && !isAdmin) return <Navigate to="/auth" replace />;

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    await saveBusinessSettings(draftSettings);
    await refreshSettings();
  }

  async function changeStatus(order: Order, status: OrderStatus) {
    if (!order.id) return;
    await updateOrderStatus(order.id, status, order.adminComment);
    setOrders(await getAllOrders());
  }

  async function changePrice(order: Order, value: string) {
    if (!order.id) return;
    await updateOrderPrice(order.id, Number(value), 'Цена изменена администратором');
    setOrders(await getAllOrders());
  }

  async function changePayment(order: Order, paid: boolean) {
    if (!order.id) return;
    await updatePaymentStatus(order.id, paid ? 'paid' : 'unpaid');
    setOrders(await getAllOrders());
  }

  const visibleOrders = orders.filter((order) =>
    [order.customerName, order.phone, order.status, ...order.items.map((item) => item.article)].join(' ').toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <section className="page admin-page">
      <div className="page-heading">
        <p className="eyebrow">Админ-панель</p>
        <h1>Заказы, наценка и настройки бизнеса</h1>
      </div>
      <div className="admin-grid">
        <form className="panel-form settings-form" onSubmit={saveSettings}>
          <h2>Настройки</h2>
          <label>Наценка, %<input type="number" value={draftSettings.markupPercent} onChange={(event) => setDraftSettings({ ...draftSettings, markupPercent: Number(event.target.value) })} /></label>
          <label>Название<input value={draftSettings.companyName} onChange={(event) => setDraftSettings({ ...draftSettings, companyName: event.target.value })} /></label>
          <label>Телефон<input value={draftSettings.phone} onChange={(event) => setDraftSettings({ ...draftSettings, phone: event.target.value })} /></label>
          <label>Telegram<input value={draftSettings.telegram} onChange={(event) => setDraftSettings({ ...draftSettings, telegram: event.target.value })} /></label>
          <label>WhatsApp<input value={draftSettings.whatsapp} onChange={(event) => setDraftSettings({ ...draftSettings, whatsapp: event.target.value })} /></label>
          <label>Город<input value={draftSettings.city} onChange={(event) => setDraftSettings({ ...draftSettings, city: event.target.value })} /></label>
          <label>Адрес<input value={draftSettings.pickupAddress} onChange={(event) => setDraftSettings({ ...draftSettings, pickupAddress: event.target.value })} /></label>
          <label>Часы<input value={draftSettings.workingHours} onChange={(event) => setDraftSettings({ ...draftSettings, workingHours: event.target.value })} /></label>
          <label>Юридический текст<textarea value={draftSettings.legalNote} onChange={(event) => setDraftSettings({ ...draftSettings, legalNote: event.target.value })} /></label>
          <Button type="submit">Сохранить настройки</Button>
        </form>
        <div>
          <input className="admin-search" placeholder="Фильтр по заказам" value={filter} onChange={(event) => setFilter(event.target.value)} />
          <div className="orders-list">
            {visibleOrders.map((order) => (
              <article className="order-card admin-order" key={order.id}>
                <div>
                  <strong>{order.customerName} · {order.phone}</strong>
                  <p>{order.items.map((item) => `${item.brand} ${item.article}`).join(', ')}</p>
                </div>
                <select value={order.status} onChange={(event) => changeStatus(order, event.target.value as OrderStatus)}>
                  {Object.entries(orderStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <input type="number" defaultValue={order.totalClientPrice} onBlur={(event) => changePrice(order, event.target.value)} />
                <span>{formatRub(order.totalClientPrice)}</span>
                <label className="checkbox">
                  <input type="checkbox" checked={order.paymentStatus === 'paid'} onChange={(event) => changePayment(order, event.target.checked)} />
                  Оплата
                </label>
              </article>
            ))}
            {visibleOrders.length === 0 && <div className="empty-state">Заказов пока нет.</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
