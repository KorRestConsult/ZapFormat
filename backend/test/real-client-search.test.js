"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {resolve}=require("node:path");
const {fallbackIntent}=require("../src/ai-search");
test("Russian ball joint requests are parts, not unknown text",()=>{
  for(const phrase of ["Шаровые","шаровая опора","передние шаровые опоры"]){
    const item=fallbackIntent(phrase,null);
    assert.equal(item.category,"other_part");
    assert.equal(item.clarification_needed,false);
    assert.equal(item.part_name,"Шаровая опора");
  }
});
test("public VIN lookup does not require customer login, uses paid-catalog rate cap",()=>{
  const source=readFileSync(resolve(__dirname,"../src/server.js"),"utf8");
  assert.match(source,/app.get\("\/api\/catalog\/vin-browser", publicVinLimiter, async/);
  assert.match(source,/const publicVinLimiter = rateLimit\(\{[\s\S]*?limit: 6/);
  assert.match(source,/catalog_status: "credits_exhausted", decoded: null/);
});

test("public common-parts search asks for vehicle before expensive AI lookup",()=>{
  const source=readFileSync(resolve(__dirname,"../src/server.js"),"utf8");
  const start=source.indexOf('app.post("/api/catalog/ai-search-public"');
  const end=source.indexOf('app.post("/api/catalog/ai-search",',start);
  const route=source.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.match(route,/fallbackIntent\(query,null\)/);
  assert.ok(route.indexOf("fallbackIntent(query,null)")<route.indexOf("await interpretSearch"));
  assert.match(route,/Укажите VIN либо марку, модель и год выпуска/);
});
test("brake disc phrase has correct deterministic category",()=>{
  const intent=fallbackIntent("Тормозные диски",null);
  assert.equal(intent.category,"brake_disk");
});
