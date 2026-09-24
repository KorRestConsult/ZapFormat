"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function SearchBox({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = query.trim();
    if (value) router.push("/search?q=" + encodeURIComponent(value));
  }

  return (
    <form className={compact ? "searchBox compact" : "searchBox"} onSubmit={submit}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Артикул, VIN или что нужно машине"
        aria-label="Поиск запчастей"
      />
      <button type="submit">Найти</button>
    </form>
  );
}
