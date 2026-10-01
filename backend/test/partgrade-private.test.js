"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createActionStore, payloadFor, operation, assertNoCredentials, redact, basketSnapshot, digest } = require("../src/partgrade-private");
const { createPartGradeClient } = require("../src/partgrade");

async function fixture(t, opts = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pg-private-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const filename = path.join(dir, "actions.json");
  return { filename, store: createActionStore({ filename, ...opts }) };
}
const payload = { method: "POST", path: "orders/instant", params: { "positions[0][quantity]": "1" } };

test("private prepare does not send, requires explicit approval and matching exact payload", async t => {
  const { store } = await fixture(t);
  let calls = 0;
  const action = await store.prepare(payload, { payload });
  const send = async p => { calls++; assert.deepEqual(p, payload); return { orders: [42] }; };
  await assert.rejects(store.execute(action.action_id, false, action.payload_hash, send), /approval/);
  await assert.rejects(store.execute(action.action_id, true, "different", send), /mismatch/);
  assert.equal(calls, 0);
  const r = await store.execute(action.action_id, true, action.payload_hash, send);
  assert.equal(r.state, "executed");
  await assert.rejects(store.execute(action.action_id, true, action.payload_hash, send), /not_pending/);
  assert.equal(calls, 1);
});

test("concurrent confirmations reserve only one upstream call", async t => {
  const { store } = await fixture(t);
  const a = await store.prepare(payload, {});
  let calls = 0;
  const send = async () => { calls++; return { ok: true }; };
  const r = await Promise.allSettled([store.execute(a.action_id, true, a.payload_hash, send), store.execute(a.action_id, true, a.payload_hash, send)]);
  assert.equal(calls, 1);
  assert.equal(r.filter(x => x.status === "fulfilled").length, 1);
});

test("timeout persists unknown; restarting cannot replay the order", async t => {
  const { store, filename } = await fixture(t);
  const a = await store.prepare(payload, {});
  let calls = 0;
  const r = await store.execute(a.action_id, true, a.payload_hash, async () => { calls++; throw Object.assign(new Error("timeout"), { code: "partgrade_timeout" }); });
  assert.equal(r.state, "unknown");
  const restarted = createActionStore({ filename });
  assert.equal((await restarted.status(a.action_id)).state, "unknown");
  await assert.rejects(restarted.execute(a.action_id, true, a.payload_hash, async () => calls++), /not_pending/);
  assert.equal(calls, 1);
  assert.equal((await fs.stat(filename)).mode & 0o777, 0o600);
});

test("crash after durable reservation is unknown and cannot replay", async t => {
  const { store, filename } = await fixture(t);
  const a = await store.prepare(payload, {});
  const raw = JSON.parse(await fs.readFile(filename, "utf8"));
  raw[a.action_id].state = "executing";
  await fs.writeFile(filename, JSON.stringify(raw));
  const restarted = createActionStore({ filename });
  assert.equal((await restarted.status(a.action_id)).state, "unknown");
  await assert.rejects(restarted.execute(a.action_id, true, a.payload_hash, async () => assert.fail("replay")), /not_pending/);
});

test("expiry and changed basket fail before reservation/upstream call", async t => {
  let clock = 1000;
  const { store } = await fixture(t, { now: () => clock, ttl: 100 });
  const a = await store.prepare(payload, {});
  await assert.rejects(store.execute(a.action_id, true, a.payload_hash, async () => assert.fail("send"), async () => { throw Error("basket_changed"); }), /basket_changed/);
  clock = 1100;
  assert.equal((await store.status(a.action_id)).state, "expired");
  await assert.rejects(store.execute(a.action_id, true, a.payload_hash, async () => assert.fail("send")), /expired/);
});

test("raw read is documentation-based and cannot invoke a mutation or a customer API", () => {
  assert.equal(operation("POST", "search/batch").readOnly, true);
  assert.equal(operation("POST", "orders/cancelPosition").readOnly, false);
  assert.throws(() => operation("GET", "orders/cancelPosition"), /undocumented/);
  for (const p of ["api/customers", "api/cart", "api/users", "api/orders", "../api/orders", "https://evil.test/x", "//evil.test", "user/info?x=1"]) assert.throws(() => operation("GET", p));
});

test("exact offer payload rejects invalid quantity and credential injection", () => {
  const item = { brand: "PATRON", number: "PRS3420", supplierCode: 12, itemKey: "offer", quantity: 1, price: 500 };
  const p = payloadFor("basket_add", { items: [item] });
  assert.equal(p.params["positions[0][quantity]"], "1");
  assert.equal(p.params["positions[0][price]"], undefined);
  assert.throws(() => payloadFor("basket_add", { items: [{ ...item, quantity: 0 }] }), /quantity/);
  assert.throws(() => payloadFor("basket_order", {}), /position_ids/);
  assert.throws(() => assertNoCredentials({ params: { "userpsw[x]": "injected" } }), /server_side/);
  assert.deepEqual(redact({ userlogin: "login", nested: ["abc hash xyz", { password: "hash" }] }, ["hash"]), { userlogin: "[redacted]", nested: ["abc [redacted] xyz", { password: "[redacted]" }] });
});

test("basket snapshot includes price and quantity, stable against response order", () => {
  const rows = [{ positionId: 2, price: 10, quantity: 1 }, { positionId: 1, price: 20, quantity: 2 }];
  assert.equal(digest(basketSnapshot(rows)), digest(basketSnapshot([...rows].reverse())));
  assert.notEqual(digest(basketSnapshot(rows)), digest(basketSnapshot([{ ...rows[0], price: 11 }, rows[1]])));
});

test("upstream client cannot exfiltrate credentials through absolute URL or redirects", async () => {
  let called = 0;
  const client = createPartGradeClient({ env: { PARTGRADE_API_LOGIN: "owner", PARTGRADE_API_PASSWORD_MD5: "0123456789abcdef0123456789abcdef" }, fetchImpl: async (_url, opts) => { called++; assert.equal(opts.redirect, "error"); return { ok: true, text: async () => "{}" }; } });
  await assert.rejects(client.rawRequest("https://evil.test/leak"), /Invalid upstream/);
  assert.equal(called, 0);
  await client.rawRequest("advices/batch", { items: [] }, { method: "POST", encoding: "json" });
  assert.equal(called, 1);
});
