import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { getAllOrders, updateOrderPrice, updateOrderStatus, updatePaymentStatus } from '../services/orderService';
import { saveBusinessSettings } from '../services/settingsService';
import type { BusinessSettings, Order, OrderStatus, SupplierMode } from '../types';
import { calculateMarginPercent, formatRub } from '../utils/pricing';
import { orderStatusLabels, paymentMethodLabels } from '../utils/status';

const quickMarkups = [10, 15, 20];

function purchaseTotal(order: Order) {
  return order.totalPurchasePrice ?? order.totalBasePrice ?? order.items.reduce((sum, item) => sum + (item.purchasePrice ?? item.basePrice ?? 0) * item.quantity, 0);
}

function marginTotal(order: Order) {
  return order.totalMargin ?? order.totalClientPrice - purchaseTotal(order);
}

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

  const stats = useMemo(() => {
    const now = new Date();
    const day = orders.filter((order) => new Date(order.createdAt).toDateString() === now.toDateString()).length;
    const week = orders.filter((order) => now.getTime() - new Date(order.createdAt).getTime() <= 7 * 86400000).length;
    const month = orders.filter((order) => now.getTime() - new Date(order.createdAt).getTime() <= 30 * 86400000).length;
    const revenue = orders.reduce((sum, order) => sum + order.totalClientPrice, 0);
    const purchase = orders.reduce((sum, order) => sum + purchaseTotal(order), 0);
    const margin = orders.reduce((sum, order) => sum + marginTotal(order), 0);
    return {
      day,
      week,
      month,
      revenue,
      purchase,
      margin,
      avgMargin: calculateMarginPercent(purchase, revenue),
      newOrders: orders.filter((order) => order.status === 'new').length,
      inWork: orders.filter((order) => ['checking', 'awaiting_payment', 'ordered', 'in_transit'].includes(order.status)).length,
      arrived: orders.filter((order) => ['arrived', 'ready_for_pickup'].includes(order.status)).length,
      issued: orders.filter((order) => order.status === 'issued').length,
      cancelled: orders.filter((order) => order.status === 'cancelled').length,
    };
  }, [orders]);

  if (!loading && !isAdmin) return <Navigate to="/auth" replace />;

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    await saveBusinessSettings(draftSettings);
    await refreshSettings();
  }

  async function reloadOrders() {
    setOrders(await getAllOrders());
  }

  async function changeStatus(order: Order, status: OrderStatus) {
    if (!order.id) return;
    await updateOrderStatus(order.id, status, order.internalComment || order.adminComment || '');
    await reloadOrders();
  }

  async function changePrice(order: Order, value: string) {
    if (!order.id) return;
    await updateOrderPrice(order.id, Number(value), 'Цена изменена администратором');
    await reloadOrders();
  }

  async function changePayment(order: Order, paid: boolean) {
    if (!order.id) return;
    await updatePaymentStatus(order.id, paid ? 'paid' : 'unpaid');
    await reloadOrders();
  }

  const visibleOrders = orders.filter((order) =>
    [order.customerName, order.phone, order.telegram, order.status, order.vin, order.carLabel, ...order.items.map((item) => `${item.brand} ${item.article}`)]
      .join(' ')
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );

  return (
    <section className="page admin-page">
      <div className="page-heading">
        <p className="eyebrow">Кабинет владельца</p>
        <h1>Заказы, закупка, маржа и статусы</h1>
      </div>

      <div className="kpi-grid">
        <article><span>Новые</span><strong>{stats.newOrders}</strong></article>
        <article><span>В работе</span><strong>{stats.inWork}</strong></article>
        <article><span>Пришли</span><strong>{stats.arrived}</strong></article>
        <article><span>Выданы</span><strong>{stats.issued}</strong></article>
        <article><span>Отмены</span><strong>{stats.cancelled}</strong></article>
        <article><span>Выручка</span><strong>{formatRub(stats.revenue)}</strong></article>
        <article><span>Закупка</span><strong>{formatRub(stats.purchase)}</strong></article>
        <article><span>Прибыль</span><strong>{formatRub(stats.margin)}</strong></article>
        <article><span>Средняя маржа</span><strong>{stats.avgMargin}%</strong></article>
        <article><span>День / неделя / месяц</span><strong>{stats.day} / {stats.week} / {stats.month}</strong></article>
      </div>

      <div className="admin-grid">
        <form className="panel-form settings-form" onSubmit={saveSettings}>
          <h2>Цены и режим</h2>
          <div className="segmented">
            {quickMarkups.map((value) => (
              <button key={value} type="button" className={draftSettings.markupPercent === value ? 'active' : ''} onClick={() => setDraftSettings({ ...draftSettings, markupPercent: value, defaultMarkupPercent: value })}>
                {value}%
              </button>
            ))}
          </div>
          <label>Ручная наценка, %<input type="number" value={draftSettings.markupPercent} onChange={(event) => setDraftSettings({ ...draftSettings, markupPercent: Number(event.target.value) })} /></label>
          <label>Минимальная прибыль, руб.<input type="number" value={draftSettings.minMarginRub} onChange={(event) => setDraftSettings({ ...draftSettings, minMarginRub: Number(event.target.value) })} /></label>
          <label>Округление цены<input type="number" value={draftSettings.roundingStep} onChange={(event) => setDraftSettings({ ...draftSettings, roundingStep: Number(event.target.value) })} /></label>
          <label>Режим поставщика
            <select value={draftSettings.supplierMode} onChange={(event) => setDraftSettings({ ...draftSettings, supplierMode: event.target.value as SupplierMode })}>
              <option value="demo">demo</option>
              <option value="proxy">proxy</option>
              <option value="live">live</option>
            </select>
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={draftSettings.proxyEnabled} onChange={(event) => setDraftSettings({ ...draftSettings, proxyEnabled: event.target.checked })} />
            Proxy включен
          </label>
          <h2>Контакты</h2>
          <label>Название<input value={draftSettings.companyName} onChange={(event) => setDraftSettings({ ...draftSettings, companyName: event.target.value })} /></label>
          <label>Телефон<input value={draftSettings.phone} onChange={(event) => setDraftSettings({ ...draftSettings, phone: event.target.value })} /></label>
          <label>Telegram<input value={draftSettings.telegram} onChange={(event) => setDraftSettings({ ...draftSettings, telegram: event.target.value })} /></label>
          <label>Город<input value={draftSettings.city} onChange={(event) => setDraftSettings({ ...draftSettings, city: event.target.value })} /></label>
          <label>Юридический текст<textarea value={draftSettings.legalNote} onChange={(event) => setDraftSettings({ ...draftSettings, legalNote: event.target.value })} /></label>
          <Button type="submit">Сохранить настройки</Button>
        </form>

        <div>
          <input className="admin-search" placeholder="Фильтр по заказам, клиенту, VIN, артикулу" value={filter} onChange={(event) => setFilter(event.target.value)} />
          <div className="orders-table">
            <div className="orders-table-head">
              <span>Клиент</span><span>Авто / VIN</span><span>Товары</span><span>Экономика</span><span>Статус</span><span>Оплата</span>
            </div>
            {visibleOrders.map((order) => (
              <article className="orders-table-row" key={order.id}>
                <div><strong>{order.customerName}</strong><p>{order.phone}</p><p>{order.telegram}</p></div>
                <div><strong>{order.carLabel || 'без авто'}</strong><p>{order.vin}</p><p>{order.comment || order.clientComment}</p></div>
                <div>{order.items.map((item) => <p key={`${item.brand}-${item.article}`}>{item.brand} {item.article} · закупка {formatRub(item.purchasePrice ?? item.basePrice ?? 0)} · клиент {formatRub(item.clientPrice)} · {item.deliveryText ?? item.deliveryTerm ?? 'срок уточняется'}</p>)}</div>
                <div>
                  <p>Закупка: {formatRub(purchaseTotal(order))}</p>
                  <p>Клиент: {formatRub(order.totalClientPrice)}</p>
                  <p>Маржа: {formatRub(marginTotal(order))} ({calculateMarginPercent(purchaseTotal(order), order.totalClientPrice)}%)</p>
                  <input type="number" defaultValue={order.totalClientPrice} onBlur={(event) => changePrice(order, event.target.value)} />
                </div>
                <select value={order.status} onChange={(event) => changeStatus(order, event.target.value as OrderStatus)}>
                  {Object.entries(orderStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <label className="checkbox">
                  <input type="checkbox" checked={order.paymentStatus === 'paid'} onChange={(event) => changePayment(order, event.target.checked)} />
                  {(order.paymentMethod && paymentMethodLabels[order.paymentMethod]) || 'оплата не указана'} · оплачено
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
