import { ShoppingCart } from 'lucide-react';
import { Button } from './Button';
import { LegalNote } from './LegalNote';
import type { SupplierPart } from '../types';
import { calculateClientPrice, formatRub } from '../utils/pricing';
import { useSettings } from '../contexts/SettingsContext';

interface PartCardProps {
  part: SupplierPart;
  onAdd(part: SupplierPart): void;
}

export function PartCard({ part, onAdd }: PartCardProps) {
  const { settings } = useSettings();
  const clientPrice = calculateClientPrice(part.basePrice, settings.markupPercent);

  return (
    <article className="part-card">
      <div>
        <p className="eyebrow">{part.brand}</p>
        <h3>{part.name}</h3>
        <p className="muted">Артикул: {part.article}</p>
      </div>
      <div className="part-meta">
        <span>{part.availability > 0 ? `Наличие: ${part.availability}` : 'Наличие уточняется'}</span>
        <span>Срок: {part.deliveryTerm}</span>
      </div>
      <div className="price-row">
        <strong>{formatRub(clientPrice)}</strong>
        <small>Цена ЗапФормат</small>
      </div>
      <LegalNote />
      <Button onClick={() => onAdd(part)}>
        <ShoppingCart size={18} />
        В корзину
      </Button>
    </article>
  );
}
