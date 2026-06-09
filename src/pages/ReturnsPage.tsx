import { Button } from '../components/Button';

export function ReturnsPage() {
  return (
    <section className="page narrow">
      <div className="page-heading">
        <p className="eyebrow">Возвраты</p>
        <h1>Заявка на возврат</h1>
      </div>
      <form className="panel-form">
        <input placeholder="Номер заказа" />
        <input placeholder="Артикул" />
        <textarea placeholder="Причина возврата" />
        <Button type="button" variant="secondary">Отправить менеджеру</Button>
      </form>
    </section>
  );
}
