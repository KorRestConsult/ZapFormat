"use strict";

function toMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function customerPrice(purchase, env = process.env) {
  const base = toMoney(purchase);
  if (base === null) return null;

  const percent = Math.max(0, Number(env.DEFAULT_MARKUP_PERCENT || 15));
  const minMarkup = Math.max(0, Number(env.MIN_MARKUP_RUB || 0));
  const markup = Math.max(base * percent / 100, minMarkup);
  return Math.round((base + markup) * 100) / 100;
}

module.exports = { customerPrice };
