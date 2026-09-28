"use strict";

const DEFAULT_MODEL = "gpt-5.6-luna";
const DEFAULT_TIMEOUT_MS = 9000;

const CATEGORY_HINTS = {
  brake_pad: ["brake_pad"],
  brake_disk: ["brake_disk"],
  brake_drum: ["brake_drum"],
  oil_filter: ["oil_filter"],
  air_filter: ["air_filter"],
  cabin_filter: ["cabin_filter"],
  fuel_filter: ["fuel_filter"],
  drain_plug_seal: ["drain_plug_seal"],
  spark_plugs: ["spark_plugs"]
};

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

function catalogHints(category) {
  return CATEGORY_HINTS[String(category || "")] || [];
}

function fallbackIntent(query, vehicle) {
  const raw = cleanText(query, 400);
  const lower = raw.toLowerCase().replace(/ё/g, "е");

  const side =
    /\b(лев(ый|ая|ое|ые)?|левая|левую|левого)\b/.test(lower) ? "left" :
    /\b(прав(ый|ая|ое|ые)?|правая|правую|правого)\b/.test(lower) ? "right" :
    "any";

  const axle =
    /\b(перед|передн|спереди)\w*/.test(lower) ? "front" :
    /\b(зад|задн|сзади)\w*/.test(lower) ? "rear" :
    "any";

  const quantityMatch = lower.match(/(?:^|\s)(\d{1,3})\s*(?:шт|штук|компл)/);
  const quantity = quantityMatch ? Math.max(1, Math.min(99, Number(quantityMatch[1]))) : 1;

  let category = "unknown";
  let specialCategory = "none";

  if (/\b(колодк)\w*/.test(lower)) category = "brake_pad";
  else if (/\b(тормозн)\w*\s+(диск)\w*/.test(lower) || /\b(диск)\w*\s+(тормозн)\w*/.test(lower)) category = "brake_disk";
  else if (/\b(тормозн)\w*\s+(барабан)\w*/.test(lower)) category = "brake_drum";
  else if (/маслян\w*\s+фильтр|фильтр\w*\s+масл/.test(lower)) category = "oil_filter";
  else if (/воздушн\w*\s+фильтр|фильтр\w*\s+воздуш/.test(lower)) category = "air_filter";
  else if (/салонн\w*\s+фильтр|фильтр\w*\s+салон/.test(lower)) category = "cabin_filter";
  else if (/топливн\w*\s+фильтр|фильтр\w*\s+топлив/.test(lower)) category = "fuel_filter";
  else if (/сливн\w*.*(пробк|шайб|уплотн)|уплотн\w*.*сливн/.test(lower)) category = "drain_plug_seal";
  else if (/\bсвеч\w*\b/.test(lower)) category = "spark_plugs";
  else if (/\b(дворник|щетк)\w*/.test(lower)) specialCategory = "wipers";
  else if (/\b(шин|резин)\w*/.test(lower)) specialCategory = "tires";
  else if (/\b(колесн\w*\s+диск|диски колес)\b/.test(lower)) specialCategory = "wheels";
  else if (/\bфильтр\w*\b/.test(lower)) category = "filter_ambiguous";
  else if (/\bрадиатор\w*\b/.test(lower)) category = "radiator";
  else if (/\b(подушк|опор)\w*.*(двигател|мотор)\w*/.test(lower)) category = "engine_mount";
  else if (/\b(подушк|опор)\w*.*(кпп|короб)\w*/.test(lower)) category = "transmission_mount";
  else if (/\bвтулк\w*.*стабилизатор\w*/.test(lower)) category = "stabilizer_bushing";
  else if (/\bамортизатор\w*/.test(lower)) category = "shock_absorber";
  else if (/\bступич\w*.*подшипник\w*/.test(lower)) category = "wheel_bearing";

  const clarificationNeeded = category === "unknown" || category === "filter_ambiguous";
  const clarificationQuestion =
    category === "filter_ambiguous"
      ? "Какой фильтр нужен: масляный, воздушный, салонный или топливный?"
      : category === "unknown"
        ? "Уточните, какую именно деталь нужно подобрать."
        : null;

  return {
    kind: "part_request",
    normalized_query: raw,
    category,
    part_name: raw,
    side,
    axle,
    quantity,
    wants_oem: /\b(oem|оригинал|оригинальный|ориг)\b/i.test(raw),
    special_category: specialCategory,
    goods_group_hints: catalogHints(category),
    clarification_needed: clarificationNeeded,
    clarification_question: clarificationQuestion,
    fitment_status: vehicle ? "vehicle_context_only" : "vehicle_required"
  };
}

