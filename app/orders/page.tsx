export default function OrdersPage() {
  return (
    <section>
      <div className="eyebrow">Личный кабинет</div>
      <h1>Заказы</h1>
      <div className="orderMock">
        <div>
          <small>Как будет выглядеть</small>
          <h3>Заказ #1042</h3>
          <span>3 позиции · 12 480 ₽</span>
        </div>
        <div className="statusBadge">В пути</div>
      </div>
      <div className="empty">После подключения PartGrade сюда придут реальные статусы заказов.</div>
    </section>
  );
}
