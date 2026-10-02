#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/zapformat"
ENV_FILE="/etc/zapformat/zapformat-api.env"
SERVICE="zapformat-api"
STAMP="$(date +%Y%m%d-%H%M%S)"
BEFORE=""
TARGET_SHA="${ZAPFORMAT_TARGET_SHA:-}"
STAGE_FILE="/var/lib/zapformat/release-stage"

mark_stage() {
  printf '%s\n' "$1" > "${STAGE_FILE}"
}

mark_stage "preflight"

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
    mark_stage "service_restart"
    systemctl stop "${SERVICE}" 2>/dev/null || true
    systemctl reset-failed "${SERVICE}" 2>/dev/null || true
    systemctl start "${SERVICE}" 2>/dev/null || true
    echo "Rollback attempted."
  fi
  exit $code
}
trap rollback EXIT

mark_stage "git_update"
git fetch origin main

if [[ -n "${TARGET_SHA}" ]]; then
  if [[ ! "${TARGET_SHA}" =~ ^[a-f0-9]{40}$ ]]; then
    echo "STOP: invalid target commit SHA."
    exit 3
  fi
  git cat-file -e "${TARGET_SHA}^{commit}" 2>/dev/null || {
    echo "STOP: requested commit is not available after fetch."
    exit 3
  }
  if [[ "${BEFORE}" != "${TARGET_SHA}" ]] && ! git merge-base --is-ancestor "${BEFORE}" "${TARGET_SHA}"; then
    echo "STOP: requested commit is not a fast-forward from the live checkout."
    exit 3
  fi
  git merge --ff-only "${TARGET_SHA}"
else
  git merge --ff-only origin/main
fi

mark_stage "install_runner"
install -m 750 "${APP_DIR}/backend/deploy/autodeploy-runner.sh" /usr/local/sbin/zapformat-autodeploy

# Supplier action journal and FAPI catalog cache are private, durable,
# and survive code releases.
install -d -o zapformat -g zapformat -m 700 /var/lib/zapformat/partgrade-private
install -d -o zapformat -g zapformat -m 700 /var/lib/zapformat/fapi-cache

mark_stage "syntax_checks"
node --check app.js
node --check backend/src/server.js
node --check backend/src/partgrade.js
node --check backend/src/partgrade-private.js
node --check backend/src/offer-token.js
node --check backend/src/pricing.js
node --check backend/src/github-oidc.js
node --check backend/src/ai-search.js
node --check backend/src/vehicle-catalog.js
node --check backend/src/secret-bootstrap.js
node --check backend/src/auth-otp.js
node --check backend/src/fapi.js
node --check backend/src/fapi-fitment.js

mark_stage "dependencies"
cd backend
if [[ -f package-lock.json ]]; then
  npm ci --omit=dev
else
  npm install --omit=dev --package-lock=false
fi
mark_stage "unit_tests"
npm test

mark_stage "environment"
if [[ -f "${ENV_FILE}" ]]; then
  set -a
  source "${ENV_FILE}"
  set +a
fi

mark_stage "database_migrations"
if [[ -n "${DATABASE_URL:-}" ]]; then
  psql "${DATABASE_URL}" -f db/001_init.sql >/dev/null
  psql "${DATABASE_URL}" -f db/002_garage_owner_app.sql >/dev/null
  psql "${DATABASE_URL}" -f db/003_quote_requests.sql >/dev/null
  psql "${DATABASE_URL}" -f db/004_cart_persistence.sql >/dev/null
  psql "${DATABASE_URL}" -f db/005_vehicle_context.sql >/dev/null
  psql "${DATABASE_URL}" -f db/006_vehicle_catalog.sql >/dev/null
  psql "${DATABASE_URL}" -f db/007_supplier_orders.sql >/dev/null
  psql "${DATABASE_URL}" -f db/008_order_item_comments.sql >/dev/null
  psql "${DATABASE_URL}" -f db/009_auth_verification.sql >/dev/null
fi

mkdir -p /etc/systemd/system/zapformat-api.service.d
cat >/etc/systemd/system/zapformat-api.service.d/ai-env.conf <<'EOF'
[Service]
EnvironmentFile=-/var/lib/zapformat/zapformat-ai.env
EOF
cat >/etc/systemd/system/zapformat-api.service.d/sms-env.conf <<'EOF'
[Service]
EnvironmentFile=-/var/lib/zapformat/zapformat-sms.env
EOF
cat >/etc/systemd/system/zapformat-api.service.d/fapi-env.conf <<'EOF'
[Service]
EnvironmentFile=-/var/lib/zapformat/zapformat-fapi.env
EOF
cat >/etc/systemd/system/zapformat-api.service.d/restart-policy.conf <<'EOF'
[Unit]
StartLimitIntervalSec=0
[Service]
Restart=always
RestartSec=3
EOF
systemctl daemon-reload

