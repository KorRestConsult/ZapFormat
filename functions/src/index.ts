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
}

function calculateClientPrice(basePrice: number, markupPercent: number) {
  return Math.round(basePrice * (1 + markupPercent / 100));
}

function assertSupplierSecrets() {
  const login = process.env.PARTGRADE_LOGIN;
  const password = process.env.PARTGRADE_PASSWORD;
  const baseUrl = process.env.PARTGRADE_BASE_URL ?? 'https://partgrade.com';
  if (!login || !password) {
    throw new Error('Partgrade credentials are not configured in function environment.');
  }
  return { login, password, baseUrl };
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
   * calls here, never in the browser. Replace this mock response with real
   * authenticated cabinet requests normalized to this shape.
   */
  void credentials;

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
