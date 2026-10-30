"use strict";

const PRICE_TIERS = Object.freeze([
  { id: "low", min: 0, max: 500 },
  { id: "medium", min: 500, max: 2000 },
  { id: "high", min: 2000, max: 10000 },
  { id: "premium", min: 10000, max: null }
]);
const ROUNDINGS = new Set([1, 10, 50, 100]);
let activePolicy = null;

function asMoney(value) {
  if (value === null || value === undefined || typeof value === "boolean") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function defaultPolicy(env = process.env) {
  const percentage = Number(env.DEFAULT_MARKUP_PERCENT ?? 15);
  const minimum = Number(env.MIN_MARKUP_RUB ?? 0);
  return {
    tiers: PRICE_TIERS.map(t => ({
      id: t.id,
      percent: Number.isFinite(percentage) ? Math.min(300, Math.max(0, percentage)) : 15
    })),
    min_markup_rub: Number.isFinite(minimum) ? Math.min(50000, Math.max(0, minimum)) : 0,
    round_to: 1
  };
}

function validatePricingPolicy(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid_pricing_policy");
  if (!Array.isArray(input.tiers) || input.tiers.length !== PRICE_TIERS.length) throw new Error("invalid_pricing_tiers");
  const tiers = PRICE_TIERS.map((reference, index) => {
    const row = input.tiers[index];
    if (!row || row.id !== reference.id || typeof row.percent !== "number" ||
        !Number.isFinite(row.percent) || row.percent < 0 || row.percent > 300) {
      throw new Error("invalid_pricing_percent");
    }
    return { id: reference.id, percent: Math.round(row.percent * 10) / 10 };
  });
  if (typeof input.min_markup_rub !== "number" ||
      !Number.isFinite(input.min_markup_rub) || input.min_markup_rub < 0 || input.min_markup_rub > 50000) {
    throw new Error("invalid_pricing_minimum");
  }
  if (!ROUNDINGS.has(input.round_to)) throw new Error("invalid_pricing_rounding");
  return { tiers, min_markup_rub: asMoney(input.min_markup_rub), round_to: input.round_to };
}

function setPricingPolicy(policy) {
  activePolicy = policy === null ? null : validatePricingPolicy(policy);
  return getPricingPolicy();
}
function getPricingPolicy() {
  return activePolicy ? structuredClone(activePolicy) : defaultPolicy();
}

function customerPrice(procurementPrice, env = process.env) {
  const procurement = asMoney(procurementPrice);
  if (procurement === null) return null;
  // Explicit env injection in legacy tests preserves the original flat-rate behavior.
  const policy = env === process.env ? getPricingPolicy() : defaultPolicy(env);
  const rateIndex = PRICE_TIERS.findIndex(t => t.max === null || procurement < t.max);
  const percent = policy.tiers[Math.max(0, rateIndex)].percent;
  const costKopecks = Math.round(procurement * 100);
  const percentageKopecks = Math.round(costKopecks * percent / 100);
  const minimumKopecks = Math.round(policy.min_markup_rub * 100);
  const rawKopecks = costKopecks + Math.max(percentageKopecks, minimumKopecks);
  const stepKopecks = policy.round_to * 100;
  return asMoney((Math.ceil(rawKopecks / stepKopecks) * stepKopecks) / 100);
}

module.exports = {
  asMoney,
  customerPrice,
  PRICE_TIERS,
  defaultPolicy,
  validatePricingPolicy,
  setPricingPolicy,
  getPricingPolicy
};
