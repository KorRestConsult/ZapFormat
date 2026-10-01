"use strict";

const DEFAULT_MODEL = "gpt-5.6-luna";
const DEFAULT_TIMEOUT_MS = 9000;
const DEFAULT_RESEARCH_TIMEOUT_MS = 18000;

const CATEGORY_HINTS = {
  brake_pad: ["brake_pad"],
  brake_disk: ["brake_disk"],
  brake_drum: ["brake_drum"],
  oil_filter: ["oil_filter"],
  air_filter: ["air_filter"],
  cabin_filter: ["cabin_filter"],
  fuel_filter: ["fuel_filter"],
  clutch: ["clutch"],
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
    /(лев(ый|ая|ое|ые)?|левая|левую|левого)/.test(lower) ? "left" :
    /(прав(ый|ая|ое|ые)?|правая|правую|правого)/.test(lower) ? "right" :
    "any";

  const axle =
    /(перед|передн|спереди)/.test(lower) ? "front" :
    /(зад|задн|сзади)/.test(lower) ? "rear" :
    "any";

  const quantityMatch = lower.match(/(?:^|\s)(\d{1,3})\s*(?:шт|штук|компл)/);
  const quantity = quantityMatch ? Math.max(1, Math.min(99, Number(quantityMatch[1]))) : 1;

  let category = "unknown";
  let specialCategory = "none";

  if (/колодк/.test(lower)) category = "brake_pad";
  else if (/тормозн[^\s]*\s+диск/.test(lower) || /диск[^\s]*\s+тормозн/.test(lower)) category = "brake_disk";
  else if (/тормозн[^\s]*\s+барабан/.test(lower)) category = "brake_drum";
  else if (/маслян\w*\s+фильтр|фильтр\w*\s+масл/.test(lower)) category = "oil_filter";
  else if (/воздушн\w*\s+фильтр|фильтр\w*\s+воздуш/.test(lower)) category = "air_filter";
  else if (/салонн\w*\s+фильтр|фильтр\w*\s+салон/.test(lower)) category = "cabin_filter";
  else if (/топливн\w*\s+фильтр|фильтр\w*\s+топлив/.test(lower)) category = "fuel_filter";
  else if (/сливн\w*.*(пробк|шайб|уплотн)|уплотн\w*.*сливн/.test(lower)) category = "drain_plug_seal";
  else if (/сцеплен/.test(lower)) category = "clutch";
  else if (/свеч/.test(lower)) category = "spark_plugs";
  else if (/(дворник|щетк)/.test(lower)) specialCategory = "wipers";
  else if (/(шин|резин)/.test(lower)) specialCategory = "tires";
  else if (/(колесн[^\s]*\s+диск|диски колес)/.test(lower)) specialCategory = "wheels";
  else if (/фильтр/.test(lower)) category = "filter_ambiguous";
  else if (/радиатор/.test(lower)) category = "radiator";
  else if (/(подушк|опор).*(двигател|мотор)/.test(lower)) category = "engine_mount";
  else if (/(подушк|опор).*(кпп|короб)/.test(lower)) category = "transmission_mount";
  else if (/втулк.*стабилизатор/.test(lower)) category = "stabilizer_bushing";
  else if (/амортизатор/.test(lower)) category = "shock_absorber";
  else if (/ступич.*подшипник/.test(lower)) category = "wheel_bearing";

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


function parseJsonText(value) {
  let text = String(value || "").trim();
  text = text.replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/i, "").trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) text = text.slice(first, last + 1);
  return JSON.parse(text);
}

async function callTimewebJson(systemText, userText, options = {}) {
  const apiKey = String(options.timewebToken || process.env.TIMEWEB_AI_TOKEN || "").trim();
  if (!apiKey) return null;

  const model = String(
    options.timewebModel || process.env.TIMEWEB_AI_MODEL || "openai/gpt-5.6-luna"
  ).trim();
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const timeoutMs = Math.max(
    1500,
    Number(options.timeoutMs || process.env.TIMEWEB_AI_TIMEOUT_MS || DEFAULT_RESEARCH_TIMEOUT_MS)
  );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl("https://api.timeweb.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemText + " Return ONLY valid JSON without markdown." },
          { role: "user", content: userText }
        ],
        max_completion_tokens: Number(options.maxTokens || 900)
      }),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error("timeweb_ai_failed");
      error.status = response.status;
      error.detail = data?.error?.message || null;
      throw error;
    }
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("timeweb_ai_empty");
    return { value: parseJsonText(text), model, source: "model" };
  } finally {
    clearTimeout(timer);
  }
}

