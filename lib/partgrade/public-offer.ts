import type { PartOffer } from "./provider";
import { applyMarkup } from "@/lib/pricing";

export type PublicOffer = Omit<PartOffer, "purchasePrice" | "warehouse"> & {
  price: number;
};

export function toPublicOffer(offer: PartOffer): PublicOffer {
  const { purchasePrice, warehouse: _warehouse, ...rest } = offer;
  return { ...rest, price: applyMarkup(purchasePrice) };
}
