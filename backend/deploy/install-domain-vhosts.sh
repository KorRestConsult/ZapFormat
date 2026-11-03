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

# Pause automatic certificate and virtual host changes until dedicated TLS is verified.
# Routine backend releases must not disrupt the existing sslip.io HTTPS endpoint.
if [[ "${ZAPFORMAT_ENABLE_DOMAIN_TLS:-false}" != "true" ]]; then
  if [[ -f "$TARGET" ]] && grep -q '^# ZAPFORMAT_LIVE_V1' "$TARGET"; then
    set_status manual_recovery_required
    echo "Custom TLS vhost still active; recovery is required from the private VPS console."
  else
    set_status tls_manual_only
    echo "New custom-domain TLS auto-provisioning is paused."
  fi
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

# Explicitly bypass any configured HTTPS proxy: local checks must hit local Nginx.
probe_domain() {
  local host="$1" url="$2" rc=0
  curl --noproxy '*' --fail --silent --show-error --connect-timeout 5 --max-time 12 \
    --resolve "${host}:443:127.0.0.1" "$url" >/dev/null || rc=$?
  return "$rc"
}
rollback_domain() {
  cp -a "$BACKUP" "$TARGET"
  nginx -t || true
  systemctl reload nginx || true
  rm -f "$BACKUP"
}
api_rc=0
admin_rc=0
for retry in 1 2 3 4 5; do
  api_rc=0
  probe_domain api.zapformat.ru https://api.zapformat.ru/api/health || api_rc=$?
  if [[ "$api_rc" -eq 0 ]]; then break; fi
  sleep 2
done
if [[ "$api_rc" -ne 0 ]]; then
  if [[ "$api_rc" -eq 60 ]]; then
    if ! openssl x509 -in "$CHAIN" -noout -checkhost api.zapformat.ru >/dev/null 2>&1; then
      api_rc=61 # Certificate file does not match the requested API host.
    else
      api_rc=62 # Certificate file matches; Nginx presents another certificate.
    fi
  fi
  rollback_domain
  set_status "smoke_api_${api_rc}"
  echo "Domain TLS smoke test failed for API (curl code ${api_rc}); restored previous config."
  exit 0
fi
for retry in 1 2 3 4 5; do
  admin_rc=0
  probe_domain admin.zapformat.ru https://admin.zapformat.ru/ || admin_rc=$?
  if [[ "$admin_rc" -eq 0 ]]; then break; fi
  sleep 2
done
if [[ "$admin_rc" -ne 0 ]]; then
  if [[ "$admin_rc" -eq 60 ]]; then
    if ! openssl x509 -in "$CHAIN" -noout -checkhost admin.zapformat.ru >/dev/null 2>&1; then
      admin_rc=61
    else
      admin_rc=62
    fi
  fi
  rollback_domain
  set_status "smoke_admin_${admin_rc}"
  echo "Domain TLS smoke test failed for admin (curl code ${admin_rc}); restored previous config."
  exit 0
fi
rm -f "$BACKUP"
set_status ready
echo "New domain endpoints enabled: https://api.zapformat.ru and https://admin.zapformat.ru"
