#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${ZAPFORMAT_APP_DIR:-/opt/zapformat}"
ENV_FILE="${ZAPFORMAT_ENV_FILE:-/etc/zapformat/zapformat-api.env}"
SERVICE_FILE="${ZAPFORMAT_SERVICE_FILE:-/etc/systemd/system/zapformat-api.service}"
NGINX_FILE="${ZAPFORMAT_NGINX_FILE:-/etc/nginx/sites-available/zapformat-api}"
BACKUP_ROOT="${ZAPFORMAT_BACKUP_ROOT:-/var/backups/zapformat}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root."
  exit 1
fi
if [[ ! -d "${APP_DIR}/.git" ]]; then
  echo "Not a git checkout: ${APP_DIR}"
  exit 2
fi

stamp="$(date +%Y%m%d-%H%M%S)"
dest="${BACKUP_ROOT}/${stamp}"
install -d -m 700 "${dest}"

git -C "${APP_DIR}" rev-parse HEAD > "${dest}/git-head.txt"
git -C "${APP_DIR}" branch --show-current > "${dest}/git-branch.txt"
git -C "${APP_DIR}" status --porcelain=v1 > "${dest}/git-status.txt"

if [[ -f "${ENV_FILE}" ]]; then install -m 600 "${ENV_FILE}" "${dest}/zapformat-api.env"; fi

# Database snapshot: read DATABASE_URL from the protected env file without printing it.
if [[ -f "${ENV_FILE}" ]] && command -v pg_dump >/dev/null 2>&1; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
  if [[ -n "${DATABASE_URL:-}" ]]; then
    pg_dump --format=custom --no-owner --no-privileges --file "${dest}/database.dump" "${DATABASE_URL}"
    chmod 600 "${dest}/database.dump"
    echo "PostgreSQL dump saved."
  else
    echo "DATABASE_URL is empty; database snapshot skipped."
  fi
else
  echo "pg_dump or env file unavailable; database snapshot skipped."
fi
if [[ -f "${SERVICE_FILE}" ]]; then install -m 600 "${SERVICE_FILE}" "${dest}/zapformat-api.service"; fi
if [[ -f "${NGINX_FILE}" ]]; then install -m 600 "${NGINX_FILE}" "${dest}/nginx-zapformat-api"; fi

systemctl is-active zapformat-api > "${dest}/service-state.txt" 2>&1 || true
nginx -t > "${dest}/nginx-test.txt" 2>&1 || true

echo "Snapshot ready: ${dest}"
echo "Git HEAD saved; ENV/nginx/systemd copied without printing their contents."
