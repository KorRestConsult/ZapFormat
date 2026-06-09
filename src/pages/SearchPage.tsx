import { Search } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { PartCard } from '../components/PartCard';
import { useCart } from '../contexts/CartContext';
import { supplierService } from '../services/supplierService';
import type { SupplierPart } from '../types';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [brand, setBrand] = useState('');
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [results, setResults] = useState<SupplierPart[]>([]);
  const [loading, setLoading] = useState(false);
  const { addPart } = useCart();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    const parts = await supplierService.searchParts([query, brand, comment].join(' '), 'authorized');
    setResults(parts);
    setLoading(false);
  }

  return (
    <section className="page">
      <div className="page-heading">
        <p className="eyebrow">Поиск по артикулу</p>
        <h1>Найдите деталь и добавьте в заказ</h1>
      </div>
      <form className="search-form" onSubmit={onSubmit}>
        <input required placeholder="Артикул" value={query} onChange={(event) => setQuery(event.target.value)} />
        <input placeholder="Бренд" value={brand} onChange={(event) => setBrand(event.target.value)} />
        <input placeholder="Комментарий" value={comment} onChange={(event) => setComment(event.target.value)} />
        <input placeholder="Имя" value={name} onChange={(event) => setName(event.target.value)} />
        <input placeholder="Телефон" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <button className="button button-primary" type="submit"><Search size={18} />{loading ? 'Ищем...' : 'Найти'}</button>
      </form>
      <div className="results-grid">
        {results.map((part) => <PartCard key={part.id} part={part} onAdd={addPart} />)}
      </div>
    </section>
  );
}
