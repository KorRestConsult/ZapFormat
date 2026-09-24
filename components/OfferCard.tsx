import type { PublicOffer } from "@/lib/partgrade/public-offer";
import { formatRub } from "@/lib/pricing";
import { AddToCartButton } from "./AddToCartButton";

export function OfferCard({ offer }: { offer: PublicOffer }) {
  return (
    <article className="offerCard">
      <div className="offerTitle">
        <div className="offerBrand">{offer.brand}</div>
        <h3>{offer.name}</h3>
        <div className="muted">{offer.article}</div>
      </div>

      <div className="offerMeta">
        <div><small>Наличие</small><b>{offer.quantity} шт.</b></div>
        <div><small>Срок</small><b>{offer.deliveryDays === 0 ? "Сегодня" : `${offer.deliveryDays} дн.`}</b></div>
      </div>

      <div className="offerBuy">
        <strong>{formatRub(offer.price)}</strong>
        <AddToCartButton item={offer} />
      </div>
    </article>
  );
}
