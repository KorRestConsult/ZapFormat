import type { Order, SupplierPart, SupplierPriceLevel } from '../types';

export interface SupplierService {
  searchParts(query: string, priceLevel?: SupplierPriceLevel): Promise<SupplierPart[]>;
  getPartDetails(partId: string, priceLevel?: SupplierPriceLevel): Promise<SupplierPart | null>;
  createSupplierOrder(order: Order): Promise<{ supplierOrderId: string; status: string }>;
  checkAvailability(article: string, brand: string): Promise<{ availability: number; deliveryTerm: string }>;
}

const mockParts: Omit<SupplierPart, 'basePrice' | 'priceLevel'>[] = [
  {
    id: 'pg-brk-001',
    article: '04465-0D050',
    brand: 'Toyota',
    name: 'Колодки тормозные передние',
    publicBasePrice: 4900,
    authorizedBasePrice: 4100,
    availability: 8,
    deliveryTerm: '1-2 дня',
    supplier: 'PartGrade-ready mock',
  },
  {
    id: 'pg-oil-002',
    article: 'OC90',
    brand: 'Mahle',
    name: 'Фильтр масляный',
    publicBasePrice: 980,
    authorizedBasePrice: 760,
    availability: 24,
    deliveryTerm: 'сегодня',
    supplier: 'PartGrade-ready mock',
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
    supplier: 'PartGrade-ready mock',
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
    supplier: 'PartGrade-ready mock',
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

export const supplierService: SupplierService = mockSupplierService;
