import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import vm from "node:vm";

const appPath=process.env.ZF_APP || resolve(dirname(fileURLToPath(import.meta.url)),"../app.js");
const source=readFileSync(appPath,"utf8");
const start=source.indexOf("let vinManualState=null;");
const end=source.indexOf("\nfunction renderVinDecodeResult(",start);
assert.ok(start>=0 && end>start,"Manual FAPI controller exists");

function setup(manufacturerId=171){
  const vin="AAAAAAAAAAAAAAAAA";
  const list={innerHTML:""};
  const filter={value:"",addEventListener(){}};
  const hint={textContent:""};
  const root={hidden:true,innerHTML:"",querySelector(sel){
    return sel==="#vinManualChoices"?list:sel==="#vinManualFilter"?filter:sel==="#vinManualCount"?hint:null;
  }};
  const panel={hidden:true,scrollIntoView(){}};
  const form={hidden:true};
  const leadPart={value:"",focus(){}};
  const leadVin={value:""};
  const leadComment={value:""};
  const leadName={value:""};
  const leadPhone={value:""};
  const elements={
    vinManualCatalog:root,manualLead:panel,manualLeadForm:form,
    manualLeadPart:leadPart,manualLeadVin:leadVin,manualLeadComment:leadComment,
    manualLeadName:leadName,manualLeadPhone:leadPhone
  };
  const calls=[];
  const sandbox={
    vinCatalogState:{vin,decoded:{dt_manufacturer_id:manufacturerId,manufacturer:"Volkswagen (SAIC)"}},
    sessionUser:{name:"Тест",surname:"Клиент",phone:"+70000000000"},
    document:{getElementById:id=>elements[id]||null},
    escapeHtml:v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),
    apiRequest:async(path)=>{
      calls.push(path);
      if(path.startsWith("/api/catalog/vin-manual/manufacturers"))return {manufacturers:[{id:171,name:"VOLKSWAGEN"}]};
      if(path.startsWith("/api/catalog/vin-manual/models"))return {models:[{id:551,name:"TIGUAN L",year_from:2022,year_to:null}]};
      if(path.startsWith("/api/catalog/vin-manual/modifications"))return {modifications:[{id:8001,name:"1.4 TSI",engine_code:"DJS"}]};
      throw new Error("Unexpected API route");
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(source.slice(start,end),sandbox);
  return {sandbox,root,list,filter,calls,panel,form,leadVin,leadComment,leadName,leadPhone};
}

test("VIN with manufacturer ID uses current FAPI catalog rather than paying for another VIN lookup",async()=>{
  const t=setup(171);
  await vm.runInContext("openVinManualCatalog()",t.sandbox);
  assert.equal(t.calls.length,1);
  assert.equal(t.calls[0],"/api/catalog/vin-manual/models?mfi=171");
  assert.equal(t.root.hidden,false);
  assert.match(t.list.innerHTML,/TIGUAN L/);
  assert.match(t.root.innerHTML,/не подтверждение применимости/);
});

test("Model/modification choice remains unverified and only fills manual lead",async()=>{
  const t=setup();
  await vm.runInContext("openVinManualCatalog()",t.sandbox);
  await vm.runInContext('loadVinManualModifications(551,"TIGUAN L")',t.sandbox);
  assert.equal(t.calls[1],"/api/catalog/vin-manual/modifications?mi=551");
  assert.match(t.list.innerHTML,/DJS/);
  vm.runInContext('selectVinManualModification({id:8001,name:"1.4 TSI"})',t.sandbox);
  assert.match(t.root.innerHTML,/Совместимость с VIN пока не подтверждена/);
  assert.match(t.root.innerHTML,/data-vin-manual-request/);
  vm.runInContext("prepareVinManualLead()",t.sandbox);
  assert.equal(t.leadVin.value,"AAAAAAAAAAAAAAAAA");
  assert.equal(t.panel.hidden,false);
  assert.equal(t.form.hidden,false);
  assert.match(t.leadComment.value,/не подтверждено/);
  assert.equal(t.leadPhone.value,"+70000000000");
  assert.doesNotMatch(t.root.innerHTML,/data-verified-article|data-cart-action/);
});

test("Missing manufacturer ID offers manual list rather than guessing a vehicle",async()=>{
  const t=setup(0);
  await vm.runInContext("openVinManualCatalog()",t.sandbox);
  assert.equal(t.calls[0],"/api/catalog/vin-manual/manufacturers");
  assert.match(t.list.innerHTML,/VOLKSWAGEN/);
});
