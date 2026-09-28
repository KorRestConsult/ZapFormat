"use strict";

const crypto = require("node:crypto");

class OfferTokenError extends Error {
  constructor(message = "Invalid offer token") {
    super(message);
    this.name = "OfferTokenError";
    this.code = "invalid_offer_token";
  }
}

function createOfferTokenCodec(options = {}) {
  const env = options.env || process.env;
  const secret = String(
    options.secret ||
    env.OFFER_TOKEN_SECRET ||
    env.INTERNAL_API_TOKEN ||
    env.PARTGRADE_API_PASSWORD_MD5 ||
    ""
  ).trim();

  const key = secret
    ? crypto.createHash("sha256").update(secret).digest()
    : null;

  function configured() {
    return Boolean(key);
  }

  function seal(payload) {
    if (!key) return null;

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();

    return [
      "v1",
      iv.toString("base64url"),
      tag.toString("base64url"),
      encrypted.toString("base64url")
    ].join(".");
  }

  function open(token) {
    if (!key) throw new OfferTokenError("Offer token codec is not configured");

    const parts = String(token || "").split(".");
    if (parts.length !== 4 || parts[0] !== "v1") {
      throw new OfferTokenError();
    }

    try {
      const iv = Buffer.from(parts[1], "base64url");
      const tag = Buffer.from(parts[2], "base64url");
      const encrypted = Buffer.from(parts[3], "base64url");

      if (iv.length !== 12 || tag.length !== 16 || !encrypted.length) {
        throw new OfferTokenError();
      }

      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      const payload = JSON.parse(plaintext.toString("utf8"));

      if (!payload || payload.v !== 1 || !payload.qn || !payload.qb) {
        throw new OfferTokenError();
      }
      if (payload.s == null && payload.k == null) {
        throw new OfferTokenError();
      }

      return payload;
    } catch (error) {
      if (error instanceof OfferTokenError) throw error;
      throw new OfferTokenError();
    }
  }

  return { configured, seal, open };
}

module.exports = {
  OfferTokenError,
  createOfferTokenCodec
};
