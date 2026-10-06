"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createClearActionStore,
  createObdMcp,
  createObdRelayManager,
  validSecret
} = require("../src/obd-relay");

test("secret validation uses sha256", () => {
  const hash = "2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b";
  assert.equal(validSecret("secret", hash), true);
  assert.equal(validSecret("wrong", hash), false);
});

test("relay sends command to poller and resolves result", async () => {
  let now = 1000;
  const relay = createObdRelayManager({ now: () => now, requestTimeoutMs: 1000, pollWaitMs: 100 });
  relay.hello({ client: { name: "test" } });

  const responsePromise = relay.request("identify_vehicle", {});
  const command = await relay.poll(100);
  assert.equal(command.method, "identify_vehicle");

  relay.reply({ id: command.id, ok: true, data: { vin: "TESTVIN" } });
  assert.deepEqual(await responsePromise, { vin: "TESTVIN" });

  now += 61000;
  assert.equal(relay.bridgeStatus().connected, false);
  assert.throws(() => relay.request("read_dtcs", {}), /offline/);
});

test("relay rejects duplicate/unknown result", async () => {
  const relay = createObdRelayManager({ requestTimeoutMs: 1000, pollWaitMs: 100 });
  relay.hello({});
  const responsePromise = relay.request("read_dtcs", {});
  const command = await relay.poll(100);
  relay.reply({ id: command.id, ok: true, data: [] });
  await responsePromise;
  assert.throws(() => relay.reply({ id: command.id, ok: true, data: [] }), /unknown_or_expired/);
});

test("clear DTC requires exact one-time explicit confirmation", () => {
  const store = createClearActionStore({ ttlMs: 10000 });
  const prepared = store.prepare({ dtcs: ["P0401"], readiness: { catalyst: "complete" } });

  assert.throws(() => store.consume(prepared.action_id, prepared.confirm_token, false), /explicit_confirmation/);
  assert.throws(() => store.consume(prepared.action_id, "bad", true), /mismatch/);

  const action = store.consume(prepared.action_id, prepared.confirm_token, true);
  assert.deepEqual(action.preflight.dtcs, ["P0401"]);
  store.finish(prepared.action_id, "executed", { cleared: true });

  assert.throws(() => store.consume(prepared.action_id, prepared.confirm_token, true), /not_pending/);
});

test("MCP exposes universal diagnostic tools and bridges reads", async () => {
  const relay = createObdRelayManager({ requestTimeoutMs: 1000, pollWaitMs: 100 });
  const mcp = createObdMcp({ relay });
  relay.hello({ adapter: { transport: "wifi" } });

  assert(mcp.tools.some((x) => x.name === "obd_scan_all"));
  assert(mcp.tools.some((x) => x.name === "obd_prepare_clear_dtcs"));
  assert(mcp.tools.some((x) => x.name === "obd_clear_dtcs" && x.annotations?.destructiveHint === true));

  const promise = mcp.callTool("obd_read_live_data", { pids: ["RPM", "COOLANT_TEMP"] });
  const command = await relay.poll(100);
  assert.equal(command.method, "read_live_data");
  assert.deepEqual(command.args.pids, ["RPM", "COOLANT_TEMP"]);

  relay.reply({ id: command.id, ok: true, data: { RPM: 850, COOLANT_TEMP: 88 } });
  assert.deepEqual(await promise, { RPM: 850, COOLANT_TEMP: 88 });
});
