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

  return {
    configured,
    usage: () => get("usage"),
    decodeVin: (vin) => get("vin", { vin }),
    tree: (modificationId) => get("catalogList/dt/treeList", { mi: modificationId }),
    oem: (modificationId, nodeId) => get("catalogList/dt/productListOEM", {
      modi: modificationId,
      nodei: nodeId,
      strict: 1
    }),
    analogs: (article, manufacturerId) => get("analogList", {
      n: article,
      mfi: manufacturerId || undefined,
      r: 0
    })
  };
}

module.exports = { FapiError, createFapiClient };
