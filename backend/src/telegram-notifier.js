"use strict";

const https = require("node:https");
const TELEGRAM_API = "https://api.telegram.org";
const TELEGRAM_FALLBACK_IPS = String(process.env.ZAPFORMAT_TELEGRAM_FALLBACK_IPS || "149.154.167.220")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

function botToken() {
  return String(process.env.ZAPFORMAT_TELEGRAM_BOT_TOKEN || "").trim();
}
function ownerChatId() {
  return String(process.env.ZAPFORMAT_TELEGRAM_OWNER_CHAT_ID || "").trim();
}
function pairingCode() {
  return String(process.env.ZAPFORMAT_TELEGRAM_PAIRING_CODE || "").trim();
}
function configured() { return Boolean(botToken()); }
function connected() { return Boolean(botToken() && ownerChatId()); }

function directTelegramRequest(ip, path, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload || {});
    const request = https.request({
      host: ip,
      port: 443,
      servername: "api.telegram.org",
      family: 4,
      path,
      method: "POST",
      headers: {
        Host: "api.telegram.org",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Content-Length": Buffer.byteLength(body)
      },
      timeout: 12000
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        let data = {};
        try { data = JSON.parse(raw); } catch {}
        resolve({ status: response.statusCode || 0, ok: (response.statusCode || 0) >= 200 && (response.statusCode || 0) < 300, data });
      });
    });
    request.on("timeout", () => request.destroy(Object.assign(new Error("telegram_timeout"), { code: "ETIMEDOUT" })));
    request.on("error", reject);
    request.end(body);
  });
}

async function telegramCall(method, payload = {}, tokenOverride = null) {
  const token = String(tokenOverride || botToken()).trim();
  if (!token) {
    const error = new Error("telegram_not_configured");
    error.code = "telegram_not_configured";
    throw error;
  }

  const path = "/bot" + token + "/" + method;
  let status = 0;
  let data = {};
  let networkError = null;

  try {
    const response = await fetch(TELEGRAM_API + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000)
    });
    status = response.status;
    data = await response.json().catch(() => ({}));
  } catch (cause) {
    networkError = cause;
  }

  if (networkError) {
    for (const ip of TELEGRAM_FALLBACK_IPS) {
      try {
        const response = await directTelegramRequest(ip, path, payload);
        status = response.status;
        data = response.data;
        networkError = null;
        break;
      } catch (cause) {
        networkError = cause;
      }
    }
  }

  if (networkError) {
    const error = new Error("telegram_unavailable");
    error.code = "telegram_unavailable";
    error.cause = networkError;
    throw error;
  }

  if (status < 200 || status >= 300 || data?.ok !== true) {
    const error = new Error("telegram_api_error");
    error.code = "telegram_api_error";
    error.status = status;
    error.telegram_error_code = data?.error_code || null;
    throw error;
  }
  return data.result;
}

async function getMe() { return telegramCall("getMe"); }
async function getMeForToken(token) { return telegramCall("getMe", {}, token); }

async function discoverPairedChat() {
  const code = pairingCode();
  if (!code) {
    const error = new Error("telegram_pairing_code_missing");
    error.code = "telegram_pairing_code_missing";
    throw error;
  }
  const updates = await telegramCall("getUpdates", {
    timeout: 0,
    limit: 100,
    allowed_updates: ["message"]
  });
  const expected = "/start " + code;
  const matches = (Array.isArray(updates) ? updates : [])
    .map((update) => update?.message)
    .filter((message) =>
      message?.chat?.type === "private" &&
      String(message?.text || "").trim() === expected
    );
  const message = matches[matches.length - 1];
  if (!message?.chat?.id) return null;
  return {
    chat_id: String(message.chat.id),
    first_name: String(message.chat.first_name || "").slice(0, 120),
    username: String(message.chat.username || "").slice(0, 120)
  };
}

