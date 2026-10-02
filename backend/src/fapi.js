"use strict";

class FapiError extends Error {
  constructor(code, status, details) {
    super(code);
    this.name = "FapiError";
    this.code = code;
    this.status = status || 500;
    this.details = details || null;
  }
}

function createFapiClient(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const baseUrl = "https://fapi.iisis.ru/fapi/v2";
  const cache = new Map();

  function configured() {
    return Boolean(String(process.env.FAPI_API_KEY || "").trim());
  }

  async function get(path, params = {}) {
    const apiKey = String(process.env.FAPI_API_KEY || "").trim();
    if (!apiKey) throw new FapiError("fapi_not_configured", 503);
    const url = new URL(baseUrl + "/" + String(path || "").replace(/^\/+/, ""));
    for (const [name, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(name, String(value));
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    let response;
    try {
      response = await fetchImpl(url, {
        headers: {
          accept: "application/json",
          authorization: "Bearer " + apiKey
        },
        signal: controller.signal
      });
    } catch (error) {
      throw new FapiError(error?.name === "AbortError" ? "fapi_timeout" : "fapi_unavailable", 503);
    } finally {
      clearTimeout(timeout);
    }

    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text || null; }

    if (!response.ok) {
      throw new FapiError("fapi_http_" + response.status, response.status, body);
    }
    return body;
  }


  async function getCached(path, params = {}, ttlMs = 6 * 60 * 60 * 1000) {
    const key = path + "?" + new URLSearchParams(
      Object.entries(params)
        .filter(([,value]) => value !== undefined && value !== null && value !== "")
        .map(([name,value]) => [name, String(value)])
    ).toString();
    const now = Date.now();
    const hit = cache.get(key);
    if (hit && hit.expires_at > now) return hit.value;
    const value = await get(path, params);
    cache.set(key, { value, expires_at: now + ttlMs });
    if (cache.size > 500) {
      for (const [cacheKey, item] of cache) {
        if (item.expires_at <= now) cache.delete(cacheKey);
      }
    }
    return value;
  }

  async function image(manufacturerId, article, width = 320) {
    const apiKey = String(process.env.FAPI_API_KEY || "").trim();
    if (!apiKey) throw new FapiError("fapi_not_configured", 503);
    const url = new URL(baseUrl + "/imageList");
    url.searchParams.set("mfi", String(manufacturerId));
    url.searchParams.set("n", String(article));
    url.searchParams.set("imgd", "true");
    url.searchParams.set("width", String(Math.max(80, Math.min(900, Number(width || 320)))));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    let response;
    try {
      response = await fetchImpl(url, {
        headers: {
          accept: "image/jpeg",
          authorization: "Bearer " + apiKey
        },
        signal: controller.signal
      });
    } catch (error) {
      throw new FapiError(error?.name === "AbortError" ? "fapi_timeout" : "fapi_unavailable", 503);
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw new FapiError("fapi_http_" + response.status, response.status);
    return {
      body: Buffer.from(await response.arrayBuffer()),
      content_type: response.headers.get("content-type") || "image/jpeg"
    };
  }

  return {
    configured,
    usage: () => get("usage"),
    decodeVin: (vin) => getCached("vin", { vin }, 20 * 60 * 60 * 1000),
    modifications: (modelId) => getCached("catalogList/dt/modificationList", { mi: modelId }, 24 * 60 * 60 * 1000),
    tree: (modificationId) => getCached("catalogList/dt/treeList", { mi: modificationId }, 24 * 60 * 60 * 1000),
    products: (modificationId, nodeId) => getCached("catalogList/dt/productList", { modi: modificationId, nodei: nodeId }, 24 * 60 * 60 * 1000),
    oem: (modificationId, nodeId) => getCached("catalogList/dt/productListOEM", {
      modi: modificationId,
      nodei: nodeId,
      strict: 1
    }, 24 * 60 * 60 * 1000),
    image,
    analogs: (article, manufacturerId) => getCached("analogList", {
      n: article,
      mfi: manufacturerId || undefined,
      r: 0
    }, 24 * 60 * 60 * 1000)
  };
}

module.exports = { FapiError, createFapiClient };
