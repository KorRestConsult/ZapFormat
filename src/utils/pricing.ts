export function calculateClientPrice(basePrice: number, markupPercent: number): number {
  if (!Number.isFinite(basePrice) || basePrice < 0) return 0;
  if (!Number.isFinite(markupPercent) || markupPercent < 0) return Math.round(basePrice);
  return Math.round(basePrice * (1 + markupPercent / 100));
}

export function formatRub(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}
