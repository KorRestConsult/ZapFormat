export default function AccountPage() {
  return (
    <section>
      <div className="eyebrow">Аккаунт</div>
      <h1>Профиль</h1>
      <div className="profileGrid">
        <div className="profileCard"><small>Контакты</small><b>Телефон и email</b><span>Для заказов и уведомлений</span></div>
        <div className="profileCard"><small>Получение</small><b>Рязань</b><span>Точка выдачи / адрес</span></div>
        <div className="profileCard"><small>Уведомления</small><b>Статусы заказов</b><span>Push / Telegram / SMS позже</span></div>
      </div>
    </section>
  );
}
