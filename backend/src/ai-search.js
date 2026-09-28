"use strict";

const DEFAULT_MODEL = "gpt-5.6-luna";
const DEFAULT_TIMEOUT_MS = 9000;

function cleanText(value, max = 240) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function normalizeVehicle(vehicle) {
  if (!vehicle) return null;
  return {
    id: vehicle.id || null,
    brand: cleanText(vehicle.brand, 80),
    model: cleanText(vehicle.model, 120),
    generation: cleanText(vehicle.generation, 120),
    year: vehicle.year || null,
    engine: cleanText(vehicle.engine, 120),
    vin: cleanText(vehicle.vin, 17),
    plate_number: cleanText(vehicle.plate_number, 20)
  };
}

function fallbackIntent(query, vehicle) {
  const raw = cleanText(query, 400);
  const lower = raw.toLowerCase();

  const side =
    /\b(лев(ый|ая|ое|ые)?|левая|левую|левого)\b/.test(lower) ? "left" :
    /\b(прав(ый|ая|ое|ые)?|правая|правую|правого)\b/.test(lower) ? "right" :
    null;
  const axle =
    /\b(перед|передн|спереди)\w*/.test(lower) ? "front" :
    /\b(зад|задн|сзади)\w*/.test(lower) ? "rear" :
    null;

  const quantityMatch = lower.match(/(?:^|\s)(\d{1,3})\s*(?:шт|штук|компл)/);
  const quantity = quantityMatch ? Math.max(1, Math.min(99, Number(quantityMatch[1]))) : 1;

  const categories = [
    ["brake_pads", ["колодк", "тормозные колодки"]],
    ["brake_disc", ["тормозн", "диск"]],
    ["oil_filter", ["масляный фильтр", "фильтр масла"]],
    ["air_filter", ["воздушн", "фильтр"]],
    ["cabin_filter", ["салонн", "фильтр"]],
    ["fuel_filter", ["топливн", "фильтр"]],
    ["wiper", ["щетк", "дворник"]],
    ["radiator", ["радиатор"]],
    ["engine_mount", ["подушк", "двигател"]],
    ["transmission_mount", ["опор", "кпп"]],
    ["stabilizer_bushing", ["втулк", "стабилизатор"]],
    ["spark_plug", ["свеч", "зажиган"]],
    ["shock_absorber", ["амортизатор"]],
    ["wheel_bearing", ["ступич", "подшипник"]]
  ];

  let category = "unknown";
  for (const [code, terms] of categories) {
    if (terms.every((term) => lower.includes(term)) || (terms.length === 1 && lower.includes(terms[0]))) {
      category = code;
      break;
    }
  }

  return {
    kind: "part_request",
    normalized_query: raw,
    category,
    part_name: raw,
    side,
    axle,
    quantity,
    wants_oem: /\b(oem|оригинал|оригинальный|ориг)\b/i.test(raw),
    article: null,
    brand: null,
    clarification_needed: category === "unknown",
    clarification_question: category === "unknown"
      ? "Уточните, какую именно деталь нужно подобрать."
      : null,
    fitment_status: vehicle ? "vehicle_context_only" : "vehicle_required",
    safe_to_search_by_article: false
  };
}

function responseText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  for (const item of Array.isArray(data?.output) ? data.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (content?.type === "output_text" && typeof content.text === "string") return content.text.trim();
    }
  }
  return "";
}

async function interpretWithOpenAI(query, vehicle, options = {}) {
  const apiKey = String(options.apiKey || process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) return null;

  const model = String(options.model || process.env.OPENAI_SEARCH_MODEL || DEFAULT_MODEL).trim();
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const timeoutMs = Math.max(1500, Number(options.timeoutMs || process.env.OPENAI_SEARCH_TIMEOUT_MS || DEFAULT_TIMEOUT_MS));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      kind: { type: "string", enum: ["part_request", "article_search", "vin", "unknown"] },
      normalized_query: { type: "string" },
      category: { type: "string" },
      part_name: { type: "string" },
      side: { type: ["string", "null"], enum: ["left", "right", null] },
      axle: { type: ["string", "null"], enum: ["front", "rear", null] },
      quantity: { type: "integer", minimum: 1, maximum: 99 },
      wants_oem: { type: "boolean" },
      article: { type: ["string", "null"] },
      brand: { type: ["string", "null"] },
      clarification_needed: { type: "boolean" },
      clarification_question: { type: ["string", "null"] },
      fitment_status: { type: "string", enum: ["vehicle_required", "vehicle_context_only", "article_explicit", "unknown"] },
      safe_to_search_by_article: { type: "boolean" }
    },
    required: [
      "kind","normalized_query","category","part_name","side","axle","quantity","wants_oem",
      "article","brand","clarification_needed","clarification_question","fitment_status","safe_to_search_by_article"
    ]
  };

  const vehicleText = vehicle
    ? JSON.stringify(normalizeVehicle(vehicle))
    : "null";

  const body = {
    model,
    input: [
      {
        role: "system",
        content: [{
          type: "input_text",
          text:
            "You are the intent parser for a Russian automotive-parts shop. " +
            "Extract what the customer wants. Never invent an OEM number, aftermarket article, brand, VIN fact, compatibility claim, engine code, or vehicle modification. " +
            "Only set article/brand when the user explicitly supplied them in the query. " +
            "A saved vehicle is context only, never proof that a part fits. " +
            "Use short Russian normalized_query and part_name. " +
            "If the request is ambiguous in a way that prevents safe part selection, set clarification_needed=true and ask one concise Russian question."
        }]
      },
      {
        role: "user",
        content: [{
          type: "input_text",
          text: "Query: " + cleanText(query, 400) + "\nSaved vehicle: " + vehicleText
        }]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "zapformat_search_intent",
        strict: true,
        schema
      }
    },
    max_output_tokens: 500
  };

  try {
    const response = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error("openai_search_failed");
      error.status = response.status;
      error.detail = data?.error?.message || null;
      throw error;
    }
    const text = responseText(data);
    if (!text) throw new Error("openai_search_empty");
    return { intent: JSON.parse(text), model };
  } finally {
    clearTimeout(timer);
  }
}

async function interpretSearch(query, vehicle, options = {}) {
  const fallback = fallbackIntent(query, vehicle);
  try {
    const ai = await interpretWithOpenAI(query, vehicle, options);
    if (!ai) return { mode: "fallback", model: null, intent: fallback };
    return { mode: "ai", model: ai.model, intent: ai.intent };
  } catch (error) {
    if (options.throwOnAIError) throw error;
    return {
      mode: "fallback",
      model: null,
      intent: fallback,
      ai_error: error?.message || "openai_search_failed"
    };
  }
}

module.exports = {
  fallbackIntent,
  interpretSearch,
  normalizeVehicle
};
