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

  if [[ ! "${REQUESTED_SHA}" =~ ^[a-f0-9]{40}$ ]]; then
    echo "Invalid requested SHA."
    exit 3
  fi

  # The live checkout may roll back after a failed release. Fetch the requested
  # commit and execute the release script FROM THAT COMMIT so deploy-script fixes
  # can recover the deployment path itself.
  git -C "${APP_DIR}" fetch origin main
  git -C "${APP_DIR}" cat-file -e "${REQUESTED_SHA}^{commit}"
  RELEASE_SCRIPT="/tmp/zapformat-release-${REQUESTED_SHA}.sh"
  git -C "${APP_DIR}" show "${REQUESTED_SHA}:backend/deploy/release-live-catalog.sh" > "${RELEASE_SCRIPT}"
  chmod 700 "${RELEASE_SCRIPT}"
  ZAPFORMAT_TARGET_SHA="${REQUESTED_SHA}" bash "${RELEASE_SCRIPT}"
  RELEASE_CODE=$?
  rm -f "${RELEASE_SCRIPT}"
  [[ "${RELEASE_CODE}" -eq 0 ]]
} >>"${LOG_FILE}" 2>&1
CODE=$?
set -e

if [[ "${CODE}" -eq 0 ]]; then
  DEPLOYED_SHA="$(git -C "${APP_DIR}" rev-parse HEAD 2>/dev/null || true)"
  write_state "success" "${DEPLOYED_SHA}" "Deployment completed"
else
  CURRENT_SHA="$(git -C "${APP_DIR}" rev-parse HEAD 2>/dev/null || true)"
  FAILURE_STAGE="$(cat "${STATE_DIR}/release-stage" 2>/dev/null || true)"
  SERVICE_DIAG=""
  if [[ "${FAILURE_STAGE}" == "service_restart" ]]; then
    SERVICE_DIAG="$(systemctl show zapformat-api       -p ActiveState -p SubState -p Result -p ExecMainCode -p ExecMainStatus       --no-pager 2>/dev/null | tr '\n' ' ' | tr -s ' ' | cut -c1-300)"
  fi
  if [[ -n "${FAILURE_STAGE}" ]]; then
    write_state "failed" "${CURRENT_SHA}" "Deployment failed at stage: ${FAILURE_STAGE}; rollback attempted${SERVICE_DIAG:+; ${SERVICE_DIAG}}"
  else
    write_state "failed" "${CURRENT_SHA}" "Deployment failed; release script attempted rollback"
  fi
fi

exit "${CODE}"
