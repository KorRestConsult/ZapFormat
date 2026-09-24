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

Health endpoint:

```
GET /api/health
```

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
