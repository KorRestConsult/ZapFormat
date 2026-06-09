# ЗапФормат

Готовый MVP веб-сервиса для подбора, продажи и заказа автозапчастей. Проект реализован на React, Vite, TypeScript и Firebase. Клиентская витрина ЗапФормат показывает только итоговые клиентские цены, а источник цен и рабочая наценка скрыты в серверном слое.

Важно: проект не использует логотип PartGrade, не выдает себя за официальный ресурс PartGrade и не хранит логин/пароль поставщика во frontend.

## Что реализовано

- Главная страница с крупным поиском, VIN CTA, преимуществами, схемой работы и контактами.
- Поиск по артикулу с брендом, комментарием, именем, телефоном и результатами.
- Карточка результата с ценой клиента, сроком, наличием и юридическим предупреждением.
- `calculateClientPrice(basePrice, markupPercent)`.
- Корзина, количество, итог, контакты, способ получения и создание заказа.
- VIN-заявка со статусом `new`.
- Firebase Auth, регистрация и вход.
- Личный кабинет: заказы, автомобили, избранное, профиль, повтор заказа.
- Админ-панель: список заказов, фильтр, статусы, цена, отметка оплаты, наценка, контакты и тексты.
- Firestore rules, indexes, Storage rules, Firebase Hosting config.
- Mock-данные и mock supplier с публичной и авторизованной закупочной ценой.
- Маржа по умолчанию: 18%, с возможностью изменить в админ-панели.
- Адаптивная мобильная верстка.

## Запуск

```bash
npm install
cp .env.example .env
npm run dev
```

Заполните `.env` значениями Firebase проекта.

## Firebase

```bash
npm run build
firebase deploy
```

Перед деплоем замените project id в `.firebaserc`.

## Администратор

Доступ в админ-панель проверяется так:

```ts
users/{uid}.role === "admin"
```

Создайте пользователя через Firebase Auth, затем добавьте документ в `users/{uid}`:

```json
{
  "uid": "uid-from-auth",
  "name": "Администратор",
  "phone": "+7 900 000-00-00",
  "email": "admin@example.com",
  "role": "admin",
  "createdAt": "2026-06-09T00:00:00.000Z"
}
```

## Supplier Service Layer

Файл: `src/services/supplierService.ts`.

Frontend вызывает только интерфейс:

```ts
searchParts(query)
getPartDetails(partId)
createSupplierOrder(order)
checkAvailability(article, brand)
```

Сейчас используется `mockSupplierService`, где есть два уровня закупочной цены:

- `publicBasePrice`
- `authorizedBasePrice`

Клиентская цена считается от авторизованной закупочной цены поставщика. Реальные учетные данные PartGrade должны подключаться только через backend, Cloud Functions, Secret Manager или другой защищенный серверный слой.

## Partgrade Proxy

В проект добавлен серверный слой `functions/src/index.ts`. Секреты поставщика должны храниться только в переменных окружения Cloud Functions:

```bash
PARTGRADE_LOGIN=...
PARTGRADE_PASSWORD=...
PARTGRADE_BASE_URL=https://partgrade.com
DEFAULT_MARKUP_PERCENT=18
```

Frontend подключается к proxy через:

```bash
VITE_SUPPLIER_PROXY_URL=https://europe-west1-your-project.cloudfunctions.net/searchParts
```

После изучения авторизованного кабинета Partgrade в функции нужно заменить mock-нормализацию на реальные запросы кабинета/API. Парсинг и авторизация не должны выполняться в браузере.

## Структура

```text
src/
  admin/
  assets/
  components/
  contexts/
  firebase/
  hooks/
  pages/
  services/
  styles/
  types/
  utils/
mock-data/
```

## Юридический текст возле цен

`Цена и срок являются предварительными и подтверждаются менеджером.`
