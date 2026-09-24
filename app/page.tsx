"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [q, setQ] = useState("");
  const router = useRouter();

  function search(e: FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push("/search?q=" + encodeURIComponent(q.trim()));
  }

  return (
    <>
      <section className="hero">
        <div className="eyebrow">Автозапчасти без лишнего шума</div>
        <h1>Найдём деталь.<br />Проверим. Привезём.</h1>
        <p>Артикул, VIN или обычное описание проблемы.</p>
        <form className="search" onSubmit={search}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Артикул, VIN или что нужно машине" />
          <button>Найти</button>
        </form>
      </section>

      <section className="cards">
        <Link href="/garage"><b>Мой гараж</b><span>Автомобили и VIN</span></Link>
        <Link href="/search?q=0250603006"><b>Быстрый поиск</b><span>Цена, наличие, срок</span></Link>
        <Link href="/orders"><b>Мои заказы</b><span>Статусы без звонков</span></Link>
      </section>
    </>
  );
}
