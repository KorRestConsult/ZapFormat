import type { PartsProvider, PartOffer } from "./provider";

const offers: PartOffer[] = [
  {
    id: "bosch-0250603006",
    article: "0250603006",
    brand: "BOSCH",
    name: "Свеча накаливания",
    purchasePrice: 1803,
    quantity: 10,
    deliveryDays: 2,
    warehouse: "PartGrade"
  },
  {
    id: "bmw-11277810456",
    article: "11277810456",
    brand: "BMW",
    name: "Элемент привода / ролик",
    purchasePrice: 2713,
    quantity: 5,
    deliveryDays: 2,
    warehouse: "PartGrade"
  },
  {
    id: "masuma-mip-e475",
    article: "MIP-E475",
    brand: "MASUMA",
    name: "Ролик натяжителя",
    purchasePrice: 3147,
    quantity: 1,
    deliveryDays: 2,
    warehouse: "PartGrade"
  },
  {
    id: "gates-t39198",
    article: "T39198",
    brand: "GATES",
    name: "Натяжной ролик",
    purchasePrice: 6810,
    quantity: 7,
    deliveryDays: 1,
    warehouse: "PartGrade"
  }
];

export const mockPartGrade: PartsProvider = {
  async search(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const direct = offers.filter((o) =>
      o.article.toLowerCase().includes(q) ||
      o.brand.toLowerCase().includes(q) ||
      o.name.toLowerCase().includes(q)
    );
    return direct.length ? direct : offers;
  }
};
