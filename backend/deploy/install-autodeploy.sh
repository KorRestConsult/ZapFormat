#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/zapformat"
STATE_DIR="/var/lib/zapformat"
LOG_DIR="/var/log/zapformat"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run from root Timeweb console."
  exit 1
fi

git config --global --add safe.directory "${APP_DIR}" 2>/dev/null || true
cd "${APP_DIR}"

# Remove only the known junk files created when terminal output was accidentally pasted
# back into Bash. Never touch tracked files or arbitrary untracked project files.
for junk in   "backend/...]]"   "backend/="   "backend/FETCH_HEAD"   "backend/[--include"   "backend/[--omit"   "backend/]"; do
  if [[ -e "${junk}" ]] && ! git ls-files --error-unmatch "${junk}" >/dev/null 2>&1; then
    rm -f -- "${junk}"
  fi
done

if [[ -n "$(git status --porcelain)" ]]; then
  echo "STOP: live checkout still has local changes."
  git status --short
  exit 2
fi

git fetch origin main
git merge --ff-only origin/main

node --check backend/src/server.js
node --check backend/src/github-oidc.js

cd backend
if [[ -f package-lock.json ]]; then
  npm ci --omit=dev
else
  npm install --omit=dev --package-lock=false
fi
npm test

mkdir -p "${STATE_DIR}" "${LOG_DIR}"
chown -R zapformat:zapformat "${STATE_DIR}"
chmod 750 "${STATE_DIR}"
touch "${STATE_DIR}/deploy.trigger"
chown zapformat:zapformat "${STATE_DIR}/deploy.trigger"
chmod 640 "${STATE_DIR}/deploy.trigger"

install -m 750 "${APP_DIR}/backend/deploy/autodeploy-runner.sh" /usr/local/sbin/zapformat-autodeploy

cat >/etc/systemd/system/zapformat-autodeploy.service <<'EOF'
[Unit]
Description=ZapFormat safe autodeploy
After=network-online.target zapformat-api.service
Wants=network-online.target

[Service]
Type=oneshot
User=root
Group=root
ExecStart=/usr/local/sbin/zapformat-autodeploy
EOF

cat >/etc/systemd/system/zapformat-autodeploy.path <<'EOF'
[Unit]
Description=Watch ZapFormat deploy trigger

[Path]
PathChanged=/var/lib/zapformat/deploy.trigger
Unit=zapformat-autodeploy.service

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now zapformat-autodeploy.path
systemctl restart zapformat-api
sleep 2

echo
echo "Backend health:"
curl -fsS http://127.0.0.1:3000/api/health
echo

UNAUTH="$(curl -sS -o /tmp/zf-deploy-unauth.json -w '%{http_code}' -X POST   -H 'Content-Type: application/json'   --data '{"sha":"0000000000000000000000000000000000000000"}'   http://127.0.0.1:3000/api/internal/deploy)"
if [[ "${UNAUTH}" != "401" ]]; then
  echo "FAIL: deploy endpoint returned HTTP ${UNAUTH}, expected 401."
  exit 3
fi
echo "Deploy endpoint unauthenticated check: HTTP 401 OK"

CURRENT_SHA="$(git -C "${APP_DIR}" rev-parse HEAD)"
python3 - "${CURRENT_SHA}" <<'PY'
import json,sys
with open("/var/lib/zapformat/deploy.trigger","w",encoding="utf-8") as f:
    json.dump({"sha":sys.argv[1],"requested_at":"bootstrap","actor":"bootstrap","run_id":"bootstrap"},f)
    f.write("\n")
PY
chown zapformat:zapformat "${STATE_DIR}/deploy.trigger"

echo "Running end-to-end local autodeploy test..."
for _ in $(seq 1 90); do
  if [[ -f "${STATE_DIR}/deploy-state.json" ]]; then
    STATUS="$(python3 - <<'PY'
import json
try:
  d=json.load(open("/var/lib/zapformat/deploy-state.json",encoding="utf-8"))
  print(d.get("status",""))
except Exception:
  print("")
PY
)"
    if [[ "${STATUS}" == "success" ]]; then
      echo
      cat "${STATE_DIR}/deploy-state.json"
      echo
      echo "=== AUTODEPLOY READY ==="
      echo "Future pushes to main will deploy automatically through GitHub Actions."
      exit 0
    fi
    if [[ "${STATUS}" == "failed" ]]; then
      echo "Autodeploy test failed."
      tail -n 120 "${LOG_DIR}/autodeploy.log" || true
      exit 4
    fi
  fi
  sleep 2
done

echo "Autodeploy test timed out."
tail -n 120 "${LOG_DIR}/autodeploy.log" || true
exit 5
