"use strict";

const ABCP_CARBASE_GOODS_GROUPS = Object.freeze([
  "oil_filter",
  "air_filter",
  "cabin_filter",
  "fuel_filter",
  "brake_pad",
  "brake_disk",
  "brake_drum",
  "brake_pad_sensors",
  "drain_plug_seal",
  "spark_plugs"
]);

const ABCP_CARBASE_CAPABILITIES = Object.freeze({
  provider_id: "abcp_carbase",
  vehicle_tree: true,
  vin_decode: false,
  free_text_part_fitment: false,
  verified_articles: true,
  goods_groups: ABCP_CARBASE_GOODS_GROUPS,
  vehicle_specs: Object.freeze(["wipers", "tires", "wheels"])
});

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compactText(value) {
  return normalizeText(value).replace(/\s+/g, "");
}

function tokens(value) {
  const stop = new Set([
    "на","для","мой","моя","мое","мою","машину","машины","авто","автомобиль",
    "нужен","нужна","нужны","найди","подбери","хочу","купить","комплект","шт",
    "the","for","my","car","need","find"
  ]);
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length >= 2 && !stop.has(token));
}

function parseYearMonth(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits || digits === "0") return null;
  const year = Number(digits.slice(0, 4));
  return Number.isFinite(year) && year >= 1900 ? year : null;
}

function yearFits(year, from, to) {
  const y = Number(year);
  if (!Number.isFinite(y) || y < 1900) return true;
  const yFrom = parseYearMonth(from);
  const yTo = parseYearMonth(to);
  if (yFrom && y < yFrom) return false;
  if (yTo && y > yTo) return false;
  return true;
}

function overlapScore(needle, haystack) {
  const a = tokens(needle);
  const b = new Set(tokens(haystack));
  if (!a.length) return 0;
  return a.reduce((sum, token) => sum + (b.has(token) ? 1 : 0), 0) / a.length;
}

function flattenModels(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  const rows = [];
  for (const [groupName, list] of Object.entries(value)) {
    if (!Array.isArray(list)) continue;
    for (const row of list) rows.push({ ...row, groupName: row?.groupName || groupName });
  }
  return rows;
}

function flattenModifications(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.modifications)) {
    return value.modifications.map((row) => ({
      ...row,
      modelId: row?.modelId || value?.id || null,
      modelName: row?.model || value?.name || null,
      groupName: row?.groupName || value?.groupName || null
    }));
  }
  return [];
}

function scoreManufacturer(vehicle, row) {
  const wanted = compactText(vehicle?.brand);
  const name = compactText(row?.name);
  if (!wanted || !name) return 0;
  if (wanted === name) return 100;
  if (wanted.includes(name) || name.includes(wanted)) return 85;
  return Math.round(overlapScore(vehicle?.brand, row?.name) * 60);
}

function scoreModel(vehicle, row) {
  const model = normalizeText(vehicle?.model);
  const generation = normalizeText(vehicle?.generation);
  const name = normalizeText(row?.name);
  const group = normalizeText(row?.groupName);
  let score = 0;

  if (model && group && compactText(model) === compactText(group)) score += 85;
  else if (model && name && (name.includes(model) || model.includes(name))) score += 65;
  else score += Math.round(overlapScore(model, [group, name].filter(Boolean).join(" ")) * 55);

  if (generation) {
    const target = [name, group].filter(Boolean).join(" ");
    const overlap = overlapScore(generation, target);
    score += Math.round(overlap * 30);
    if (compactText(target).includes(compactText(generation))) score += 20;
  }

  if (yearFits(vehicle?.year, row?.yearFrom, row?.yearTo)) score += 15;
  else score -= 80;

  return score;
}

function fuelKind(value) {
  const text = normalizeText(value);
  if (/диз|diesel/.test(text)) return "diesel";
  if (/бенз|petrol|gasoline/.test(text)) return "petrol";
  if (/элект|electric/.test(text)) return "electric";
  if (/hybrid|гибрид/.test(text)) return "hybrid";
  return "";
}

