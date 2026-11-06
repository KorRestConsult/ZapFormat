"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {canMoveDelivery}=require("../src/staff-routes");
test("delivery workflow only allows forward, auditable transitions",()=>{
  assert.equal(canMoveDelivery("assigned","accepted"),true);
  assert.equal(canMoveDelivery("accepted","picked_up"),true);
  assert.equal(canMoveDelivery("picked_up","delivered"),true);
  assert.equal(canMoveDelivery("accepted","problem"),true);
  for (const [from,to] of [["assigned","delivered"],["delivered","assigned"],["problem","delivered"],["cancelled","accepted"],["assigned","cancelled"]]){
    assert.equal(canMoveDelivery(from,to),false);
  }
});
test("personnel route middleware enforces owner and courier roles",()=>{
  const src=fs.readFileSync(path.resolve(__dirname,"../src/staff-routes.js"),"utf8");
  assert.match(src,/req\.user\?\.role === "owner"/);
  assert.match(src,/req\.user\?\.role === "courier"/);
  assert.match(src,/req\.user\.role !== "customer"/);
  assert.match(src,/phone_verified_at/);
  assert.match(src,/app\.use\("\/api\/staff", requireDatabase, requireUser\)/);
  assert.match(src,/app\.use\("\/api\/admin\/staff", requireDatabase, requireUser, owner\)/);
  assert.ok(src.includes("ca.courier_id=$1"));
  assert.ok(src.includes("ca.courier_id=$2"));
  assert.ok(!src.includes("purchase_price"));
  assert.ok(!src.includes("PartGrade"));
});
test("deployment applies courier migration and staff pages are role-limited",()=>{
  const deploy=fs.readFileSync(path.resolve(__dirname,"../deploy/release-live-catalog.sh"),"utf8");
  const s=fs.readFileSync(path.resolve(__dirname,"../src/server.js"),"utf8");
  const ui=fs.readFileSync(path.resolve(__dirname,"../../admin/admin.js"),"utf8");
  assert.ok(deploy.includes("db/013_staff_courier.sql"));
  assert.match(s, /installStaffRoutes\(\{ app, pool, requireDatabase, requireUser(?:, addUserNotification)? \}\)/);
  assert.ok(ui.includes('role==="courier"?["deliveries","security"]'));
  assert.ok(ui.includes('role==="customer"?["apply","security"]'));
});
