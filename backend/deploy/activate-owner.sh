#!/usr/bin/env bash
# Run in an interactive, trusted VPS terminal; do not call from browser or CI.
set -Eeuo pipefail
APP=/opt/zapformat
[[ "$EUID" -eq 0 && -t 0 && -t 1 ]] || { echo "Requires an interactive server administrator terminal" >&2; exit 1; }
[[ -d "$APP/.git" ]] || { echo "No ZapFormat checkout" >&2; exit 1; }
cd "$APP"
git config --global --add safe.directory "$APP"
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || { echo "Live checkout has modifications: stop without overwriting" >&2; exit 1; }
git fetch origin main
git merge --ff-only origin/main
cd backend
node --check src/server.js
node --check scripts/provision-owner.js
npm test
[[ -r /etc/zapformat/zapformat-api.env ]] || { echo "Missing private API environment" >&2; exit 1; }
set -a
source /etc/zapformat/zapformat-api.env
set +a
[[ -n "${DATABASE_URL:-}" ]] || { echo "Database URL unavailable" >&2; exit 1; }
printf "Owner email: "
read -r EMAIL
printf "Owner name: "
read -r NAME
[[ "$EMAIL" == *"@"* && -n "$NAME" ]] || { echo "Email and name required" >&2; exit 1; }
printf "Create the first owner on production? Type CREATE: "
read -r ANSWER
[[ "$ANSWER" == "CREATE" ]] || { echo "Cancelled without changes" >&2; exit 1; }
node scripts/provision-owner.js --name "$NAME" --email "$EMAIL"
echo "Keep the generated initial password private; do not paste into chat."
systemctl restart zapformat-api
curl -fsS --max-time 15 https://api.168.113.211.246.sslip.io/api/health
echo
STATUS="$(curl -sS -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" --data "{}" https://api.168.113.211.246.sslip.io/api/account/password/change)"
[[ "$STATUS" == "401" ]] || { echo "Owner exists, but password-change endpoint still not deployed; do NOT re-run owner bootstrap" >&2; exit 1; }
echo "Owner provisioning and password change endpoint are verified."
echo "Open https://korrestconsult.github.io/ZapFormat/admin/ and log in."
printf "Install automatic backend deployment agent? (yes/no): "
read -r RUNNER
if [[ "$RUNNER" == "yes" ]]; then bash /opt/zapformat/backend/deploy/install-autodeploy.sh; fi