function displacement(value) {
  const match = normalizeText(value).match(/\b(\d{1,2})[.,](\d)\b/);
  return match ? Number(match[1] + "." + match[2]) : null;
}

function engineCodes(value) {
  return String(value || "")
    .toUpperCase()
    .match(/\b[A-Z][A-Z0-9-]{2,9}\b/g) || [];
}

function scoreModification(vehicle, row) {
  const engine = String(vehicle?.engine || "");
  const searchable = [
    row?.modificationName,
    row?.name,
    row?.fuelType,
    row?.motorCodes,
    row?.cylinderCapacityCcm ? String(Number(row.cylinderCapacityCcm) / 1000) : ""
  ].filter(Boolean).join(" ");

  let score = yearFits(vehicle?.year, row?.yearFrom, row?.yearTo) ? 20 : -100;

  const wantedDisp = displacement(engine);
  if (wantedDisp !== null) {
    const rowDisp =
      displacement(row?.modificationName) ??
      (Number(row?.cylinderCapacityCcm) > 0 ? Number(row.cylinderCapacityCcm) / 1000 : null);
    if (rowDisp !== null) {
      score += Math.abs(rowDisp - wantedDisp) <= 0.11 ? 45 : -30;
    }
  }

  const wantedFuel = fuelKind(engine);
  const rowFuel = fuelKind(row?.fuelType || row?.modificationName);
  if (wantedFuel && rowFuel) score += wantedFuel === rowFuel ? 30 : -45;

  const codes = engineCodes(engine);
  if (codes.length) {
    const hay = String(row?.motorCodes || "").toUpperCase();
    score += codes.some((code) => hay.includes(code)) ? 65 : 0;
  }

  score += Math.round(overlapScore(engine, searchable) * 25);
  return score;
}

