#!/usr/bin/env bash
# Restore known-good Nginx routing for API; does not touch DB or secrets.
set -Eeuo pipefail
if [[ "$EUID" -ne 0 ]]; then
  echo "Run in the authenticated AdminVPS root console."
  exit 2
fi
TARGET=/etc/nginx/conf.d/zapformat-domains.conf
STAGING=/opt/zapformat/backend/deploy/nginx-domain-staging.conf
BACKUP_DIR=/var/backups/zapformat
if [[ ! -f "$STAGING" ]]; then echo "Known-good staging config missing"; exit 3; fi
install -d -m 700 "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="$BACKUP_DIR/domains-before-recovery-$STAMP.conf"
if [[ -f "$TARGET" ]]; then cp -a "$TARGET" "$BACKUP"; fi
install -m 644 "$STAGING" "$TARGET"
if ! nginx -t; then
  if [[ -f "$BACKUP" ]]; then cp -a "$BACKUP" "$TARGET"; nginx -t || true; fi
  echo "Nginx config validation failed; original restored."
  exit 4
fi
# Restart, not reload, so any stalled TLS worker is replaced.
systemctl restart nginx
if ! systemctl is-active --quiet nginx; then echo "Nginx inactive"; exit 5; fi
if ! curl --noproxy "*" --fail --silent --show-error --connect-timeout 6 --max-time 15 https://api.168.113.211.246.sslip.io/api/health; then
  echo "Nginx restarted but stable HTTPS API remains unavailable."
  exit 6
fi
echo
echo "Stable HTTPS API restored."
printf "%s\n" tls_manual_only > /var/lib/zapformat/domain-tls-status.txt
chmod 644 /var/lib/zapformat/domain-tls-status.txt
echo "TLS auto-provisioning remains paused until reviewed."
