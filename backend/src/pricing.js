"use strict";

function asMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function customerPrice(procurementPrice, env = process.env) {
  const procurement = asMoney(procurementPrice);
  if (procurement === null) return null;

  const markupPercent = Math.max(0, Number(env.DEFAULT_MARKUP_PERCENT || 15));
  const minMarkup = Math.max(0, Number(env.MIN_MARKUP_RUB || 0));
  const byPercent = procurement * (1 + markupPercent / 100);
  const byMinimum = procurement + minMarkup;

  return asMoney(Math.max(byPercent, byMinimum));
}

module.exports = {
  asMoney,
  customerPrice
};
