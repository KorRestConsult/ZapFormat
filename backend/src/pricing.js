"use strict";

function asMoney(value) {
  // Missing supplier prices must never become a fictitious zero-ruble offer.
  if (value === null || value === undefined || typeof value === "boolean") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function customerPrice(procurementPrice, env = process.env) {
  const procurement = asMoney(procurementPrice);
  if (procurement === null) return null;

  const markupPercent = Math.max(0, Number(env.DEFAULT_MARKUP_PERCENT || 15));
  const minMarkup = Math.max(0, Number(env.MIN_MARKUP_RUB || 0));
  // Work in integer kopecks to avoid floating-point under-rounding:
  // 100.50 RUB + 15% must become 115.58, never 115.57.
  if (!Number.isFinite(markupPercent) || !Number.isFinite(minMarkup)) return null;
  const procurementKopecks = Math.round(procurement * 100);
  const percentageKopecks = Math.round(procurementKopecks * markupPercent / 100);
  const minimumKopecks = Math.round(minMarkup * 100);
  return asMoney((procurementKopecks + Math.max(percentageKopecks, minimumKopecks)) / 100);
}

module.exports = {
  asMoney,
  customerPrice
};
