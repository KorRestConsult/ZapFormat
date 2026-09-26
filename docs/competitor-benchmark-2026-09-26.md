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
- one smart search for article, brand + article, supplier-backed suggestions or natural language;
- AI search layer with VIN/plate excluded from OpenAI context;
- persistent vehicle context;
- quick category entry points and a dedicated Catalogs page;
- deep-linkable part detail pages;
- dense manufacturer and offer results;
- sort/filter by price, speed, stock, delivery probability and returnability;
- availability, packing, delivery probability and returnability;
- delivery window labels;
- saved parts and recent searches;
- cart with live supplier-offer recheck;
- verified checkout that creates a confirmation request rather than a fake supplier order;
- public Help page describing where confirmation is required.

### Account
- registration/login and active-session management;
- profile and saved addresses;
- in-app notification feed and notification preferences;
- password change and logout-other-sessions;
- cross-device verified cart;
- quote requests with customer-visible history;
- real orders and status history;
- returns with history and customer cancellation where allowed;
- VIN selection requests with history;
- saved parts and recent search history;
- threaded support tickets linked to orders/quotes/VIN/returns;
- printable/save-as-PDF customer summaries.

### Garage
- multiple vehicles and primary/active vehicle;
- VIN, engine, generation, year, plate and mileage;
- transmission, body, tyres, wheels, oil and coolant context;
- measurements;
- service history;
- maintenance plans;
- reminders;
- quick part search;
- expert VIN request.

### Operations
- operator UI for quote requests, VIN requests, returns and support tickets;
- operator search and status/comment workflows;
- active pickup-point administration;
- supplier readiness checks that do not create an order;
- supplier write code kept behind an explicit disabled-by-default flag;
- safe supplier endpoints and opaque offer references;
- backend-only pricing;
- PartGrade verification script;
- public catalog rate limiting and short browse cache;
- PostgreSQL included in deployment snapshots plus explicit restore tooling;
- Chromium and WebKit responsive smoke, including iPad Pro 11-inch viewports;
- factual release-readiness diagnostics in the operator dashboard.

## Next parity gaps

Do not fake these. Implement only when the underlying system is ready:

1. Real VIN/EPC catalog provider for automatic fitment.
2. Verified PartGrade search/articles access in production.
3. Safe PartGrade basket/order write enablement plus supplier order/status synchronization.
4. Real payment provider and payment state.
5. Calculated delivery/courier integration; pickup points already support real configured locations.
6. Email/SMS/push notification dispatcher; in-app notifications already work.
7. Seller identity, terms, privacy and returns-policy publication before public commerce.
8. Production domain/TLS and same-origin deployment smoke.
9. Loyalty/referral balances and accounting.
10. Product imagery and ratings from a legitimate licensed source.

## Design direction

- Keep ZapFormat green/cream/navy identity.
- Use market-leader information architecture, not their branding.
- Desktop: dense, operational, fast scanning.
- iPad: two-column where useful.
- iPhone: one-column, no horizontal overflow, bottom navigation.
- Search results should optimize comparison, not merchandising.
- The home page may use category cards, but product cards must always be backed by live data.
