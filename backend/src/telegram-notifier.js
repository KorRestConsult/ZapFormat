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
  const allItems = Array.isArray(items) ? items : [];
  const visible = allItems.slice(0, 5);
  const totalItems = allItems.reduce((sum, item) => sum + Number(item?.quantity || 1), 0);
  const saleTotal = Number(order?.total_amount || allItems.reduce(
    (sum, item) => sum + Number(item?.unit_price || 0) * Number(item?.quantity || 1), 0
  ));
  const costComplete = allItems.length > 0 && allItems.every((item) => {
    const value = Number(item?.purchase_price);
    return item?.purchase_price !== null && item?.purchase_price !== undefined && Number.isFinite(value) && value >= 0;
  });
  const purchaseTotal = costComplete
    ? allItems.reduce((sum, item) => sum + Number(item.purchase_price) * Number(item?.quantity || 1), 0)
    : null;
  const grossProfit = costComplete ? saleTotal - purchaseTotal : null;
  const marginPercent = costComplete && saleTotal > 0 ? (grossProfit / saleTotal) * 100 : null;
  const divider = "────────────────";

  lines.push(test ? "🧪 ZAPFORMAT · TEST · ZF-" + orderNumber : "🟠 ZAPFORMAT · ZF-" + orderNumber);
  lines.push(test ? "Тестовый заказ" : "Новый заказ");
  lines.push(divider);
  lines.push("👤 " + cleanLine(order?.recipient_name, "Клиент") + " · " + cleanLine(order?.recipient_phone));
  lines.push(totalItems + " шт. · " + rub(saleTotal));
  lines.push("");

  lines.push("💰 ЭКОНОМИКА");
  if (costComplete) {
    lines.push("Закупка: " + rub(purchaseTotal));
    lines.push("Клиент: " + rub(saleTotal));
    lines.push("Заработок: " + rub(grossProfit));
    lines.push("Маржа: " + marginPercent.toFixed(1).replace(".", ",") + "%");
    lines.push("Чистыми: — расходы ещё не учтены");
  } else {
    lines.push("Закупка: неполная себестоимость");
    lines.push("Клиент: " + rub(saleTotal));
    lines.push("Заработок: — до полной себестоимости");
  }
  lines.push(divider);

  lines.push("📦 ЗАКАЗ");
  visible.forEach((item, index) => {
    const title = [item?.brand, item?.article].filter(Boolean).join(" ");
    const quantity = Number(item?.quantity || 1);
    const lineTotal = Number(item?.unit_price || 0) * quantity;
    lines.push((index + 1) + ". " + cleanLine(title, "Позиция") + " × " + quantity);
    if (item?.description) lines.push("   " + cleanLine(item.description));
    lines.push("   " + rub(lineTotal) + (Number.isFinite(Number(item?.delivery_days)) ? " · " + Math.max(0, Number(item.delivery_days)) + " д." : ""));
  });
  if (allItems.length > visible.length) lines.push("… ещё " + (allItems.length - visible.length) + " поз.");
  lines.push(divider);

  const supply = supplyLabel(supplier, test);
  lines.push(supply.icon + " " + supply.text);
  const supplierOrders = [...new Set(
    (Array.isArray(supplier?.orders) ? supplier.orders : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  )];
  if (supplierOrders.length) lines.push("Поставщик: " + supplierOrders.map((number) => "№" + number).join(", "));
  if (supplier?.reason && supplier?.submitted !== true) lines.push("Причина: " + supplyReason(supplier.reason));

  return lines.join("\n").slice(0, 1000);
}