function topDistinct(rows, scoreFn, limit = 8) {
  return rows
    .map((row) => ({ row, score: scoreFn(row) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function createAbcpCarbaseProvider(client) {
  if (!client) return null;
  return {
    provider_kind: "vehicle_catalog",
    id: "abcp_carbase",
    capabilities: ABCP_CARBASE_CAPABILITIES,
    manufacturers: () => client.carbaseManufacturers(),
    models: (manufacturerId) => client.carbaseModels(manufacturerId),
    modifications: (modelId) => client.carbaseModifications(modelId),
    modificationInfo: (modificationId) => client.carbaseModificationInfo(modificationId)
  };
}

function asCatalogProvider(source) {
  if (!source) return null;
  if (source.provider_kind === "vehicle_catalog") return source;
  return createAbcpCarbaseProvider(source);
}

function catalogCoverageForIntent(intent, capabilities = ABCP_CARBASE_CAPABILITIES) {
  const special = String(intent?.special_category || "none");
  if (special !== "none") {
    const supported = Array.isArray(capabilities?.vehicle_specs) && capabilities.vehicle_specs.includes(special);
    return {
      supported,
      kind: supported ? "vehicle_specs" : "external_fitment_required",
      required_capability: supported ? null : "vehicle_specs_by_vehicle"
    };
  }

  const hints = Array.isArray(intent?.goods_group_hints) ? intent.goods_group_hints : [];
  const supportedGroups = new Set(Array.isArray(capabilities?.goods_groups) ? capabilities.goods_groups : []);
  const supported = hints.some((hint) => supportedGroups.has(String(hint || "").toLowerCase()));
  return {
    supported,
    kind: supported ? "verified_articles" : "external_fitment_required",
    required_capability: supported ? null : "parts_by_vehicle_or_vin"
  };
}

async function resolveVehicleCatalog(source, vehicle) {
  const provider = asCatalogProvider(source);
  if (!provider || !vehicle) return { status: "vehicle_required" };

  if (
    vehicle.catalog_modification_id &&
    (!vehicle.catalog_provider || vehicle.catalog_provider === provider.id)
  ) {
    const info = await provider.modificationInfo(vehicle.catalog_modification_id);
    return {
      status: "resolved",
      source: "saved",
      manufacturer: {
        id: vehicle.catalog_manufacturer_id || null,
        name: info?.modification?.manufacturerName || vehicle.brand || null
      },
      model: {
        id: vehicle.catalog_model_id || info?.modification?.modelId || null,
        name: info?.modification?.modelName || vehicle.model || null
      },
      modification: {
        id: String(vehicle.catalog_modification_id),
        name: info?.modification?.modificationName || vehicle.catalog_modification_name || null,
        fuelType: info?.modification?.fuelType || null,
        powerHP: info?.modification?.powerHP || null,
        motorCodes: info?.modification?.motorCodes || null
      },
      info
    };
  }

  const manufacturersRaw = await provider.manufacturers();
  const manufacturers = Array.isArray(manufacturersRaw) ? manufacturersRaw : [];
  const rankedManufacturers = topDistinct(
    manufacturers,
    (row) => scoreManufacturer(vehicle, row),
    5
  );
  const manufacturerHit = rankedManufacturers[0];

  if (!manufacturerHit || manufacturerHit.score < 60) {
    return {
      status: "manufacturer_not_found",
      candidates: rankedManufacturers.map(({ row, score }) => ({
        id: String(row.id),
        name: row.name,
        score
      }))
    };
  }

  const modelsRaw = await provider.models(manufacturerHit.row.id);
  const models = flattenModels(modelsRaw);
  const rankedModels = topDistinct(models, (row) => scoreModel(vehicle, row), 8);
  const modelHit = rankedModels[0];
  const modelRunner = rankedModels[1];

  if (
    !modelHit ||
    modelHit.score < 55 ||
    (modelRunner && modelHit.score - modelRunner.score < 12)
  ) {
    return {
      status: "model_ambiguous",
      manufacturer: { id: String(manufacturerHit.row.id), name: manufacturerHit.row.name },
      candidates: rankedModels.map(({ row, score }) => ({
        id: String(row.id),
        name: row.name,
        groupName: row.groupName || null,
        yearFrom: row.yearFrom || null,
        yearTo: row.yearTo || null,
        score
      }))
    };
  }

  const modificationsRaw = await provider.modifications(modelHit.row.id);
  const modifications = flattenModifications(modificationsRaw)
    .filter((row) => yearFits(vehicle?.year, row?.yearFrom, row?.yearTo));

  if (!modifications.length) {
    return {
      status: "modification_not_found",
      manufacturer: { id: String(manufacturerHit.row.id), name: manufacturerHit.row.name },
      model: { id: String(modelHit.row.id), name: modelHit.row.name }
    };
  }

  const rankedModifications = topDistinct(
    modifications,
    (row) => scoreModification(vehicle, row),
    12
  );
  const modificationHit = rankedModifications[0];
  const modificationRunner = rankedModifications[1];

  const hasEngineDetail = Boolean(
    displacement(vehicle?.engine) !== null ||
    fuelKind(vehicle?.engine) ||
    engineCodes(vehicle?.engine).length
  );
  const safeToResolve =
    modifications.length === 1 ||
    (
      hasEngineDetail &&
      modificationHit &&
      modificationHit.score >= 55 &&
      (!modificationRunner || modificationHit.score - modificationRunner.score >= 15)
    );

  if (!safeToResolve) {
    return {
      status: "modification_ambiguous",
      manufacturer: { id: String(manufacturerHit.row.id), name: manufacturerHit.row.name },
      model: { id: String(modelHit.row.id), name: modelHit.row.name },
      candidates: rankedModifications.map(({ row, score }) => ({
        id: String(row.id),
        name: row.modificationName || row.name || "Модификация",
        yearFrom: row.yearFrom || null,
        yearTo: row.yearTo || null,
        fuelType: row.fuelType || null,
        powerHP: row.powerHP || null,
        motorCodes: row.motorCodes || null,
        cylinderCapacityCcm: row.cylinderCapacityCcm || null,
        score
      }))
    };
  }

  const info = await provider.modificationInfo(modificationHit.row.id);
  return {
    status: "resolved",
    source: "auto",
    manufacturer: { id: String(manufacturerHit.row.id), name: manufacturerHit.row.name },
    model: { id: String(modelHit.row.id), name: modelHit.row.name },
    modification: {
      id: String(modificationHit.row.id),
      name: modificationHit.row.modificationName || modificationHit.row.name || null,
      fuelType: modificationHit.row.fuelType || null,
      powerHP: modificationHit.row.powerHP || null,
      motorCodes: modificationHit.row.motorCodes || null
    },
    info
  };
}

function canonicalAxle(value) {
  const text = normalizeText(value);
  if (/front|перед/.test(text)) return "front";
  if (/rear|зад/.test(text)) return "rear";
  return "any";
}

function articleScore(article, intent, query) {
  const hints = Array.isArray(intent?.goods_group_hints) ? intent.goods_group_hints : [];
  const groupCode = String(article?.goodsGroupCode || "").toLowerCase();
  const groupName = normalizeText(article?.goodsGroupName);
  const description = normalizeText(article?.description);
  const queryText = normalizeText([query, intent?.part_name].filter(Boolean).join(" "));
  let score = 0;

  if (hints.includes(groupCode)) score += 120;
  if (hints.some((hint) => groupName.includes(normalizeText(hint)))) score += 45;

  const qTokens = tokens(queryText);
  const hay = groupName + " " + description;
  for (const token of qTokens) {
    if (hay.includes(token)) score += token.length >= 5 ? 8 : 4;
  }

  const wantedAxle = String(intent?.axle || "any");
  const actualAxle = canonicalAxle(article?.fitAxle);
  if (wantedAxle === "front") {
    if (actualAxle === "rear") return -1000;
    score += actualAxle === "front" ? 70 : 0;
  } else if (wantedAxle === "rear") {
    if (actualAxle === "front") return -1000;
    score += actualAxle === "rear" ? 70 : 0;
  }

  return score;
}

function selectVerifiedArticles(info, intent, query, limit = 8) {
  const articles = Array.isArray(info?.articles) ? info.articles : [];
  const ranked = articles
    .map((article) => ({ article, score: articleScore(article, intent, query) }))
    .filter(({ score }) => score >= 15)
    .sort((a, b) => b.score - a.score);

  const seen = new Set();
  const result = [];
  for (const { article, score } of ranked) {
    const key =
      compactText(article?.brandName) + "|" +
      compactText(article?.brandNumber);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push({
      brand: article?.brandName || null,
      article: article?.brandNumber || null,
      description: article?.description || article?.goodsGroupName || null,
      goods_group_code: article?.goodsGroupCode || null,
      goods_group_name: article?.goodsGroupName || null,
      fit_axle: article?.fitAxle || null,
      score
    });
    if (result.length >= limit) break;
  }
  return result;
}

function vehicleSpecsForIntent(info, intent) {
  const special = String(intent?.special_category || "none");
  if (special === "wipers" && info?.wipers) {
    return { kind: "wipers", data: info.wipers };
  }
  if (special === "tires" && info?.tires) {
    return { kind: "tires", data: info.tires };
  }
  if (special === "wheels" && info?.disks) {
    return { kind: "wheels", data: info.disks };
  }
  return null;
}

module.exports = {
  ABCP_CARBASE_CAPABILITIES,
  ABCP_CARBASE_GOODS_GROUPS,
  createAbcpCarbaseProvider,
  asCatalogProvider,
  catalogCoverageForIntent,
  normalizeText,
  compactText,
  tokens,
  yearFits,
  flattenModels,
  flattenModifications,
  scoreManufacturer,
  scoreModel,
  scoreModification,
  resolveVehicleCatalog,
  selectVerifiedArticles,
  vehicleSpecsForIntent
};
