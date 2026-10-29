#!/usr/bin/env bash
# One-time interactive recovery of the PartGrade ABCP credentials.
# Invoke on AdminVPS as root in a real terminal. Never pass a password as a CLI argument.
set -Eeuo pipefail
umask 077
ENV_FILE="/etc/zapformat/zapformat-api.env"
APP_ROOT="/opt/zapformat"
if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root on the authorized ZapFormat server." >&2
  exit 1
fi
if [[ ! -t 0 ]]; then
  echo "Interactive terminal required; credentials are not accepted via command arguments." >&2
  exit 1
fi
if [[ ! -f "${ENV_FILE}" ]] || [[ ! -f "${APP_ROOT}/backend/src/partgrade.js" ]]; then
  echo "ZapFormat server files not found." >&2
  exit 1
fi

echo "PartGrade / ABCP setup (read-only credential test; no basket/order writes)."
read -r -p "PartGrade site login: " login
if [[ ! "${login}" =~ ^[A-Za-z0-9._@+-]+$ ]]; then
  echo "Invalid login format. Credentials not changed." >&2
  exit 1
fi
IFS= read -r -s -p "PartGrade site password (hidden): " password
printf '\n'
if [[ -z "${password}" ]]; then
  echo "Blank password. Credentials not changed." >&2
  exit 1
fi
digest="$(printf '%s' "${password}" | md5sum | cut -d' ' -f1)"
unset password
export PARTGRADE_API_LOGIN="${login}"
export PARTGRADE_API_PASSWORD_MD5="${digest}"
export PARTGRADE_API_BASE="https://auto-complekt.public.api.abcp.ru"
trap 'unset login digest PARTGRADE_API_LOGIN PARTGRADE_API_PASSWORD_MD5' EXIT

echo "Verifying read-only user/info with PartGrade..."
if ! node -e '
  const {createPartGradeClient} = require("/opt/zapformat/backend/src/partgrade");
  createPartGradeClient().userInfo()
    .then(() => console.log("PartGrade login verified."))
    .catch(() => { console.error("PartGrade refused login or the API is unavailable. No changes were saved."); process.exitCode = 1; });
'; then
  exit 1
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup="${ENV_FILE}.partgrade-backup-${stamp}"
cp -p -- "${ENV_FILE}" "${backup}"
python3 - "${ENV_FILE}" <<'PY'
import os, pathlib, sys, tempfile
path=pathlib.Path(sys.argv[1])
lines=path.read_text(encoding="utf-8").splitlines()
names={"PARTGRADE_API_LOGIN", "PARTGRADE_API_PASSWORD_MD5", "PARTGRADE_API_BASE"}
lines=[line for line in lines if line.split("=",1)[0].strip() not in names]
for name in ("PARTGRADE_API_BASE","PARTGRADE_API_LOGIN","PARTGRADE_API_PASSWORD_MD5"):
    value=os.environ[name]
    if not value or any(ch in value for ch in "\r\n"):
        raise RuntimeError("invalid partgrade configuration")
    lines.append(name+"="+value)
fd,tmp=tempfile.mkstemp(prefix=".partgrade-",dir=str(path.parent))
try:
    os.fchmod(fd,0o600)
    with os.fdopen(fd,"w",encoding="utf-8") as out:
        out.write("\n".join(lines)+"\n")
        out.flush()
        os.fsync(out.fileno())
    os.replace(tmp,path)
except BaseException:
    try: os.unlink(tmp)
    except FileNotFoundError: pass
    raise
PY
echo "Verified credentials saved in protected server configuration."
if ! systemctl restart zapformat-api; then
  echo "Service restart failed; restoring previous server configuration." >&2
  cp -p -- "${backup}" "${ENV_FILE}"
  systemctl restart zapformat-api || true
  exit 1
fi
if curl -fsS --max-time 20 http://127.0.0.1:3000/api/supplier/health >/dev/null; then
  echo "SUCCESS: supplier health verified; orders were not sent."
else
  echo "Server restarted but supplier health failed; recheck with support diagnostics. The verified credentials remain protected on this VPS." >&2
  exit 2
fi
