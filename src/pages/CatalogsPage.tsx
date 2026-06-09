import { Link } from 'react-router-dom';

const catalogSections = [
  ['Поиск по VIN', 'Подбор детали по автомобилю и нужному узлу.', '/vin'],
  ['Каталог ТО', 'Фильтры, масла, свечи, ремни и расходники.', '/search'],
  ['Шины и диски', 'Сезонные позиции, диски, крепеж и аксессуары.', '/search'],
  ['Масла и жидкости', 'Моторные, трансмиссионные, тормозные и охлаждающие.', '/search'],
  ['Аккумуляторы', 'АКБ, зарядные устройства и провода запуска.', '/search'],
  ['Лампы', 'Автолампы, свет, параметры и замены.', '/search'],
  ['Аксессуары', 'Коврики, щетки, компрессоры, наборы автомобилиста.', '/search'],
  ['Инструменты', 'Ключи, наборы, домкраты и гаражное оснащение.', '/search'],
];

const brands = [
  'Audi',
  'BMW',
  'Chevrolet',
  'Citroen',
  'Daewoo',
  'Ford',
  'Hyundai',
  'Kia',
  'Lexus',
  'Mazda',
  'Mercedes Benz',
  'Mitsubishi',
  'Nissan',
  'Opel',
  'Renault',
  'Skoda',
  'Toyota',
  'Volkswagen',
  'Volvo',
  'Все бренды',
];

export function CatalogsPage() {
  return (
    <section className="page">
      <div className="page-heading">
        <p className="eyebrow">Каталоги</p>
        <h1>Популярные разделы</h1>
      </div>
      <div className="section-grid compact-grid">
        {catalogSections.map(([title, description, href]) => (
          <Link className="feature-card" to={href} key={title}>
            <h3>{title}</h3>
            <p>{description}</p>
          </Link>
        ))}
      </div>
      <div className="page-heading">
        <p className="eyebrow">Марки</p>
        <h1>Каталог легковых автомобилей</h1>
      </div>
      <div className="section-grid compact-grid">
        {brands.map((brand) => (
          <Link className="feature-card" to="/search" key={brand}>
            <h3>{brand}</h3>
            <p>{brand === 'Все бренды' ? 'Запчасти и расходники для всех марок.' : `Запчасти и расходники для ${brand}.`}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
