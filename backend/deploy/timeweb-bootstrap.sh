#!/usr/bin/env bash
set -Eeuo pipefail

API_HOST="${ZAPFORMAT_API_HOST:-api.201.51.28.68.sslip.io}"
REPO_URL="https://github.com/KorRestConsult/ZapFormat.git"
APP_DIR="/opt/zapformat"
ENV_DIR="/etc/zapformat"
ENV_FILE="${ENV_DIR}/zapformat-api.env"
SERVICE_FILE="/etc/systemd/system/zapformat-api.service"
NGINX_FILE="/etc/nginx/sites-available/zapformat-api"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Запусти эту команду из root-консоли Timeweb."
  exit 1
fi

# Never replace an existing application directory that is not this repository.
if [[ -e "${APP_DIR}" ]]; then
  if [[ ! -d "${APP_DIR}/.git" ]]; then
    echo "${APP_DIR} уже существует и не является git-репозиторием. Ничего не удалено."
    exit 1
  fi
  if [[ "$(git -C "${APP_DIR}" remote get-url origin)" != "${REPO_URL}" ]] ||
     [[ "$(git -C "${APP_DIR}" branch --show-current)" != "main" ]] ||
     [[ -n "$(git -C "${APP_DIR}" status --porcelain)" ]]; then
    echo "Существующая копия ${APP_DIR} отличается от чистой ветки main ZapFormat. Ничего не перезаписано."
    exit 1
  fi
fi

echo "=== ZapFormat · быстрый deploy PartGrade backend ==="
read -r -p "Логин PartGrade: " PG_LOGIN
read -r -s -p "Временный пароль PartGrade: " PG_PASSWORD
echo
if [[ -z "${PG_LOGIN}" || -z "${PG_PASSWORD}" ]]; then
  echo "Логин или пароль пустой. Остановлено."
  exit 1
fi

