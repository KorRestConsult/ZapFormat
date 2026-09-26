#!/usr/bin/env bash
set -Eeuo pipefail

ENV_FILE="${ZAPFORMAT_ENV_FILE:-/etc/zapformat/zapformat-api.env}"
LOCAL_API="${ZAPFORMAT_LOCAL_API:-http://127.0.0.1:3000}"
EXPECTED_HOST="https://auto-complekt.public.api.abcp.ru"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ENV file is missing: ${ENV_FILE}"
  exit 2
fi

set -a
source "${ENV_FILE}"
set +a

if [[ "${PARTGRADE_API_BASE:-}" != "${EXPECTED_HOST}" ]]; then
  echo "FAIL: unexpected PartGrade API host"
  exit 3
fi
if [[ -z "${PARTGRADE_API_LOGIN:-}" ]]; then
  echo "FAIL: PartGrade login is missing in ENV"
  exit 4
fi
if [[ ! "${PARTGRADE_API_PASSWORD_MD5:-}" =~ ^[a-fA-F0-9]{32}$ ]]; then
  echo "FAIL: PartGrade MD5 credential is missing or malformed"
  exit 5
fi

echo "ZapFormat PartGrade verification"
echo "Credentials: present (values hidden)"
echo "Host: OK"

node - "${LOCAL_API}" <<'NODE'
const localApi = process.argv[2].replace(/\/+$/, "");
const base = String(process.env.PARTGRADE_API_BASE || "").replace(/\/+$/, "");
const login = String(process.env.PARTGRADE_API_LOGIN || "");
const psw = String(process.env.PARTGRADE_API_PASSWORD_MD5 || "");
const markup = Math.max(0, Number(process.env.DEFAULT_MARKUP_PERCENT || 15));
const minMarkup = Math.max(0, Number(process.env.MIN_MARKUP_RUB || 0));

function rows(value) {
  if (Array.isArray(value)) return value;
  return value && typeof value === "object" ? Object.values(value) : [];
}
function money(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : null;
}
function customerPrice(p) {
  const n = money(p);
  if (n === null) return null;
  return money(Math.max(n * (1 + markup / 100), n + minMarkup));
}
async function upstream(path, params = {}, method = "GET") {
  const u = new URL(path, base + "/");
  const all = { userlogin: login, userpsw: psw, ...params };
  const opts = { method, headers: { Accept: "application/json" } };
  if (method === "GET") {
    for (const [k,v] of Object.entries(all)) if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, String(v));
  } else {
    const body = new URLSearchParams();
    for (const [k,v] of Object.entries(all)) if (v !== undefined && v !== null && v !== "") body.append(k, String(v));
    opts.headers["Content-Type"] = "application/x-www-form-urlencoded";
    opts.body = body.toString();
  }
  const r = await fetch(u, opts);
  const t = await r.text();
  let data = null;
  try { data = t ? JSON.parse(t) : null; } catch {}
  return { status: r.status, data };
}
async function local(path) {
  const r = await fetch(localApi + path, { headers: { Accept: "application/json" } });
  const t = await r.text();
  let data = null;
  try { data = t ? JSON.parse(t) : null; } catch {}
  return { status: r.status, data };
}
function forbiddenKeyFound(value) {
  const forbidden = /^(purchase|purchase_price|procurement|procurement_price|supplier_price|cost|cost_price|userpsw|password|md5)$/i;
  if (Array.isArray(value)) return value.some(forbiddenKeyFound);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([k,v]) => forbidden.test(k) || forbiddenKeyFound(v));
}

(async () => {
  const info = await upstream("user/info");
  if (info.status !== 200) throw new Error("user/info failed: HTTP " + info.status);
  console.log("1) user/info: OK");

  const brands = await upstream("search/brands/", { number: "PRS3420", useOnlineStocks: 1 });
  if (brands.status !== 200) throw new Error("search/brands PRS3420 failed: HTTP " + brands.status);
  const brandRows = rows(brands.data);
  if (!brandRows.some(x => String(x?.brand || "").toUpperCase() === "PATRON")) {
    throw new Error("PRS3420 does not contain PATRON");
  }
  console.log("2) PRS3420 -> PATRON: OK");

  const articles = await upstream("search/articles/", {
    number: "PRS3420",
    brand: "PATRON",
    locale: "ru_RU"
  });

  if (articles.status === 403 && Number(articles.data?.errorCode) === 103) {
    console.log("3) search/articles: rights are still disabled (HTTP 403 / errorCode 103)");
    process.exit(10);
  }
  if (articles.status !== 200) throw new Error("search/articles failed: HTTP " + articles.status);

  const articleRows = rows(articles.data);
  const upstreamPrices = articleRows.map(x => money(x?.price)).filter(x => x !== null && x > 0);
  if (!upstreamPrices.length) throw new Error("PRS3420 returned no numeric procurement prices");
  const nearExpected = upstreamPrices.some(p => Math.abs(p - 4595) / 4595 <= 0.10);
  console.log("3) PRS3420 real offers: OK; procurement near reference:", nearExpected ? "YES" : "NO/CHANGED");

  const publicOffers = await local("/api/catalog/offers?number=PRS3420&brand=PATRON");
  if (publicOffers.status !== 200) throw new Error("local backend offers failed: HTTP " + publicOffers.status);
  if (forbiddenKeyFound(publicOffers.data)) throw new Error("public response contains a forbidden procurement/credential field");
  const offers = Array.isArray(publicOffers.data?.offers) ? publicOffers.data.offers : [];
  if (!offers.length) throw new Error("public backend returned no offers");

  const expectedPrices = new Set(upstreamPrices.map(customerPrice).filter(x => x !== null).map(String));
  const customerPrices = offers.map(x => money(x?.price)).filter(x => x !== null);
  if (!customerPrices.length) throw new Error("public backend returned no customer prices");
  if (!customerPrices.every(p => expectedPrices.has(String(p)))) {
    throw new Error("one or more customer prices do not match backend markup");
  }
  const purchaseSet = new Set(upstreamPrices.map(String));
  if ((markup > 0 || minMarkup > 0) && customerPrices.some(p => purchaseSet.has(String(p)))) {
    throw new Error("a procurement price appears unchanged in the public response");
  }
  console.log("4) procurement hidden + backend markup: OK");

  const hkDirect = await upstream("search/brands/", { number: "HK0810", useOnlineStocks: 1 });
  if (hkDirect.status !== 200) throw new Error("HK0810 upstream brand search failed");
  const hkUpstream = rows(hkDirect.data);
  const hkPublic = await local("/api/catalog/brands?number=HK0810");
  if (hkPublic.status !== 200) throw new Error("HK0810 backend brand search failed");

  const uniq = xs => new Set(xs.map(x => String(x?.brand || "").trim().toUpperCase()).filter(Boolean));
  const upSet = uniq(hkUpstream);
  const publicSet = uniq(Array.isArray(hkPublic.data?.brands) ? hkPublic.data.brands : []);
  const missing = [...upSet].filter(x => !publicSet.has(x));
  if (missing.length) throw new Error("HK0810 loses manufacturers in backend normalization");
  console.log("5) HK0810 manufacturers preserved: OK; count =", publicSet.size);

  console.log("RESULT: PASS");
})().catch(err => {
  console.error("RESULT: FAIL:", err.message);
  process.exit(1);
});
NODE
