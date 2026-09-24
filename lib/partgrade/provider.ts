export type PartOffer = {
  id: string;
  article: string;
  brand: string;
  name: string;
  purchasePrice: number;
  quantity: number;
  deliveryDays: number;
  warehouse: string;
};

export interface PartsProvider {
  search(query: string): Promise<PartOffer[]>;
}
