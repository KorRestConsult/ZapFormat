#!/usr/bin/env bash
set -Eeuo pipefail
APP_DIR="/opt/zapformat"
ENV_FILE="/etc/zapformat/zapformat-api.env"
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
git -C "$APP_DIR" fetch origin main
git -C "$APP_DIR" merge --ff-only origin/main
cd "$APP_DIR/backend"
set -a
source "$ENV_FILE"
set +a
node scripts/probe-search-articles.js