# Deploys can arrive close together while the frontend is being refined.
# Stop/start explicitly and disable the start-rate limiter so a healthy API
# is never rejected only because several safe releases ran in succession.
systemctl stop "${SERVICE}" 2>/dev/null || true
for _ in $(seq 1 20); do
  if ! systemctl is-active --quiet "${SERVICE}"; then break; fi
  sleep 0.25
done
systemctl reset-failed "${SERVICE}" 2>/dev/null || true
if ! systemctl start "${SERVICE}"; then
  echo "FAIL: ${SERVICE} could not start."
  systemctl status "${SERVICE}" --no-pager -l || true
  journalctl -u "${SERVICE}" -n 80 --no-pager || true
  exit 1
fi
sleep 2
if ! systemctl is-active --quiet "${SERVICE}"; then
  echo "FAIL: ${SERVICE} exited after start."
  systemctl status "${SERVICE}" --no-pager -l || true
  journalctl -u "${SERVICE}" -n 80 --no-pager || true
  exit 1
fi

mark_stage "health_check"
echo
echo "Health:"
curl -fsS http://127.0.0.1:3000/api/health
echo

mark_stage "checkout_auth_smoke"
echo "Checkout auth smoke test:"
checkout_code="$(curl -sS -o /tmp/zf-checkout-auth.json -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  --data '{"name":"Smoke","phone":"+79990000000","items":[]}' \
  http://127.0.0.1:3000/api/quote-requests)"
if [ "$checkout_code" != "401" ]; then
  echo "FAIL: unauthenticated checkout returned HTTP $checkout_code"
  cat /tmp/zf-checkout-auth.json || true
  exit 1
fi
echo "OK: unauthenticated checkout is blocked"

mark_stage "ai_search_smoke"
echo
echo "AI search health:"
curl -fsS http://127.0.0.1:3000/api/search/health
echo

echo
echo "AI search fallback smoke test:"
curl -fsS -X POST   -H "Content-Type: application/json"   --data '{"query":"передние тормозные колодки"}'   http://127.0.0.1:3000/api/search/interpret > /tmp/zf-ai-search.json
python3 - <<'PY'
import json
data=json.load(open("/tmp/zf-ai-search.json",encoding="utf-8"))
intent=data.get("intent") or {}
print("mode:",data.get("mode"))
print("category:",intent.get("category"))
print("axle:",intent.get("axle"))
if intent.get("category") != "brake_pad":
    raise SystemExit("FAIL: AI search parser smoke test")
PY

echo
echo "Vehicle catalog capability:"
curl -fsS "http://127.0.0.1:3000/api/catalog/vehicle-catalog/status" || true
echo

echo "FAPI/Vindec capability:"
curl -fsS "http://127.0.0.1:3000/api/catalog/fapi/status" || true
echo

echo "Supplier integration:"
curl -fsS "http://127.0.0.1:3000/api/integration/status"
echo

mark_stage "catalog_smoke"
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

mark_stage "cart_revalidation"
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

mark_stage "protected_routes"
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
echo "Account cart route:"
CART_STATUS="$(curl -sS -o /tmp/zf-account-cart.json -w '%{http_code}' "http://127.0.0.1:3000/api/cart")"
echo "HTTP ${CART_STATUS} (401 expected without login)"
if [[ "${CART_STATUS}" != "401" ]]; then
  echo "FAIL: account cart route is not protected/available as expected."
  cat /tmp/zf-account-cart.json || true
  exit 1
fi

echo
echo "Garage route:"
GARAGE_STATUS="$(curl -sS -o /tmp/zf-garage.json -w '%{http_code}' "http://127.0.0.1:3000/api/garage")"
echo "HTTP ${GARAGE_STATUS} (401 expected without login)"
if [[ "${GARAGE_STATUS}" != "401" ]]; then
  echo "FAIL: garage route is not protected/available as expected."
  cat /tmp/zf-garage.json || true
  exit 1
fi

mark_stage "public_site"
echo
echo "Public site:"
curl -fsS "https://zap.201.51.28.68.sslip.io/api/health"
echo

mark_stage "done"
trap - EXIT
echo
echo "=== RELEASE OK ==="
echo "From: ${BEFORE}"
echo "To:   $(git -C "${APP_DIR}" rev-parse HEAD)"
echo "Site: https://zap.201.51.28.68.sslip.io/"
