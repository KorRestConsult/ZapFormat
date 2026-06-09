import type { Order, SearchKind, SupplierPart } from '../types';
import { calculateClientPrice, calculateMarginRub } from '../utils/pricing';

export interface SupplierSearchParams {
  query: string;
  kind?: SearchKind;
  brand?: string;
  category?: string;
  garageCarId?: string;
  markupPercent?: number;
  minMarginRub?: number;
  roundingStep?: number;
}

export interface SupplierService {
  searchParts(params: SupplierSearchParams): Promise<SupplierPart[]>;
  getPartDetails(partId: string): Promise<SupplierPart | null>;
  createSupplierOrder(order: Order): Promise<{ supplierOrderId: string; status: string }>;
  checkAvailability(article: string, brand: string): Promise<{ availability: number; deliveryText: string }>;
}

const placeholderImage =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420"%3E%3Crect width="640" height="420" fill="%2316211b"/%3E%3Cpath d="M132 238h376l-34-82c-7-17-21-27-39-27H205c-18 0-32 10-39 27l-34 82Z" fill="%2332483b"/%3E%3Ccircle cx="216" cy="260" r="38" fill="%23f4efe4"/%3E%3Ccircle cx="424" cy="260" r="38" fill="%23f4efe4"/%3E%3Ctext x="320" y="92" text-anchor="middle" fill="%23c8b894" font-family="Arial" font-size="34" font-weight="700"%3EZapFormat%3C/text%3E%3Ctext x="320" y="336" text-anchor="middle" fill="%23ffffff" font-family="Arial" font-size="22"%3E%D1%84%D0%BE%D1%82%D0%BE %D1%83%D1%82%D0%BE%D1%87%D0%BD%D1%8F%D0%B5%D1%82%D1%81%D1%8F%3C/text%3E%3C/svg%3E';

const demoParts: Array<Omit<SupplierPart, 'clientPrice' | 'markupPercent' | 'marginRub' | 'updatedAt'>> = [
  {
    id: 'pg-original-04465-0d050',
    supplier: 'PartGrade demo',
    brand: 'Toyota',
    article: '04465-0D050',
    name: 'Колодки тормозные передние',
    description: 'Оригинальный комплект для Toyota Corolla/Auris, передняя ось.',
    imageUrl: placeholderImage,
    purchasePrice: 4100,
    availability: 8,
    deliveryDays: 1,
    deliveryText: '1 день',
    warehouse: 'Москва',
    probability: 96,
    isOriginal: true,
    analogs: ['Brembo P 83 082', 'NiBK PN-1410', 'TRW GDB3312'],
    applicability: ['Toyota Corolla E150 2006-2013', 'Toyota Auris 2007-2012'],
    category: 'тормоза',
  },
  {
    id: 'pg-brembo-p83082',
    supplier: 'PartGrade demo',
    brand: 'Brembo',
    article: 'P 83 082',
    name: 'Колодки тормозные передние, аналог',
    description: 'Надежный аналог оригинального комплекта с быстрым сроком поставки.',
    imageUrl: placeholderImage,
    purchasePrice: 2960,
    availability: 14,
    deliveryDays: 0,
    deliveryText: 'сегодня',
    warehouse: 'Рязань',
    probability: 98,
    isOriginal: false,
    analogs: ['04465-0D050', 'NiBK PN-1410'],
    applicability: ['Toyota Corolla E150 2006-2013'],
    category: 'тормоза',
  },
  {
    id: 'pg-mahle-oc90',
    supplier: 'PartGrade demo',
    brand: 'Mahle/Knecht',
    article: 'OC 90',
    name: 'Фильтр масляный',
    description: 'Масляный фильтр для Chevrolet Aveo, Captiva, Lacetti.',
    imageUrl: placeholderImage,
    purchasePrice: 283,
    availability: 101,
    deliveryDays: 1,
    deliveryText: '1 день',
    warehouse: 'Москва',
    probability: 95,
    isOriginal: false,
    analogs: ['Mann W712/75', 'Bosch 0 451 103 276'],
    applicability: ['Chevrolet Lacetti 1.4-1.8', 'Chevrolet Aveo T250'],
    category: 'ТО',
  },
  {
    id: 'pg-mann-c25012',
    supplier: 'PartGrade demo',
    brand: 'Mann',
    article: 'C25012',
    name: 'Фильтр воздушный',
    description: 'Воздушный фильтр двигателя, популярная складская позиция.',
    imageUrl: placeholderImage,
    purchasePrice: 1520,
    availability: 11,
    deliveryDays: 2,
    deliveryText: '2-3 дня',
    warehouse: 'Санкт-Петербург',
    probability: 91,
    isOriginal: false,
    analogs: ['Filtron AP082', 'Mahle LX 1085'],
    applicability: ['Volkswagen Polo Sedan', 'Skoda Rapid'],
    category: 'фильтры',
  },
  {
    id: 'pg-denso-2349009',
    supplier: 'PartGrade demo',
    brand: 'Denso',
    article: '234-9009',
    name: 'Датчик кислородный',
    description: 'Лямбда-зонд с высокой вероятностью поставки.',
    imageUrl: placeholderImage,
    purchasePrice: 6100,
    availability: 3,
    deliveryDays: 4,
    deliveryText: '3-5 дней',
    warehouse: 'Екатеринбург',
    probability: 84,
    isOriginal: false,
    analogs: ['Bosch 0 258 006 537'],
    applicability: ['Mazda 3 BK', 'Ford Focus II'],
    category: 'электрика',
  },
];

