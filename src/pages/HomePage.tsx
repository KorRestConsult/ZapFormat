import { ArrowRight, Car, CheckCircle2, MessageCircle, Search, ShieldCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useSettings } from '../contexts/SettingsContext';

const benefits = ['История по каждому автомобилю', 'Оригиналы и аналоги', 'Заказ через личный кабинет', 'Статусы и возвраты'];
const categories = ['ТО', 'масла', 'фильтры', 'тормоза', 'подвеска', 'электрика', 'аккумуляторы', 'лампы', 'шины', 'диски', 'автохимия', 'аксессуары', 'инструменты', 'щетки стеклоочистителя'];

export function HomePage() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">ZapFormat</p>
          <h1>Запчасти по VIN, артикулу и автомобилю</h1>
          <p>Наличие, сроки, оригиналы, аналоги и заказ в одном месте. Клиент видит финальную цену ZapFormat, владелец видит закупку, наценку и маржу.</p>
          <form className="hero-search" onSubmit={submitSearch}>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="VIN, артикул, бренд или название детали" />
            <button className="button button-primary" type="submit"><Search size={18} />Найти</button>
          </form>
          <div className="hero-actions">
            <Link to="/search" className="button button-primary"><Search size={18} />Найти по VIN</Link>
            <Link to="/search" className="button button-secondary"><ShieldCheck size={18} />Найти по артикулу</Link>
            <Link to="/account" className="button button-secondary"><Car size={18} />Добавить авто в гараж</Link>
          </div>
        </div>
        <div className="hero-panel">
          <span>Кабинет владельца</span>
          <strong>закупка, скидка, маржа и источник</strong>
          <p>Служебные цены и поставщик скрыты от клиента, но доступны владельцу в админке.</p>
        </div>
      </section>

      <section className="section-grid">
        {benefits.map((item) => (
          <article className="feature-card" key={item}>
            <CheckCircle2 size={22} />
            <h3>{item}</h3>
            <p>Рабочий сценарий для повторных заказов, подборов и контроля статусов.</p>
          </article>
        ))}
      </section>

      <section className="category-band">
        <div className="page-heading">
          <p className="eyebrow">Категории</p>
          <h2>Популярные разделы</h2>
        </div>
        <div className="category-grid">
          {categories.map((item) => <Link key={item} to={`/search?category=${encodeURIComponent(item)}`}>{item}</Link>)}
        </div>
      </section>

      <section className="workflow">
        <h2>Схема работы</h2>
        <div className="steps">
          {['Поиск', 'Оригиналы и аналоги', 'Корзина', 'Статус заказа', 'Выдача или возврат'].map((step, index) => (
            <div className="step" key={step}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
        <Button onClick={() => window.location.assign(`tel:${settings.phone}`)}>
          Связаться с менеджером <ArrowRight size={18} />
        </Button>
        <a className="button button-secondary" href={settings.telegram} target="_blank" rel="noreferrer"><MessageCircle size={18} />Telegram</a>
      </section>
    </>
  );
}
