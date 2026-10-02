const test = require("node:test");
const assert = require("node:assert/strict");
const { createFapiClient, FapiError } = require("../src/fapi");

test("FAPI client reports missing server-side key", async () => {
  const old = process.env.FAPI_API_KEY;
  delete process.env.FAPI_API_KEY;
  try {
    const client = createFapiClient({ fetchImpl: async () => { throw new Error("must not fetch"); } });
    assert.equal(client.configured(), false);
    await assert.rejects(() => client.usage(), (error) => {
      assert.ok(error instanceof FapiError);
      assert.equal(error.code, "fapi_not_configured");
      return true;
    });
  } finally {
    if (old === undefined) delete process.env.FAPI_API_KEY;
    else process.env.FAPI_API_KEY = old;
  }
});

test("FAPI client sends bearer key only in request header", async () => {
  const old = process.env.FAPI_API_KEY;
  process.env.FAPI_API_KEY = "iis_test_key_value";
  let captured = null;
  try {
    const client = createFapiClient({
      fetchImpl: async (url, options) => {
        captured = { url: String(url), options };
        return {
          ok: true,
          status: 200,
          async text() { return JSON.stringify({ account: { st: "allowed" } }); }
        };
      }
    });
    await client.usage();
    assert.match(captured.url, /\/fapi\/v2\/usage$/);
    assert.equal(captured.options.headers.authorization, "Bearer iis_test_key_value");
    assert.equal(captured.url.includes("iis_test_key_value"), false);
  } finally {
    if (old === undefined) delete process.env.FAPI_API_KEY;
    else process.env.FAPI_API_KEY = old;
  }
});

test("FAPI VIN request passes VIN as query parameter", async () => {
  const old = process.env.FAPI_API_KEY;
  process.env.FAPI_API_KEY = "iis_test_key_value";
  let requested = "";
  try {
    const client = createFapiClient({
      fetchImpl: async (url) => {
        requested = String(url);
        return {
          ok: true,
          status: 200,
          async text() { return JSON.stringify({ confidence: "exact", dt_type_id: 123 }); }
        };
      }
    });
    const data = await client.decodeVin("WBAWY31000L527390");
    assert.equal(data.dt_type_id, 123);
    assert.match(requested, /vin=WBAWY31000L527390/);
  } finally {
    if (old === undefined) delete process.env.FAPI_API_KEY;
    else process.env.FAPI_API_KEY = old;
  }
});
