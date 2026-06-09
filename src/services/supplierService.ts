import type { Order, SupplierPart, SupplierPriceLevel } from '../types';

export interface SupplierService {
  searchParts(query: string, priceLevel?: SupplierPriceLevel): Promise<SupplierPart[]>;
  getPartDetails(partId: string, priceLevel?: SupplierPriceLevel): Promise<SupplierPart | null>;
  createSupplierOrder(order: Order): Promise<{ supplierOrderId: string; status: string }>;
  checkAvailability(article: string, brand: string): Promise<{ availability: number; deliveryTerm: string }>;
}

/*
 * Partgrade must be connected behind this boundary only.
 * Real credentials belong in a backend, Cloud Functions, or secret manager.
 * The storefront receives normalized purchase prices and never logs into
 * the supplier cabinet directly from the browser.
 */
const mockParts: Omit<SupplierPart, 'basePrice' | 'priceLevel'>[] = [
  {
    id: 'pg-oc90-001',
    article: 'OC 90',
    brand: 'Mahle/Knecht',
    name: 'Фильтр масляный Chevrolet Aveo, Captiva, Lacetti',
    publicBasePrice: 334,
    authorizedBasePrice: 283,
    availability: 100,
    deliveryTerm: '1 день',
    supplier: 'private-supplier-proxy',
  },
  {
    id: 'pg-oc90-002',
    article: 'OC 90',
    brand: 'Mahle/Knecht',
    name: 'OC90, фильтр масляный Mahle Original',
    publicBasePrice: 348,
    authorizedBasePrice: 295,
    availability: 101,
    deliveryTerm: '1 день',
    supplier: 'private-supplier-proxy',
  },
  {
    id: 'pg-air-003',
    article: 'C25012',
    brand: 'Mann',
    name: 'Фильтр воздушный',
    publicBasePrice: 1850,
    authorizedBasePrice: 1520,
    availability: 11,
    deliveryTerm: '2-3 дня',
    supplier: 'private-supplier-proxy',
  },
  {
    id: 'pg-sns-004',
    article: '234-9009',
    brand: 'Denso',
    name: 'Датчик кислородный',
    publicBasePrice: 7200,
    authorizedBasePrice: 6100,
    availability: 3,
    deliveryTerm: '3-5 дней',
    supplier: 'private-supplier-proxy',
  },
];

function withPriceLevel(part: Omit<SupplierPart, 'basePrice' | 'priceLevel'>, priceLevel: SupplierPriceLevel): SupplierPart {
  return {
    ...part,
    priceLevel,
    basePrice: priceLevel === 'authorized' ? part.authorizedBasePrice : part.publicBasePrice,
  };
}

export const mockSupplierService: SupplierService = {
  async searchParts(query, priceLevel = 'authorized') {
    const normalized = query.trim().toLowerCase();
    const result = mockParts.filter((part) =>
      [part.article, part.brand, part.name].some((value) => value.toLowerCase().includes(normalized)),
    );
    return (result.length ? result : mockParts).map((part) => withPriceLevel(part, priceLevel));
  },

  async getPartDetails(partId, priceLevel = 'authorized') {
    const part = mockParts.find((item) => item.id === partId);
    return part ? withPriceLevel(part, priceLevel) : null;
  },

  async createSupplierOrder(order) {
    return {
      supplierOrderId: `MOCK-${order.createdAt.slice(0, 10)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      status: 'accepted_for_manual_confirmation',
    };
  },

  async checkAvailability(article, brand) {
    const part = mockParts.find(
      (item) => item.article.toLowerCase() === article.toLowerCase() && item.brand.toLowerCase() === brand.toLowerCase(),
    );
    return {
      availability: part?.availability ?? 0,
      deliveryTerm: part?.deliveryTerm ?? 'уточняется менеджером',
    };
  },
};

const proxyUrl = import.meta.env.VITE_SUPPLIER_PROXY_URL;

export const partgradeProxySupplierService: SupplierService = {
  async searchParts(query) {
    if (!proxyUrl) return mockSupplierService.searchParts(query);
    const response = await fetch(`${proxyUrl}?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Не удалось получить цены поставщика');
    const payload = (await response.json()) as {
      parts: Array<{
        id: string;
        article: string;
        brand: string;
        name: string;
        purchasePrice: number;
        availability: number;
        deliveryTerm: string;
      }>;
    };
    return payload.parts.map((part) => ({
      id: part.id,
      article: part.article,
      brand: part.brand,
      name: part.name,
      publicBasePrice: part.purchasePrice,
      authorizedBasePrice: part.purchasePrice,
      basePrice: part.purchasePrice,
      availability: part.availability,
      deliveryTerm: part.deliveryTerm,
      supplier: 'private-supplier-proxy',
      priceLevel: 'authorized',
    }));
  },
  async getPartDetails(partId) {
    return mockSupplierService.getPartDetails(partId);
  },
  async createSupplierOrder(order) {
    return mockSupplierService.createSupplierOrder(order);
  },
  async checkAvailability(article, brand) {
    return mockSupplierService.checkAvailability(article, brand);
  },
};

export const supplierService: SupplierService = partgradeProxySupplierService;
