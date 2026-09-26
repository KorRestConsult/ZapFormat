"use strict";

function customerPrice(value, env = process.env) {
  const purchase = Number(value);
  if (!Number.isFinite(purchase) || purchase <= 0) return null;
  const percent = Math.max(0, Number(env.DEFAULT_MARKUP_PERCENT || 15));
  const minimum = Math.max(0, Number(env.MIN_MARKUP_RUB || 0));
  return Math.ceil(Math.max(purchase * (1 + percent / 100), purchase + minimum));
}

module.exports = { customerPrice };