function enrichPart(
  part: Omit<SupplierPart, 'clientPrice' | 'markupPercent' | 'marginRub' | 'updatedAt'>,
  markupPercent = 15,
  minMarginRub = 150,
  roundingStep = 10,
): SupplierPart {
  const clientPrice = calculateClientPrice(part.purchasePrice, markupPercent, minMarginRub, roundingStep);
  return {
    ...part,
    clientPrice,
    markupPercent,
    marginRub: calculateMarginRub(part.purchasePrice, clientPrice),
    updatedAt: new Date().toISOString(),
  };
}

function matches(part: Omit<SupplierPart, 'clientPrice' | 'markupPercent' | 'marginRub' | 'updatedAt'>, params: SupplierSearchParams) {
  const query = params.query.trim().toLowerCase();
  const haystack = [part.article, part.brand, part.name, part.description, part.category, ...part.applicability, ...part.analogs].join(' ').toLowerCase();
  const queryMatch = !query || haystack.includes(query) || query.split(/\s+/).every((token) => haystack.includes(token));
  const brandMatch = !params.brand || part.brand.toLowerCase().includes(params.brand.toLowerCase());
  const categoryMatch = !params.category || part.category.toLowerCase() === params.category.toLowerCase();
  return queryMatch && brandMatch && categoryMatch;
}

export const mockSupplierService: SupplierService = {
  async searchParts(params) {
    const filtered = demoParts.filter((part) => matches(part, params));
    const source = filtered.length ? filtered : demoParts;
    const sorted = [...source].sort((a, b) => {
      if (params.kind === 'vin' && a.isOriginal !== b.isOriginal) return a.isOriginal ? -1 : 1;
      return b.probability - a.probability || a.deliveryDays - b.deliveryDays;
    });
    return sorted.map((part) => enrichPart(part, params.markupPercent, params.minMarginRub, params.roundingStep));
  },

  async getPartDetails(partId) {
    const part = demoParts.find((item) => item.id === partId);
    return part ? enrichPart(part) : null;
  },

  async createSupplierOrder(order) {
    return {
      supplierOrderId: `DEMO-${order.createdAt.slice(0, 10)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      status: 'accepted_for_manual_confirmation',
    };
  },

  async checkAvailability(article, brand) {
    const part = demoParts.find(
      (item) => item.article.toLowerCase() === article.toLowerCase() && item.brand.toLowerCase() === brand.toLowerCase(),
    );
    return {
      availability: part?.availability ?? 0,
      deliveryText: part?.deliveryText ?? 'уточняется менеджером',
    };
  },
};

const proxyUrl = import.meta.env.VITE_SUPPLIER_PROXY_URL;

export const partgradeProxySupplierService: SupplierService = {
  async searchParts(params) {
    if (!proxyUrl) return mockSupplierService.searchParts(params);

    try {
      const search = new URLSearchParams({
        q: params.query,
        kind: params.kind ?? 'article',
        markup: String(params.markupPercent ?? 15),
      });
      const response = await fetch(`${proxyUrl}?${search.toString()}`);
      if (!response.ok) throw new Error('Не удалось получить цены поставщика');
      const payload = (await response.json()) as { parts: SupplierPart[] };
      return payload.parts.map((part) => ({
        ...part,
        imageUrl: part.imageUrl || placeholderImage,
        clientPrice: part.clientPrice || calculateClientPrice(part.purchasePrice, params.markupPercent ?? 15, params.minMarginRub ?? 150),
        marginRub: part.marginRub || calculateMarginRub(part.purchasePrice, part.clientPrice),
        markupPercent: part.markupPercent || params.markupPercent || 15,
        deliveryText: part.deliveryText || 'уточняется',
        warehouse: part.warehouse || 'уточняется',
        probability: part.probability || 0,
        analogs: part.analogs || [],
        applicability: part.applicability || [],
        updatedAt: part.updatedAt || new Date().toISOString(),
      }));
    } catch {
      const fallback = await mockSupplierService.searchParts(params);
      return fallback.map((part) => ({
        ...part,
        availability: 0,
        deliveryDays: 0,
        deliveryText: 'уточнить наличие',
        warehouse: 'proxy недоступен',
        probability: 0,
      }));
    }
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
