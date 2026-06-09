import { MessageCircle, PackageCheck, ShoppingCart } from 'lucide-react';
import { Button } from './Button';
import { LegalNote } from './LegalNote';
import type { SupplierPart } from '../types';
import { formatRub } from '../utils/pricing';
import { useSettings } from '../contexts/SettingsContext';

interface PartCardProps {
  part: SupplierPart;
  onAdd(part: SupplierPart): void;
}

export function PartCard({ part, onAdd }: PartCardProps) {
  const { settings } = useSettings();
  const telegramHref = `${settings.telegram}${settings.telegram.includes('?') ? '&' : '?'}text=${encodeURIComponent(
    `Здравствуйте. Уточните ${part.brand} ${part.article} для моего авто.`,
  )}`;

  return (
    <article className="part-card product-card">
      <img className="part-image" src={part.imageUrl} alt={`${part.brand} ${part.article}`} loading="lazy" />
      <div className="part-card-body">
        <div>
          <p className="eyebrow">{part.isOriginal ? 'Оригинал' : 'Аналог'} · {part.brand}</p>
          <h3>{part.name}</h3>
          <p className="muted">Артикул: {part.article}</p>
        </div>
        <div className="part-meta">
          <span><PackageCheck size={16} /> {part.availability > 0 ? `Наличие: ${part.availability}` : 'Наличие уточняется'}</span>
          <span>Срок: {part.deliveryText}</span>
          <span>Склад: {part.warehouse}</span>
          <span>Поставка: {part.probability ? `${part.probability}%` : 'уточняется'}</span>
        </div>
        <p className="muted">{part.description}</p>
        <div className="tag-row">
          {part.applicability.slice(0, 2).map((item) => <span className="tag" key={item}>{item}</span>)}
        </div>
        <div className="price-row">
          <strong>{formatRub(part.clientPrice)}</strong>
          <small>Цена ZapFormat</small>
        </div>
        <LegalNote />
        <div className="card-actions">
          <Button onClick={() => onAdd(part)}>
            <ShoppingCart size={18} />
            В корзину
          </Button>
          <a className="button button-secondary" href={telegramHref} target="_blank" rel="noreferrer">
            <MessageCircle size={18} />
            Уточнить
          </a>
        </div>
      </div>
    </article>
  );
}
