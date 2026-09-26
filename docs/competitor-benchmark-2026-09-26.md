# ZapFormat competitor benchmark — 2026-09-26

This document records the product direction for the rebuild branch. It is a functional benchmark, not a visual clone.

## Market patterns reviewed

### Autodoc.ru

Strong patterns:
- primary navigation built around Catalogs, Search, Cart, Orders and Garage;
- vehicle-first catalogs for maintenance, original parts, tyres/wheels and accessories;
- multiple supplier offers for one part with different price and delivery time;
- analogs;
- personal-manager assistance;
- order status tracking and notifications.

What ZapFormat should keep:
- vehicle as persistent shopping context;
- fast route from article to manufacturer to offers;
- visible delivery promise and stock;
- expert fallback when selection is uncertain.

### Exist.ru

Strong patterns:
- one broad search entry for VIN/body number/article/name;
- Garage unlocks detailed vehicle catalogs;
- original catalog plus replacements;
- VIN selection requests;
- maintenance schedule and vehicle ownership context;
- order/payment history.

What ZapFormat should keep:
- one search field;
- Garage as a useful operating area, not a decorative vehicle list;
- explicit VIN request workflow;
- service history, mileage, reminders and maintenance plans.

### Emex

Strong patterns:
- dense manufacturer/result list;
- fast comparison of offers;
- emphasis on price, availability and delivery;
- expert selection as a safety net;
- returns positioned as an important customer guarantee.

What ZapFormat should keep:
- dense search results rather than oversized retail cards;
- clear route to alternatives;
- returns inside the account;
- human selection workflow for risky fitment cases.

### Armtek

Strong patterns:
- product-first storefront;
- strong delivery-time visibility;
- price/discount hierarchy;
- large assortment browsing.

What ZapFormat should keep:
- delivery date/window should be visible next to price;
- storefront needs category entry points in addition to article search;
- never invent showcase products when the supplier cannot provide live product data.

## ZapFormat product position

ZapFormat should not be a copy of any one competitor.

The product position is:

**AI understands the request → vehicle context narrows intent → real supplier catalog confirms articles/offers → backend verifies price and stock → customer account tracks everything.**

Rules:
1. AI never invents an article number.
2. AI never declares compatibility without catalog/provider confirmation.
3. Purchase price never reaches the browser.
4. Customer price is calculated only on backend.
5. Cart prices and stock are rechecked before a request is created.
6. Old order prices are never reused as current prices.
7. VIN requests are a separate workflow, not fake catalog matches.
8. Demo products, demo orders and fake prices are prohibited.

## Rebuild functionality now

### Storefront
- single smart search for article or natural language;
- AI search layer;
- persistent vehicle context;
- quick category entry points;
- dedicated Catalogs page;
- dense brand and offer results;
- sort by price / speed / stock;
- availability, packing, delivery probability and returnability;
- delivery window labels;
- cart with live recheck.

### Account
- registration/login;
- profile;
- saved addresses;
- notification preferences;
- password change and logout-other-sessions;
- cross-device verified cart;
- quote requests;
- orders and status history;
- returns;
- VIN selection requests.

### Garage
- multiple vehicles;
- primary vehicle;
- VIN, engine, generation, year, plate and mileage;
- measurements;
- service history;
- maintenance plans;
- reminders;
- quick part search;
- expert VIN request.

### Operational backend
- internal VIN-request queue;
- safe supplier endpoints;
- backend-only pricing;
- opaque offer references;
- PartGrade verification script;
- pre-deploy snapshot and rollback scripts.

## Next parity gaps

Do not fake these. Implement only when the underlying system is ready:

1. Real VIN/EPC catalog provider.
2. Supplier write flow: basket/order creation and supplier order sync.
3. Payment methods and payment state.
4. Real delivery/pickup methods and calculated logistics.
5. Operator UI for quote/VIN queues.
6. Push/email/SMS notification dispatcher.
7. Loyalty/referral balances and accounting.
8. Product imagery and ratings from a legitimate data source.
9. Cancellation rules synced to supplier state.
10. Production domain with frontend and API same-origin.

## Design direction

- Keep ZapFormat green/cream/navy identity.
- Use market-leader information architecture, not their branding.
- Desktop: dense, operational, fast scanning.
- iPad: two-column where useful.
- iPhone: one-column, no horizontal overflow, bottom navigation.
- Search results should optimize comparison, not merchandising.
- The home page may use category cards, but product cards must always be backed by live data.
