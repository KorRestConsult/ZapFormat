"use strict";

const DEFAULT_BASE = "https://auto-complekt.public.api.abcp.ru";

class PartGradeError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "PartGradeError";
    Object.assign(this, details);
  }
}

function rows(value) {
  if (Array.isArray(value)) return value;
  return value && typeof value === "object" ? Object.values(value) : [];
}

function createPartGradeClient({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const baseUrl = String(env.PARTGRADE_API_BASE || DEFAULT_BASE).trim().replace(/\/+$/, "");
  const userlogin = String(env.PARTGRADE_API_LOGIN || "").trim();
  const userpsw = String(env.PARTGRADE_API_PASSWORD_MD5 || "").trim().toLowerCase();
  const timeoutMs = Math.max(1000, Number(env.PARTGRADE_API_TIMEOUT_MS || 12000));

  function configured() {
    return Boolean(userlogin && /^[a-f0-9]{32}$/.test(userpsw));
  }

  async function get(path, params = {}) {
    if (!configured()) {
      throw new PartGradeError("PartGrade credentials are not configured", {
        code: "partgrade_not_configured"
      });
    }

    const url = new URL(path.replace(/^\/+/, ""), baseUrl + "/");
    url.searchParams.set("userlogin", userlogin);
    url.searchParams.set("userpsw", userpsw);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchImpl(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal
      });
    } catch (cause) {
      throw new PartGradeError(cause?.name === "AbortError" ? "PartGrade timeout" : "PartGrade network error", {
        code: cause?.name === "AbortError" ? "partgrade_timeout" : "partgrade_network_error",
        cause
      });
    } finally {
      clearTimeout(timer);
    }

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (cause) {
      throw new PartGradeError("PartGrade returned invalid JSON", {
        code: "partgrade_invalid_json",
        status: response.status,
        cause
      });
    }

    if (!response.ok) {
      throw new PartGradeError("PartGrade request failed", {
        code: "partgrade_http_error",
        status: response.status,
        upstreamCode: data?.errorCode ?? data?.code ?? null
      });
    }
    return data;
  }

  return {
    baseUrl,
    configured,
    userInfo: () => get("user/info"),
    async searchBrands(number) {
      const data = await get("search/brands/", { number: String(number || "").trim(), useOnlineStocks: 1 });
      return rows(data);
    },
    async searchArticles(number, brand) {
      const data = await get("search/articles/", {
        number: String(number || "").trim(),
        brand: String(brand || "").trim(),
        useOnlineStocks: 1
      });
      return rows(data);
    }
  };
}

module.exports = { PartGradeError, createPartGradeClient };
