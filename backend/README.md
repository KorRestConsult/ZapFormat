# ZAPFORMAT backend

Backend responsibilities:
- authentication and sessions;
- PostgreSQL customer data;
- carts, orders, returns and notifications;
- supplier API access and secret credentials;
- final customer pricing.

## Local / server start

```bash
cd backend
cp .env.example .env
npm install
psql "$DATABASE_URL" -f db/001_init.sql
npm start
```

Health endpoints:

```
GET /api/health
GET /api/supplier/health
```

PartGrade / ABCP catalog endpoints:

```
GET /api/catalog/brands?number=PRS3420
GET /api/catalog/offers?number=PRS3420&brand=PATRON
```

PartGrade confirmed the ABCP public API host `auto-complekt.public.api.abcp.ru`.
ABCP authentication uses the PartGrade site login and the MD5 hash of the site password.
Only the final ZAPFORMAT customer price is returned by public catalog endpoints; supplier route IDs, item keys and procurement prices stay server-side.

Authentication endpoints:

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
PATCH /api/account/profile
GET  /api/account/overview
```

Production process files are in `deploy/`.

Important:
- supplier keys stay only in the backend environment;
- procurement prices are stored server-side and must never be returned by public API responses;
- production frontend and API should use HTTPS;
- for reliable iPhone/Safari sessions, use the production ZAPFORMAT domain and an API host under the same site, or reverse proxy `/api` through the same public origin.

## Separate owner and customer sign-in (2026-11-04)

Storefront login explicitly uses `account_scope=customer` and selects `customer_type=individual|service`.
The dedicated admin login explicitly uses `account_scope=admin`.
A single verified email can belong to the existing owner and to both separate customer profiles,
with distinct identities, sessions and orders. The owner credentials must never be migrated into
or deleted as a customer record. Database migration `017_customer_account_scopes.sql` enforces
role-and-profile-scoped email uniqueness. The frontend customer signup remains email-code verified.
