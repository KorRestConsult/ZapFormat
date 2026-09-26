"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  looksLikeArticle,
  looksLikeVin,
  outputText,
  safeVehicleContext,
  sanitizeIntent
} = require("../src/ai");

test("recognizes article-like queries but not VINs or natural language", () => {
  assert.equal(looksLikeArticle("PRS3420"), true);
  assert.equal(looksLikeArticle("HK0810"), true);
  assert.equal(looksLikeArticle("передние колодки"), false);
  assert.equal(looksLikeVin("X9F5XXEED56R37916"), true);
  assert.equal(looksLikeArticle("X9F5XXEED56R37916"), false);
});

test("vehicle context excludes VIN and plate", () => {
  assert.deepEqual(
    safeVehicleContext({
      brand: "Ford",
      model: "Focus",
      generation: "II",
      year: 2006,
      engine: "1.8",
      vin: "X9F5XXEED56R37916",
      plate_number: "A000AA62"
    }),
    {
      brand: "Ford",
      model: "Focus",
      generation: "II",
      year: "2006",
      engine: "1.8"
    }
  );
});

test("extracts output text from Responses API payload", () => {
  assert.equal(
    outputText({
      output: [{
        content: [{ type: "output_text", text: "{\"kind\":\"part_name\"}" }]
      }]
    }),
    "{\"kind\":\"part_name\"}"
  );
});

test("sanitizer rejects an article the user never typed", () => {
  const result = sanitizeIntent({
    kind: "part_name",
    article: "FAKE123",
    brand_hint: "",
    normalized_query: "передние тормозные колодки",
    part_name: "передние тормозные колодки",
    position: "передняя ось",
    search_terms: ["тормозные колодки", "колодки передние"],
    assistant_text: "Понял запрос.",
    needs_article: true,
    confidence: 0.95
  }, "нужны передние колодки");

  assert.equal(result.article, "");
  assert.equal(result.needs_article, true);
  assert.equal(result.part_name, "передние тормозные колодки");
});

test("sanitizer accepts only an explicit article from the user's query", () => {
  const result = sanitizeIntent({
    kind: "article",
    article: "PRS3420",
    brand_hint: "PATRON",
    normalized_query: "PATRON PRS3420",
    part_name: "",
    position: "",
    search_terms: [],
    assistant_text: "Нашёл явный артикул.",
    needs_article: false,
    confidence: 1
  }, "найди PATRON PRS3420");

  assert.equal(result.article, "PRS3420");
  assert.equal(result.needs_article, false);
});
