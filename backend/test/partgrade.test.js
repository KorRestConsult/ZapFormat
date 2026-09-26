"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createPartGradeClient, PartGradeError } = require("../src/partgrade");
const { customerPrice } = require("../src/pricing");

const env = {
  PARTGRADE_API_BASE: "https://auto-complekt.public.api.abcp.ru",
  PARTGRADE_API_LOGIN: "client@example.com",
  PARTGRADE_API_PASSWORD_MD5: "0123456789abcdef0123456789abcdef"
};

test("brand search uses the documented ABCP request", async () => {
  let request;
  const client = createPartGradeClient({ env, fetchImpl: async (url) => {
    request = new URL(url);
    return new Response(JSON.stringify({ PATRONPRS3420: { brand: "PATRON", number: "PRS3420" } }));
  }});
  const result = await client.searchBrands("PRS3420");
  assert.equal(request.pathname, "/search/brands/");
  assert.equal(request.searchParams.get("number"), "PRS3420");
  assert.equal(request.searchParams.get("useOnlineStocks"), "1");
  assert.equal(result[0].brand, "PATRON");
});

test("offer search preserves an upstream denial", async () => {
  const client = createPartGradeClient({ env, fetchImpl: async () => new Response(
    JSON.stringify({ errorCode: 103, errorMessage: "Access to requested operation is denied" }),
    { status: 403 }
  )});
  await assert.rejects(() => client.searchArticles("PRS3420", "PATRON"), error =>
    error instanceof PartGradeError && error.status === 403 && error.upstreamCode === 103
  );
});

test("pricing returns only the marked-up customer price", () => {
  assert.equal(customerPrice(4595, { DEFAULT_MARKUP_PERCENT: "15", MIN_MARKUP_RUB: "0" }), 5285);
  assert.equal(customerPrice(100, { DEFAULT_MARKUP_PERCENT: "10", MIN_MARKUP_RUB: "50" }), 150);
});
