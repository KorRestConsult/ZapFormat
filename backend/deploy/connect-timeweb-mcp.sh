#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/zapformat"
ENV_FILE="/etc/zapformat/zapformat-api.env"
SERVICE="zapformat-api"
STAMP="$(date +%Y%m%d-%H%M%S)"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run from root Timeweb console."
  exit 1
fi

read -r -s -p "Вставьте токен Timeweb Cloud (ввод скрыт): " TIMEWEB_TOKEN
echo
if [[ -z "${TIMEWEB_TOKEN}" ]]; then
  echo "Токен пустой. Ничего не изменено."
  exit 2
fi

git config --global --add safe.directory "${APP_DIR}" 2>/dev/null || true
cd "${APP_DIR}"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "STOP: в /opt/zapformat есть локальные изменения. Ничего не изменено."
  git status --short
  exit 3
fi

git fetch origin main
git merge --ff-only origin/main

cp -a "${ENV_FILE}" "${ENV_FILE}.timeweb-backup-${STAMP}" 2>/dev/null || true

TMP_ENV="$(mktemp)"
trap 'rm -f "${TMP_ENV}"' EXIT

if [[ -f "${ENV_FILE}" ]]; then
  grep -v '^TIMEWEB_CLOUD_TOKEN=' "${ENV_FILE}" > "${TMP_ENV}" || true
fi
printf '\nTIMEWEB_CLOUD_TOKEN=%s\n' "${TIMEWEB_TOKEN}" >> "${TMP_ENV}"
install -m 600 "${TMP_ENV}" "${ENV_FILE}"

unset TIMEWEB_TOKEN

node --check app.js
node --check backend/src/server.js
node --check backend/scripts/probe-timeweb-mcp.js

cd backend
if [[ -f package-lock.json ]]; then
  npm ci --omit=dev
fi
npm test

set -a
source "${ENV_FILE}"
set +a

echo
echo "Проверяем прямое подключение к Timeweb MCP..."
node scripts/probe-timeweb-mcp.js

systemctl restart "${SERVICE}"
sleep 2

echo
echo "ZapFormat health:"
curl -fsS http://127.0.0.1:3000/api/health
echo

echo
echo "=== TIMEWEB CONNECTED ==="
echo "Токен сохранён только в ${ENV_FILE} с правами 600."
echo "В чат токен отправлять не нужно."
