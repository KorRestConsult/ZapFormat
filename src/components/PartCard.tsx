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
  const whatsappHref = `${settings.whatsapp}?text=${encodeURIComponent(`Здравствуйте. Уточните ${part.brand} ${part.article} для моего авто.`)}`;

  return (
    <article className="part-card product-row">
      <div className="part-main">
        <p className="eyebrow">{part.isOriginal ? 'Оригинал' : 'Аналог'} · {part.brand}</p>
        <h3>{part.name}</h3>
        <p className="muted">Артикул: {part.article}</p>
        <p className="part-description">{part.description}</p>
        <div className="tag-row">
          {part.applicability.slice(0, 2).map((item) => <span className="tag" key={item}>{item}</span>)}
        </div>
      </div>
      <div className="part-supply">
        <span><PackageCheck size={16} /> {part.availability > 0 ? `${part.availability} шт.` : 'уточняется'}</span>
        <span>{part.deliveryText}</span>
        <span>{part.warehouse}</span>
        <span>{part.probability ? `${part.probability}%` : 'уточнить'}</span>
      </div>
      <div className="part-buy">
        <strong>{formatRub(part.clientPrice)}</strong>
        <small>Цена ZapFormat</small>
        <Button onClick={() => onAdd(part)}>
          <ShoppingCart size={18} />
          В корзину
        </Button>
        <a className="button button-secondary" href={whatsappHref} target="_blank" rel="noreferrer">
          <MessageCircle size={18} />
          Уточнить
        </a>
      </div>
      <LegalNote />
    </article>
  );
}
