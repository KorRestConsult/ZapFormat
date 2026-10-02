"use strict";

function text(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compact(value) {
  return text(value).replace(/\s+/g, "");
}

const CATEGORY_TERMS = Object.freeze({
  brake_pad: ["тормозн", "колод"],
  brake_disk: ["тормозн", "диск"],
  brake_drum: ["тормозн", "барабан"],
  oil_filter: ["маслян", "фильтр"],
  air_filter: ["воздуш", "фильтр"],
  cabin_filter: ["салон", "фильтр"],
  fuel_filter: ["топлив", "фильтр"],
  clutch: ["сцеплен"],
  drain_plug_seal: ["слив", "пробк", "уплот", "шайб"],
  spark_plugs: ["свеч", "зажиган"],
  radiator: ["радиатор"],
  engine_mount: ["опор", "двигател", "подуш"],
  transmission_mount: ["опор", "короб", "кпп", "подуш"],
  stabilizer_bushing: ["втул", "стабилиз"],
  shock_absorber: ["амортиз"],
  wheel_bearing: ["ступич", "подшипник"]
});

function queryTokens(value) {
  const stop = new Set(["для","мой","моя","мою","авто","машин","нужен","нужна","нужны","найди","подбери","купить","шт"]);
  return text(value).split(" ").filter((x) => x.length >= 3 && !stop.has(x));
}

function nodeDepth(row, byId) {
  let depth = 0;
  let current = row;
  const seen = new Set();
  while (current && Number(current.pi) && !seen.has(String(current.pi)) && depth < 12) {
    seen.add(String(current.pi));
    current = byId.get(String(current.pi));
    depth += 1;
  }
  return depth;
}

function nodeScore(row, intent, query, byId) {
  const label = text(row?.d);
  if (!label) return -1000;

  const category = String(intent?.category || "");
  const terms = CATEGORY_TERMS[category] || [];
  let score = 0;

  for (const term of terms) {
    if (label.includes(term)) score += 34;
  }

  for (const token of queryTokens([intent?.part_name, query].filter(Boolean).join(" "))) {
    if (label.includes(token)) score += token.length >= 6 ? 16 : 9;
  }

  const axle = String(intent?.axle || "any");
  if (axle === "front") {
    if (/перед/.test(label)) score += 22;
    if (/зад/.test(label)) score -= 30;
  } else if (axle === "rear") {
    if (/зад/.test(label)) score += 22;
    if (/перед/.test(label)) score -= 30;
  }

  const side = String(intent?.side || "any");
  if (side === "left") {
    if (/лев/.test(label)) score += 12;
    if (/прав/.test(label)) score -= 12;
  } else if (side === "right") {
    if (/прав/.test(label)) score += 12;
    if (/лев/.test(label)) score -= 12;
  }

  score += Math.min(12, nodeDepth(row, byId) * 2);
  return score;
}

function selectFapiNodes(tree, intent, query, limit = 4) {
  const rows = Array.isArray(tree) ? tree.filter(Boolean) : [];
  const byId = new Map(rows.map((row) => [String(row.i), row]));
  return rows
    .map((row) => ({ row, score: nodeScore(row, intent, query, byId) }))
    .filter((x) => x.score >= 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, limit))
    .map(({ row, score }) => ({
      id: Number(row.i),
      name: String(row.d || "").trim(),
      parent_id: Number(row.pi || 0),
      score
    }));
}


function modificationRows(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.m)) return value.m;
  return [];
}

function productionTime(value) {
  const t = Date.parse(String(value || ""));
  return Number.isFinite(t) ? t : null;
}

