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
function orderMessage({ order, items = [], test = false }) {
  const lines = [];
  lines.push(test ? "🧪 ТЕСТОВЫЙ ЗАКАЗ" : "🟠 НОВЫЙ ЗАКАЗ ZAPFORMAT");
  lines.push("");
  lines.push("ZF-" + cleanLine(order?.order_number || order?.id));
  lines.push(cleanLine(order?.recipient_name, "Клиент") + " · " + cleanLine(order?.recipient_phone));
  lines.push("");
  const visible = Array.isArray(items) ? items.slice(0, 12) : [];
  visible.forEach((item, index) => {
    const title = [item?.brand, item?.article].filter(Boolean).join(" ");
    lines.push((index + 1) + ". " + cleanLine(title, "Позиция") + " × " + Number(item?.quantity || 1));
    if (item?.description) lines.push("   " + cleanLine(item.description));
  });
  if (items.length > visible.length) lines.push("… ещё " + (items.length - visible.length) + " поз.");
  lines.push("");
  lines.push("Сумма: " + rub(order?.total_amount));
  if (test) lines.push("PartGrade: НЕ ОТПРАВЛЯЕТСЯ");
  return lines.join("\n").slice(0, 3900);
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
  return sendOwnerMessage(orderMessage(payload));
}

module.exports = {
  configured,
  connected,
  pairingCode,
  getMe,
  getMeForToken,
  discoverPairedChat,
  sendOwnerMessage,
  notifyOwnerOrderCreated,
  orderMessage
};
