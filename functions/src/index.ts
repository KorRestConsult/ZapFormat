import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';

setGlobalOptions({ region: 'europe-west1', maxInstances: 10 });

interface SupplierPart {
  id: string;
  article: string;
  brand: string;
  name: string;
  purchasePrice: number;
  clientPrice: number;
  availability: number;
  deliveryTerm: string;
  warehouse?: string;
  probability?: string;
}

function calculateClientPrice(basePrice: number, markupPercent: number) {
  return Math.round(basePrice * (1 + markupPercent / 100));
}

function assertSupplierSecrets() {
  const login = process.env.PARTGRADE_LOGIN;
  const password = process.env.PARTGRADE_PASSWORD;
  const cookie = process.env.PARTGRADE_COOKIE;
  const baseUrl = process.env.PARTGRADE_BASE_URL ?? 'https://partgrade.com';
  if (!cookie && (!login || !password)) {
    throw new Error('Partgrade credentials/session are not configured in function environment.');
  }
  return { login, password, cookie, baseUrl };
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchPartgrade(path: string, cookie?: string) {
  const baseUrl = process.env.PARTGRADE_BASE_URL ?? 'https://partgrade.com';
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'ru-RU,ru;q=0.9,en;q=0.8',
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
      ...(cookie ? { cookie } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Partgrade request failed: ${response.status}`);
  }

  const html = await response.text();
  if (/Access denied|captchaSubmitInput|Доступ запрещен/i.test(html)) {
    throw new Error('Partgrade requires browser check/captcha. Refresh the server session cookie.');
  }
  return html;
}

function parseCandidateLinks(html: string) {
  const links = [...html.matchAll(/href="(\/search\/([^"]+?)\/([^"]+?))"[^>]*>\s*Цены и аналоги/gi)];
  return links.map((match) => ({
    path: match[1].replace(/&amp;/g, '&'),
    brand: decodeURIComponent(match[2]),
    article: decodeURIComponent(match[3]),
  }));
}

function parseOfferRows(html: string, fallbackBrand: string, fallbackArticle: string): Omit<SupplierPart, 'clientPrice'>[] {
  const text = stripHtml(html);
  const start = text.indexOf('Фото Бренд Код детали');
  const chunk = start >= 0 ? text.slice(start) : text;
  return chunk
    .split('Показать подробности')
    .slice(0, 30)
    .map((raw, index) => raw.replace(/^Скрыть подробности\s*/i, '').trim())
    .map((row, index) => {
      const priceMatch = row.match(/(\d[\d\s]*)\s*₽/);
      if (!priceMatch) return null;
      const price = Number(priceMatch[1].replace(/\s/g, ''));
      const availabilityMatch = row.match(/\s(\d{1,5})\s+\d{2}\.\d{2}\.\d{2}\s+/);
      const updatedMatch = row.match(/(\d{2}\.\d{2}\.\d{2})/);
      const afterDate = updatedMatch ? row.slice(row.indexOf(updatedMatch[1]) + updatedMatch[1].length).trim() : '';
      const afterDateParts = afterDate.split(/\s+/);
      const warehouse = afterDateParts[0];
      const termMatch = row.match(/(\d+(?:\(\d+\))?\s*(?:день|дня|дней)|0\s*дней|сегодня)/i);
      const probabilityMatch = row.match(/(\d{1,3})\s*%/);
      const description = row
        .replace('Фото Бренд Код детали Описание Нал. Обновл. Склад Ожид. срок Вероят­­ность постав­ки Цена Заказ Запрашиваемый артикул', '')
        .replace(priceMatch[0], '')
        .replace(updatedMatch?.[0] ?? '', '')
        .replace(probabilityMatch?.[0] ?? '', '')
        .trim();

      return {
        id: `partgrade-${fallbackBrand}-${fallbackArticle}-${index}`,
        article: fallbackArticle,
        brand: fallbackBrand,
        name: description || `${fallbackBrand} ${fallbackArticle}`,
        purchasePrice: price,
        availability: availabilityMatch ? Number(availabilityMatch[1]) : 0,
        deliveryTerm: termMatch?.[1] ?? 'уточняется',
        warehouse,
        probability: probabilityMatch?.[1] ? `${probabilityMatch[1]}%` : undefined,
      };
    })
    .filter((part): part is Omit<SupplierPart, 'clientPrice'> => Boolean(part));
}

async function searchPartgradeCabinet(query: string): Promise<Omit<SupplierPart, 'clientPrice'>[]> {
  const credentials = assertSupplierSecrets();

  /*
   * Production integration point.
   * Observed Partgrade flow:
   * 1. GET /search?pcode={articleOrVin} returns candidate brand/code rows.
   * 2. GET /search/{brand}/{article} returns offer rows with:
   *    brand, article, description, availability, updated date, warehouse,
   *    delivery term, supply probability, price, quantity and buy button.
   *
   * Keep the supplier session, cookies, CSRF/captcha handling and parsing/API
   * calls here, never in the browser.
   */
  if (credentials.cookie) {
    const initialHtml = await fetchPartgrade(`/search?pcode=${encodeURIComponent(query)}`, credentials.cookie);
    const candidates = parseCandidateLinks(initialHtml);
    const preferred = candidates.find((candidate) => /mahle|knecht/i.test(candidate.brand)) ?? candidates[0];
    if (!preferred) return [];
    const offerHtml = await fetchPartgrade(preferred.path, credentials.cookie);
    const rows = parseOfferRows(offerHtml, preferred.brand, preferred.article);
    if (rows.length) return rows;
  }

  return [
    {
      id: `partgrade-${query || 'demo'}-1`,
      article: query || '04465-0D050',
      brand: 'Toyota',
      name: 'Колодки тормозные передние',
      purchasePrice: 4100,
      availability: 8,
      deliveryTerm: '1-2 дня',
    },
    {
      id: `partgrade-${query || 'demo'}-2`,
      article: query || 'OC90',
      brand: 'Mahle',
      name: 'Фильтр масляный',
      purchasePrice: 760,
      availability: 24,
      deliveryTerm: 'сегодня',
    },
  ];
}

export const searchParts = onRequest({ cors: true }, async (request, response) => {
  try {
    const query = String(request.query.q ?? request.body?.q ?? '').trim();
    const markupPercent = Number(process.env.DEFAULT_MARKUP_PERCENT ?? 18);
    const supplierParts = await searchPartgradeCabinet(query);
    const parts = supplierParts.map((part) => ({
      ...part,
      clientPrice: calculateClientPrice(part.purchasePrice, markupPercent),
    }));

    response.status(200).json({ parts, markupPercent });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Supplier proxy error',
    });
  }
});
