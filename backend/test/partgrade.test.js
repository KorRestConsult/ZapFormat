"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createPartGradeClient, PartGradeError } = require("../src/partgrade");

const ENV = {
  PARTGRADE_API_BASE: "https://auto-complekt.public.api.abcp.ru",
  PARTGRADE_API_LOGIN: "demo@example.com",
  PARTGRADE_API_PASSWORD_MD5: "0123456789abcdef0123456789abcdef"
};

test("searchBrands uses official ABCP query shape", async () => {
  let seen;
  const client = createPartGradeClient({
    env: ENV,
    fetchImpl: async (url) => {
      seen = new URL(url);
      return new Response(JSON.stringify({
        PATRONPRS3420: {
          brand: "PATRON",
          number: "PRS3420",
          numberFix: "PRS3420",
          description: "Радиатор",
          availability: true
        }
      }), { status: 200 });
    }
  });

  const rows = await client.searchBrands("PRS3420");
  assert.equal(seen.pathname, "/search/brands/");
  assert.equal(seen.searchParams.get("userlogin"), ENV.PARTGRADE_API_LOGIN);
  assert.equal(seen.searchParams.get("userpsw"), ENV.PARTGRADE_API_PASSWORD_MD5);
  assert.equal(seen.searchParams.get("number"), "PRS3420");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].brand, "PATRON");
});

test("searchArticles uses only documented required parameters", async () => {
  let seen;
  const client = createPartGradeClient({
    env: ENV,
    fetchImpl: async (url) => {
      seen = new URL(url);
      return new Response(JSON.stringify([{
        brand: "PATRON",
        number: "PRS3420",
        price: 4595,
        availability: 10,
        deliveryPeriod: 24
      }]), { status: 200 });
    }
  });

  const rows = await client.searchArticles("PRS3420", "PATRON");
  assert.equal(seen.pathname, "/search/articles/");
  assert.equal(seen.searchParams.get("number"), "PRS3420");
  assert.equal(seen.searchParams.get("brand"), "PATRON");
  assert.equal(seen.searchParams.has("locale"), false);
  assert.equal(seen.searchParams.has("useOnlineStocks"), false);
  assert.equal(rows[0].price, 4595);
});

test("ABCP error code is preserved without reinterpreting it", async () => {
  const client = createPartGradeClient({
    env: ENV,
    fetchImpl: async () => new Response(JSON.stringify({
      errorCode: 103,
      errorMessage: "Access to requested operation is denied"
    }), { status: 403 })
  });

  await assert.rejects(
    () => client.searchArticles("PRS3420", "PATRON"),
    (error) => {
      assert.ok(error instanceof PartGradeError);
      assert.equal(error.status, 403);
      assert.equal(error.upstreamCode, 103);
      return true;
    }
  );
});
