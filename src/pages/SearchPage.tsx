import { Search, SlidersHorizontal } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PartCard } from '../components/PartCard';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useSettings } from '../contexts/SettingsContext';
import { getUserCars } from '../services/carService';
import { supplierService } from '../services/supplierService';
import type { Car, SearchKind, SupplierPart } from '../types';

const categories = ['ТО', 'масла', 'фильтры', 'тормоза', 'подвеска', 'электрика', 'аккумуляторы', 'лампы', 'шины', 'диски', 'автохимия', 'аксессуары', 'инструменты', 'щетки стеклоочистителя'];

export function SearchPage() {
  const { firebaseUser } = useAuth();
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? searchParams.get('vin') ?? '');
  const [kind, setKind] = useState<SearchKind>(searchParams.get('vin') ? 'vin' : 'article');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [garageCarId, setGarageCarId] = useState('');
  const [filter, setFilter] = useState<'all' | 'original' | 'analog' | 'cheap' | 'fast' | 'stock' | 'reliable'>('all');
  const [sort, setSort] = useState<'price' | 'delivery' | 'stock' | 'brand' | 'reliability'>('reliability');
  const [cars, setCars] = useState<Car[]>([]);
  const [results, setResults] = useState<SupplierPart[]>([]);
  const [loading, setLoading] = useState(false);
  const { addPart } = useCart();

  useEffect(() => {
    if (firebaseUser) getUserCars(firebaseUser.uid).then(setCars).catch(() => setCars([]));
  }, [firebaseUser]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    const selectedCar = cars.find((car) => car.id === garageCarId);
    const searchQuery = kind === 'garage' && selectedCar ? [selectedCar.vin, selectedCar.brand, selectedCar.model, query].join(' ') : query;
    const parts = await supplierService.searchParts({
      query: searchQuery,
      kind,
      category,
      garageCarId,
      markupPercent: settings.markupPercent,
      minMarginRub: settings.minMarginRub,
      roundingStep: settings.roundingStep,
    });
    setResults(parts);
    setLoading(false);
  }

  const visibleResults = useMemo(() => {
    const next = results.filter((part) => {
      if (filter === 'original') return part.isOriginal;
      if (filter === 'analog') return !part.isOriginal;
      if (filter === 'stock') return part.availability > 0;
      if (filter === 'fast') return part.deliveryDays <= 1;
      if (filter === 'reliable') return part.probability >= 90;
      return true;
    });
    if (filter === 'cheap') next.sort((a, b) => a.clientPrice - b.clientPrice);
    if (sort === 'price') next.sort((a, b) => a.clientPrice - b.clientPrice);
    if (sort === 'delivery') next.sort((a, b) => a.deliveryDays - b.deliveryDays);
    if (sort === 'stock') next.sort((a, b) => b.availability - a.availability);
    if (sort === 'brand') next.sort((a, b) => a.brand.localeCompare(b.brand));
    if (sort === 'reliability') next.sort((a, b) => b.probability - a.probability);
    return next;
  }, [filter, results, sort]);

  return (
    <section className="page">
      <div className="page-heading">
        <p className="eyebrow">Поиск ZapFormat</p>
        <h1>VIN, артикул, бренд, название или категория</h1>
      </div>
      <form className="search-form advanced-search" onSubmit={onSubmit}>
        <select value={kind} onChange={(event) => setKind(event.target.value as SearchKind)}>
          <option value="vin">VIN</option>
          <option value="article">Артикул</option>
          <option value="brand">Бренд</option>
          <option value="name">Название</option>
          <option value="category">Категория</option>
          <option value="garage">Авто из гаража</option>
        </select>
        <input required={kind !== 'category' && kind !== 'garage'} placeholder="Введите VIN, артикул или название" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">Все категории</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={garageCarId} onChange={(event) => setGarageCarId(event.target.value)}>
          <option value="">Любой автомобиль</option>
          {cars.map((car) => <option key={car.id} value={car.id}>{car.brand} {car.model} · {car.vin || car.plate}</option>)}
        </select>
        <button className="button button-primary" type="submit"><Search size={18} />{loading ? 'Ищем...' : 'Найти'}</button>
      </form>
      <div className="part-card filters-card">
        <p className="eyebrow"><SlidersHorizontal size={14} /> Фильтры и сортировка</p>
        <div className="form-row">
          <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>
            <option value="all">Все предложения</option>
            <option value="original">Оригинал</option>
            <option value="analog">Аналог</option>
            <option value="cheap">Дешевле</option>
            <option value="fast">Быстрее</option>
            <option value="stock">В наличии</option>
            <option value="reliable">Надежная поставка</option>
          </select>
          <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
            <option value="reliability">По надежности</option>
            <option value="price">По цене</option>
            <option value="delivery">По сроку</option>
            <option value="stock">По наличию</option>
            <option value="brand">По бренду</option>
          </select>
        </div>
      </div>
      <div className="results-grid">
        {visibleResults.map((part) => <PartCard key={part.id} part={part} onAdd={addPart} />)}
        {!loading && visibleResults.length === 0 && <div className="empty-state">Введите запрос, чтобы увидеть оригиналы и аналоги.</div>}
      </div>
    </section>
  );
}
