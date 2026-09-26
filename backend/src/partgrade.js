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

  async function request(path, params = {}, options = {}) {
    assertConfigured();

    const method = String(options.method || "GET").toUpperCase();
    const url = new URL(path, baseUrl + "/");
    const allParams = {
      userlogin,
      userpsw,
      ...params
    };

    const headers = {
      Accept: "application/json"
    };
    const fetchOptions = {
      method,
      headers
    };

    if (method === "GET") {
      for (const [key, value] of Object.entries(allParams)) {
        if (value === undefined || value === null || value === "") continue;
        url.searchParams.set(key, String(value));
      }
    } else {
      const body = new URLSearchParams();
      for (const [key, value] of Object.entries(allParams)) {
        if (value === undefined || value === null || value === "") continue;
        body.append(key, String(value));
      }
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      fetchOptions.body = body.toString();
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    fetchOptions.signal = controller.signal;

    let response;
    try {
      response = await fetchImpl(url, fetchOptions);
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
      const upstreamCode =
        data && typeof data === "object"
          ? (data.errorCode ?? data.code ?? null)
          : null;
      const upstreamMessage =
        data && typeof data === "object"
          ? (data.errorMessage ?? data.message ?? null)
          : null;

      throw new PartGradeError("PartGrade API request failed", {
        code: "partgrade_http_error",
        status: response.status,
        upstreamCode,
        upstreamMessage
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
    searchBrands(number, options = {}) {
      return request("search/brands/", {
        number: String(number || "").trim(),
        locale: "ru_RU",
        useOnlineStocks: options.useOnlineStocks === false ? 0 : 1
      });
    },
    searchTips(number) {
      return request("search/tips", {
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
    },
    searchBatch(items) {
      const params = {};
      (Array.isArray(items) ? items : []).slice(0, 100).forEach((item, index) => {
        params[`search[${index}][number]`] = String(item?.number || "").trim();
        params[`search[${index}][brand]`] = String(item?.brand || "").trim();
      });
      return request("search/batch", params, { method: "POST" });
    },
    basketContent() {
      return request("basket/content");
    },
    paymentMethods() {
      return request("basket/paymentMethods");
    },
    shipmentMethods() {
      return request("basket/shipmentMethods");
    },
    shipmentAddresses() {
      return request("basket/shipmentAddresses");
    },
    orderStatuses() {
      return request("orders/statuses");
    },
    orders(params = {}) {
      return request("orders/", {
        skip: params.skip ?? 0,
        limit: params.limit ?? 50
      });
    },
    tsCartCreate(item = {}) {
      return request("ts/cart/create", {
        brand: String(item.brand || "").trim(),
        number: String(item.number || "").trim(),
        quantity: Number(item.quantity || 1),
        supplierCode: String(item.supplierCode || "").trim(),
        itemKey: String(item.itemKey || "").trim()
      }, { method: "POST" });
    },
    tsCartList(params = {}) {
      return request("ts/cart/list", {
        positionIds: params.positionIds || null,
        skip: params.skip ?? 0,
        limit: params.limit ?? 100
      });
    },
    tsCartDeletePositions(positionIds = []) {
      const params = {};
      (Array.isArray(positionIds) ? positionIds : []).slice(0, 100).forEach((id, index) => {
        params[`positionIds[${index}]`] = id;
      });
      return request("ts/cart/deletePositions", params, { method: "POST" });
    },
    tsCartClear() {
      return request("ts/cart/clear", {}, { method: "POST" });
    },
    tsOrdersCreateByCart({ positionIds = [], number = null, externalId = null, delivery = null } = {}) {
      const params = {};
      (Array.isArray(positionIds) ? positionIds : []).slice(0, 100).forEach((id, index) => {
        params[`positions[${index}]`] = id;
      });
      if (number) params.number = String(number);
      if (externalId) params.externalId = String(externalId);
      if (delivery && typeof delivery === "object") {
        if (delivery.methodId) params["delivery[methodId]"] = delivery.methodId;
        if (delivery.address) params["delivery[meetData][address]"] = delivery.address;
        if (delivery.person) params["delivery[meetData][person]"] = delivery.person;
        if (delivery.contact) params["delivery[meetData][contact]"] = delivery.contact;
        if (delivery.comment) params["delivery[meetData][comment]"] = delivery.comment;
      }
      return request("ts/orders/createByCart", params, { method: "POST" });
    },
    tsOrderGet(orderId) {
      return request("ts/orders/get", { orderId });
    },
    tsOrderRefuse(orderId) {
      return request("ts/orders/refuse", { orderId }, { method: "POST" });
    }
  };
}

module.exports = {
  PartGradeError,
  createPartGradeClient
};
