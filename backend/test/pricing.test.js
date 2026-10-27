"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { asMoney, customerPrice } = require("../src/pricing");

test("missing or invalid supplier prices never become zero-price offers", () => {
  for (const input of [undefined, null, "", "  ", true, false, -1, "not-a-number", Infinity, NaN]) {
    assert.equal(asMoney(input), null, "invalid input: " + String(input));
    assert.equal(customerPrice(input), null, "invalid quote: " + String(input));
  }
});

test("a genuinely free confirmed supplier item can be priced at zero", () => {
  assert.equal(asMoney(0), 0);
  assert.equal(customerPrice(0, { DEFAULT_MARKUP_PERCENT: "15", MIN_MARKUP_RUB: "0" }), 0);
});

test("existing pricing policy is unchanged: 15% markup by default", () => {
  assert.equal(customerPrice(1000, {}), 1150);
  assert.equal(customerPrice(2000, {}), 2300);
  assert.equal(customerPrice(1000, { DEFAULT_MARKUP_PERCENT: "15", MIN_MARKUP_RUB: "0" }), 1150);
});

test("minimum ruble markup wins only when greater than percentage markup", () => {
  assert.equal(customerPrice(100, { DEFAULT_MARKUP_PERCENT: "10", MIN_MARKUP_RUB: "40" }), 140);
  assert.equal(customerPrice(1000, { DEFAULT_MARKUP_PERCENT: "10", MIN_MARKUP_RUB: "40" }), 1100);
});

test("money is rounded to kopecks and invalid negative procurement is rejected", () => {
  assert.equal(asMoney(14.999), 15);
  assert.equal(customerPrice("100.50", { DEFAULT_MARKUP_PERCENT: "15", MIN_MARKUP_RUB: "0" }), 115.58);
  assert.equal(customerPrice(-10), null);
});
