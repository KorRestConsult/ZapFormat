#!/usr/bin/env bash
set -Eeuo pipefail

snapshot="${1:-}"
APP_DIR="${ZAPFORMAT_APP_DIR:-/opt/zapformat}"
ENV_FILE="${ZAPFORMAT_ENV_FILE:-/etc/zapformat/zapformat-api.env}"
SERVICE_FILE="${ZAPFORMAT_SERVICE_FILE:-/etc/systemd/system/zapformat-api.service}"
NGINX_FILE="${ZAPFORMAT_NGINX_FILE:-/etc/nginx/sites-available/zapformat-api}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root."
  exit 1
fi
if [[ -z "${snapshot}" || ! -d "${snapshot}" || ! -f "${snapshot}/git-head.txt" ]]; then
  echo "Usage: $0 /var/backups/zapformat/YYYYMMDD-HHMMSS"
  exit 2
fi

target="$(tr -d '[:space:]' < "${snapshot}/git-head.txt")"
if ! git -C "${APP_DIR}" cat-file -e "${target}^{commit}" 2>/dev/null; then
  echo "Saved commit is not present locally; refusing network fetch during rollback."
  exit 3
fi

git -C "${APP_DIR}" reset --hard "${target}"

if [[ -f "${snapshot}/zapformat-api.env" ]]; then install -m 600 "${snapshot}/zapformat-api.env" "${ENV_FILE}"; fi
if [[ -f "${snapshot}/zapformat-api.service" ]]; then install -m 644 "${snapshot}/zapformat-api.service" "${SERVICE_FILE}"; fi
if [[ -f "${snapshot}/nginx-zapformat-api" ]]; then install -m 644 "${snapshot}/nginx-zapformat-api" "${NGINX_FILE}"; fi

systemctl daemon-reload
nginx -t
systemctl restart zapformat-api
systemctl reload nginx
curl -fsS http://127.0.0.1:3000/api/health >/dev/null

echo "Rollback complete: ${target}"
