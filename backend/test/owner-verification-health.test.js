"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const src=fs.readFileSync(require("node:path").resolve(__dirname,"../src/server.js"),"utf8");
test("owner verification dashboard is role-protected and never sends codes",()=>{
  const start=src.indexOf('app.get("/api/admin/verification-health"');
  const end=src.indexOf('app.get("/api/admin/customers"',start);
  assert.ok(start>0 && end>start);
  const route=src.slice(start,end);
  assert.match(route,/req\.user\?\.role !== "owner"/);
  assert.match(route,/https:\/\/sms\.ru\/my\/balance/);
  assert.match(route,/purpose='register'/);
  assert.doesNotMatch(route,/sendVerification(Call|Code)|code_hash|password_hash/);
});
