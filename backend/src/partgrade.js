"use strict";

const DEFAULT_BASE = "https://auto-complekt.public.api.abcp.ru";
const DEFAULT_TIMEOUT_MS = 12000;

class PartGradeError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "PartGradeError";
    this.code = options.code || "partgrade_error";
    this.status = options.status || null;
    this.cause = options.cause;
  }
}

function cleanBase(value) {
  return String(value || DEFAULT_BASE).trim().replace(/\/+$/, "");
}

function createPartGradeClient(options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const baseUrl = cleanBase(env.PARTGRADE_API_BASE);
  const userlogin = String(env.PARTGRADE_API_LOGIN || "").trim();
  const userpsw = String(env.PARTGRADE_API_PASSWORD_MD5 || "").trim().toLowerCase();
  const timeoutMs = Math.max(1000, Number(env.PARTGRADE_API_TIMEOUT_MS || DEFAULT_TIMEOUT_MS));

  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required");
  }

  function configured() {
    return Boolean(baseUrl && userlogin && /^[a-f0-9]{32}$/i.test(userpsw));
  }

  function assertConfigured() {
    if (!configured()) {
      throw new PartGradeError("PartGrade API credentials are not configured", {
        code: "partgrade_not_configured"
      });
    }
  }

  async function request(path, params = {}) {
    assertConfigured();

    const url = new URL(path, baseUrl + "/");
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
        headers: {
          Accept: "application/json"
        },
        signal: controller.signal
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new PartGradeError("PartGrade API timeout", {
          code: "partgrade_timeout",
          cause: error
        });
      }
      throw new PartGradeError("PartGrade API network error", {
        code: "partgrade_network_error",
        cause: error
      });
    } finally {
      clearTimeout(timer);
    }

    const body = await response.text();
    let data;
    try {
      data = body ? JSON.parse(body) : null;
    } catch (error) {
      throw new PartGradeError("PartGrade API returned invalid JSON", {
        code: "partgrade_invalid_json",
        status: response.status,
        cause: error
      });
    }

    if (!response.ok) {
      throw new PartGradeError("PartGrade API request failed", {
        code: "partgrade_http_error",
        status: response.status
      });
    }

    return data;
  }

  return {
    baseUrl,
    configured,
    userInfo() {
      return request("user/info");
    },
    searchBrands(number) {
      return request("search/brands/", {
        number: String(number || "").trim(),
        locale: "ru_RU"
      });
    },
    searchArticles(number, brand) {
      return request("search/articles/", {
        number: String(number || "").trim(),
        brand: String(brand || "").trim(),
        locale: "ru_RU"
      });
    }
  };
}

module.exports = {
  PartGradeError,
  createPartGradeClient
};
