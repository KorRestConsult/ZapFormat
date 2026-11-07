"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {validCatalogId,mapManufacturers,mapModels,mapModifications}=require("../src/fapi-manual");
const {createFapiClient}=require("../src/fapi");

test("Catalog ids are validated before reaching FAPI",()=>{
  assert.equal(validCatalogId("171"),171);
  for(const bad of ["", "0", "-2", "171/../../", "1.3", "1e3", "99999999999999999"]){
    assert.equal(validCatalogId(bad),null);
  }
});

test("Manufacturer catalog uses stable dbi and not manufacturer display index",()=>{
  const list=mapManufacturers({mf:[
    {i:12,dbi:171,ds:"VOLKSWAGEN",da:"VOLKSWAGEN"},
    {i:13,dbi:0,ds:"INVALID"},
    {i:1001,ds:"MISSING-STABLE-ID"},
    {i:15,dbi:91,ds:"AUDI"}
  ]});
  assert.deepEqual(list,[{id:91,name:"AUDI"},{id:171,name:"VOLKSWAGEN"}]);
});

test("Model and modification choices retain stable FAPI catalog ids",()=>{
  const model=mapModels({m:[{i:1,dbi:4846,mfi:171,d:"TIGUAN L",cb:1640995200000,ce:0}]});
  assert.deepEqual(model,[{id:4846,name:"TIGUAN L",year_from:2022,year_to:null}]);
  const modification=mapModifications({m:[{
    i:1,dbi:124170,mdi:4846,d:"1.4 TSI",engineCode:"DJS",
    engineType:"Petrol",power:110,capacity:1395,driveType:"FWD",
    bodyType:"SUV",cb:1640995200000,ce:0
  }]});
  assert.equal(modification.length,1);
  assert.equal(modification[0].id,124170);
  assert.equal(modification[0].engine_code,"DJS");
  assert.equal(modification[0].power_kw,110);
  assert.notEqual(modification[0].id,1);
  assert.deepEqual(mapModifications({m:[{i:999,d:"no-stable-id"}]}),[]);
});

test("Existing FAPI v2 methods use documented endpoints and stay authenticated",async()=>{
  const old=process.env.FAPI_API_KEY;
  process.env.FAPI_API_KEY="LOCAL-UNIT-TEST-ONLY";
  const calls=[];
  try{
    const fapi=createFapiClient({cacheDir:"",fetchImpl:async(url,options)=>{
      const request=new URL(url);
      calls.push({path:request.pathname,params:request.searchParams,auth:options.headers.authorization});
      return new Response(JSON.stringify(request.pathname.endsWith("/manufacturerList")?{mf:[]}: {m:[]}),{status:200,headers:{"content-type":"application/json"}});
    }});
    await fapi.manufacturers();
    await fapi.models(171);
    await fapi.modifications(4846);
    assert.deepEqual(calls.map(c=>c.path),[
      "/fapi/v2/catalogList/dt/manufacturerList",
      "/fapi/v2/catalogList/dt/modelList",
      "/fapi/v2/catalogList/dt/modificationList"
    ]);
    assert.equal(calls[1].params.get("mfi"),"171");
    assert.equal(calls[2].params.get("mi"),"4846");
    assert.ok(calls.every(c=>c.auth==="Bearer LOCAL-UNIT-TEST-ONLY"));
  }finally{
    if(old===undefined)delete process.env.FAPI_API_KEY;
    else process.env.FAPI_API_KEY=old;
  }
});

test("Manual FAPI tree is authenticated read-only and explicitly unverified",()=>{
  const fs=require("node:fs");
  const path=require("node:path");
  const server=fs.readFileSync(path.resolve(__dirname,"../src/server.js"),"utf8");
  const start=server.indexOf('app.get("/api/catalog/vin-manual/tree"');
  const end=server.indexOf('app.get("/api/catalog/vin-browser"',start);
  assert.ok(start>0&&end>start);
  const route=server.slice(start,end);
  assert.match(route,/requireUser, aiSearchLimiter/);
  assert.match(route,/validCatalogId/);
  assert.match(route,/fitment_verified:false/);
  assert.doesNotMatch(route,/partGrade|basket_order|pool.query|persistVehicleCatalogBinding/);
});
