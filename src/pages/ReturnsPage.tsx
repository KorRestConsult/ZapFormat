import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { createReturnRequest, getUserOrders, getUserReturns } from '../services/orderService';
import { uploadReturnPhoto } from '../services/storageService';
import type { Order, ReturnRequest, ReturnReason } from '../types';
import { returnReasonLabels } from '../utils/status';

export function ReturnsPage() {
  const { firebaseUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (firebaseUser) {
      getUserOrders(firebaseUser.uid).then(setOrders).catch(() => setOrders([]));
      getUserReturns(firebaseUser.uid).then(setReturns).catch(() => setReturns([]));
    }
  }, [firebaseUser]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const orderId = String(form.get('orderId') ?? '');
    const files = form.getAll('photos').filter((file): file is File => file instanceof File && file.size > 0);
    const photos = firebaseUser ? await Promise.all(files.map((file) => uploadReturnPhoto(firebaseUser.uid, orderId, file))) : [];
    await createReturnRequest({
      userId: firebaseUser?.uid ?? null,
      orderId,
      reason: String(form.get('reason') ?? 'other') as ReturnReason,
      comment: String(form.get('comment') ?? ''),
      photos,
      status: 'new',
      createdAt: new Date().toISOString(),
    });
    event.currentTarget.reset();
    setSent(true);
    if (firebaseUser) setReturns(await getUserReturns(firebaseUser.uid));
  }

  return (
    <section className="page narrow">
      <div className="page-heading">
        <p className="eyebrow">Возвраты</p>
        <h1>Заявка на возврат</h1>
      </div>
      <form className="panel-form" onSubmit={onSubmit}>
        <select name="orderId" required>
          <option value="">Выберите заказ</option>
          {orders.map((order) => <option key={order.id} value={order.id}>Заказ от {new Date(order.createdAt).toLocaleDateString('ru-RU')} · {order.items[0]?.article}</option>)}
        </select>
        <select name="reason" defaultValue="not_fit">
          {Object.entries(returnReasonLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input name="photos" type="file" accept="image/*" multiple />
        <textarea name="comment" placeholder="Комментарий" />
        {sent && <p className="success">Заявка сохранена.</p>}
        <Button type="submit" variant="secondary">Отправить менеджеру</Button>
      </form>
      <div className="orders-list">
        {returns.map((item) => (
          <article className="order-card" key={item.id}>
            <strong>{returnReasonLabels[item.reason]}</strong>
            <span className="status">{item.status}</span>
            <p>{item.comment}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
