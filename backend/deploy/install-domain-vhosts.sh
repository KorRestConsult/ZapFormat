#!/usr/bin/env bash
# Safe on every release; do not overwrite future certbot-managed vhosts.
set -Eeuo pipefail
TARGET=/etc/nginx/conf.d/zapformat-domains.conf
SOURCE=/opt/zapformat/backend/deploy/nginx-domain-staging.conf
if [[ ! -f "$TARGET" ]]; then
  install -m 644 "$SOURCE" "$TARGET"
  if ! nginx -t; then
    rm -f "$TARGET"
    nginx -t
    exit 1
  fi
  if ! systemctl reload nginx; then
    rm -f "$TARGET"
    systemctl reload nginx || true
    exit 1
  fi
  echo "New names staged, retaining existing HTTPS entrypoints."
else
  echo "Domain vhosts present; preserving certificates and custom changes."
fi
