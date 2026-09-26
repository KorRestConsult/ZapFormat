#!/usr/bin/env bash
set -Eeuo pipefail

ENV_FILE="/etc/zapformat/zapformat-api.env"
LOGIN="Korobicin@live.com"
BASE="https://auto-complekt.public.api.abcp.ru"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run from root Timeweb console."
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ENV file missing: ${ENV_FILE}"
  exit 2
fi

BACKUP="${ENV_FILE}.bak.$(date +%Y%m%d-%H%M%S)"
cp -a "${ENV_FILE}" "${BACKUP}"

read -r -s -p "Current PartGrade password: " PASSWORD
echo
PASSWORD_MD5="$(printf '%s' "${PASSWORD}" | md5sum | awk '{print $1}')"
unset PASSWORD

TMP="$(mktemp)"
grep -vE '^(PARTGRADE_API_BASE|PARTGRADE_API_LOGIN|PARTGRADE_API_PASSWORD_MD5)=' "${ENV_FILE}" > "${TMP}" || true
{
  cat "${TMP}"
  printf 'PARTGRADE_API_BASE=%s\n' "${BASE}"
  printf 'PARTGRADE_API_LOGIN=%s\n' "${LOGIN}"
  printf 'PARTGRADE_API_PASSWORD_MD5=%s\n' "${PASSWORD_MD5}"
} > "${ENV_FILE}"
rm -f "${TMP}"
unset PASSWORD_MD5

chmod 600 "${ENV_FILE}"
systemctl restart zapformat-api
sleep 2

set -a
source "${ENV_FILE}"
set +a

echo "Credentials updated."
echo "Backup: ${BACKUP}"
echo "Service: $(systemctl is-active zapformat-api || true)"
echo "Login: ${PARTGRADE_API_LOGIN}"
echo "Outbound IPv4: $(curl -4 -fsS https://api.ipify.org || true)"

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
    name:info.data?.name,
    organization:info.data?.organization,
    filialId:info.data?.filialId,
    errorCode:info.data?.errorCode,
    errorMessage:info.data?.errorMessage
  });

  const brands=await req("search/brands/",{number:"PRS3420"});
  console.log("search/brands PRS3420:",brands.status,
    Array.isArray(brands.data) ? "count="+brands.data.length :
    (brands.data && typeof brands.data==="object" ? "keys="+Object.keys(brands.data).join(",") : ""));

  const articles=await req("search/articles/",{number:"PRS3420",brand:"PATRON"});
  const count=Array.isArray(articles.data) ? articles.data.length : null;
  console.log("search/articles PRS3420/PATRON:",articles.status,{
    count,
    errorCode:articles.data?.errorCode,
    errorMessage:articles.data?.errorMessage
  });

  if (articles.status===200 && Array.isArray(articles.data) && articles.data.length) {
    const x=articles.data[0];
    console.log("first offer:",{
      brand:x.brand,
      number:x.number,
      price:x.price,
      availability:x.availability,
      deliveryPeriod:x.deliveryPeriod,
      deliveryPeriodMax:x.deliveryPeriodMax
    });
  }
})().catch(e=>{console.error("check failed:",e.message);process.exit(3)});
NODE
