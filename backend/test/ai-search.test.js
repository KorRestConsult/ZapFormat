"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { fallbackIntent, interpretSearch } = require("../src/ai-search");

test("fallback parser recognizes front brake pads without inventing an article", () => {
  const intent = fallbackIntent("нужны передние тормозные колодки", {
    brand: "FORD",
    model: "Focus",
    year: 2006,
    engine: "1.8"
  });
  assert.equal(intent.category, "brake_pad");
  assert.equal(intent.axle, "front");
  assert.deepEqual(intent.goods_group_hints, ["brake_pad"]);
  assert.equal(Object.prototype.hasOwnProperty.call(intent, "article"), false);
});

test("fallback parser asks which filter was meant", () => {
  const intent = fallbackIntent("нужен фильтр", null);
  assert.equal(intent.category, "filter_ambiguous");
  assert.equal(intent.clarification_needed, true);
  assert.match(intent.clarification_question, /масляный/);
});

test("AI search uses deterministic fallback when no API key is configured", async () => {
  let called = false;
  const result = await interpretSearch(
    "задние тормозные диски",
    { brand: "FORD", model: "Focus", year: 2006 },
    {
      apiKey: "",
      fetchImpl: async () => {
        called = true;
        throw new Error("must not call");
      }
    }
  );
  assert.equal(called, false);
  assert.equal(result.mode, "fallback");
  assert.equal(result.intent.category, "brake_disk");
  assert.equal(result.intent.axle, "rear");
});


test("fallback parser recognizes clutch request", () => {
  const intent = fallbackIntent("нужно сцепление на Ford Focus", {
    brand: "FORD",
    model: "Focus",
    year: 2006,
    engine: "1.8"
  });
  assert.equal(intent.category, "clutch");
  assert.deepEqual(intent.goods_group_hints, ["clutch"]);
  assert.equal(intent.clarification_needed, false);
});