function cleanLine(value, fallback = "—") {
  const text = String(value ?? "").replace(/[\r\n]+/g, " ").trim();
  return text || fallback;
}
function rub(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(amount) + " ₽";
}
function supplyLabel(supplier = {}, test = false) {
  if (test || supplier?.state === "test_only") {
    return { icon: "🧪", text: "PartGrade: тест — не отправляется" };
  }
  if (supplier?.submitted === true || supplier?.state === "submitted") {
    return { icon: "✅", text: "PartGrade: отправлен" };
  }
  if (supplier?.state === "ready_to_submit") {
    return { icon: "⏳", text: "PartGrade: ожидает отправки" };
  }
  if (["submit_failed", "configuration_required", "manual_required"].includes(String(supplier?.state || ""))) {
    return { icon: "⚠️", text: "PartGrade: требует внимания" };
  }
  return { icon: "•", text: "PartGrade: статус не определён" };
}

function supplyReason(value) {
  const reason = String(value || "").trim();
  const labels = {
    database_not_configured: "база данных недоступна",
    order_not_found: "заказ не найден",
    test_order_blocked: "тестовый заказ",
    order_items_missing: "нет позиций заказа",
    offer_identity_missing: "не хватает идентификатора предложения поставщика",
    supplier_order_not_created: "поставщик не создал заказ",
    supplier_submit_failed: "ошибка отправки поставщику"
  };
  return labels[reason] || reason.replace(/_/g, " ");
}

