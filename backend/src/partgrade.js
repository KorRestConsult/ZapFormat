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
    if (url.origin !== new URL(baseUrl).origin || url.search || url.hash || url.username || url.password) {
      throw new PartGradeError("Invalid upstream path", { code: "invalid_partgrade_path" });
    }
    const allParams = { ...params, userlogin, userpsw };

    const headers = {
      Accept: "application/json"
    };
    const fetchOptions = {
      method,
      headers,
      redirect: "error"
    };

    if (method === "GET") {
      for (const [key, value] of Object.entries(allParams)) {
        if (value === undefined || value === null || value === "") continue;
        url.searchParams.set(key, String(value));
      }
    } else if (options.encoding === "json") {
      headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(allParams);
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

  function indexedPositions(items) {
    const params = {};
    (Array.isArray(items) ? items : []).slice(0, 500).forEach((item, index) => {
      const prefix = `positions[${index}]`;
      if (item?.number) params[`${prefix}[number]`] = String(item.number).trim();
      if (item?.brand) params[`${prefix}[brand]`] = String(item.brand).trim();
      if (item?.supplierCode !== undefined && item?.supplierCode !== null) {
        params[`${prefix}[supplierCode]`] = String(item.supplierCode);
      }
      if (item?.itemKey !== undefined && item?.itemKey !== null) {
        params[`${prefix}[itemKey]`] = String(item.itemKey);
      }
      params[`${prefix}[quantity]`] = Math.max(1, Number(item?.quantity || 1));
      if (item?.comment) params[`${prefix}[comment]`] = String(item.comment).slice(0, 500);
    });
    return params;
  }

  return {
    baseUrl,
    configured,
    rawRequest(path, params = {}, options = {}) {
      return request(String(path || "").replace(/^\/+/, ""), params, options);
    },
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
    searchArticles(number, brand, options = {}) {
      return request("search/articles/", {
        ...options,
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
    carbaseManufacturers() {
      return request("carbase/manufacturers", {
        locale: "ru_RU"
      });
    },
    carbaseModels(manufacturerId) {
      return request("carbase/models", {
        manufacturerId: String(manufacturerId || "").trim(),
        locale: "ru_RU"
      });
    },
    carbaseModifications(modelId) {
      return request("carbase/modifications", {
        modelId: String(modelId || "").trim(),
        locale: "ru_RU"
      });
    },
    carbaseModificationInfo(modificationId) {
      return request("carbase/modificationInfo", {
        modificationId: String(modificationId || "").trim(),
        locale: "ru_RU"
      });
    },
    basketContent() {
      return request("basket/content");
    },
    basketOptions() {
      return request("basket/options");
    },
    basketAdd(items, options = {}) {
      return request("basket/add", {
        ...indexedPositions(items),
        basketId: options.basketId
      }, { method: "POST" });
    },
    basketOrder(options = {}) {
      const params = {
        paymentMethod: options.paymentMethod,
        shipmentMethod: options.shipmentMethod,
        shipmentAddress: options.shipmentAddress,
        shipmentOffice: options.shipmentOffice,
        shipmentDate: options.shipmentDate,
        comment: options.comment,
        basketId: options.basketId,
        wholeOrderOnly: options.wholeOrderOnly ?? 1,
        clientOrderNumber: options.clientOrderNumber
      };
      (Array.isArray(options.positionIds) ? options.positionIds : []).forEach((id, index) => {
        params[`positionIds[${index}]`] = String(id);
      });
      return request("basket/order", params, { method: "POST" });
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
    shipmentOffices() {
      return request("basket/shipmentOffices");
    },
    shipmentDates(params = {}) {
      return request("basket/shipmentDates", {
        minDeadlineTime: params.minDeadlineTime,
        maxDeadlineTime: params.maxDeadlineTime,
        shipmentAddress: params.shipmentAddress
      });
    },
    orderStatuses() {
      return request("orders/statuses");
    },
    orderList(orderNumbers = []) {
      const params = {};
      (Array.isArray(orderNumbers) ? orderNumbers : []).slice(0, 500).forEach((number, index) => {
        params[`orders[${index}]`] = String(number);
      });
      return request("orders/list", params);
    },
    orders(params = {}) {
      return request("orders/", {
        skip: params.skip ?? 0,
        limit: params.limit ?? 50,
        format: params.format
      });
    },
    instantOrder(items, options = {}) {
      return request("orders/instant", {
        ...indexedPositions(items),
        paymentMethod: options.paymentMethod,
        shipmentMethod: options.shipmentMethod,
        shipmentAddress: options.shipmentAddress,
        shipmentOffice: options.shipmentOffice,
        shipmentDate: options.shipmentDate,
        comment: options.comment,
        basketId: options.basketId,
        wholeOrderOnly: options.wholeOrderOnly ?? 1,
        clientOrderNumber: options.clientOrderNumber
      }, { method: "POST" });
    },
    cancelOrderPosition(positionId) {
      return request("orders/cancelPosition", {
        positionId: String(positionId || "").trim()
      }, { method: "POST" });
    },
    ordersVersion() {
      return request("orders/version");
    },
    userGarage() {
      return request("user/garage");
    }
  };
}

module.exports = {
  PartGradeError,
  createPartGradeClient
};
