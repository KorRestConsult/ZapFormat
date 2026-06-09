import { ArrowRight, CheckCircle2, MessageCircle, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { useSettings } from '../contexts/SettingsContext';

export function HomePage() {
  const { settings } = useSettings();

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Подберем, проверим, привезем</p>
          <h1>{settings.companyName}</h1>
          <p>Ищите по артикулу или отправьте VIN-заявку. Менеджер сверит цену, наличие и срок у поставщика перед подтверждением заказа.</p>
          <div className="hero-actions">
            <Link to="/search" className="button button-primary"><Search size={18} />Найти деталь</Link>
            <Link to="/vin" className="button button-secondary"><MessageCircle size={18} />Подбор по VIN</Link>
          </div>
        </div>
        <div className="hero-panel">
          <span>Цена поставщика</span>
          <strong>через защищенный Supplier Layer</strong>
          <p>Публичные и авторизованные цены разделены, логины поставщика не хранятся во frontend.</p>
        </div>
      </section>

      <section className="section-grid">
        {['Поиск по артикулу', 'Проверка менеджером', 'Оплата после подтверждения', 'Статусы в кабинете'].map((item) => (
          <article className="feature-card" key={item}>
            <CheckCircle2 size={22} />
            <h3>{item}</h3>
            <p>Прозрачный процесс без обещаний наличия до финальной проверки.</p>
          </article>
        ))}
      </section>

      <section className="workflow">
        <h2>Схема работы</h2>
        <div className="steps">
          {['Заявка', 'Проверка цены', 'Подтверждение', 'Заказ у поставщика', 'Выдача'].map((step, index) => (
            <div className="step" key={step}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
        <Button onClick={() => window.location.assign(`tel:${settings.phone}`)}>
          Связаться с менеджером <ArrowRight size={18} />
        </Button>
      </section>
    </>
  );
}
