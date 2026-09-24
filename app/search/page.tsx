const demo = [
  { brand: "BOSCH", article: "0250603006", name: "Свеча накаливания", price: 2073, qty: 10, days: 2 },
  { brand: "BMW", article: "11277810456", name: "Деталь привода", price: 3120, qty: 5, days: 2 },
  { brand: "MASUMA", article: "MIP-E475", name: "Ролик натяжителя", price: 3619, qty: 1, days: 2 }
];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  return (
    <section>
      <div className="eyebrow">Поиск</div>
      <h1>Результаты: {q || "—"}</h1>
      <div className="results">
        {demo.map((x) => (
          <article key={x.article} className="offer">
            <div><small>{x.brand}</small><h2>{x.name}</h2><span>{x.article}</span></div>
            <div>{x.qty} шт. · {x.days} дн.</div>
            <div className="buy"><strong>{x.price.toLocaleString("ru-RU")} ₽</strong><button>В корзину</button></div>
          </article>
        ))}
      </div>
    </section>
  );
}
