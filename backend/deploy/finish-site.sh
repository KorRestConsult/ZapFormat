#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/zapformat"
ENV_FILE="/etc/zapformat/zapformat-api.env"
SITE_HOST="${ZAPFORMAT_SITE_HOST:-zap.201.51.28.68.sslip.io}"
API_HOST="${ZAPFORMAT_API_HOST:-api.201.51.28.68.sslip.io}"
NGINX_SITE="/etc/nginx/sites-available/zapformat-site"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run from root Timeweb console."
  exit 1
fi

echo "=== ZapFormat · finish site ==="

git config --global --add safe.directory "${APP_DIR}" 2>/dev/null || true
git -C "${APP_DIR}" fetch origin main
git -C "${APP_DIR}" merge --ff-only origin/main

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y postgresql postgresql-contrib nginx certbot python3-certbot-nginx curl ca-certificates

systemctl enable --now postgresql

DB_USER="zapformat"
DB_NAME="zapformat"
DB_PASS="$(python3 - <<'PY'
import secrets
print(secrets.token_hex(24))
PY
)"

if runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  runuser -u postgres -- psql -c "ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';"
else
  runuser -u postgres -- psql -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';"
fi

if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  runuser -u postgres -- createdb -O "${DB_USER}" "${DB_NAME}"
fi

mkdir -p "$(dirname "${ENV_FILE}")"
touch "${ENV_FILE}"
chmod 600 "${ENV_FILE}"

set_env() {
  local key="$1"
  local value="$2"
  if grep -qE "^${key}=" "${ENV_FILE}"; then
    sed -i "s#^${key}=.*#${key}=${value}#" "${ENV_FILE}"
  else
    printf '%s=%s\n' "${key}" "${value}" >> "${ENV_FILE}"
  fi
}

INTERNAL_TOKEN="$(python3 - <<'PY'
import secrets
print(secrets.token_urlsafe(32))
PY
)"

set_env DATABASE_URL "postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}"
set_env PGSSL "false"
set_env FRONTEND_ORIGINS "https://korrestconsult.github.io,https://${SITE_HOST}"
set_env COOKIE_SAME_SITE "lax"
set_env INTERNAL_API_TOKEN "${INTERNAL_TOKEN}"

cd "${APP_DIR}/backend"
if [[ -f package-lock.json ]]; then
  npm ci --omit=dev
else
  npm install --omit=dev --package-lock=false
fi

set -a
source "${ENV_FILE}"
set +a

psql "${DATABASE_URL}" -f db/001_init.sql
psql "${DATABASE_URL}" -f db/002_garage_owner_app.sql
psql "${DATABASE_URL}" -f db/003_quote_requests.sql

mkdir -p /var/lib/zapformat
chown -R zapformat:zapformat /var/lib/zapformat
chmod 750 /var/lib/zapformat

systemctl restart zapformat-api
sleep 2

echo
echo "Backend:"
curl -fsS http://127.0.0.1:3000/api/health
echo

cat > "${NGINX_SITE}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${SITE_HOST};

    root ${APP_DIR};
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

ln -sfn "${NGINX_SITE}" /etc/nginx/sites-enabled/zapformat-site
nginx -t
systemctl reload nginx

if certbot --nginx -d "${SITE_HOST}" --non-interactive --agree-tos --register-unsafely-without-email --redirect; then
  echo "HTTPS ready."
else
  echo "HTTPS setup failed. Check ports 80/443 in Timeweb."
  exit 3
fi

echo
echo "Public site health:"
curl -fsS "https://${SITE_HOST}/api/health"
echo

echo
echo "Auth database check:"
curl -sS -o /tmp/zf-auth-check.json -w 'HTTP %{http_code}\n' "https://${SITE_HOST}/api/auth/me"
cat /tmp/zf-auth-check.json
echo

echo
echo "=== READY ==="
echo "Site: https://${SITE_HOST}/"
echo "API:  https://${SITE_HOST}/api/health"
echo "Database: enabled"
echo "Raw supplier purchase/order endpoints: locked to internal access"