async function interpretWithTimeweb(query, vehicle, options = {}) {
  const categories = [
    "brake_pad","brake_disk","brake_drum","oil_filter","air_filter","cabin_filter",
    "fuel_filter","clutch","drain_plug_seal","spark_plugs","radiator","engine_mount",
    "transmission_mount","stabilizer_bushing","shock_absorber","wheel_bearing",
    "other_part","filter_ambiguous","unknown"
  ];
  const system =
    "Normalize Russian automotive-parts search intent. Never invent article numbers, brands, VIN facts, engine codes or compatibility. " +
    "Allowed category values: " + categories.join(", ") + ". " +
    "Allowed side: left,right,any. Allowed axle: front,rear,any. " +
    "Allowed special_category: none,wipers,tires,wheels. " +
    "For bare 'фильтр' require clarification. For сцепление use clutch. " +
    "For a clearly named part outside the fixed list use other_part. " +
    "Return keys normalized_query,category,part_name,side,axle,quantity,wants_oem,special_category,clarification_needed,clarification_question.";

  return callTimewebJson(
    system,
    "Query: " + cleanText(query, 400) + "\nSaved vehicle context: " + JSON.stringify(normalizeVehicle(vehicle)),
    { ...options, maxTokens: 500 }
  );
}

async function researchWithTimeweb(query, vehicle, options = {}) {
  const result = await callTimewebJson(
    "You are a conservative auto-parts fitment assistant. Use only facts you are confident about from model knowledge. " +
    "Never guess a part number or compatibility. If year, engine, gearbox, axle or side is needed, return needs_clarification and ONE short Russian question. " +
    "If you are not confident in an exact brand+article, return not_found rather than inventing. " +
    "Return JSON with status (candidates|needs_clarification|not_found), clarification_question, summary, candidates. " +
    "Each candidate must have brand, article, description, fitment_note.",
    "Запрос: " + cleanText(query, 400) +
      "\nСохранённый автомобиль: " + JSON.stringify(normalizeVehicle(vehicle)),
    { ...options, maxTokens: 900 }
  );
  if (!result) return null;
  const value = result.value || {};
  return {
    model: result.model,
    source: "model",
    status: ["candidates","needs_clarification","not_found"].includes(value?.status)
      ? value.status : "not_found",
    clarification_question: value?.clarification_question
      ? cleanText(value.clarification_question, 220) : null,
    summary: cleanText(value?.summary, 320),
    candidates: (Array.isArray(value?.candidates) ? value.candidates : [])
      .slice(0, 5)
      .map((item) => ({
        brand: cleanText(item?.brand, 80),
        article: cleanText(item?.article, 100),
        description: cleanText(item?.description, 180),
        fitment_note: cleanText(item?.fitment_note, 220)
      }))
      .filter((item) => item.brand && item.article)
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
    "fuel_filter","clutch","drain_plug_seal","spark_plugs","radiator","engine_mount",
    "transmission_mount","stabilizer_bushing","shock_absorber","wheel_bearing",
    "other_part","filter_ambiguous","unknown"
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
            "For сцепление/комплект сцепления use category=clutch. " +
            "For a clearly named automotive part that is not in the fixed category list use category=other_part instead of unknown; ask clarification only when the requested part itself is genuinely ambiguous. " +
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


async function researchPartCandidates(query, vehicle, options = {}) {
  const timewebToken = String(options.timewebToken || process.env.TIMEWEB_AI_TOKEN || "").trim();
  if (timewebToken && !options.forceOpenAI) {
    return researchWithTimeweb(query, vehicle, options);
  }

  const apiKey = String(options.apiKey || process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) return null;

  const model = String(options.model || process.env.OPENAI_SEARCH_MODEL || DEFAULT_MODEL).trim();
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const timeoutMs = Math.max(
    4000,
    Number(options.timeoutMs || process.env.OPENAI_RESEARCH_TIMEOUT_MS || DEFAULT_RESEARCH_TIMEOUT_MS)
  );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      status: { type: "string", enum: ["candidates","needs_clarification","not_found"] },
      clarification_question: { type: ["string","null"] },
      summary: { type: "string" },
      candidates: {
        type: "array",
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            brand: { type: "string" },
            article: { type: "string" },
            description: { type: "string" },
            fitment_note: { type: "string" }
          },
          required: ["brand","article","description","fitment_note"]
        }
      }
    },
    required: ["status","clarification_question","summary","candidates"]
  };

  const body = {
    model,
    store: false,
    tools: [{ type: "web_search", search_context_size: "low" }],
    input: [
      {
        role: "system",
        content: [{
          type: "input_text",
          text:
            "You are the fitment research layer of a Russian auto-parts shop. Use web search. " +
            "Your job is to find exact manufacturer part numbers for the requested part and vehicle, or ask one useful clarification. " +
            "Never guess a part number or compatibility. Prefer OEM catalogs, manufacturer catalogs, reputable parts catalogs and repeated agreement across sources. " +
            "If the query explicitly names a vehicle, those query facts take priority over saved vehicle context. " +
            "If make/model/year/engine/gearbox or axle/side details are insufficient to distinguish fitment, return needs_clarification and ask ONE short question in Russian. " +
            "For clutch requests, gearbox/transmission can be essential. For brake pads, axle can be essential. " +
            "Return candidates only when the evidence supports that exact brand+article for the described vehicle."
        }]
      },
      {
        role: "user",
        content: [{
          type: "input_text",
          text:
            "Запрос: " + cleanText(query, 400) +
            "\nСохранённый автомобиль (может быть пустым или уступать данным из запроса): " +
            JSON.stringify(normalizeVehicle(vehicle))
        }]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "zapformat_part_research",
        strict: true,
        schema
      }
    },
    max_output_tokens: 800
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
      const error = new Error("openai_research_failed");
      error.status = response.status;
      error.detail = data?.error?.message || null;
      throw error;
    }
    const text = responseText(data);
    if (!text) throw new Error("openai_research_empty");
    const value = JSON.parse(text);
    return {
      model,
      source: "web",
      status: ["candidates","needs_clarification","not_found"].includes(value?.status)
        ? value.status
        : "not_found",
      clarification_question: value?.clarification_question
        ? cleanText(value.clarification_question, 220)
        : null,
      summary: cleanText(value?.summary, 320),
      candidates: (Array.isArray(value?.candidates) ? value.candidates : [])
        .slice(0, 5)
        .map((item) => ({
          brand: cleanText(item?.brand, 80),
          article: cleanText(item?.article, 100),
          description: cleanText(item?.description, 180),
          fitment_note: cleanText(item?.fitment_note, 220)
        }))
        .filter((item) => item.brand && item.article)
    };
  } finally {
    clearTimeout(timer);
  }
}

