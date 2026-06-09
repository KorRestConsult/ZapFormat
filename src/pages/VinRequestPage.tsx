import { FormEvent, useState } from 'react';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { createVinRequest } from '../services/orderService';
import { uploadVinPhoto } from '../services/storageService';

export function VinRequestPage() {
  const { firebaseUser, profile } = useAuth();
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const photo = form.get('photo');
    const photoUrl = firebaseUser && photo instanceof File && photo.size > 0 ? await uploadVinPhoto(firebaseUser.uid, photo) : undefined;
    await createVinRequest({
      userId: firebaseUser?.uid ?? null,
      vin: String(form.get('vin') ?? ''),
      carBrand: String(form.get('carBrand') ?? ''),
      carModel: String(form.get('carModel') ?? ''),
      year: String(form.get('year') ?? ''),
      requestedPart: String(form.get('requestedPart') ?? ''),
      phone: String(form.get('phone') ?? profile?.phone ?? ''),
      comment: String(form.get('comment') ?? ''),
      status: 'new',
      adminComment: '',
      photoUrl,
      createdAt: new Date().toISOString(),
    });
    event.currentTarget.reset();
    setSent(true);
  }

  return (
    <section className="page narrow">
      <div className="page-heading">
        <p className="eyebrow">VIN-подбор</p>
        <h1>Сохраните автомобиль и заказывайте быстрее</h1>
      </div>
      <form className="panel-form" onSubmit={onSubmit}>
        <input name="vin" required placeholder="VIN" />
        <div className="form-row">
          <input name="carBrand" placeholder="Марка" />
          <input name="carModel" placeholder="Модель" />
          <input name="year" placeholder="Год" />
        </div>
        <input name="requestedPart" required placeholder="Какая деталь нужна" />
        <input name="photo" type="file" accept="image/*" />
        <input name="phone" required placeholder="Телефон" defaultValue={profile?.phone ?? ''} />
        <textarea name="comment" placeholder="Комментарий" />
        <Button type="submit">Отправить заявку</Button>
        {sent && <p className="success">Заявка создана со статусом "new". Менеджер скоро свяжется с вами.</p>}
      </form>
    </section>
  );
}
