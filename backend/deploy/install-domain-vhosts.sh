#!/usr/bin/env bash
# Idempotent: retain existing HTTPS, provision new domains with separate cert.
set -Eeuo pipefail
TARGET=/etc/nginx/conf.d/zapformat-domains.conf
STAGING=/opt/zapformat/backend/deploy/nginx-domain-staging.conf
LIVE=/opt/zapformat/backend/deploy/nginx-domain-live.conf
CHAIN=/etc/letsencrypt/live/zapformat-domains/fullchain.pem
KEY=/etc/letsencrypt/live/zapformat-domains/privkey.pem
STATUS_FILE=/var/lib/zapformat/domain-tls-status.txt
set_status() {
  printf '%s\n' "$1" > "$STATUS_FILE"
  chmod 644 "$STATUS_FILE"
}
set_status checking

if [[ ! -f "$TARGET" ]]; then
  install -m 644 "$STAGING" "$TARGET"
  if ! nginx -t || ! systemctl reload nginx; then
    rm -f "$TARGET"
    nginx -t || true
    systemctl reload nginx || true
    set_status staging_failed
    echo "Domain staging failed; legacy hosts untouched."
    exit 0
  fi
fi

if [[ -f "$CHAIN" && -f "$KEY" ]] && grep -q '^# ZAPFORMAT_LIVE_V1' "$TARGET"; then
  set_status ready
  echo "API and admin domain TLS already provisioned."
  exit 0
fi

# Public DNS has been independently verified. Let the certificate authority
# perform authoritative validation instead of trusting the VPS local DNS cache.

if [[ ! -f "$CHAIN" || ! -f "$KEY" ]]; then
  if ! command -v certbot >/dev/null 2>&1; then
    set_status certbot_missing
    echo "Domain TLS deferred: certbot is not installed."
    exit 0
  fi
  if ! timeout 115 certbot certonly --nginx --non-interactive --agree-tos \
      --register-unsafely-without-email --cert-name zapformat-domains \
      -d api.zapformat.ru -d admin.zapformat.ru; then
    set_status certificate_failed
    echo "Domain TLS deferred: certificate challenge unsuccessful; old HTTPS still works."
    exit 0
  fi
fi

BACKUP="$(mktemp /tmp/zapformat-domain-backup.XXXXXX)"
cp -a "$TARGET" "$BACKUP"
install -m 644 "$LIVE" "$TARGET"
if ! nginx -t || ! systemctl reload nginx; then
  cp -a "$BACKUP" "$TARGET"
  nginx -t || true
  systemctl reload nginx || true
  rm -f "$BACKUP"
  set_status nginx_failed
  echo "Domain TLS configuration rejected; original Nginx configuration restored."
  exit 0
fi

if ! curl --fail --silent --show-error --max-time 12 \
       --resolve api.zapformat.ru:443:127.0.0.1 \
       https://api.zapformat.ru/api/health >/dev/null ||
   ! curl --fail --silent --show-error --max-time 12 \
       --resolve admin.zapformat.ru:443:127.0.0.1 \
       https://admin.zapformat.ru/ >/dev/null; then
  cp -a "$BACKUP" "$TARGET"
  nginx -t || true
  systemctl reload nginx || true
  rm -f "$BACKUP"
  set_status smoke_failed
  echo "Domain TLS smoke test failed; original Nginx configuration restored."
  exit 0
fi
rm -f "$BACKUP"
set_status ready
echo "New domain endpoints enabled: https://api.zapformat.ru and https://admin.zapformat.ru"
