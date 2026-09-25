#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/zapformat"
ENV_FILE="/etc/zapformat/zapformat-api.env"

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

set -a
source "${ENV_FILE}"
set +a

systemctl restart zapformat-api
sleep 2

echo
echo "=== Live PartGrade diagnostic ==="
node scripts/partgrade-diagnostic.js

echo
echo "=== Backend health ==="
curl -fsS http://127.0.0.1:3000/api/health
echo
