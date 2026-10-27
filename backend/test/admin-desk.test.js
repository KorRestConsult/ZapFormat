"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {resolve}=require("node:path");
const source=readFileSync(resolve(__dirname,"../src/server.js"),"utf8");
test("owner service desk routes follow authentication and role checks",()=>{
 const guard=source.indexOf('app.use("/api/admin", requireDatabase, requireUser, requireAdmin)');
 const req=source.indexOf('app.get("/api/admin/requests"');
 const cust=source.indexOf('app.get("/api/admin/customers"');
 assert.ok(guard>0&&req>guard&&cust>guard);
 const segment=source.slice(req,cust+1800);
 assert.ok(segment.includes("u.role = 'customer'"));
 assert.ok(segment.includes("LIMIT $2 OFFSET $3"));
 assert.ok(segment.includes("position(lower($1)"));
 assert.ok(segment.includes("res.json({ customers:"));
});
