import { SearchBox } from "@/components/SearchBox";
import { OfferCard } from "@/components/OfferCard";
import { partGrade } from "@/lib/partgrade";
import { toPublicOffer } from "@/lib/partgrade/public-offer";

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const rawOffers = query ? await partGrade.search(query) : [];
  const offers = rawOffers.map(toPublicOffer);

  return (
    <section>
      <div className="pageHead">
        <div>
          <div className="eyebrow">Поиск</div>
          <h1>{query ? `Результаты для «${query}»` : "Найдите запчасть"}</h1>
        </div>
        <div className="resultCount">{offers.length} предлож.</div>
      </div>

      <SearchBox compact />

      <div className="filterBar">
        <button className="active">Все</button>
        <button>Быстрее</button>
        <button>Дешевле</button>
        <button>В наличии</button>
      </div>

      <div className="results">
        {offers.map((offer) => <OfferCard key={offer.id} offer={offer} />)}
        {query && !offers.length ? <div className="empty">Ничего не найдено.</div> : null}
      </div>
    </section>
  );
}
