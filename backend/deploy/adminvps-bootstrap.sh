#!/usr/bin/env bash
# First-time AdminVPS deployment for ZapFormat. No supplier actions or paid services.
set -Eeuo pipefail
export DEBIAN_FRONTEND=noninteractive
APP=/opt/zapformat
ENV_DIR=/etc/zapformat
ENV_FILE=$ENV_DIR/zapformat-api.env
API_HOST=${ZAPFORMAT_API_HOST:-api.168.113.211.246.sslip.io}
if [[ ${EUID} -ne 0 ]]; then echo "Run as root"; exit 1; fi
cd "$APP/backend"
test -d ../.git
systemctl enable --now postgresql nginx
if ! id zapformat >/dev/null 2>&1; then
  useradd --system --home "$APP" --shell /usr/sbin/nologin zapformat
fi
install -d -m 700 "$ENV_DIR"
if [[ ! -f "$ENV_FILE" ]]; then
  DB_PASS="$(openssl rand -hex 24)"
  DB_EXISTS="$(runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='zapformat'")"
  if [[ "$DB_EXISTS" == 1 ]]; then
    runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "ALTER ROLE zapformat WITH LOGIN PASSWORD '$DB_PASS'"
  else
    runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "CREATE ROLE zapformat WITH LOGIN PASSWORD '$DB_PASS'"
  fi
  DATABASE_EXISTS="$(runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname='zapformat'")"
  if [[ "$DATABASE_EXISTS" != 1 ]]; then
    runuser -u postgres -- createdb -O zapformat zapformat
  fi
  TOKEN="$(openssl rand -hex 32)"
  OTP_SECRET="$(openssl rand -hex 32)"
  OFFER_SECRET="$(openssl rand -hex 32)"
  cat > "$ENV_FILE" <<EOF
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
DATABASE_URL=postgresql://zapformat:${DB_PASS}@127.0.0.1:5432/zapformat
PGSSL=false
FRONTEND_ORIGINS=https://korrestconsult.github.io,https://${API_HOST}
COOKIE_NAME=zf_session
COOKIE_SAME_SITE=none
SESSION_DAYS=30
INTERNAL_API_TOKEN=${TOKEN}
AUTH_OTP_SECRET=${OTP_SECRET}
OFFER_TOKEN_SECRET=${OFFER_SECRET}
PARTGRADE_API_BASE=https://auto-complekt.public.api.abcp.ru
PARTGRADE_API_LOGIN=
PARTGRADE_API_PASSWORD_MD5=
PARTGRADE_AUTO_ORDER_AFTER_CHECKOUT=false
PARTGRADE_API_TIMEOUT_MS=12000
DEFAULT_MARKUP_PERCENT=15
MIN_MARKUP_RUB=0
EOF
  chmod 600 "$ENV_FILE"
fi
set -a
source "$ENV_FILE"
set +a
for sql in db/0[0-9][0-9]_*.sql; do
  echo "Migrating: $sql"
  psql -X -v ON_ERROR_STOP=1 "$DATABASE_URL" -f "$sql" >/dev/null
done
install -d -o zapformat -g zapformat -m 700 /var/lib/zapformat
install -d -o zapformat -g zapformat -m 700 /var/lib/zapformat/partgrade-private
install -d -o zapformat -g zapformat -m 700 /var/lib/zapformat/fapi-cache
chown -R zapformat:zapformat "$APP"
cp "$APP/backend/deploy/zapformat-api.service" /etc/systemd/system/zapformat-api.service
systemctl daemon-reload
systemctl enable --now zapformat-api
systemctl restart zapformat-api
sleep 2
echo "Local API health:"
curl --fail --silent --show-error http://127.0.0.1:3000/api/health
echo
cat > /etc/nginx/sites-available/zapformat-api <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${API_HOST};
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
ln -sfn /etc/nginx/sites-available/zapformat-api /etc/nginx/sites-enabled/zapformat-api
nginx -t
systemctl reload nginx
echo "Requesting HTTPS certificate for ${API_HOST}"
certbot --nginx -d "$API_HOST" --non-interactive --agree-tos --register-unsafely-without-email --redirect
echo "Public API health:"
curl --fail --silent --show-error "https://${API_HOST}/api/health"
echo
echo "ZAPFORMAT_ADMINVPS_BOOTSTRAP_COMPLETED"
