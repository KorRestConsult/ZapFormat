import { Search } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { PartCard } from '../components/PartCard';
import { useCart } from '../contexts/CartContext';
import { supplierService } from '../services/supplierService';
import type { SupplierPart } from '../types';

const searchCandidates = [
  { brand: 'ABSEL', article: 'OC90', name: 'Фильтр масляный ан. Mahle OC90 (OC71275)' },
  { brand: 'AM POINT', article: 'OC90', name: 'Масляные фильтры' },
  { brand: 'Mahle/Knecht', article: 'OC90', name: 'Фильтр масляный' },
];

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [brand, setBrand] = useState('');
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [results, setResults] = useState<SupplierPart[]>([]);
  const [candidateMode, setCandidateMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const { addPart } = useCart();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setCandidateMode(true);
    setResults([]);
    setLoading(false);
  }

  async function openOffers(candidateBrand: string, article: string) {
    setLoading(true);
    const parts = await supplierService.searchParts(`${candidateBrand} ${article}`, 'authorized');
    setResults(parts);
    setCandidateMode(false);
    setLoading(false);
  }

  return (
    <section className="page">
      <div className="page-heading">
        <p className="eyebrow">Поиск по артикулу</p>
        <h1>Электронный поиск по каталогу</h1>
      </div>
      <form className="search-form" onSubmit={onSubmit}>
        <input required placeholder="Артикул" value={query} onChange={(event) => setQuery(event.target.value)} />
        <input placeholder="Бренд" value={brand} onChange={(event) => setBrand(event.target.value)} />
        <input placeholder="Комментарий" value={comment} onChange={(event) => setComment(event.target.value)} />
        <input placeholder="Имя" value={name} onChange={(event) => setName(event.target.value)} />
        <input placeholder="Телефон" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <button className="button button-primary" type="submit"><Search size={18} />{loading ? 'Ищем...' : 'Найти'}</button>
      </form>
      {candidateMode ? (
        <div className="part-card result-table">
          <div className="result-row result-head"><span>Бренд</span><span>Код детали</span><span>Описание</span><span>Поиск</span></div>
          {searchCandidates
            .filter((item) => [item.brand, item.article, item.name].join(' ').toLowerCase().includes(query.toLowerCase()) || !query)
            .map((item) => (
              <div className="result-row" key={`${item.brand}-${item.article}`}>
                <strong>{item.brand}</strong>
                <span>{item.article}</span>
                <span>{item.name}</span>
                <button className="button button-secondary" onClick={() => openOffers(item.brand, item.article)}>Цены и аналоги</button>
              </div>
            ))}
        </div>
      ) : (
        <div className="results-grid">
          <div className="part-card filters-card">
            <p className="eyebrow">Цены и аналоги</p>
            <div className="form-row">
              <select><option>Все бренды</option><option>Популярные</option><option>Избранные</option></select>
              <select><option>Любой срок</option><option>На складе</option><option>Сегодня</option><option>1 день</option></select>
              <input placeholder="Любая цена" />
              <input placeholder="Наличие от, шт" />
            </div>
          </div>
          {results.map((part) => <PartCard key={part.id} part={part} onAdd={addPart} />)}
        </div>
      )}
    </section>
  );
}
