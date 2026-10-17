# ZapFormat — code review policy

Failing behavior in this repository means: incorrect customer price, leaked wholesale/supplier credentials, wrong item applicability, broken or duplicate order, customer account data exposure, irreversible supplier order, data migration loss, or deployment of broken code.
These are HIGH priority regardless of diff size.

## Sensitive code (HIGH)
- `backend/src/server.js` — auth, account/garage, carts/orders, external API and request validation.
- `backend/src/partgrade.js`, `backend/src/partgrade-private.js`, `backend/src/fapi.js`, `backend/src/supplier-orders.js` — supplier boundaries and purchasing.
- `backend/src/pricing.js`, `backend/src/offer-token.js` — trust, margin, offer integrity.
- `backend/src/auth-otp.js`, `backend/src/github-oidc.js`, `backend/src/secret-bootstrap.js` — authorization and keys.
- `backend/db/**`, `backend/deploy/**`, `.github/workflows/**` — migration, deployment, privileges.

## Review order
1. Understand what changed and the intended user-visible behavior; inspect related API callers and database schema.
2. Security: order/cart owner checks, session cookie, CORS/CSRF, IDOR, SSRF, injection and secrets.
3. Business logic: prices, availability, delivery, supplier order idempotency, retries and refunds.
4. Tests: run actual `npm test`, syntax checks, npm audit; document any missing end-to-end verification.
5. Rollback: identify precise revert SHA, database migration rollback, server and web states before approving.

## Notes
Skip generated assets, large vendor files and style-only nits. Demand exact file/added line and a concrete failure scenario. Clearly separate pre-existing issues from new regressions. Re-verify suspected problems with separate skeptical passes; fix root cause, not just one occurrence.
Limit to 3 review/fix iterations per PR, then call for a human redesign discussion. Never claim an unrun test passed. Do not merge, deploy or edit live orders as part of code review.
