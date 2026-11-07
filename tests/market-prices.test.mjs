import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
const require=createRequire(import.meta.url);
const m=require("../backend/src/market-pricing.js");
const flatCost=1000,regular=1150;
const setting={enabled:true,discount_percent:5,min_profit_rub:150};

test("manual quote matches exact manufacturer and normalized article, not other brands",()=>{
  assert.equal(m.marketKey("MANN","HU 6004-X"),m.marketKey("MANN","HU6004X"));
  assert.notEqual(m.marketKey("BMW","11428507683"),m.marketKey("SAT","11428507683"));
  assert.notEqual(m.marketKey("MANN","HU6004X"),m.marketKey("MANN","HU6005X"));
});
test("only owner-confirmed https Ryazan quote with price is accepted",()=>{
  const ref={brand:"BMW",article:"11428507683",competitor:"Autodoc",
    competitor_price:3200,source_url:"https://www.autodoc.ru/",city:"Рязань",owner_confirmed:true};
  assert.equal(m.validReference(ref).competitor_price,3200);
  assert.equal(m.validReference({...ref,owner_confirmed:false}),null);
  assert.equal(m.validReference({...ref,city:"Москва"}),null);
  assert.equal(m.validReference({...ref,competitor_price:-1}),null);
  assert.equal(m.validReference({...ref,source_url:"http://www.autodoc.ru"}),null);
});
test("five percent below market can improve earnings but never violates gross floor",()=>{
  const v=m.marketSuggestedPrice(flatCost,3200,setting);
  assert.deepEqual(v,{eligible:true,reason:"market_price",price:3040,gross_profit:2040});
  assert.equal(m.pickCustomerPrice(flatCost,regular,3200,setting),3040);
  assert.equal(m.pickCustomerPrice(flatCost,regular,3200,{...setting,enabled:false}),regular);
  assert.equal(m.pickCustomerPrice(flatCost,regular,1100,setting),regular);
  assert.equal(m.marketSuggestedPrice(flatCost,1100,setting).reason,"below_profit_floor");
  assert.equal(m.marketSuggestedPrice(flatCost,3200,{...setting,discount_percent:40}).eligible,false);
});
test("retail-only market lookup is protected, expired quotes and TEST orders remain excluded",()=>{
  const server=readFileSync(resolve("backend/src/server.js"),"utf8");
  assert.match(server,/customerType!=="individual"/);
  assert.match(server,/checked_at >= NOW\(\)-INTERVAL '72 hours'/);
  assert.match(server,/pickCustomerPrice\(row\?\.price, ordinaryPrice, marketRefPrice, activeMarketSettings\)/);
  assert.match(server,/const quote = await marketReferencesForOffers/);
  assert.match(server,/const references = await marketReferencesForOffers/);
  assert.match(server,/ownerMarketOnly\(req,res,next\)/);
  assert.match(server,/"\/api\/admin\/market-prices\/settings", ownerMarketOnly/);
  assert.match(server,/enabled: false, discount_percent: 5, min_profit_rub: 150/);
  assert.match(server,/revalidateOfferToken\(item\.offer_token, item\.quantity, validationCache, customerType\)/);
});
test("owner can inspect and manually confirm quotes, without automatic paid integrations",()=>{
  const admin=readFileSync(resolve("admin/admin.js"),"utf8");
  const html=readFileSync(resolve("admin/index.html"),"utf8");
  assert.match(admin,/data-market-preview/);
  assert.match(admin,/owner_confirmed:data\.has\("owner_confirmed"\)/);
  assert.match(admin,/market\.references/);
  assert.match(admin,/window\.confirm\("Включить автоматическую рыночную цену/);
  assert.match(admin,/market-prices\/settings/);
  assert.match(html,/market-prices\.css\?v=/);
  assert.match(html,/admin\.js\?v=20261107-market-pilot1/);
});
