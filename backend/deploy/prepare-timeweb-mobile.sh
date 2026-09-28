#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/zapformat"
ENV_FILE="/etc/zapformat/zapformat-api.env"
SERVICE="zapformat-api"
STAMP="$(date +%Y%m%d-%H%M%S)"
MCP_URL="https://api.201.51.28.68.sslip.io/mcp/timeweb-mobile"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run from root Timeweb console."
  exit 1
fi

git config --global --add safe.directory "${APP_DIR}" 2>/dev/null || true
cd "${APP_DIR}"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "STOP: /opt/zapformat has local changes. Nothing changed."
  git status --short
  exit 2
fi

git fetch origin main
git merge --ff-only origin/main

cp -a "${ENV_FILE}" "${ENV_FILE}.mobile-mcp-backup-${STAMP}" 2>/dev/null || true

RELAY_TOKEN="$(openssl rand -base64 36 | tr -d '=+/\n' | head -c 48)"
RELAY_HASH="$(printf '%s' "${RELAY_TOKEN}" | sha256sum | awk '{print $1}')"

TMP_ENV="$(mktemp)"
trap 'rm -f "${TMP_ENV}"' EXIT

if [[ -f "${ENV_FILE}" ]]; then
  grep -v '^TIMEWEB_RELAY_TOKEN_SHA256=' "${ENV_FILE}" > "${TMP_ENV}" || true
fi
printf '\nTIMEWEB_RELAY_TOKEN_SHA256=%s\n' "${RELAY_HASH}" >> "${TMP_ENV}"
install -m 600 "${TMP_ENV}" "${ENV_FILE}"

node --check app.js
node --check backend/src/server.js

cd backend
if [[ -f package-lock.json ]]; then
  npm ci --omit=dev
fi
npm test

systemctl restart "${SERVICE}"
sleep 2

STATUS="$(curl -sS -o /tmp/timeweb-mobile-unauth.json -w '%{http_code}' "${MCP_URL}")"
if [[ "${STATUS}" != "401" ]]; then
  echo "FAIL: unauthenticated mobile MCP endpoint returned HTTP ${STATUS}, expected 401."
  cat /tmp/timeweb-mobile-unauth.json || true
  exit 3
fi

set -a
source "${ENV_FILE}"
set +a

cat > /tmp/timeweb-mobile-init.json <<'JSON'
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"zapformat-mobile-probe","version":"1.0.0"}}}
JSON

AUTH_STATUS="$(curl -sS -o /tmp/timeweb-mobile-auth.out -w '%{http_code}'   -X POST   -H "Authorization: Bearer ${RELAY_TOKEN}"   -H "Content-Type: application/json"   -H "Accept: application/json, text/event-stream"   --data-binary @/tmp/timeweb-mobile-init.json   "${MCP_URL}")"

if [[ "${AUTH_STATUS}" != "200" ]]; then
  echo "FAIL: authenticated mobile MCP probe returned HTTP ${AUTH_STATUS}."
  head -c 1200 /tmp/timeweb-mobile-auth.out || true
  echo
  exit 4
fi

echo
echo "=== MOBILE TIMEWEB READY ==="
echo
echo "MCP URL:"
echo "${MCP_URL}"
echo
echo "Bearer token (copy it now; it is shown only by this setup command):"
echo "${RELAY_TOKEN}"
echo
echo "Do NOT send this bearer token in chat."
echo "Use it only in the ChatGPT MCP connection form."
echo
echo "Unauthenticated endpoint: HTTP 401 OK"
echo "Authenticated MCP initialize: HTTP 200 OK"
