#!/usr/bin/env bash
set -Eeuo pipefail

REPO_URL="https://github.com/KorRestConsult/ZapFormat.git"
BRANCH="${ZAPFORMAT_BRANCH:-rebuild-from-zero-2026-09-26}"
APP_DIR="${ZAPFORMAT_APP_DIR:-/opt/zapformat}"
WEB_ROOT="${ZAPFORMAT_WEB_ROOT:-/var/www/zapformat}"
ENV_FILE="${ZAPFORMAT_ENV_FILE:-/etc/zapformat/zapformat-api.env}"
SITE_HOST="${ZAPFORMAT_SITE_HOST:-zap.201.51.28.68.sslip.io}"
SERVICE_FILE="/etc/systemd/system/zapformat-api.service"
NGINX_FILE="/etc/nginx/sites-available/zapformat"

fail(){ echo "FAIL: $*" >&2; exit 1; }

[[ "${EUID}" -eq 0 ]] || fail "Run from the root console on the Timeweb VPS."

echo "=== ZapFormat rebuild deploy ==="
echo "branch: ${BRANCH}"
echo "site:   https://${SITE_HOST}"

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y git curl ca-certificates nginx certbot python3-certbot-nginx postgresql-client

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [[ "${NODE_MAJOR}" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

[[ -f "${ENV_FILE}" ]] || fail "Missing ${ENV_FILE}. Existing PartGrade credentials must stay server-side."

set -a
source "${ENV_FILE}"
set +a

[[ "${PARTGRADE_API_BASE:-}" == "https://auto-complekt.public.api.abcp.ru" ]] || fail "PARTGRADE_API_BASE is missing or unexpected."
[[ -n "${PARTGRADE_API_LOGIN:-}" ]] || fail "PARTGRADE_API_LOGIN is missing."
[[ "${PARTGRADE_API_PASSWORD_MD5:-}" =~ ^[A-Fa-f0-9]{32}$ ]] || fail "PARTGRADE_API_PASSWORD_MD5 is missing or malformed."

git config --global --add safe.directory "${APP_DIR}" 2>/dev/null || true

if [[ -d "${APP_DIR}/.git" ]]; then
  [[ -z "$(git -C "${APP_DIR}" status --porcelain)" ]] || fail "${APP_DIR} has local changes; refusing destructive deploy."
  [[ "$(git -C "${APP_DIR}" remote get-url origin)" == "${REPO_URL}" ]] || fail "Unexpected git origin in ${APP_DIR}."
  if [[ -x "${APP_DIR}/backend/deploy/snapshot-before-rebuild.sh" ]]; then
    ZAPFORMAT_APP_DIR="${APP_DIR}" ZAPFORMAT_ENV_FILE="${ENV_FILE}" "${APP_DIR}/backend/deploy/snapshot-before-rebuild.sh"
  fi
  git -C "${APP_DIR}" fetch --prune origin "${BRANCH}"
  git -C "${APP_DIR}" checkout -B "${BRANCH}" "origin/${BRANCH}"
else
  [[ ! -e "${APP_DIR}" ]] || fail "${APP_DIR} exists but is not a git checkout."
  git clone --branch "${BRANCH}" --depth 1 "${REPO_URL}" "${APP_DIR}"
fi

if ! id zapformat >/dev/null 2>&1; then
  useradd --system --home "${APP_DIR}" --shell /usr/sbin/nologin zapformat
fi

cd "${APP_DIR}/backend"
if [[ -f package-lock.json ]]; then
  npm ci --omit=dev
else
  npm install --omit=dev --package-lock=false
fi

# Keep CORS compatible with the current GitHub Pages test URL and the same-origin VPS site.
python3 - "${ENV_FILE}" "${SITE_HOST}" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1])
host=sys.argv[2]
text=p.read_text()
wanted=f"FRONTEND_ORIGINS=https://korrestconsult.github.io,https://{host}"
lines=text.splitlines()
out=[]
seen=False
for line in lines:
    if line.startswith("FRONTEND_ORIGINS="):
        if not seen:
            out.append(wanted); seen=True
    else:
        out.append(line)
if not seen:
    out.append(wanted)
p.write_text("\n".join(out)+"\n")
p.chmod(0o600)
PY

set -a
source "${ENV_FILE}"
set +a

if [[ -n "${DATABASE_URL:-}" ]] && command -v psql >/dev/null 2>&1; then
  for migration in db/*.sql; do
    [[ -f "${migration}" ]] || continue
    echo "migration: ${migration}"
    psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${migration}" >/dev/null
  done
fi

cat > "${SERVICE_FILE}" <<'EOF'
[Unit]
Description=ZapFormat API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=zapformat
Group=zapformat
WorkingDirectory=/opt/zapformat/backend
EnvironmentFile=/etc/zapformat/zapformat-api.env
ExecStart=/usr/bin/node /opt/zapformat/backend/src/server.js
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

chown -R zapformat:zapformat "${APP_DIR}"
install -d -o zapformat -g zapformat -m 750 /var/lib/zapformat
install -d -m 755 "${WEB_ROOT}"
install -m 644 "${APP_DIR}/index.html" "${WEB_ROOT}/index.html"

cat > "${NGINX_FILE}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${SITE_HOST};

    root ${WEB_ROOT};
    index index.html;
    client_max_body_size 2m;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 30s;
        proxy_connect_timeout 5s;
    }

    location / {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        try_files /index.html =404;
    }

    location ^~ /backend/ { return 404; }
    location ^~ /.github/ { return 404; }
    location ^~ /test/ { return 404; }
    location ~ /\\. { return 404; }
}
EOF

ln -sfn "${NGINX_FILE}" /etc/nginx/sites-enabled/zapformat
rm -f /etc/nginx/sites-enabled/default
nginx -t

systemctl daemon-reload
systemctl enable zapformat-api
systemctl restart zapformat-api
systemctl restart nginx
sleep 3

echo "Local API health:"
curl -fsS http://127.0.0.1:3000/api/health
echo

if ! certbot certificates 2>/dev/null | grep -Fq "Domains: ${SITE_HOST}"; then
  certbot --nginx -d "${SITE_HOST}" --non-interactive --agree-tos --register-unsafely-without-email --redirect
else
  certbot --nginx -d "${SITE_HOST}" --non-interactive --agree-tos --register-unsafely-without-email --redirect >/dev/null || true
fi

echo "Public API health:"
curl -fsS "https://${SITE_HOST}/api/health"
echo

echo "PartGrade account health:"
curl -fsS "https://${SITE_HOST}/api/supplier/health"
echo

echo "PartGrade live catalog verification:"
ZAPFORMAT_LOCAL_API=http://127.0.0.1:3000 ZAPFORMAT_ENV_FILE="${ENV_FILE}" "${APP_DIR}/backend/deploy/verify-after-partgrade-access.sh"

echo
echo "=== PASS ==="
echo "Site: https://${SITE_HOST}/"
echo "API:  https://${SITE_HOST}/api/health"