function orderKeyboard({ order, supplier = {} }) {
  const orderId = String(order?.id || "").trim();
  const phone = String(order?.recipient_phone || "").replace(/[^\d+]/g, "");
  const supplierOrders = [...new Set(
    (Array.isArray(supplier?.orders) ? supplier.orders : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  )];
  const adminBase = "https://korrestconsult.github.io/ZapFormat/admin/";
  const rows = [];

  if (orderId || phone) {
    const row = [];
    if (orderId) row.push({ text: "📋 Открыть заказ", url: adminBase + "?order=" + encodeURIComponent(orderId) });
    if (phone) row.push({ text: "👤 Клиент", url: "tg://resolve?phone=" + encodeURIComponent(phone) + "&profile" });
    if (row.length) rows.push(row);
  }

  const second = [];
  if (supplierOrders.length) {
    second.push({
      text: "📦 PartGrade",
      url: "https://partgrade.com/orders/?id_order=" + encodeURIComponent(supplierOrders[0])
    });
  } else {
    second.push({ text: "📦 PartGrade", url: "https://partgrade.com/orders/?id_order=-1" });
  }
  if (orderId) {
    second.push({
      text: "↻ Обновить данные",
      url: adminBase + "?order=" + encodeURIComponent(orderId) + "&refresh=1"
    });
  }
  rows.push(second);
  return { inline_keyboard: rows.filter((row) => row.length) };
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
      hostname: "api.telegram.org",
      port: 443,
      servername: "api.telegram.org",
      family: 4,
      lookup(_hostname, options, callback) {
        if (options?.all) return callback(null, [{ address: ip, family: 4 }]);
        return callback(null, ip, 4);
      },
      path,
      method: "POST",
      headers: {
        Host: "api.telegram.org",
        "Content-Type": "multipart/form-data; boundary=" + boundary,
        "Content-Length": body.length,
        Accept: "application/json"
      },
      timeout: 20000
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

async function telegramDocument(buffer, filename, caption = "", replyMarkup = null) {
  const token = botToken();
  const chatId = ownerChatId();
  if (!token || !chatId) return { sent: false, reason: "telegram_not_connected" };
  const safeCaption = String(caption || "").slice(0, 1000);
  const path = "/bot" + token + "/sendDocument";
  let networkError = null;
  let status = 0;
  let data = {};
  let failureDetail = null;
  try {
    const form = new FormData();
    form.append("chat_id", chatId);
    if (safeCaption) form.append("caption", safeCaption);
    if (replyMarkup) form.append("reply_markup", JSON.stringify(replyMarkup));
    form.append("document", new Blob([buffer], { type: "application/pdf" }), filename);
    const response = await fetch(TELEGRAM_API + path, { method: "POST", body: form, signal: AbortSignal.timeout(15000) });
    status = response.status;
    data = await response.json().catch(() => ({}));
  } catch (cause) {
    networkError = cause;
    failureDetail = { stage: "standard", code: cause?.code || cause?.name || "fetch_failed" };
  }

  if (networkError) {
    for (const ip of TELEGRAM_FALLBACK_IPS) {
      try {
        const response = await directTelegramMultipart(ip, path, {
          chat_id: chatId,
          caption: safeCaption,
          ...(replyMarkup ? { reply_markup: JSON.stringify(replyMarkup) } : {})
        }, {
          field: "document", filename, contentType: "application/pdf", buffer
        });
        status = response.status;
        data = response.data;
        networkError = null;
        failureDetail = null;
        break;
      } catch (cause) {
        networkError = cause;
        failureDetail = { stage: "direct", code: cause?.code || cause?.name || "direct_failed" };
      }
    }
  }
  if (networkError || status < 200 || status >= 300 || data?.ok !== true) {
    const error = new Error(networkError ? "telegram_unavailable" : "telegram_api_error");
    error.code = networkError ? "telegram_unavailable" : "telegram_api_error";
    error.detail = failureDetail || { stage: "api", status, telegram_error_code: data?.error_code || null };
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
  const keyboard = orderKeyboard(payload);
  if (Buffer.isBuffer(payload?.invoice_pdf) && payload.invoice_pdf.length) {
    const invoice = await telegramDocument(
      payload.invoice_pdf,
      payload.invoice_filename || ("ZapFormat-ZF-" + cleanLine(payload?.order?.order_number || payload?.order?.id) + ".pdf"),
      caption,
      keyboard
    );
    return { sent: invoice.sent === true, message_id: invoice.message_id || null, invoice };
  }
  return sendOwnerMessage(caption, { reply_markup: keyboard });
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
