"use strict";

// Manual catalog navigation is not a VIN fitment proof. The customer chooses
// the actual model/modification and an operator verifies applicability.
const rows = (response, key) =>
  Array.isArray(response?.[key]) ? response[key] : (Array.isArray(response) ? response : []);

function validCatalogId(raw) {
  const text = String(raw ?? "").trim();
  if (!/^[1-9][0-9]{0,11}$/.test(text)) return null;
  const id = Number(text);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function yearFromEpoch(value) {
  const ts = Number(value);
  if (!Number.isFinite(ts) || ts <= 0) return null;
  const year = new Date(ts).getUTCFullYear();
  return year >= 1900 && year <= 2100 ? year : null;
}

function cleanLabel(value) {
  return String(value ?? "").trim().slice(0, 180);
}

function mapManufacturers(response) {
  return rows(response, "mf").map((row) => ({
    // FAPI's row index i is NOT the stable manufacturer identifier.
    id: validCatalogId(row?.dbi),
    name: cleanLabel(row?.ds || row?.da)
  })).filter((row) => row.id && row.name)
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

function mapModels(response) {
  return rows(response, "m").map((row) => ({
    // FAPI's dbi is the catalog key required by modificationList(mi).
    id: validCatalogId(row?.dbi),
    name: cleanLabel(row?.d || row?.fd),
    year_from: yearFromEpoch(row?.cb),
    year_to: yearFromEpoch(row?.ce)
  })).filter((row) => row.id && row.name);
}

function mapModifications(response) {
  return rows(response, "m").map((row) => ({
    // The response index i is not the modification key for treeList(mi).
    id: validCatalogId(row?.dbi),
    name: cleanLabel(row?.d || row?.fd),
    year_from: yearFromEpoch(row?.cb),
    year_to: yearFromEpoch(row?.ce),
    engine_code: cleanLabel(row?.engineCode) || null,
    engine_type: cleanLabel(row?.engineType) || null,
    power_kw: Number.isFinite(Number(row?.power)) && row?.power !== null && row?.power !== "" ? Number(row.power) : null,
    capacity: row?.capacity ?? null,
    drive_type: cleanLabel(row?.driveType) || null,
    body_type: cleanLabel(row?.bodyType) || null
  })).filter((row) => row.id && row.name);
}

module.exports = { validCatalogId, mapManufacturers, mapModels, mapModifications };
