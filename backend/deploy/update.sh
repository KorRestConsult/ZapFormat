#!/usr/bin/env bash
set -Eeuo pipefail
APP_DIR="/opt/zapformat"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run from root Timeweb console."
  exit 1
fi

git config --global --add safe.directory "${APP_DIR}" 2>/dev/null || true
git -C "${APP_DIR}" fetch origin main
git -C "${APP_DIR}" merge --ff-only origin/main
cd "${APP_DIR}/backend"
if [[ -f package-lock.json ]]; then
  npm ci --omit=dev
else
  npm install --omit=dev --package-lock=false
fi
mkdir -p /var/lib/zapformat
chown zapformat:zapformat /var/lib/zapformat
chmod 750 /var/lib/zapformat
if [[ -f /etc/zapformat/zapformat-api.env ]]; then
  set -a
  source /etc/zapformat/zapformat-api.env
  set +a
  if [[ -n "${DATABASE_URL:-}" ]]; then
    psql "${DATABASE_URL}" -f db/001_init.sql >/dev/null
    psql "${DATABASE_URL}" -f db/002_garage_owner_app.sql >/dev/null
    psql "${DATABASE_URL}" -f db/003_quote_requests.sql >/dev/null
  fi
fi

systemctl restart zapformat-api
sleep 2
curl -fsS http://127.0.0.1:3000/api/health
echo
echo "ZapFormat backend updated."
