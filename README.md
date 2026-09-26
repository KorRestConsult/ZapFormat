# ZapFormat

ZapFormat — интернет-магазин автозапчастей с собственным кабинетом, гаражом и backend-интеграцией поставщика.

## Rebuild 2026-09-26

Активная рабочая ветка: `rebuild-from-zero-2026-09-26`.

Live / GitHub Pages не переключаются на эту ветку до полного smoke-теста.

### Frontend

Один `index.html`, без старых `app.js`, `styles.css` и `config.js`.

Сейчас реализованы:

- поиск по артикулу: производитель → реальные предложения;
- сортировка предложений по цене, сроку и наличию;
- корзина без demo-позиций;
- полноценный checkout: контакт, автомобиль, получение, адрес, оплата после подтверждения и финальная серверная перепроверка;
- безопасная перепроверка цены/остатка через backend;
- индикация изменения цены, остатка и срока;
- регистрация и вход;
- профиль пользователя;
- настройки уведомлений и центр событий;
- сохранённые детали и история поиска;
- гараж: автомобили, VIN, пробег, замеры, обслуживание, контрольные интервалы и блок ближайшего ТО;
- история реальных заказов;
- отдельный статус заявок, которые ещё не стали заказами;
- отдельный поток подбора по VIN;
- служебный кабинет оператора для заявок, VIN-подбора и возвратов;
- повтор позиций заказа в корзину с обязательной перепроверкой;
- адаптивная навигация для desktop, iPad и iPhone.

### Backend

Node.js API в `backend/`.

Ключевые обязанности backend:

- PartGrade / ABCP доступ и секреты;
- финальная клиентская цена;
- закупочная цена не передаётся frontend;
- стабильные непрозрачные `offer_ref` для конкретного предложения;
- перепроверка корзины без передачи supplier route IDs клиенту;
- PostgreSQL: пользователи, сессии, гараж, корзины, заказы, возвраты, уведомления;
- заявки на подтверждение и checkout metadata;
- служебная очередь оператора;
- подбор по VIN;
- сохранённые детали и история поиска;
- профиль, уведомления и центр событий;
- история заказов и позиций;
- гараж, пробег, замеры, история обслуживания и планы ТО.

### PartGrade

API host:

`auto-complekt.public.api.abcp.ru`

Секреты хранятся только в `/etc/zapformat/zapformat-api.env` на VPS.

Публичные endpoints не должны отдавать:

- PartGrade login;
- MD5 / пароль;
- закупочную цену;
- внутренние supplier/item identifiers.

После включения прав на `search/articles` / `search/batch` выполнить:

`backend/deploy/verify-after-partgrade-access.sh`

Проверка включает PRS3420/PATRON, клиентскую наценку, отсутствие утечки закупочной цены и сохранение производителей HK0810.

## Проверки

GitHub Actions для rebuild-ветки проверяет:

- синтаксис backend;
- unit tests;
- публичный контракт цены и offer reference;
- отсутствие старых frontend-файлов и demo-данных;
- синтаксис inline JavaScript;
- browser smoke на desktop, iPad и iPhone;
- отсутствие горизонтального overflow на основных экранах.

## Deploy safety

Перед deploy:

`backend/deploy/snapshot-before-rebuild.sh`

Snapshot сохраняет commit, ENV, nginx, systemd и PostgreSQL dump (если доступен `pg_dump`).

Frontend публикуется только из выделенного web-root:

`backend/deploy/install-frontend.sh`

Для отката кода/конфигурации:

`backend/deploy/rollback-to-snapshot.sh`

Восстановление БД выполняется отдельно и только явно:

`backend/deploy/restore-db-from-snapshot.sh /var/backups/zapformat/<snapshot> --yes`

Никакого blind `git pull`. Git checkout под `/opt/zapformat` не используется как публичный web-root.


## AI search

The rebuild branch contains an AI layer above the supplier catalog.

- Exact article queries bypass AI and go directly to the catalog.
- Natural-language queries are interpreted on the backend through the OpenAI Responses API with Structured Outputs.
- Default model: `gpt-5.6-luna`; override it with the backend model setting.
- Vehicle context sent to AI is limited to make/model/generation/year/engine. VIN and plate are not forwarded from the saved garage context.
- AI is not allowed to invent part numbers, fitment, prices, stock, or delivery terms.
- An article returned by AI is accepted only when that exact article was explicitly present in the user's query.
- Natural-language search terms may be checked against supplier tips, but all price/availability data still comes from the supplier API.
- The AI credential belongs only in the VPS backend environment and must never be committed or sent to the browser.

The public health endpoint exposes only whether AI is configured, never the credential itself.