function responseText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  for (const item of Array.isArray(data?.output) ? data.output : []) {
    for (const part of Array.isArray(item?.content) ? item.content : []) {
      if (part?.type === "output_text" && typeof part.text === "string") return part.text.trim();
    }
  }
  return "";
}

function normalizeIntent(value, fallback) {
  const category = cleanText(value?.category || fallback.category, 80) || "unknown";
  const special = ["none","wipers","tires","wheels"].includes(value?.special_category)
    ? value.special_category
    : fallback.special_category;
  return {
    kind: "part_request",
    normalized_query: cleanText(value?.normalized_query || fallback.normalized_query, 400),
    category,
    part_name: cleanText(value?.part_name || fallback.part_name, 180),
    side: ["left","right","any"].includes(value?.side) ? value.side : fallback.side,
    axle: ["front","rear","any"].includes(value?.axle) ? value.axle : fallback.axle,
    quantity: Math.max(1, Math.min(99, Number(value?.quantity || fallback.quantity || 1))),
    wants_oem: Boolean(value?.wants_oem),
    special_category: special,
    goods_group_hints: catalogHints(category),
    clarification_needed: Boolean(value?.clarification_needed),
    clarification_question: value?.clarification_question
      ? cleanText(value.clarification_question, 180)
      : null,
    fitment_status: fallback.fitment_status
  };
}

async function interpretWithOpenAI(query, vehicle, options = {}) {
  const apiKey = String(options.apiKey || process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) return null;

  const model = String(options.model || process.env.OPENAI_SEARCH_MODEL || DEFAULT_MODEL).trim();
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const timeoutMs = Math.max(1500, Number(options.timeoutMs || process.env.OPENAI_SEARCH_TIMEOUT_MS || DEFAULT_TIMEOUT_MS));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const categories = [
    "brake_pad","brake_disk","brake_drum","oil_filter","air_filter","cabin_filter",
    "fuel_filter","drain_plug_seal","spark_plugs","radiator","engine_mount",
    "transmission_mount","stabilizer_bushing","shock_absorber","wheel_bearing",
    "filter_ambiguous","unknown"
  ];

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      normalized_query: { type: "string" },
      category: { type: "string", enum: categories },
      part_name: { type: "string" },
      side: { type: "string", enum: ["left","right","any"] },
      axle: { type: "string", enum: ["front","rear","any"] },
      quantity: { type: "integer", minimum: 1, maximum: 99 },
      wants_oem: { type: "boolean" },
      special_category: { type: "string", enum: ["none","wipers","tires","wheels"] },
      clarification_needed: { type: "boolean" },
      clarification_question: { type: ["string","null"] }
    },
    required: [
      "normalized_query","category","part_name","side","axle","quantity",
      "wants_oem","special_category","clarification_needed","clarification_question"
    ]
  };

  const body = {
    model,
    input: [
      {
        role: "system",
        content: [{
          type: "input_text",
          text:
            "You normalize Russian automotive-parts search intent. " +
            "Never invent or output OEM numbers, aftermarket article numbers, brands, VIN facts, engine codes, or compatibility. " +
            "The vehicle catalog, not the model, will decide applicability. " +
            "Choose only the semantic category and position requested. " +
            "For a bare word 'фильтр', require clarification. " +
            "Use special_category=wipers for дворники/щетки стеклоочистителя, tires for шины/резина, wheels for колесные диски."
        }]
      },
      {
        role: "user",
        content: [{
          type: "input_text",
          text: "Query: " + cleanText(query, 400) + "\nSaved vehicle context: " + JSON.stringify(normalizeVehicle(vehicle))
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
    max_output_tokens: 450
  };

  try {
    const response = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
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
    return { value: JSON.parse(text), model };
  } finally {
    clearTimeout(timer);
  }
}

async function interpretSearch(query, vehicle, options = {}) {
  const fallback = fallbackIntent(query, vehicle);
  try {
    const ai = await interpretWithOpenAI(query, vehicle, options);
    if (!ai) return { mode: "fallback", model: null, intent: fallback };
    return { mode: "ai", model: ai.model, intent: normalizeIntent(ai.value, fallback) };
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
  CATEGORY_HINTS,
  catalogHints,
  fallbackIntent,
  interpretSearch,
  normalizeIntent,
  normalizeVehicle
};
