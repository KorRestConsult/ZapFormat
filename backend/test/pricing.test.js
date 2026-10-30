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

test("saved policy applies four price bands and a minimum profit", () => {
  const { setPricingPolicy, getPricingPolicy } = require("../src/pricing");
  const policy={
    tiers:[
      {id:"low",percent:90},
      {id:"medium",percent:70},
      {id:"high",percent:25},
      {id:"premium",percent:10}
    ],
    min_markup_rub:250,
    round_to:10
  };
  try {
    setPricingPolicy(policy);
    assert.deepEqual(getPricingPolicy(),policy);
    assert.equal(customerPrice(194),450);
    assert.equal(customerPrice(1183),2020);
    assert.equal(customerPrice(4000),5000);
    assert.equal(customerPrice(10000),11000);
  } finally {
    setPricingPolicy(null);
  }
});

test("invalid policies never replace saved markup settings", () => {
  const { setPricingPolicy, getPricingPolicy } = require("../src/pricing");
  const old=getPricingPolicy();
  assert.throws(()=>setPricingPolicy({tiers:[],min_markup_rub:0,round_to:1}),/invalid_pricing_tiers/);
  assert.deepEqual(getPricingPolicy(),old);
});

test("owner pricing API and catalog checkout packing rule are server-side", () => {
  const { readFileSync }=require("node:fs");
  const { resolve }=require("node:path");
  const source=readFileSync(resolve(__dirname,"../src/server.js"),"utf8");
  const auth=source.indexOf('app.use("/api/admin", requireDatabase, requireUser, requireAdmin)');
  assert.ok(source.indexOf('app.get("/api/admin/pricing"')>auth);
  assert.ok(source.indexOf('app.put("/api/admin/pricing"')>auth);
  assert.ok(source.includes('INSERT INTO store_pricing_settings'));
  assert.ok(source.includes('requested < offer.packing ? "minimum_quantity"'));
});