async function interpretSearch(query, vehicle, options = {}) {
  const fallback = fallbackIntent(query, vehicle);
  let openAIError = null;

  try {
    const ai = await interpretWithOpenAI(query, vehicle, options);
    if (ai) return { mode: "ai", model: ai.model, provider: "openai", intent: normalizeIntent(ai.value, fallback) };
  } catch (error) {
    openAIError = error;
    if (options.throwOnAIError && !String(options.timewebToken || process.env.TIMEWEB_AI_TOKEN || "").trim()) throw error;
  }

  try {
    const alt = await interpretWithTimeweb(query, vehicle, options);
    if (alt) return { mode: "ai", model: alt.model, provider: "timeweb", intent: normalizeIntent(alt.value, fallback) };
  } catch (error) {
    if (options.throwOnAIError) throw error;
    return {
      mode: "fallback",
      model: null,
      intent: fallback,
      ai_error: error?.message || openAIError?.message || "ai_search_failed"
    };
  }

  return {
    mode: "fallback",
    model: null,
    intent: fallback,
    ai_error: openAIError?.message || null
  };
}

module.exports = {
  CATEGORY_HINTS,
  catalogHints,
  fallbackIntent,
  interpretSearch,
  researchPartCandidates,
  researchWithTimeweb,
  interpretWithTimeweb,
  normalizeIntent,
  normalizeVehicle
};
