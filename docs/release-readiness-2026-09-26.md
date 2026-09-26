# ZapFormat release readiness — 2026-09-26

This is the launch gate for the rebuild branch. A checked item means the code path exists and is covered by the current repository checks. It does **not** mean an external supplier/payment/logistics service has been verified unless explicitly stated.

## Customer flow

- [x] One smart search for article, brand + article, supplier-backed suggestions and natural-language AI intent.
- [x] Real supplier-backed manufacturer and offer results; no demo products.
- [x] Deep-linkable part card with price, stock, delivery, packing, delivery probability and returnability.
- [x] Backend-only customer pricing; procurement price is not returned to the browser.
- [x] Persistent cart with supplier-offer references.
- [x] Cart recheck before checkout.
- [x] Checkout captures customer, vehicle, receiving method, address/pickup, comment and payment state.
- [x] Checkout creates a confirmation request only after server verification.
- [x] Account: profile, addresses, saved parts, recent searches, notifications and active sessions.
- [x] Garage: multiple vehicles, VIN, mileage, drivetrain/body/tyre/fluid context, history, plans and reminders.
- [x] Orders, quote requests, VIN requests and returns have customer-visible detail/history.
- [x] Customer support center with threaded messages and staff queue.
- [x] Printable/save-as-PDF summaries for order/service-case screens.
- [x] Public help page explains where confirmation is required.

## Operations

- [x] Operator queue for quote requests, VIN requests, returns and support tickets.
- [x] Operator can manage real pickup points.
- [x] Supplier readiness check is read-only and does not create an order.
- [x] Supplier write operations remain guarded by SUPPLIER_ORDER_WRITE_ENABLED=false by default.
- [x] PostgreSQL is included in deployment snapshots.
- [x] Explicit database restore script exists.
- [x] Public catalog rate limiting and short browse cache exist.
- [x] Checkout/recheck paths do not rely on stale browse cache.

## Responsive / browser quality

- [x] Chromium responsive smoke.
- [x] WebKit smoke for iPhone and iPad Pro 11-inch portrait.
- [x] Explicit iPad Pro 11-inch portrait (834×1194) and landscape (1194×834) viewports.
- [x] Compact navigation activates for iPad Pro portrait to prevent header overflow.
- [x] Keyboard focus, reduced-motion behavior, skip-to-content and dialog accessibility improvements.

## External launch blockers

These must stay explicit. Do not replace them with fake UI/data.

- [ ] **PartGrade search/articles rights:** run the real supplier verification script on the VPS after access is enabled. Historical state was HTTP 403 / ABCP errorCode 103.
- [ ] **Real PartGrade order write:** verify supplier-required basket/order fields and an agreed safe staging path before enabling SUPPLIER_ORDER_WRITE_ENABLED.
- [ ] **Supplier order synchronization:** map supplier order/status changes back into ZapFormat orders.
- [ ] **Real payment provider:** no online payment is currently connected; checkout correctly states payment happens after confirmation.
- [ ] **Delivery pricing / courier integration:** active pickup points can be configured, but calculated logistics is not connected.
- [ ] **VIN/EPC fitment provider:** VIN requests exist, but automatic compatibility must not be claimed until a licensed catalog source is connected.
- [ ] **Outbound notification provider:** in-app notifications exist; email/SMS/push delivery is not connected.
- [ ] **Business/legal identity:** seller details, offer/terms, privacy policy, returns policy and required consent text must be supplied and legally reviewed before public commerce.
- [ ] **Production domain/TLS smoke:** final domain must serve frontend and API on the intended same origin and pass post-deploy checks.
- [ ] **Production secrets:** confirm DATABASE_URL, PartGrade credentials, INTERNAL_API_TOKEN and OpenAI key are installed only in the protected VPS environment.

## AI status

- [x] The code uses the Responses API and structured output.
- [x] Exact article and explicit brand + article searches can bypass AI.
- [x] VIN/plate are excluded from the OpenAI vehicle context.
- [x] The configured API model ID `gpt-5.6-luna` is a valid OpenAI API model as of 2026-09-26.
- [ ] OPENAI_API_KEY presence on the production VPS has not been confirmed from this repository.

## Release rule

Do not call ZapFormat fully live until the real supplier search smoke passes. Do not enable supplier order writes merely because the storefront/checkout UI is complete. Payment, logistics, legal documents and supplier write access should each be enabled only after their own production checks pass.
