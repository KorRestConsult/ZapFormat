"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { installStaffRoutes } = require("../src/staff-routes");

function fixture() {
  const app = express();
  app.use(express.json());
  const db = {
    query: async () => ({ rows: [], rowCount: 0 }),
    connect: async () => ({
      query: async () => ({ rows: [], rowCount: 0 }),
      release: () => {}
    })
  };
  const requireDatabase = (_req, _res, next) => next();
  // Fake auth is confined to this in-memory test. Production uses its session middleware.
  const requireUser = (req, _res, next) => {
    req.user = { id: "11111111-1111-4111-8111-111111111111", role: req.get("x-test-role") || "customer", phone_verified_at: new Date() };
    next();
  };
  installStaffRoutes({ app, pool: db, requireDatabase, requireUser });
  return app;
}

test("courier routes enforce real middleware roles before any database reads", async (t) => {
  const server = fixture().listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once("listening", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  const get = (path, role) => fetch(base + path, { headers: { "x-test-role": role } });
  const post = (path, role, body) => fetch(base + path, {
    method: "POST", headers: { "x-test-role": role, "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  assert.equal((await get("/api/staff/courier/orders", "customer")).status, 403);
  assert.equal((await get("/api/staff/courier/orders", "admin")).status, 403);
  const ownOrders = await get("/api/staff/courier/orders", "courier");
  assert.equal(ownOrders.status, 200);
  assert.deepEqual((await ownOrders.json()).orders, []);

  assert.equal((await get("/api/admin/staff/overview", "courier")).status, 403);
  assert.equal((await get("/api/admin/staff/overview", "admin")).status, 403);
  const dashboard = await get("/api/admin/staff/overview", "owner");
  assert.equal(dashboard.status, 200);
  assert.deepEqual((await dashboard.json()).applications, []);

  assert.equal((await post("/api/admin/staff/assignments", "admin", {})).status, 403);
  assert.equal((await post("/api/admin/staff/assignments", "owner", {})).status, 400);
  assert.equal((await post("/api/staff/apply", "courier", {})).status, 403);

  const uuid = "11111111-1111-4111-8111-111111111111";
  assert.equal((await post("/api/staff/courier/assignments/" + uuid + "/status", "courier", { status: "problem" })).status, 400);
  assert.equal((await post("/api/staff/courier/assignments/" + uuid + "/status", "courier", { status: "delivered" })).status, 404);
});

test("pricing changes are a server-enforced owner-only privilege", () => {
  const fs=require("node:fs");
  const path=require("node:path");
  const s=fs.readFileSync(path.resolve(__dirname,"../src/server.js"),"utf8");
  const r=s.slice(s.indexOf('app.get("/api/admin/pricing"'),s.indexOf('app.get("/api/admin/overview"'));
  assert.match(r,/app.get\("\/api\/admin\/pricing", async \(req, res, next\) => \{\s*if \(req\.user\?\.role !== "owner"\)/);
  assert.match(r,/app.put\("\/api\/admin\/pricing", async \(req, res, next\) => \{\s*if \(req\.user\?\.role !== "owner"\)/);
});
