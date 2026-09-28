#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/zapformat"
ENV_FILE="/etc/zapformat/zapformat-api.env"
SERVICE="zapformat-api"
STAMP="$(date +%Y%m%d-%H%M%S)"
BEFORE=""

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run from root Timeweb console."
  exit 1
fi

git config --global --add safe.directory "${APP_DIR}" 2>/dev/null || true

cd "${APP_DIR}"
BEFORE="$(git rev-parse HEAD)"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "STOP: live checkout has local changes. Nothing was deployed."
  git status --short
  exit 2
fi

git branch "backup-live-${STAMP}" "${BEFORE}" 2>/dev/null || true
cp -a "${ENV_FILE}" "${ENV_FILE}.release-backup-${STAMP}" 2>/dev/null || true
cp -a /etc/systemd/system/zapformat-api.service "/etc/systemd/system/zapformat-api.service.release-backup-${STAMP}" 2>/dev/null || true
cp -a /etc/nginx/sites-available/zapformat-site "/etc/nginx/sites-available/zapformat-site.release-backup-${STAMP}" 2>/dev/null || true

rollback() {
  code=$?
  if [[ $code -ne 0 && -n "${BEFORE}" ]]; then
    echo
    echo "Release failed. Rolling code back to ${BEFORE} ..."
    git reset --hard "${BEFORE}" || true
    systemctl restart "${SERVICE}" || true
    echo "Rollback attempted."
  fi
  exit $code
}
trap rollback EXIT

git fetch origin main
git merge --ff-only origin/main

node --check app.js
node --check backend/src/server.js
node --check backend/src/partgrade.js
node --check backend/src/offer-token.js
node --check backend/src/pricing.js

cd backend
if [[ -f package-lock.json ]]; then
  npm ci --omit=dev
else
  npm install --omit=dev --package-lock=false
fi
npm test

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  source "${ENV_FILE}"
  set +a
fi

if [[ -n "${DATABASE_URL:-}" ]]; then
  psql "${DATABASE_URL}" -f db/001_init.sql >/dev/null
  psql "${DATABASE_URL}" -f db/002_garage_owner_app.sql >/dev/null
  psql "${DATABASE_URL}" -f db/003_quote_requests.sql >/dev/null
fi

systemctl restart "${SERVICE}"
sleep 2

echo
echo "Health:"
curl -fsS http://127.0.0.1:3000/api/health
echo

echo
echo "Catalog smoke test:"
curl -fsS "http://127.0.0.1:3000/api/catalog/brands?number=PRS3420" > /tmp/zf-brands.json
curl -fsS "http://127.0.0.1:3000/api/catalog/offers?number=PRS3420&brand=PATRON" > /tmp/zf-offers.json

python3 - <<'PY'
import json

brands=json.load(open("/tmp/zf-brands.json",encoding="utf-8"))
offers=json.load(open("/tmp/zf-offers.json",encoding="utf-8"))

b=brands.get("brands") or []
exact=offers.get("offers") or []
analogs=offers.get("analogs") or []

print("brands:", len(b))
print("PATRON present:", any(str(x.get("brand","")).upper()=="PATRON" for x in b))
print("exact offers:", len(exact))
print("analog offers:", len(analogs))
if exact:
    x=exact[0]
    print("first exact:", {
        "brand":x.get("brand"),
        "article":x.get("article"),
        "price_ZapFormat":x.get("price"),
        "availability":x.get("availability"),
        "delivery_hours":x.get("delivery_hours"),
    })
if analogs:
    x=analogs[0]
    print("first analog:", {
        "brand":x.get("brand"),
        "article":x.get("article"),
        "price_ZapFormat":x.get("price"),
        "availability":x.get("availability"),
        "delivery_hours":x.get("delivery_hours"),
    })

if not b:
    raise SystemExit("FAIL: no brand results")
if not exact and not analogs:
    raise SystemExit("FAIL: supplier returned no offers")

candidate=(exact or analogs)[0]
token=candidate.get("offer_token")
if not token:
    raise SystemExit("FAIL: offer token missing")

with open("/tmp/zf-revalidate-request.json","w",encoding="utf-8") as fh:
    json.dump({
        "items":[{
            "id":"smoke-1",
            "offer_token":token,
            "quantity":1
        }]
    },fh)
PY

echo
echo "Cart revalidation smoke test:"
curl -fsS -X POST   -H "Content-Type: application/json"   --data-binary @/tmp/zf-revalidate-request.json   "http://127.0.0.1:3000/api/catalog/revalidate" > /tmp/zf-revalidate.json

python3 - <<'PY'
import json
data=json.load(open("/tmp/zf-revalidate.json",encoding="utf-8"))
items=data.get("items") or []
if not items:
    raise SystemExit("FAIL: empty revalidation response")
item=items[0]
print("status:",item.get("status"))
print("price_ZapFormat:",item.get("price"))
print("availability:",item.get("availability"))
if item.get("status") not in ("ok","insufficient"):
    raise SystemExit("FAIL: offer token could not be revalidated")
PY

echo
echo "Account orders route:"
ACCOUNT_STATUS="$(curl -sS -o /tmp/zf-account-orders.json -w '%{http_code}' "http://127.0.0.1:3000/api/account/orders")"
echo "HTTP ${ACCOUNT_STATUS} (401 expected without login)"
if [[ "${ACCOUNT_STATUS}" != "401" ]]; then
  echo "FAIL: account orders route is not protected/available as expected."
  cat /tmp/zf-account-orders.json || true
  exit 1
fi

echo
echo "Public site:"
curl -fsS "https://zap.201.51.28.68.sslip.io/api/health"
echo

trap - EXIT
echo
echo "=== RELEASE OK ==="
echo "From: ${BEFORE}"
echo "To:   $(git -C "${APP_DIR}" rev-parse HEAD)"
echo "Site: https://zap.201.51.28.68.sslip.io/"
