#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/zapformat"
STATE_DIR="/var/lib/zapformat"
TRIGGER_FILE="${STATE_DIR}/deploy.trigger"
STATE_FILE="${STATE_DIR}/deploy-state.json"
LOG_FILE="/var/log/zapformat/autodeploy.log"
LOCK_FILE="/run/lock/zapformat-autodeploy.lock"

mkdir -p "${STATE_DIR}" /var/log/zapformat
touch "${LOG_FILE}"
chmod 640 "${LOG_FILE}" || true

exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  exit 0
fi

if [[ ! -f "${TRIGGER_FILE}" ]]; then
  exit 0
fi

REQUESTED_SHA="$(python3 - <<'PY'
import json
p="/var/lib/zapformat/deploy.trigger"
try:
    data=json.load(open(p,encoding="utf-8"))
    print(data.get("sha",""))
except Exception:
    print("")
PY
)"
REQUESTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

write_state() {
  local status="$1"
  local deployed_sha="${2:-}"
  local message="${3:-}"
  python3 - "${status}" "${REQUESTED_SHA}" "${deployed_sha}" "${REQUESTED_AT}" "${message}" <<'PY'
import json, os, sys, tempfile
status, requested_sha, deployed_sha, requested_at, message = sys.argv[1:6]
state={
  "status": status,
  "requested_sha": requested_sha,
  "deployed_sha": deployed_sha or None,
  "requested_at": requested_at,
  "updated_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat().replace("+00:00","Z"),
  "message": message or None,
}
path="/var/lib/zapformat/deploy-state.json"
tmp=path+".tmp"
with open(tmp,"w",encoding="utf-8") as f:
    json.dump(state,f,ensure_ascii=False)
    f.write("\n")
os.replace(tmp,path)
PY
  chmod 644 "${STATE_FILE}" || true
}

write_state "running" "" "Deployment started"

set +e
{
  echo
  echo "===== AUTODEPLOY $(date -u +%Y-%m-%dT%H:%M:%SZ) requested=${REQUESTED_SHA} ====="
  ZAPFORMAT_TARGET_SHA="${REQUESTED_SHA}" bash "${APP_DIR}/backend/deploy/release-live-catalog.sh"
} >>"${LOG_FILE}" 2>&1
CODE=$?
set -e

if [[ "${CODE}" -eq 0 ]]; then
  DEPLOYED_SHA="$(git -C "${APP_DIR}" rev-parse HEAD 2>/dev/null || true)"
  write_state "success" "${DEPLOYED_SHA}" "Deployment completed"
else
  CURRENT_SHA="$(git -C "${APP_DIR}" rev-parse HEAD 2>/dev/null || true)"
  FAILURE_STAGE="$(cat "${STATE_DIR}/release-stage" 2>/dev/null || true)"
  if [[ -n "${FAILURE_STAGE}" ]]; then
    write_state "failed" "${CURRENT_SHA}" "Deployment failed at stage: ${FAILURE_STAGE}; rollback attempted"
  else
    write_state "failed" "${CURRENT_SHA}" "Deployment failed; release script attempted rollback"
  fi
fi

exit "${CODE}"
