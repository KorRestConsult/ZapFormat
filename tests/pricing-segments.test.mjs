import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const require=createRequire(import.meta.url);
const pricing=require("../backend/src/pricing.js");
const flat=(rate,min=0,round=.01)=>({
  tiers:["low","medium","high","premium"].map(id=>({id,percent:rate})),
  min_markup_rub:min,round_to:round
});

test("legacy flat saved pricing migrates to both segments without changing prices",()=>{
  pricing.setPricingPolicies(null);
  pricing.setPricingPolicies(flat(15));
  assert.deepEqual(pricing.getPricingPolicies().individual,flat(15));
  assert.deepEqual(pricing.getPricingPolicies().service,flat(15));
  assert.equal(pricing.customerPrice(2000),2300);
  assert.equal(pricing.customerPrice(2000,process.env,"service"),2300);
  pricing.setPricingPolicies(null);
});

test("retail, guest and verified session-type service use separate settings",()=>{
  pricing.setPricingPolicies({individual:flat(25,100),service:flat(12,50)});
  assert.equal(pricing.customerPrice(1000),1250);
  assert.equal(pricing.customerPrice(1000,process.env,"individual"),1250);
  assert.equal(pricing.customerPrice(1000,process.env,"service"),1120);
  assert.equal(pricing.customerPrice(1000,process.env,"unauthorized"),1250);
  assert.equal(pricing.customerPrice(100,process.env,"service"),150);
  assert.equal(pricing.customerPrice(100,process.env,"individual"),200);
  pricing.setPricingPolicies(null);
});

test("invalid auto-service rates cannot be stored while retail remains valid",()=>{
  assert.throws(()=>pricing.validatePricingPolicies({individual:flat(15),service:flat(350)}),/invalid_pricing_percent/);
  assert.throws(()=>pricing.validatePricingPolicies({individual:flat(15)}),/invalid_pricing_policy/);
  assert.equal(pricing.validatePricingPolicies({individual:flat(15),service:flat(10)}).service.tiers[0].percent,10);
});

test("supplier offers, revalidation and final checkout derive tier from authenticated role",()=>{
  const server=readFileSync(resolve("backend/src/server.js"),"utf8");
  const app=readFileSync(resolve("app.js"),"utf8");
  assert.match(server,/user\.customer_type === "service"/);
  assert.match(server,/user\?\.role === "customer"/);
  assert.match(server,/publicSupplierOffer\(row, number, brand, customerType\)/);
  assert.match(server,/revalidateOfferToken\(token, quantity, cache, customerType\)/);
  assert.match(server,/revalidateOfferToken\(item\.offer_token, item\.quantity, validationCache, customerType\)/);
  assert.match(server,/customerPrice\(row\?\.price, process\.env, customerType\)/);
  assert.match(server,/requestUser = guest \? null : \(pool \? await currentUser\(req\) : null\)/);
  assert.match(app,/credentials:"include"/);
  assert.match(app,/"Authorization":"Bearer "/);
});

test("admin regulator edits two profiles and preserves explicit owner save",()=>{
  const server=readFileSync(resolve("backend/src/server.js"),"utf8");
  const admin=readFileSync(resolve("admin/admin.js"),"utf8");
  const html=readFileSync(resolve("admin/index.html"),"utf8");
  assert.match(server,/app\.get\("\/api\/admin\/pricing"/);
  assert.match(server,/app\.put\("\/api\/admin\/pricing"/);
  assert.match(server,/policies: stored\.rows\[0\] \? setPricingPolicies/);
  assert.match(server,/policies = validatePricingPolicies\(submitted\)/);
  assert.match(server,/service: getPricingPolicy\("service"\)/);
  assert.match(admin,/data-pricing-profile="individual"/);
  assert.match(admin,/data-pricing-profile="service"/);
  assert.match(admin,/body:\{policies\}/);
  assert.match(admin,/window\.confirm/);
  assert.match(html,/pricing-segments\.css\?v=/);
  assert.match(html,/admin\.js\?v=20261106-segments1/);
});
