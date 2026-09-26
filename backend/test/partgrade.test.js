"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createPartGradeClient, PartGradeError } = require("../src/partgrade");
const { customerPrice } = require("../src/pricing");

test("PartGrade client sends ABCP login and MD5 password", async () => {
  let seenUrl = null;
  const client = createPartGradeClient({
    env: {
      PARTGRADE_API_BASE: "https://auto-complekt.public.api.abcp.ru",
      PARTGRADE_API_LOGIN: "demo@example.com",
      PARTGRADE_API_PASSWORD_MD5: "0123456789abcdef0123456789abcdef"
    },
    fetchImpl: async (url) => {
      seenUrl = new URL(url);
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify([{ brand: "PATRON", number: "PRS3420" }]);
        }
      };
    }
  });

  const result = await client.searchBrands("PRS3420");
  assert.equal(result[0].brand, "PATRON");
  assert.equal(seenUrl.hostname, "auto-complekt.public.api.abcp.ru");
  assert.equal(seenUrl.pathname, "/search/brands/");
  assert.equal(seenUrl.searchParams.get("userlogin"), "demo@example.com");
  assert.equal(
    seenUrl.searchParams.get("userpsw"),
    "0123456789abcdef0123456789abcdef"
  );
  assert.equal(seenUrl.searchParams.get("number"), "PRS3420");
});

test("PartGrade client refuses an unconfigured credential set", async () => {
  const client = createPartGradeClient({
    env: {},
    fetchImpl: async () => {
      throw new Error("must not run");
    }
  });

  await assert.rejects(
    () => client.searchBrands("PRS3420"),
    (error) => error instanceof PartGradeError && error.code === "partgrade_not_configured"
  );
});

test("customer pricing never returns procurement price when markup is configured", () => {
  assert.equal(
    customerPrice(4595, { DEFAULT_MARKUP_PERCENT: "15", MIN_MARKUP_RUB: "0" }),
    5284.25
  );
  assert.equal(
    customerPrice(100, { DEFAULT_MARKUP_PERCENT: "15", MIN_MARKUP_RUB: "50" }),
    150
  );
});


test("ABCP TS cart create keeps supplier routing fields backend-only", async () => {
  let seen = null;
  const client = createPartGradeClient({
    env: {
      PARTGRADE_API_BASE: "https://auto-complekt.public.api.abcp.ru",
      PARTGRADE_API_LOGIN: "demo@example.com",
      PARTGRADE_API_PASSWORD_MD5: "0123456789abcdef0123456789abcdef"
    },
    fetchImpl: async (url, options) => {
      seen = { url: new URL(url), options };
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({ id: 321 });
        }
      };
    }
  });

  const result = await client.tsCartCreate({
    brand: "PATRON",
    number: "PRS3420",
    quantity: 2,
    supplierCode: "SUP-1",
    itemKey: "ITEM-ABC"
  });

  assert.equal(result.id, 321);
  assert.equal(seen.url.pathname, "/ts/cart/create");
  assert.equal(seen.options.method, "POST");
  const body = new URLSearchParams(seen.options.body);
  assert.equal(body.get("brand"), "PATRON");
  assert.equal(body.get("number"), "PRS3420");
  assert.equal(body.get("quantity"), "2");
  assert.equal(body.get("supplierCode"), "SUP-1");
  assert.equal(body.get("itemKey"), "ITEM-ABC");
  assert.equal(body.get("userlogin"), "demo@example.com");
});