function orderMessage({ order, items = [], test = false, supplier = {} }) {
  const lines = [];
  const orderNumber = cleanLine(order?.order_number || order?.id);
  const visible = Array.isArray(items) ? items.slice(0, 12) : [];
  const totalItems = (Array.isArray(items) ? items : []).reduce((sum, item) => sum + Number(item?.quantity || 1), 0);

  lines.push(test ? "🧪 ТЕСТОВЫЙ ЗАКАЗ · ZF-" + orderNumber : "🟠 НОВЫЙ ЗАКАЗ · ZF-" + orderNumber);
  lines.push(cleanLine(order?.recipient_name, "Клиент") + " · " + cleanLine(order?.recipient_phone));
  lines.push(totalItems + " шт. · " + rub(order?.total_amount));
  lines.push("");

  visible.forEach((item, index) => {
    const title = [item?.brand, item?.article].filter(Boolean).join(" ");
    const quantity = Number(item?.quantity || 1);
    const lineTotal = Number(item?.unit_price || 0) * quantity;
    lines.push((index + 1) + ". " + cleanLine(title, "Позиция") + " × " + quantity + " — " + rub(lineTotal));
    if (item?.description) lines.push("   " + cleanLine(item.description));
    if (Number.isFinite(Number(item?.delivery_days))) {
      const days = Math.max(0, Number(item.delivery_days));
      lines.push("   срок: " + days + " д.");
    }
  });
  if (items.length > visible.length) lines.push("… ещё " + (items.length - visible.length) + " поз.");

  lines.push("");
  const supply = supplyLabel(supplier, test);
  lines.push(supply.icon + " " + supply.text);

  const supplierOrders = [...new Set(
    (Array.isArray(supplier?.orders) ? supplier.orders : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  )];
  if (supplierOrders.length) {
    lines.push("Заказ поставщика: " + supplierOrders.map((number) => "№" + number).join(", "));
  }
  if (supplier?.reason && supplier?.submitted !== true) {
    lines.push("Причина: " + supplyReason(supplier.reason));
  }

  return lines.join("\n").slice(0, 3900);
}

function multipartBody(fields, file) {
  const boundary = "----ZapFormat" + Date.now().toString(16) + Math.random().toString(16).slice(2);
  const parts = [];
  const push = (value) => parts.push(Buffer.isBuffer(value) ? value : Buffer.from(String(value), "utf8"));
  for (const [name, value] of Object.entries(fields || {})) {
    if (value == null) continue;
    push("--" + boundary + "\r\n");
    push('Content-Disposition: form-data; name="' + name + '"\r\n\r\n');
    push(String(value));
    push("\r\n");
  }
  push("--" + boundary + "\r\n");
  push('Content-Disposition: form-data; name="' + file.field + '"; filename="' + file.filename.replace(/"/g, "") + '"\r\n');
  push("Content-Type: " + (file.contentType || "application/octet-stream") + "\r\n\r\n");
  push(file.buffer);
  push("\r\n--" + boundary + "--\r\n");
  return { boundary, body: Buffer.concat(parts) };
}

function directTelegramMultipart(ip, path, fields, file) {
  return new Promise((resolve, reject) => {
    const { boundary, body } = multipartBody(fields, file);
    const request = https.request({
      host: ip, port: 443, servername: "api.telegram.org", family: 4,
      path, method: "POST",
      headers: {
        Host: "api.telegram.org",
        "Content-Type": "multipart/form-data; boundary=" + boundary,
        "Content-Length": body.length,
        Accept: "application/json"
      },
      timeout: 15000
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        let data = {};
        try { data = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch {}
        resolve({ status: response.statusCode || 0, data });
      });
    });
    request.on("timeout", () => request.destroy(Object.assign(new Error("telegram_timeout"), { code: "ETIMEDOUT" })));
    request.on("error", reject);
    request.end(body);
  });
}

async function telegramDocument(buffer, filename, caption = "") {
  const token = botToken();
  const chatId = ownerChatId();
  if (!token || !chatId) return { sent: false, reason: "telegram_not_connected" };
  const path = "/bot" + token + "/sendDocument";
  let networkError = null;
  let status = 0;
  let data = {};
  try {
    const form = new FormData();
    form.append("chat_id", chatId);
    if (caption) form.append("caption", String(caption).slice(0, 1000));
    form.append("document", new Blob([buffer], { type: "application/pdf" }), filename);
    const response = await fetch(TELEGRAM_API + path, { method: "POST", body: form, signal: AbortSignal.timeout(15000) });
    status = response.status;
    data = await response.json().catch(() => ({}));
  } catch (cause) { networkError = cause; }

  if (networkError) {
    for (const ip of TELEGRAM_FALLBACK_IPS) {
      try {
        const response = await directTelegramMultipart(ip, path, { chat_id: chatId, caption }, {
          field: "document", filename, contentType: "application/pdf", buffer
        });
        status = response.status;
        data = response.data;
        networkError = null;
        break;
      } catch (cause) { networkError = cause; }
    }
  }
  if (networkError || status < 200 || status >= 300 || data?.ok !== true) {
    const error = new Error(networkError ? "telegram_unavailable" : "telegram_api_error");
    error.code = networkError ? "telegram_unavailable" : "telegram_api_error";
    throw error;
  }
  return { sent: true, message_id: data.result?.message_id || null };
}

async function sendOwnerMessage(text, extra = {}) {
  const chatId = ownerChatId();
  if (!connected()) return { sent: false, reason: "telegram_not_connected" };
  const result = await telegramCall("sendMessage", {
    chat_id: chatId,
    text: String(text || "").slice(0, 4000),
    disable_web_page_preview: true,
    ...extra
  });
  return { sent: true, message_id: result?.message_id || null };
}
async function notifyOwnerOrderCreated(payload) {
  const caption = orderMessage(payload);
  if (Buffer.isBuffer(payload?.invoice_pdf) && payload.invoice_pdf.length) {
    const invoice = await telegramDocument(
      payload.invoice_pdf,
      payload.invoice_filename || ("ZapFormat-ZF-" + cleanLine(payload?.order?.order_number || payload?.order?.id) + ".pdf"),
      caption
    );
    return { sent: invoice.sent === true, message_id: invoice.message_id || null, invoice };
  }
  return sendOwnerMessage(caption);
}

module.exports = {
  configured,
  connected,
  pairingCode,
  getMe,
  getMeForToken,
  discoverPairedChat,
  sendOwnerMessage,
  telegramDocument,
  notifyOwnerOrderCreated,
  orderMessage
};
