export default function GaragePage() {
  return (
    <section>
      <div className="eyebrow">Автомобили</div>
      <h1>Мой гараж</h1>
      <div className="garageGrid">
        <article className="garageCard demoCar">
          <small>Пример</small>
          <h2>BMW X3 F25</h2>
          <p>2.0 Diesel · 2010</p>
          <button>Искать для этой машины</button>
        </article>
        <article className="garageCard addCar">
          <span>+</span>
          <h2>Добавить автомобиль</h2>
          <p>VIN, марка, модель, поколение, двигатель.</p>
        </article>
      </div>
    </section>
  );
}
