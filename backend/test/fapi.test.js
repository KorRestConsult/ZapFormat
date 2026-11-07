const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
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
      cacheDir: "",
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


test("FAPI client persists catalog cache across client instances", async () => {
  const old = process.env.FAPI_API_KEY;
  process.env.FAPI_API_KEY = "iis_test_key_value";
  const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), "zf-fapi-cache-"));
  let calls = 0;
  try {
    const fetchImpl = async () => {
      calls += 1;
      return {
        ok: true,
        status: 200,
        async text() { return JSON.stringify([{ i: 1, d: "Engine", pi: 0 }]); }
      };
    };

    const first = createFapiClient({ fetchImpl, cacheDir });
    const firstResult = await first.tree(33778);
    assert.equal(firstResult[0].d, "Engine");
    assert.equal(calls, 1);

    const second = createFapiClient({
      cacheDir,
      fetchImpl: async () => {
        throw new Error("persistent cache should avoid a second network call");
      }
    });
    const secondResult = await second.tree(33778);
    assert.equal(secondResult[0].i, 1);
    assert.equal(calls, 1);
  } finally {
    await fs.rm(cacheDir, { recursive: true, force: true });
    if (old === undefined) delete process.env.FAPI_API_KEY;
    else process.env.FAPI_API_KEY = old;
  }
});


test("Corrected VIN decoder ignores legacy brand-only cache and bounds incomplete TTL", async () => {
  const old = process.env.FAPI_API_KEY;
  process.env.FAPI_API_KEY = "unit-test";
  const vin = "TESTVIN1234567890";
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "zf-vin-cache-test-"));
  const crypto = require("node:crypto");
  const filename = (key) => path.join(dir, crypto.createHash("sha256").update(key).digest("hex") + ".json");
  let calls = 0;
  try {
    await fs.writeFile(filename("vin?vin=" + vin), JSON.stringify({
      expires_at: Date.now() + 72000000,
      value: {brand_name:"SANTANA",dt_manufacturer_id:171,dt_model_id:null}
    }));
    const client = createFapiClient({cacheDir:dir,fetchImpl:async (url) => {
      calls++;
      assert.equal(new URL(url).searchParams.get("vin"),vin);
      return {ok:true,status:200,text:async () => JSON.stringify({
        manufacturer:"VW (SVW)",model_name:"Tiguan L",
        dt_manufacturer_id:3035,dt_model_id:37588,dt_type_id:null
      })};
    }});
    assert.equal((await client.decodeVin(vin)).dt_model_id,37588);
    assert.equal((await client.decodeVin(vin)).dt_type_id,null);
    assert.equal(calls,1);
    const saved=JSON.parse(await fs.readFile(filename("vin?vin=" + vin + "#decoder-20261107"),"utf8"));
    assert.equal(saved.value.dt_manufacturer_id,3035);
    assert.ok(saved.expires_at-Date.now()>0);
    assert.ok(saved.expires_at-Date.now()<=3600000);
  } finally {
    await fs.rm(dir,{recursive:true,force:true});
    if(old===undefined) delete process.env.FAPI_API_KEY;
    else process.env.FAPI_API_KEY=old;
  }
});
