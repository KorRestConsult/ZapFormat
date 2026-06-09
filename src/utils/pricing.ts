export function roundNice(value: number, step = 10): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (!Number.isFinite(step) || step <= 1) return Math.round(value);
  return Math.ceil(value / step) * step;
}

export function calculateClientPrice(basePrice: number, markupPercent: number, minMarginRub = 0, roundingStep = 10): number {
  if (!Number.isFinite(basePrice) || basePrice < 0) return 0;
  const safeMarkup = Number.isFinite(markupPercent) && markupPercent > 0 ? markupPercent : 0;
  const markedUp = basePrice * (1 + safeMarkup / 100);
  const withMinMargin = Math.max(markedUp, basePrice + Math.max(0, minMarginRub));
  return roundNice(withMinMargin, roundingStep);
}

export function calculateMarginRub(purchasePrice: number, clientPrice: number): number {
  return Math.max(0, Math.round(clientPrice - purchasePrice));
}

export function calculateMarginPercent(purchasePrice: number, clientPrice: number): number {
  if (!purchasePrice) return 0;
  return Math.round(((clientPrice - purchasePrice) / purchasePrice) * 1000) / 10;
}

export function formatRub(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}
