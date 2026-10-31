"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizedQuantity, summarizeIntake } = require("../src/physical-intake");

test("an incomplete order never becomes ready from supplier promises", () => {
  const state = summarizeIntake([
    { quantity: 2, received_quantity: 2, supplier_status: "finished", status: "ready" },
    { quantity: 1, received_quantity: 0, supplier_status: "finished", status: "processing" }
  ]);
  assert.equal(state.intake_state, "partial");
  assert.equal(state.ready_for_packaging, false);
  assert.equal(state.missing_quantity, 1);
});

test("a fully physically received order is ready for packaging", () => {
  const state = summarizeIntake([
    { quantity: 2, received_quantity: 2, status: "ready" },
    { quantity: 1, received_quantity: 1, status: "ready" }
  ]);
  assert.equal(state.ready_for_packaging, true);
  assert.equal(state.intake_state, "received");
});

test("cancelled lines require manual resolution even if other goods arrived", () => {
  assert.equal(summarizeIntake([
    { quantity: 1, received_quantity: 1, status: "ready" },
    { quantity: 1, received_quantity: 0, status: "cancelled" }
  ]).ready_for_packaging, false);
});

test("received quantity is absolute and bounded by ordered quantity", () => {
  assert.equal(normalizedQuantity(0, 4), 0);
  assert.equal(normalizedQuantity(3, 4), 3);
  for (const n of [-1, 1.5, 5, NaN, "2"]) {
    assert.throws(() => normalizedQuantity(n, 4), { code: "invalid_received_quantity" });
  }
});