function selectFapiModification(value, decoded) {
  const rows = modificationRows(value);
  const wantedPower = Number(decoded?.power_kw);
  const wantedDate = productionTime(decoded?.production_date);
  const vinEngine = compact(decoded?.engine_code || "");
  const scored = rows.map((row) => {
    let score = 0;
    const power = Number(row?.power);
    if (Number.isFinite(wantedPower) && Number.isFinite(power)) {
      score += power === wantedPower ? 120 : -Math.min(80, Math.abs(power - wantedPower) * 3);
    }

    const rowEngine = compact(row?.engineCode || "");
    if (vinEngine && rowEngine) {
      if (rowEngine === vinEngine) score += 100;
      else if (rowEngine.includes(vinEngine) || vinEngine.includes(rowEngine)) score += 60;
      else if (vinEngine.startsWith("n47") && rowEngine.startsWith("n47")) score += 45;
    }

    if (wantedDate) {
      const from = Number(row?.cb || 0);
      const to = Number(row?.ce || 0);
      if (from && wantedDate >= from && (!to || wantedDate <= to)) score += 35;
      else if (from || to) score -= 80;
    }

    const model = text(decoded?.model_name || "");
    const full = text(row?.fd || row?.d || "");
    if (model && full && model.split(" ").some((token) => token.length >= 3 && full.includes(token))) score += 10;

    return { row, score };
  }).sort((a,b)=>b.score-a.score);

  const best=scored[0];
  const second=scored[1];
  if(!best || best.score < 100) return null;
  if(second && best.score-second.score < 20) return null;
  return {
    id: Number(best.row.dbi || 0) || null,
    name: String(best.row.fd || best.row.d || "").trim() || null,
    short_name: String(best.row.d || "").trim() || null,
    engine_type: best.row.engineType || null,
    engine_code: best.row.engineCode || null,
    power_kw: Number(best.row.power) || null,
    capacity: best.row.capacity || null,
    drive_type: best.row.driveType || null,
    body_type: best.row.bodyType || null,
    score: best.score
  };
}

function uniqueOemRows(rows, limit = 16) {
  const seen = new Set();
  const out = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const brand = String(row?.mfd || "").trim();
    const article = String(row?.n || "").trim();
    const normalized = String(row?.ns || compact(article)).toUpperCase();
    if (!brand || !article || !normalized) continue;
    const key = brand.toUpperCase() + "|" + normalized;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      manufacturer_id: row?.mfi ?? null,
      brand,
      article,
      article_normalized: normalized,
      description: String(row?.d || "Оригинальная деталь").trim(),
      fit: row?.fit || null
    });
    if (out.length >= limit) break;
  }
  return out;
}

function analogCandidates(response, sourceArticle, limit = 20) {
  const manufacturers = new Map(
    (response?.manufacturerList?.mf || []).map((row) => [
      String(row.i),
      String(row.ds || row.da || "").trim()
    ])
  );
  const products = new Map(
    (response?.productList?.p || []).map((row) => [
      String(row.mfi) + "|" + String(row.ns || "").toUpperCase(),
      row
    ])
  );
  const sourceNs = compact(sourceArticle).toUpperCase();
  const seen = new Set();
  const out = [];

  for (const link of response?.analogList?.a || []) {
    if (String(link.ns || "").toUpperCase() !== sourceNs) continue;
    const key = String(link.mfai) + "|" + String(link.nsa || "").toUpperCase();
    if (seen.has(key)) continue;
    const product = products.get(key);
    const brand = manufacturers.get(String(link.mfai)) || null;
    const article = product?.n || link.nsa || null;
    if (!brand || !article) continue;
    seen.add(key);
    out.push({
      manufacturer_id: link.mfai ?? null,
      brand,
      article: String(article),
      description: String(product?.d || "Аналог").trim(),
      rating_plus: Number(link.rp || 0),
      rating_minus: Number(link.rm || 0)
    });
    if (out.length >= limit) break;
  }
  return out.sort((a, b) =>
    (b.rating_plus - b.rating_minus) - (a.rating_plus - a.rating_minus)
  );
}

module.exports = {
  CATEGORY_TERMS,
  selectFapiNodes,
  modificationRows,
  selectFapiModification,
  uniqueOemRows,
  analogCandidates
};
