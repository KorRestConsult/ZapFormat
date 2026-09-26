#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${ZAPFORMAT_APP_DIR:-/opt/zapformat}"
WEB_ROOT="${ZAPFORMAT_WEB_ROOT:-/var/www/zapformat}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root."
  exit 1
fi
if [[ ! -f "${APP_DIR}/index.html" ]]; then
  echo "Missing frontend: ${APP_DIR}/index.html"
  exit 2
fi

install -d -m 755 "${WEB_ROOT}"
install -m 644 "${APP_DIR}/index.html" "${WEB_ROOT}/index.html"

# Refuse accidental repo exposure.
for forbidden in backend .github test .git; do
  if [[ -e "${WEB_ROOT}/${forbidden}" ]]; then
    echo "Forbidden path exists in public web root: ${WEB_ROOT}/${forbidden}"
    exit 3
  fi
done

nginx -t
echo "Frontend installed to ${WEB_ROOT}/index.html"
