"use strict";

const DEFAULT_BASE = "https://auto-complekt.public.api.abcp.ru";
const DEFAULT_TIMEOUT_MS = 12000;

class PartGradeError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "PartGradeError";
    this.code = options.code || "partgrade_error";
    this.status = options.status || null;
    this.upstreamCode = options.upstreamCode ?? null;
    this.upstreamMessage = options.upstreamMessage ?? null;
    this.cause = options.cause;
  }
}

function normalizeBase(value) {
  return String(value || DEFAULT_BASE).trim().replace(/\/+$/, "");
}

function normalizeRows(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
}

function createPartGradeClient({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") throw new Error("fetch implementation is required");

  const baseUrl = normalizeBase(env.PARTGRADE_API_BASE);
  const userlogin = String(env.PARTGRADE_API_LOGIN || "").trim();
  const userpsw = String(env.PARTGRADE_API_PASSWORD_MD5 || "").trim().toLowerCase();
  const timeoutMs = Math.max(1000, Number(env.PARTGRADE_API_TIMEOUT_MS || DEFAULT_TIMEOUT_MS));

  function configured() {
    return Boolean(baseUrl && userlogin && /^[a-f0-9]{32}$/.test(userpsw));
  }

  async function request(path, params = {}) {
    if (!configured()) {
      throw new PartGradeError("PartGrade credentials are not configured", {
        code: "partgrade_not_configured"
      });
    }

    const url = new URL(path.replace(/^\/+/, ""), baseUrl + "/");
    url.searchParams.set("userlogin", userlogin);
    url.searchParams.set("userpsw", userpsw);

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetchImpl(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal
      });
    } catch (error) {
      throw new PartGradeError(
        error?.name === "AbortError" ? "PartGrade API timeout" : "PartGrade API network error",
        {
          code: error?.name === "AbortError" ? "partgrade_timeout" : "partgrade_network_error",
          cause: error
        }
      );
    } finally {
      clearTimeout(timer);
    }

    const raw = await response.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch (error) {
      throw new PartGradeError("PartGrade returned invalid JSON", {
        code: "partgrade_invalid_json",
        status: response.status,
        cause: error
      });
    }

    if (!response.ok) {
      throw new PartGradeError("PartGrade request failed", {
        code: "partgrade_http_error",
        status: response.status,
        upstreamCode: data && typeof data === "object" ? (data.errorCode ?? data.code ?? null) : null,
        upstreamMessage: data && typeof data === "object" ? (data.errorMessage ?? data.message ?? null) : null
      });
    }

    return data;
  }

  return {
    baseUrl,
    configured,

    async userInfo() {
      return request("user/info");
    },

    async searchBrands(number) {
      const data = await request("search/brands/", {
        number: String(number || "").trim()
      });

      const seen = new Set();
      return normalizeRows(data)
        .filter((row) => row && typeof row === "object")
        .map((row) => ({
          brand: row.brand ?? null,
          number: row.number ?? null,
          numberFix: row.numberFix ?? null,
          description: row.description ?? null,
          availability: row.availability ?? null
        }))
        .filter((row) => {
          const key = [row.brand, row.number, row.description]
            .map((x) => String(x || "").trim().toUpperCase())
            .join("|");
          if (seen.has(key)) return false;
          seen.add(key);
          return Boolean(row.brand && (row.number || number));
        });
    },

    async searchArticles(number, brand) {
      const data = await request("search/articles/", {
        number: String(number || "").trim(),
        brand: String(brand || "").trim()
      });
      return normalizeRows(data);
    }
  };
}

module.exports = {
  PartGradeError,
  createPartGradeClient
};
