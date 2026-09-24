import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";

const categories = [
  ["ТО", "Фильтры, свечи, ремни"],
  ["Тормоза", "Колодки, диски, датчики"],
  ["Подвеска", "Рычаги, стойки, сайлентблоки"],
  ["Двигатель", "Ремни, ролики, прокладки"],
  ["Электрика", "Датчики, лампы, генераторы"],
  ["Жидкости", "Масла, антифризы, химия"]
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="eyebrow">Запчасти без каталожной боли</div>
        <h1>Найдём нужную деталь.<br />Без сотни лишних вариантов.</h1>
        <p>
          Ищите по артикулу, VIN или обычным человеческим запросом.
          Сейчас работает тестовая выдача; после подключения PartGrade здесь будут ваши реальные цены, остатки и сроки.
        </p>
        <SearchBox />

        <div className="quickLinks">
          <Link href="/search?q=0250603006">BOSCH 0250603006</Link>
          <Link href="/search?q=11277810456">BMW 11277810456</Link>
          <Link href="/search?q=MIP-E475">MASUMA MIP-E475</Link>
        </div>
      </section>

      <section className="section">
        <div className="sectionHead">
          <div>
            <div className="eyebrow">Каталог</div>
            <h2>Быстрый вход</h2>
          </div>
          <Link className="textLink" href="/garage">Выбрать по автомобилю →</Link>
        </div>
        <div className="categoryGrid">
          {categories.map(([title, text]) => (
            <Link key={title} href={"/search?q=" + encodeURIComponent(title)} className="categoryCard">
              <span className="categoryDot" />
              <div>
                <strong>{title}</strong>
                <small>{text}</small>
              </div>
              <span>→</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="aiPanel">
        <div>
          <div className="eyebrow">AI-подбор</div>
          <h2>«BMW X3 F25. Нужны хорошие передние колодки, не самые дорогие»</h2>
        </div>
        <p>
          ИИ будет уточнять автомобиль, проверять совместимость по каталожным данным
          и сводить десятки предложений в несколько понятных вариантов.
        </p>
      </section>

      <section className="trustRow">
        <div><b>Цена</b><span>Своя наценка поверх закупки</span></div>
        <div><b>Срок</b><span>Реальные сроки поставщика</span></div>
        <div><b>Статусы</b><span>Заказ отслеживается в кабинете</span></div>
      </section>
    </>
  );
}
