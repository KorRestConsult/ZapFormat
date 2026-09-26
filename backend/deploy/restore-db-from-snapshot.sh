#!/usr/bin/env bash
set -Eeuo pipefail

snapshot="${1:-}"
confirm="${2:-}"
ENV_FILE="${ZAPFORMAT_ENV_FILE:-/etc/zapformat/zapformat-api.env}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root."
  exit 1
fi
if [[ -z "${snapshot}" || ! -f "${snapshot}/database.dump" ]]; then
  echo "Usage: $0 /var/backups/zapformat/YYYYMMDD-HHMMSS --yes"
  exit 2
fi
if [[ "${confirm}" != "--yes" ]]; then
  echo "Database restore is destructive. Re-run with --yes after verifying the snapshot."
  exit 3
fi
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing env file: ${ENV_FILE}"
  exit 4
fi
if ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore is not installed."
  exit 5
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is empty."
  exit 6
fi

pg_restore --clean --if-exists --no-owner --no-privileges --dbname "${DATABASE_URL}" "${snapshot}/database.dump"
echo "Database restored from ${snapshot}/database.dump"
