"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

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
  const cacheDir = String(
    options.cacheDir !== undefined
      ? options.cacheDir
      : (process.env.FAPI_CACHE_DIR || "/var/lib/zapformat/fapi-cache")
  ).trim();

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


  function persistentCachePath(key) {
    if (!cacheDir) return null;
    const digest = crypto.createHash("sha256").update(key).digest("hex");
    return path.join(cacheDir, digest + ".json");
  }

  async function readPersistentCache(key, now) {
    const file = persistentCachePath(key);
    if (!file) return null;
    try {
      const saved = JSON.parse(await fs.readFile(file, "utf8"));
      if (!saved || Number(saved.expires_at || 0) <= now) {
        await fs.unlink(file).catch(() => {});
        return null;
      }
      return saved;
    } catch {
      return null;
    }
  }

  async function writePersistentCache(key, value, expiresAt) {
    const file = persistentCachePath(key);
    if (!file) return;
    try {
      await fs.mkdir(cacheDir, { recursive: true, mode: 0o700 });
      const temp = file + "." + process.pid + ".tmp";
      await fs.writeFile(
        temp,
        JSON.stringify({ expires_at: expiresAt, value }),
        { mode: 0o600 }
      );
      await fs.rename(temp, file);
    } catch {
      // Cache persistence is an optimization; FAPI requests must still work
      // when the runtime filesystem is read-only or unavailable.
    }
  }

  async function getCached(endpoint, params = {}, ttlMs = 6 * 60 * 60 * 1000) {
    const key = endpoint + "?" + new URLSearchParams(
      Object.entries(params)
        .filter(([,value]) => value !== undefined && value !== null && value !== "")
        .map(([name,value]) => [name, String(value)])
    ).toString();
    const now = Date.now();

    const hit = cache.get(key);
    if (hit && hit.expires_at > now) return hit.value;

    const saved = await readPersistentCache(key, now);
    if (saved) {
      cache.set(key, saved);
      return saved.value;
    }

    const value = await get(endpoint, params);
    const expiresAt = now + ttlMs;
    const item = { value, expires_at: expiresAt };
    cache.set(key, item);
    await writePersistentCache(key, value, expiresAt);

    if (cache.size > 500) {
      for (const [cacheKey, cached] of cache) {
        if (cached.expires_at <= now) cache.delete(cacheKey);
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
    modifications: (modelId) => getCached("catalogList/dt/modificationList", { mi: modelId }, 30 * 24 * 60 * 60 * 1000),
    tree: (modificationId) => getCached("catalogList/dt/treeList", { mi: modificationId }, 30 * 24 * 60 * 60 * 1000),
    products: (modificationId, nodeId) => getCached("catalogList/dt/productList", { modi: modificationId, nodei: nodeId }, 7 * 24 * 60 * 60 * 1000),
    oem: (modificationId, nodeId) => getCached("catalogList/dt/productListOEM", {
      modi: modificationId,
      nodei: nodeId,
      strict: 1
    }, 7 * 24 * 60 * 60 * 1000),
    image,
    analogs: (article, manufacturerId) => getCached("analogList", {
      n: article,
      mfi: manufacturerId || undefined,
      r: 0
    }, 7 * 24 * 60 * 60 * 1000)
  };
}

module.exports = { FapiError, createFapiClient };
