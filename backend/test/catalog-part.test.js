"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { summarizePublicOffers } = require("../src/server");

test("offer summary stays empty when no public offers exist", () => {
  assert.deepEqual(summarizePublicOffers([]), {
    count: 0,
    available_count: 0,
    price_min: null,
    price_max: null,
    stock_total: 0,
    fastest_hours: null,
    returnable_offers: 0,
    high_probability_offers: 0,
    balance_offer_ref: null
  });
});

test("offer summary uses only available offers for shopping metrics", () => {
  const summary = summarizePublicOffers([
    {
      offer_ref: "cheap-slow",
      price: 4500,
      availability: 10,
      delivery_hours: 96,
      delivery_probability: 90,
      returnable: true
    },
    {
      offer_ref: "balanced",
      price: 4800,
      availability: 8,
      delivery_hours: 24,
      delivery_probability: 97,
      returnable: true
    },
    {
      offer_ref: "unavailable",
      price: 1000,
      availability: 0,
      delivery_hours: 1,
      delivery_probability: 100,
      returnable: true
    }
  ]);

  assert.equal(summary.count, 3);
  assert.equal(summary.available_count, 2);
  assert.equal(summary.price_min, 4500);
  assert.equal(summary.price_max, 4800);
  assert.equal(summary.stock_total, 18);
  assert.equal(summary.fastest_hours, 24);
  assert.equal(summary.returnable_offers, 2);
  assert.equal(summary.high_probability_offers, 2);
  assert.equal(summary.balance_offer_ref, "balanced");
});

test("balance offer never points to an unavailable row", () => {
  const summary = summarizePublicOffers([
    {
      offer_ref: "none",
      price: 100,
      availability: 0,
      delivery_hours: 1,
      delivery_probability: 100,
      returnable: true
    },
    {
      offer_ref: "live",
      price: 500,
      availability: 1,
      delivery_hours: 48,
      delivery_probability: 80,
      returnable: false
    }
  ]);
  assert.equal(summary.balance_offer_ref, "live");
});
