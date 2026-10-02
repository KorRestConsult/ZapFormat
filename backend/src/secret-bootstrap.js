"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");

const PRIVATE_KEY_FILE = "/var/lib/zapformat/openai-bootstrap-private.pem";
const AI_ENV_FILE = "/var/lib/zapformat/zapformat-ai.env";
const SMS_ENV_FILE = "/var/lib/zapformat/zapformat-sms.env";

async function ensureBootstrapPrivateKey() {
  try {
    return await fs.readFile(PRIVATE_KEY_FILE, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const { privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 4096,
    publicExponent: 0x10001,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" }
  });

  await fs.mkdir("/var/lib/zapformat", { recursive: true });
  await fs.writeFile(PRIVATE_KEY_FILE, privateKey, { mode: 0o600, flag: "wx" }).catch(async (error) => {
    if (error?.code !== "EEXIST") throw error;
  });
  await fs.chmod(PRIVATE_KEY_FILE, 0o600).catch(() => {});
  return fs.readFile(PRIVATE_KEY_FILE, "utf8");
}

async function publicBootstrapJwk() {
  const privatePem = await ensureBootstrapPrivateKey();
  const publicKey = crypto.createPublicKey(privatePem);
  const jwk = publicKey.export({ format: "jwk" });
  return { kty: jwk.kty, n: jwk.n, e: jwk.e };
}

function pickCiphertext(payload) {
  const candidates = [
    payload?.encrypted_api_key?.ciphertext,
    payload?.encrypted_api_key,
    payload?.encrypted_key?.ciphertext,
    payload?.encrypted_key,
    payload?.ciphertext,
    payload?.encryptedApiKey?.ciphertext,
    payload?.encryptedApiKey,
    payload?.result?.encrypted_api_key?.ciphertext,
    payload?.result?.encrypted_api_key,
    payload?.result?.encrypted_key?.ciphertext,
    payload?.result?.encrypted_key,
    payload?.result?.ciphertext
  ];
  return candidates.find((value) => typeof value === "string" && value.trim())?.trim() || null;
}

function decodeCiphertext(value) {
  const normalized = String(value || "").trim().replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 ? "=".repeat(4 - (normalized.length % 4)) : "";
  return Buffer.from(normalized + padding, "base64");
}

function envLine(name, value) {
  const clean = String(value || "").trim();
  if (!clean) return "";
  return name + "=" + clean.replace(/[\r\n]/g, "") + "\n";
}

async function writeAIEnv(extra = {}) {
  const values = {
    OPENAI_API_KEY: extra.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY,
    OPENAI_SEARCH_MODEL: extra.OPENAI_SEARCH_MODEL ?? process.env.OPENAI_SEARCH_MODEL ?? "gpt-5.6-luna",
    TIMEWEB_AI_TOKEN: extra.TIMEWEB_AI_TOKEN ?? process.env.TIMEWEB_AI_TOKEN,
    TIMEWEB_AI_MODEL: extra.TIMEWEB_AI_MODEL ?? process.env.TIMEWEB_AI_MODEL ?? "openai/gpt-5.6-luna"
  };
  const envBody =
    envLine("OPENAI_API_KEY", values.OPENAI_API_KEY) +
    envLine("OPENAI_SEARCH_MODEL", values.OPENAI_SEARCH_MODEL) +
    envLine("TIMEWEB_AI_TOKEN", values.TIMEWEB_AI_TOKEN) +
    envLine("TIMEWEB_AI_MODEL", values.TIMEWEB_AI_MODEL);
  await fs.writeFile(AI_ENV_FILE, envBody, { mode: 0o600 });
  await fs.chmod(AI_ENV_FILE, 0o600).catch(() => {});
}

async function installEncryptedOpenAIKey(payload) {
  const ciphertext = pickCiphertext(payload);
  if (!ciphertext) {
    const error = new Error("encrypted_key_required");
    error.code = "encrypted_key_required";
    throw error;
  }

  const privatePem = await ensureBootstrapPrivateKey();
  let plaintext;
  const hashes = ["sha256", "sha1"];
  let lastError = null;

  for (const oaepHash of hashes) {
    try {
      plaintext = crypto.privateDecrypt({
        key: privatePem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash
      }, decodeCiphertext(ciphertext)).toString("utf8").trim();
      if (plaintext) break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!plaintext) {
    const error = new Error("openai_key_decrypt_failed");
    error.cause = lastError;
    throw error;
  }

  if (!/^sk-[A-Za-z0-9_-]{20,}$/.test(plaintext)) {
    throw new Error("openai_key_invalid");
  }

  process.env.OPENAI_API_KEY = plaintext;
  process.env.OPENAI_SEARCH_MODEL = "gpt-5.6-luna";
  await writeAIEnv({
    OPENAI_API_KEY: plaintext,
    OPENAI_SEARCH_MODEL: "gpt-5.6-luna"
  });

  // The bootstrap private key is one-time setup material. Remove it after use
  // so a repository-stored ciphertext cannot be decrypted later if copied.
  await fs.unlink(PRIVATE_KEY_FILE).catch(() => {});

  return { configured: true, model: process.env.OPENAI_SEARCH_MODEL };
}


async function installTimewebAIToken(payload) {
  const token = String(payload?.timeweb_ai_token || payload?.token || "").trim();
  if (!token || token.length < 20 || /[\r\n]/.test(token)) {
    throw new Error("timeweb_ai_token_invalid");
  }
  const model = String(
    payload?.timeweb_ai_model || process.env.TIMEWEB_AI_MODEL || "openai/gpt-5.6-luna"
  ).trim();
  process.env.TIMEWEB_AI_TOKEN = token;
  process.env.TIMEWEB_AI_MODEL = model;
  await writeAIEnv({ TIMEWEB_AI_TOKEN: token, TIMEWEB_AI_MODEL: model });
  return { configured: true, model };
}

async function installSmsRuToken(payload) {
  const apiId = String(payload?.smsru_api_id || payload?.api_id || "").trim();
  if (!/^[A-Za-z0-9_-]{16,}$/.test(apiId) || /[\r\n]/.test(apiId)) {
    throw new Error("smsru_api_id_invalid");
  }
  const from = String(payload?.smsru_from || "").trim().replace(/[\r\n]/g, "");
  const test = String(payload?.smsru_test || "false") === "true";

  process.env.SMSRU_API_ID = apiId;
  process.env.SMSRU_FROM = from;
  process.env.SMSRU_TEST = test ? "true" : "false";

  const envBody =
    envLine("SMSRU_API_ID", apiId) +
    envLine("SMSRU_FROM", from) +
    envLine("SMSRU_TEST", test ? "true" : "false");

  await fs.writeFile(SMS_ENV_FILE, envBody, { mode: 0o600 });
  await fs.chmod(SMS_ENV_FILE, 0o600).catch(() => {});
  return { configured: true, provider: "sms.ru", test };
}

module.exports = {
  publicBootstrapJwk,
  installEncryptedOpenAIKey,
  installTimewebAIToken,
  installSmsRuToken,
  AI_ENV_FILE,
  SMS_ENV_FILE
};
