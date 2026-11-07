"use strict";

// Read-only regional comparison. Never uses the owner's Chrome session or credentials.
// Emex includes original and aftermarket proposals in a single search result page.
// Always match both the manufacturer and the article; never infer authenticity.
const REGION_ID = 40119; // Emex pickup at Ryazan, Chapayeva 61
const TTL_MS = 30 * 60 * 1000;
const FAILURE_TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 250;
const MAX_REQUESTS_PER_HOUR = 40;
const cache = new Map();
let calls = [];

function normalized(value) {
  return String(value || "").normalize("NFKC").toUpperCase().replace(/[^A-ZА-ЯЁ0-9]/g, "");
}
function brandKey(value) {
  const key = normalized(value);
  // Verified naming variant for the same manufacturer.
  return key === "MANNFILTER" ? "MANN" : key;
}
function keyFor(brand, article) {
  return brandKey(brand) + "|" + normalized(article);
}
function validPart(value) {
  return typeof value === "string" && value.length >= 2 && value.length <= 80 &&
    /^[\p{L}\p{N} ._+\/-]+$/u.test(value);
}
function sourceUrl(brand, article) {
  return "https://emex.ru/products/" + encodeURIComponent(article) + "/" +
    encodeURIComponent(brand) + "/" + REGION_ID;
}
function extractState(html) {
  const match = html.match(/<script\b[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) throw new Error("emex_missing_embedded_state");
  const wrapped = JSON.parse(match[1]);
  const state = wrapped?.props?.initialState;
  if (!state) throw new Error("emex_missing_state");
  const detail = (typeof state === "string" ? JSON.parse(state) : state)?.details;
  if (!detail || !Array.isArray(detail.originals)) throw new Error("emex_missing_offers");
  return detail;
}
function chooseOffers(product) {
  const list = (Array.isArray(product?.offers) ? product.offers : [])
    .map(o => ({
      price: Number(o?.displayPrice?.value),
      days: Number(o?.delivery?.value),
      quantity: Number(o?.quantity),
      rating: o?.rating == null ? null : Number(o.rating)
    }))
    .filter(o => Number.isFinite(o.price) && o.price > 0 && Number.isFinite(o.days) &&
      o.days >= 0 && o.days <= 90 && Number.isFinite(o.quantity) && o.quantity >= 1);
  const byPrice = (a, b) => a.price - b.price || a.days - b.days;
  const reasonable = list.filter(o => o.days <= 21);
  const rated = reasonable.filter(o => o.rating != null && o.rating >= 4);
  return {
    visible: reasonable.sort(byPrice)[0] || list.sort(byPrice)[0] || null,
    reliable: rated.sort(byPrice)[0] || null
  };
}
function parseMarketPage(html, brand, article) {
  const details = extractState(html);
  const originalKey = keyFor(brand, article);
  if (!(details.originals || []).some(p => keyFor(p.make, p.detailNum) === originalKey)) {
    throw new Error("emex_article_brand_mismatch");
  }
  const quotes = {};
  for (const part of [...details.originals, ...(details.analogs || [])].slice(0, 250)) {
    if (!validPart(part?.make) || !validPart(part?.detailNum)) continue;
    const identity = keyFor(part.make, part.detailNum);
    if (quotes[identity]) continue;
    const offers = chooseOffers(part);
    if (!offers.visible) continue;
    quotes[identity] = {
      brand: part.make, article: part.detailNum,
      price: offers.visible.price, days: offers.visible.days,
      quantity: offers.visible.quantity, rating: offers.visible.rating,
      minimum_advertised: Number(part?.minPrice?.value) > 0 ? Number(part.minPrice.value) : offers.visible.price,
      reliable: offers.reliable ? {
        price: offers.reliable.price, days: offers.reliable.days,
        quantity: offers.reliable.quantity, rating: offers.reliable.rating
      } : null,
      source_url: sourceUrl(part.make, part.detailNum)
    };
  }
  return { status: "ok", checked_at: new Date().toISOString(), location: "Рязань · Чапаева, 61",
    source: "Emex", original_key: originalKey, quotes };
}
function empty(reason) {
  return { status: reason, checked_at: new Date().toISOString(),
    location: "Рязань · Чапаева, 61", source: "Emex", quotes: {} };
}
async function download(brand, article) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch(sourceUrl(brand, article), {
      method: "GET", signal: controller.signal,
      headers: { "Accept": "text/html", "User-Agent": "Mozilla/5.0 (compatible; ZapFormatMarketCheck/1.0)" }
    });
    if (!response.ok) throw new Error("emex_http_" + response.status);
    const size = Number(response.headers.get("content-length") || 0);
    if (size > 3_000_000) throw new Error("emex_response_too_large");
    const body = await response.text();
    if (body.length > 3_000_000) throw new Error("emex_response_too_large");
    return parseMarketPage(body, brand, article);
  } finally {
    clearTimeout(timeout);
  }
}
function trimCache() {
  while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value);
}
async function getMarketSnapshot(brand, article) {
  if (!validPart(brand) || !validPart(article)) return empty("invalid_query");
  const key = keyFor(brand, article);
  const old = cache.get(key);
  const now = Date.now();
  if (old?.until > now) return old.value || old.promise;
  calls = calls.filter(t => t > now - 3600_000);
  if (calls.length >= MAX_REQUESTS_PER_HOUR) return empty("rate_limited");
  calls.push(now);
  const pending = download(brand, article).catch(() => empty("unavailable"));
  cache.set(key, { promise: pending, until: now + FAILURE_TTL_MS });
  trimCache();
  const result = await pending;
  cache.set(key, { value: result, until: now + (result.status === "ok" ? TTL_MS : FAILURE_TTL_MS) });
  trimCache();
  return result;
}
function retailFromMarket(procurement, ordinaryRetail, quote, enabled, minProfit = 150) {
  if (!enabled || !quote?.reliable) return ordinaryRetail;
  const cost = Number(procurement), marketPrice = Number(quote.reliable.price);
  if (!Number.isFinite(cost) || cost < 0 || !Number.isFinite(marketPrice) || marketPrice <= 0) return ordinaryRetail;
  // Ten-percent reduction, rounded down to ten roubles; never sacrifice minimum margin.
  const proposed = Math.floor((marketPrice * 0.9 + 1e-7) / 10) * 10;
  return proposed >= cost + minProfit ? proposed : ordinaryRetail;
}
module.exports = { REGION_ID, keyFor, validPart, sourceUrl, parseMarketPage, getMarketSnapshot, retailFromMarket };
