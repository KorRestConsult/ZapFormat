const crypto = require("node:crypto");

class SmsDeliveryError extends Error {
  constructor(message, code = "sms_send_failed", details = null) {
    super(message);
    this.name = "SmsDeliveryError";
    this.code = code;
    this.details = details;
  }
}

function createOtpCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function otpHash(secret, challengeId, code) {
  return crypto
    .createHmac("sha256", String(secret || ""))
    .update(String(challengeId || ""))
    .update(":")
    .update(String(code || ""))
    .digest("hex");
}

function otpMatches(secret, challengeId, code, expectedHash) {
  const actual = Buffer.from(otpHash(secret, challengeId, code), "hex");
  const expected = Buffer.from(String(expectedHash || ""), "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function smsRuPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length !== 11 || !digits.startsWith("7")) {
    throw new SmsDeliveryError("Unsupported phone number", "invalid_phone");
  }
  return digits;
}

function createSmsRuSender({
  apiId = process.env.SMSRU_API_ID,
  from = process.env.SMSRU_FROM,
  test = String(process.env.SMSRU_TEST || "false") === "true",
  fetchImpl = globalThis.fetch
} = {}) {
  return async function sendVerificationCode({ phone, code }) {
    if (!apiId) {
      throw new SmsDeliveryError("SMS.RU is not configured", "sms_not_configured");
    }
    if (typeof fetchImpl !== "function") {
      throw new SmsDeliveryError("fetch is unavailable");
    }

    const to = smsRuPhone(phone);
    const params = new URLSearchParams({
      api_id: String(apiId),
      to,
      msg: `ZapFormat: код подтверждения ${code}. Никому не сообщайте.`,
      json: "1"
    });
    if (from) params.set("from", String(from));
    if (test) params.set("test", "1");

    let response;
    try {
      response = await fetchImpl("https://sms.ru/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: params
      });
    } catch (error) {
      throw new SmsDeliveryError("SMS provider network error", "sms_send_failed", error?.message);
    }

    const data = await response.json().catch(() => null);
    const item = data?.sms?.[to];
    if (!response.ok || Number(data?.status_code) !== 100 || Number(item?.status_code) !== 100) {
      throw new SmsDeliveryError(
        "SMS provider rejected message",
        "sms_send_failed",
        data?.status_text || item?.status_text || data?.status_code || response.status
      );
    }

    return {
      provider: "sms.ru",
      message_id: item?.sms_id || null,
      test
    };
  };
}

function maskPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 7) return "номер телефона";
  return `+${digits.slice(0, 2)} ••• •••-${digits.slice(-2)}`;
}

module.exports = {
  SmsDeliveryError,
  createOtpCode,
  otpHash,
  otpMatches,
  createSmsRuSender,
  maskPhone,
  smsRuPhone
};
