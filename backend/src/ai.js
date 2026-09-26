"use strict";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-5.6-luna";

class ZapFormatAIError extends Error {
  constructor(code, message, status = null) {
    super(message);
    this.name = "ZapFormatAIError";
    this.code = code;
    this.status = status;
  }
}

function configured() {
  return Boolean(String(process.env.OPENAI_API_KEY || "").trim());
}

function modelName() {
  return String(process.env.OPENAI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
}

function looksLikeVin(value) {
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(String(value || "").trim());
}

function looksLikeArticle(value) {
  const q = String(value || "").trim();
  if (!q || q.length > 48 || /\s/.test(q)) return false;
  if (looksLikeVin(q)) return false;
  if (!/[A-Za-z0-9]/.test(q)) return false;
  return /^[A-Za-z0-9][A-Za-z0-9._/+\-]{2,47}$/.test(q);
}

function safeVehicleContext(vehicle) {
  if (!vehicle || typeof vehicle !== "object") return null;
  const clean = {};
  for (const key of ["brand", "model", "generation", "year", "engine"]) {
    const value = vehicle[key];
    if (value === undefined || value === null || value === "") continue;
    clean[key] = String(value).trim().slice(0, 120);
  }
  return Object.keys(clean).length ? clean : null;
}

function outputText(response) {
  if (typeof response?.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }
  const parts = [];
  for (const item of Array.isArray(response?.output) ? response.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        parts.push(content.text);
      }
    }
  }
  return parts.join("\n").trim();
}

const SEARCH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "kind",
    "article",
    "brand_hint",
    "normalized_query",
    "part_name",
    "position",
    "search_terms",
    "assistant_text",
    "needs_article",
    "confidence"
  ],
  properties: {
    kind: {
      type: "string",
      enum: ["article", "part_name", "vin", "question", "unknown"]
    },
    article: { type: "string", maxLength: 80 },
    brand_hint: { type: "string", maxLength: 80 },
    normalized_query: { type: "string", maxLength: 240 },
    part_name: { type: "string", maxLength: 160 },
    position: { type: "string", maxLength: 120 },
    search_terms: {
      type: "array",
      maxItems: 6,
      items: { type: "string", maxLength: 160 }
    },
    assistant_text: { type: "string", maxLength: 500 },
    needs_article: { type: "boolean" },
    confidence: { type: "number", minimum: 0, maximum: 1 }
  }
};

async function interpretSearch({ query, vehicle = null, fetchImpl = globalThis.fetch }) {
  const input = String(query || "").trim().slice(0, 500);
  if (!input) throw new ZapFormatAIError("ai_query_required", "Search query is required", 400);

  if (!configured()) {
    throw new ZapFormatAIError("ai_not_configured", "OpenAI API key is not configured", 503);
  }

  const baseUrl = String(process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const timeoutMs = Math.max(2000, Number(process.env.OPENAI_TIMEOUT_MS || 12000));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const system = [
    "You are the intent router for ZapFormat, a Russian auto-parts store.",
    "Your job is to understand a customer's search phrase and normalize it for the real supplier catalog.",
    "Never invent an article/OEM number. Set article only when an article-like code is explicitly present in the user's text.",
    "Never claim vehicle compatibility, price, stock, delivery time, or manufacturer fitment.",
    "Vehicle context is only a hint for wording and part position. It is not evidence of compatibility.",
    "For a natural-language part request, return canonical Russian part_name, useful synonyms in search_terms, and needs_article=true.",
    "For VIN input, classify it as vin; do not pretend to decode it.",
    "Keep assistant_text concise and practical, in Russian.",
    "search_terms may contain names/synonyms from the request but must never contain fabricated article numbers."
  ].join(" ");

  const userPayload = {
    query: input,
    vehicle: safeVehicleContext(vehicle)
  };

  try {
    const response = await fetchImpl(baseUrl + "/responses", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + String(process.env.OPENAI_API_KEY || "").trim(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: modelName(),
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: system }]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: JSON.stringify(userPayload) }]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "zapformat_search_intent",
            strict: true,
            schema: SEARCH_SCHEMA
          }
        },
        max_output_tokens: 700
      }),
      signal: controller.signal
    });

    const raw = await response.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      throw new ZapFormatAIError("ai_bad_response", "OpenAI returned non-JSON response", response.status);
    }

    if (!response.ok) {
      const message = String(data?.error?.message || "OpenAI request failed").slice(0, 300);
      throw new ZapFormatAIError("ai_upstream_error", message, response.status);
    }

    const text = outputText(data);
    if (!text) throw new ZapFormatAIError("ai_empty_response", "OpenAI returned empty output", 502);

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new ZapFormatAIError("ai_invalid_json", "OpenAI structured output was invalid", 502);
    }

    const explicitArticle = looksLikeArticle(parsed?.article) &&
      input.toUpperCase().includes(String(parsed.article).toUpperCase());

    return {
      kind: String(parsed?.kind || "unknown"),
      article: explicitArticle ? String(parsed.article).trim() : "",
      brand_hint: String(parsed?.brand_hint || "").trim().slice(0, 80),
      normalized_query: String(parsed?.normalized_query || input).trim().slice(0, 240),
      part_name: String(parsed?.part_name || "").trim().slice(0, 160),
      position: String(parsed?.position || "").trim().slice(0, 120),
      search_terms: [...new Set(
        (Array.isArray(parsed?.search_terms) ? parsed.search_terms : [])
          .map((x) => String(x || "").trim().slice(0, 160))
          .filter(Boolean)
      )].slice(0, 6),
      assistant_text: String(parsed?.assistant_text || "").trim().slice(0, 500),
      needs_article: explicitArticle ? false : Boolean(parsed?.needs_article),
      confidence: Math.max(0, Math.min(1, Number(parsed?.confidence || 0)))
    };
  } catch (error) {
    if (error instanceof ZapFormatAIError) throw error;
    if (error?.name === "AbortError") {
      throw new ZapFormatAIError("ai_timeout", "OpenAI request timed out", 504);
    }
    throw new ZapFormatAIError("ai_unavailable", "OpenAI request failed", 502);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  ZapFormatAIError,
  configured,
  interpretSearch,
  looksLikeArticle,
  looksLikeVin,
  modelName,
  outputText,
  safeVehicleContext
};