PG_HASH="$(printf '%s' "${PG_PASSWORD}" | md5sum | awk '{print $1}')"
unset PG_PASSWORD

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y git curl ca-certificates gnupg nginx certbot python3-certbot-nginx

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [[ "${NODE_MAJOR}" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

if ! id zapformat >/dev/null 2>&1; then
  useradd --system --home /opt/zapformat --shell /usr/sbin/nologin zapformat
fi

if [[ -d "${APP_DIR}/.git" ]]; then
  git -C "${APP_DIR}" fetch origin main
  git -C "${APP_DIR}" merge --ff-only origin/main
else
  git clone --branch main --depth 1 "${REPO_URL}" "${APP_DIR}"
fi

cd "${APP_DIR}/backend"
if [[ -f package-lock.json ]]; then
  npm ci --omit=dev
else
  npm install --omit=dev --package-lock=false
fi

mkdir -p "${ENV_DIR}"
export ZF_PG_LOGIN="${PG_LOGIN}" ZF_PG_HASH="${PG_HASH}"
python3 - "${ENV_FILE}" <<'PY'
import os
import pathlib
import tempfile
import sys

path = pathlib.Path(sys.argv[1])
values = {
    "NODE_ENV": "production",
    "PORT": "3000",
    "HOST": "127.0.0.1",
    "FRONTEND_ORIGINS": "https://korrestconsult.github.io",
    "COOKIE_NAME": "zf_session",
    "COOKIE_SAME_SITE": "none",
    "SESSION_DAYS": "30",
    "PARTGRADE_API_BASE": "https://auto-complekt.public.api.abcp.ru",
    "PARTGRADE_API_LOGIN": os.environ["ZF_PG_LOGIN"],
    "PARTGRADE_API_PASSWORD_MD5": os.environ["ZF_PG_HASH"],
    "PARTGRADE_API_TIMEOUT_MS": "12000",
    "DEFAULT_MARKUP_PERCENT": "15",
    "MIN_MARKUP_RUB": "0",
}
if any(c in values["PARTGRADE_API_LOGIN"] for c in '\r\n\x00'):
    raise SystemExit("Недопустимые символы в логине; ENV не изменён")
original = path.read_text() if path.exists() else ""
lines = original.splitlines()
present = {line.split('=', 1)[0] for line in lines if '=' in line}
changed = set()
updated = []
for line in lines:
    key = line.split('=', 1)[0] if '=' in line else None
    if key in values:
        if key in changed:
            continue
        updated.append(f'{key}={values[key]}' if key.startswith('PARTGRADE_') else line)
        changed.add(key)
    else:
        updated.append(line)
updated += [f'{key}={value}' for key, value in values.items() if key not in present]
fd, temp_path = tempfile.mkstemp(prefix='.zf-env-', dir=path.parent)
try:
    with os.fdopen(fd, 'w') as out:
        out.write('\n'.join(updated) + '\n')
    os.chmod(temp_path, 0o600)
    os.replace(temp_path, path)
finally:
    if os.path.exists(temp_path):
        os.unlink(temp_path)
PY
unset ZF_PG_LOGIN ZF_PG_HASH PG_HASH PG_LOGIN
chown root:root "${ENV_FILE}"

if [[ -e "${SERVICE_FILE}" ]]; then
  cp -p "${SERVICE_FILE}" "${SERVICE_FILE}.zapformat-backup-$(date +%Y%m%d%H%M%S)"
fi
cat > "${SERVICE_FILE}" <<'EOF'
[Unit]
Description=ZapFormat API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=zapformat
Group=zapformat
WorkingDirectory=/opt/zapformat/backend
EnvironmentFile=/etc/zapformat/zapformat-api.env
ExecStart=/usr/bin/node /opt/zapformat/backend/src/server.js
Restart=always
RestartSec=3
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

chown -R zapformat:zapformat "${APP_DIR}"
systemctl daemon-reload
systemctl enable --now zapformat-api
systemctl restart zapformat-api
sleep 2

echo
echo "Локальная проверка backend:"
curl -fsS http://127.0.0.1:3000/api/health || {
  echo
  echo "Backend не поднялся. Последние логи:"
  journalctl -u zapformat-api -n 80 --no-pager
  exit 2
}
echo

if [[ -e "${NGINX_FILE}" ]]; then
  cp -p "${NGINX_FILE}" "${NGINX_FILE}.zapformat-backup-$(date +%Y%m%d%H%M%S)"
fi
cat > "${NGINX_FILE}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${API_HOST};

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sfn "${NGINX_FILE}" /etc/nginx/sites-enabled/zapformat-api
nginx -t
systemctl reload nginx

echo
echo "Получаю HTTPS-сертификат для ${API_HOST}…"
if certbot --nginx -d "${API_HOST}" --non-interactive --agree-tos --register-unsafely-without-email --redirect; then
  echo "HTTPS готов."
else
  echo "Не удалось автоматически получить HTTPS. Backend работает локально; проверь открыты ли порты 80/443 в Timeweb."
  exit 3
fi

echo
echo "Проверка публичного API:"
curl -fsS "https://${API_HOST}/api/health"
echo

echo "Проверка PartGrade:"
if ! curl -fsS "https://${API_HOST}/api/supplier/health"; then
  echo
  echo "Backend запущен, но проверка поставщика не прошла. Поиск будет проверен отдельно."
fi
echo

echo
echo "Проверка PartGrade PATRON PRS3420:"
HTTP_CODE="$(curl -sS -o /tmp/zf-offers.json -w '%{http_code}' \
  "https://${API_HOST}/api/catalog/offers?number=PRS3420&brand=PATRON")"
echo "HTTP: ${HTTP_CODE}"
python3 - <<'PY'
import json
p="/tmp/zf-offers.json"
try:
    data=json.load(open(p,encoding="utf-8"))
except Exception:
    print(open(p,encoding="utf-8",errors="replace").read()[:2000])
    raise SystemExit
if isinstance(data,dict) and isinstance(data.get("offers"),list):
    print("Живых предложений:",len(data["offers"]))
    for x in data["offers"][:5]:
        print({
            "brand":x.get("brand"),
            "article":x.get("article"),
            "price_ZapFormat":x.get("price"),
            "availability":x.get("availability"),
            "delivery_hours":x.get("delivery_hours"),
        })
    if not data["offers"]:
        raise SystemExit("Поиск ответил HTTP 200, но живых предложений нет")
else:
    print(data)
PY

if [[ "${HTTP_CODE}" != "200" ]]; then
  echo "Backend работает, но живой поиск PartGrade пока не работает (HTTP ${HTTP_CODE})."
  exit 4
fi

echo
echo "=== Backend доступен, проверка ответа поиска завершена ==="
echo "API: https://${API_HOST}"
echo "Сайт: https://korrestconsult.github.io/ZapFormat/"
echo "Проверка frontend и оформления заказа — отдельные шаги после подтверждения живых предложений."
