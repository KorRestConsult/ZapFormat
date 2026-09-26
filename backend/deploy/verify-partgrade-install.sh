#!/usr/bin/env bash
set -Eeuo pipefail

ENV_FILE="/etc/zapformat/zapformat-api.env"
EXPECTED_HOST="https://auto-complekt.public.api.abcp.ru"
EXPECTED_LOGIN="Korobicin@live.com"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run from root Timeweb console."
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ENV file missing: ${ENV_FILE}"
  exit 2
fi

set -a
source "${ENV_FILE}"
set +a

echo "=== ZapFormat / PartGrade install verification ==="
echo "API host: ${PARTGRADE_API_BASE:-<missing>}"
echo "Login:    ${PARTGRADE_API_LOGIN:-<missing>}"
echo "Host match:  $([[ "${PARTGRADE_API_BASE:-}" == "${EXPECTED_HOST}" ]] && echo YES || echo NO)"
echo "Login match: $([[ "${PARTGRADE_API_LOGIN:-}" == "${EXPECTED_LOGIN}" ]] && echo YES || echo NO)"
echo "Stored MD5 format: $([[ "${PARTGRADE_API_PASSWORD_MD5:-}" =~ ^[a-fA-F0-9]{32}$ ]] && echo OK || echo BAD)"

read -r -s -p "PartGrade password for one-time local verification: " CHECK_PASSWORD
echo
CHECK_MD5="$(printf '%s' "${CHECK_PASSWORD}" | md5sum | awk '{print $1}')"
unset CHECK_PASSWORD
if [[ "${CHECK_MD5,,}" == "${PARTGRADE_API_PASSWORD_MD5,,}" ]]; then
  echo "Password/hash match: YES"
else
  echo "Password/hash match: NO"
fi
unset CHECK_MD5

echo -n "Outbound IPv4: "
curl -4 -fsS https://api.ipify.org || true
echo

echo
echo "Backend service:"
systemctl is-active zapformat-api || true
echo "Git HEAD: $(git -C /opt/zapformat rev-parse --short HEAD 2>/dev/null || echo unknown)"

echo
echo "Direct ABCP checks (no frontend involved):"
node - <<'NODE'
const base=String(process.env.PARTGRADE_API_BASE||"").replace(/\/+$/,"");
const login=String(process.env.PARTGRADE_API_LOGIN||"");
const psw=String(process.env.PARTGRADE_API_PASSWORD_MD5||"");

async function req(path,params={}){
  const u=new URL(path,base+"/");
  u.searchParams.set("userlogin",login);
  u.searchParams.set("userpsw",psw);
  for(const [k,v] of Object.entries(params)) u.searchParams.set(k,String(v));
  const r=await fetch(u,{headers:{Accept:"application/json"}});
  const t=await r.text();
  let d={}; try{ d=t?JSON.parse(t):{} }catch{}
  return {status:r.status,data:d};
}

(async()=>{
  const info=await req("user/info");
  console.log("user/info:",info.status,{
    id:info.data?.id,
    code:info.data?.code,
    name:info.data?.name,
    organization:info.data?.organization,
    filialId:info.data?.filialId
  });

  const brands=await req("search/brands/",{number:"PRS3420"});
  console.log("search/brands PRS3420:",brands.status,
    Array.isArray(brands.data) ? "count="+brands.data.length :
    (brands.data && typeof brands.data==="object" ? "keys="+Object.keys(brands.data).join(",") : ""));

  const articles=await req("search/articles/",{number:"PRS3420",brand:"PATRON"});
  console.log("search/articles PRS3420/PATRON:",articles.status,{
    errorCode:articles.data?.errorCode,
    errorMessage:articles.data?.errorMessage
  });
})().catch(e=>{console.error("check failed:",e.message);process.exit(3)});
NODE

echo
echo "=== Verification complete ==="
