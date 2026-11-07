import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import vm from "node:vm";

const appPath=process.env.ZF_APP || resolve(dirname(fileURLToPath(import.meta.url)),"../app.js");
const source=readFileSync(appPath,"utf8");
const start=source.indexOf("function renderVinDecodeResult(");
const end=source.indexOf("\nfunction smartSpecRows(",start);
assert.ok(start>=0 && end>start,"VIN fallback renderer is present");
const renderer=source.slice(start,end);
const vin="AAAAAAAAAAAAAAAAA"; // Synthetic: never store real customer VINs in tests.
const decoded={
  manufacturer:"Volkswagen (SAIC)",
  brand_name:"SANTANA",
  model_name:null,
  model_year:2022
};
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,char=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
})[char]);

function render({user={id:"test-customer"},vehicles=[],savedVehicleId=null,details=decoded}={}){
  const root={innerHTML:""};
  const sandbox={
    vinCatalogState:null,
    sessionUser:user,
    garageVehicles:vehicles,
    smartSearchMount:()=>root,
    escapeHtml,
    normalizeVin:x=>String(x||"").trim().toUpperCase(),
    setVinCatalogMode(value){sandbox.vinCatalogMode=value;}
  };
  vm.createContext(sandbox);
  vm.runInContext(renderer+"\nrenderVinDecodeResult("+JSON.stringify(vin)+","+JSON.stringify(details)+","+JSON.stringify(savedVehicleId)+");",sandbox);
  return {html:root.innerHTML,state:sandbox.vinCatalogState,catalogMode:sandbox.vinCatalogMode};
}

test("Unresolved VIN is not presented as a verified model or catalog",()=>{
  const result=render();
  assert.equal(result.catalogMode,false);
  assert.equal(result.state.vin,vin);
  assert.equal(result.state.locked,true);
  assert.match(result.html,/Volkswagen \(SAIC\)/);
  assert.doesNotMatch(result.html,/SANTANA/);
  assert.match(result.html,/точная модель и комплектация не подтверждены/);
  assert.match(result.html,/data-open-manual-lead/);
  assert.match(result.html,/data-focus-catalog-search/);
  assert.match(result.html,/data-save-vin-vehicle/);
  assert.doesNotMatch(result.html,/data-verified-article|data-vin-node/);
});

test("A guest can ask for help but cannot save to another account",()=>{
  const result=render({user:null});
  assert.match(result.html,/data-open-manual-lead/);
  assert.doesNotMatch(result.html,/data-save-vin-vehicle/);
});

test("Known garage VIN is not offered for duplicate saving",()=>{
  const result=render({vehicles:[{vin}],savedVehicleId:null});
  assert.doesNotMatch(result.html,/data-save-vin-vehicle/);
  const result2=render({savedVehicleId:"existing-id"});
  assert.doesNotMatch(result2.html,/data-save-vin-vehicle/);
});

test("Saving an unresolved model uses an explicitly unverified label",()=>{
  assert.match(source,/model:d\.model_name\|\|"Модель уточняется"/);
  assert.match(source,/renderVinDecodeResult\(vin,decoded,active\?\.id\|\|null\)/);
});
