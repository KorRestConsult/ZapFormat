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
          <p className="eyebrow">Электронный каталог автозапчастей</p>
          <h1>{settings.companyName}</h1>
          <p>Поиск деталей по артикулу и VIN, каталоги для автомобиля, корзина, заказы и личный кабинет в одном сервисе.</p>
          <div className="hero-actions">
            <Link to="/search" className="button button-primary"><Search size={18} />Найти деталь</Link>
            <Link to="/vin" className="button button-secondary"><MessageCircle size={18} />Подбор по VIN</Link>
          </div>
        </div>
        <div className="hero-panel">
          <span>Для клиентов ЗапФормат</span>
          <strong>цены сразу на сайте</strong>
          <p>Показываем итоговую цену, срок и наличие. Подтверждение заказа выполняет менеджер.</p>
        </div>
      </section>

      <section className="section-grid">
        {['Каталоги по автомобилю', 'Поиск по артикулу', 'Гараж клиента', 'Заказы в кабинете'].map((item) => (
          <article className="feature-card" key={item}>
            <CheckCircle2 size={22} />
            <h3>{item}</h3>
            <p>Привычный каталог запчастей с аккуратной витриной и быстрым оформлением.</p>
          </article>
        ))}
      </section>

      <section className="workflow">
        <h2>Схема работы</h2>
        <div className="steps">
          {['Поиск детали', 'Выбор позиции', 'Корзина', 'Заказ', 'Получение'].map((step, index) => (
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
