export const DEFAULT_MARKUP_PERCENT = 15;

export function applyMarkup(price: number, percent = DEFAULT_MARKUP_PERCENT) {
  return Math.round(price * (1 + percent / 100));
}

export function formatRub(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value) + " ₽";
}
